"""
AI 인사이트 분석 라우터
대시보드용 거래 데이터 LLM 분석 엔드포인트

엔드포인트:
  GET  /ai-insights/summary      → 자동 요약 + 이상값 탐지
  POST /ai-insights/question     → 자연어 질문
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel
from openai import AsyncOpenAI
from datetime import datetime, timedelta
from collections import defaultdict
import json
import os

from app.database import get_db          # 기존 프로젝트 DB 세션
from app.models.transaction import Transaction  # 기존 모델
from app.models.user import User    # 기존 JWT 미들웨어
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/ai-insights", tags=["ai-insights"])
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ────────────────────────────────────────────
# 공통: DB에서 거래 데이터 → LLM용 텍스트 변환
# ────────────────────────────────────────────
async def fetch_transactions_for_llm(current_user: dict, db: AsyncSession) -> dict:
    """최근 3개월 거래 내역을 LLM에게 넘기기 좋은 구조로 변환"""
    three_months_ago = datetime.now() - timedelta(days=365)

    result = await db.execute(
        select(Transaction)
        .where(
            Transaction.user_id == uuid.UUID(current_user["sub"]),
            Transaction.transaction_date >= three_months_ago,
        )
        .order_by(Transaction.transaction_date.asc())
    )
    transactions = result.scalars().all()

    if not transactions:
        return None

    # 카테고리별 집계
    category_totals = defaultdict(int)
    monthly_totals = defaultdict(lambda: {"income": 0, "expense": 0})
    daily_expense = defaultdict(int)

    for t in transactions:
        date_str = t.transaction_date.strftime("%Y-%m-%d")
        month_str = t.transaction_date.strftime("%Y-%m")

        if t.type == "expense":
            category_totals[t.category_name or "기타"] += t.amount
            daily_expense[date_str] += t.amount
            monthly_totals[month_str]["expense"] += t.amount
        else:
            monthly_totals[month_str]["income"] += t.amount

    # 이상값 탐지: 일별 지출 평균 대비 300% 초과
    if daily_expense:
        avg_daily = sum(daily_expense.values()) / len(daily_expense)
        anomalies = [
            {"date": d, "amount": a, "ratio": round(a / avg_daily * 100)}
            for d, a in daily_expense.items()
            if a > avg_daily * 3
        ]
    else:
        anomalies = []

    total_expense = sum(t.amount for t in transactions if t.type == "expense")

    # 카테고리 비율
    category_ratios = {
        cat: {
            "amount": amt,
            "ratio": round(amt / total_expense * 100) if total_expense else 0,
        }
        for cat, amt in sorted(category_totals.items(), key=lambda x: -x[1])
    }

    return {
        "transactions": [
            {
                "date": t.transaction_date.strftime("%Y-%m-%d"),
                "type": t.type,
                "amount": t.amount,
                "category": t.category_name or "기타",
                "memo": t.memo or "",
            }
            for t in transactions
        ],
        "category_ratios": category_ratios,
        "monthly_totals": dict(monthly_totals),
        "anomalies": anomalies,
        "total_income": sum(t.amount for t in transactions if t.type == "income"),
        "total_expense": total_expense,
        "period": f"{three_months_ago.strftime('%Y.%m.%d')} ~ {datetime.now().strftime('%Y.%m.%d')}",
    }


def build_context_text(data: dict) -> str:
    top_cats = list(data["category_ratios"].items())[:5]
    cats_text = "\n".join(
        f"  - {cat}: {v['amount']:,}원 ({v['ratio']}%)" for cat, v in top_cats
    )

    monthly_text = "\n".join(
        f"  - {month}: 수입 {v['income']:,}원 / 지출 {v['expense']:,}원"
        for month, v in sorted(data["monthly_totals"].items())
    )

    anomaly_text = (
        "\n".join(
            f"  - {a['date']}: {a['amount']:,}원 (평균 대비 {a['ratio']}%)"
            for a in data["anomalies"]
        )
        or "  없음"
    )

    # 최근 10건만 샘플로 전달
    recent_sample = data['transactions'][-10:]
    sample_text = "\n".join(
        f"  - {t['date']} {t['type']} {t['amount']:,}원 ({t['category']}) {t['memo']}"
        for t in recent_sample
    )

    return f"""
[분석 기간] {data['period']}
[총 수입] {data['total_income']:,}원
[총 지출] {data['total_expense']:,}원
[순이익] {data['total_income'] - data['total_expense']:,}원

[카테고리별 지출 비율 Top5]
{cats_text}

[월별 수입/지출]
{monthly_text}

[이상 지출 감지 (일평균 300% 초과)]
{anomaly_text}

[최근 거래 샘플 (10건)]
{sample_text}
""".strip()


# ────────────────────────────────────────────
# 1. 자동 요약 + 이상값 탐지
# ────────────────────────────────────────────
@router.get("/summary")
async def get_ai_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await fetch_transactions_for_llm(current_user, db)

    if not data:
        return {
            "summary": "아직 거래 내역이 없습니다. 거래를 등록하면 AI가 분석해 드려요!",
            "anomalies": [],
            "top_category": None,
        }

    context = build_context_text(data)

    system_prompt = """당신은 프리랜서·크리에이터를 위한 AI 세무 비서입니다.
아래 거래 데이터를 분석해서 다음 3가지를 JSON으로만 응답하세요.
다른 텍스트는 절대 포함하지 마세요.

응답 형식:
{
  "summary": "2~3문장. 이번 기간 핵심 수지 요약 + 가장 주목할 지출 패턴",
  "insight": "1문장. 절세 또는 지출 개선 팁",
  "anomalies": [
    {"date": "YYYY-MM-DD", "amount": 숫자, "ratio": 숫자, "description": "왜 이상한지 한 줄"}
  ],
  "top_category": {"name": "카테고리명", "ratio": 숫자, "amount": 숫자}
}"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
            max_tokens=600,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        result["period"] = data["period"]
        result["total_income"] = data["total_income"]
        result["total_expense"] = data["total_expense"]
        result["category_ratios"] = data["category_ratios"]
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 분석 오류: {str(e)}")


# ────────────────────────────────────────────
# 2. 자연어 질문 (스트리밍)
# ────────────────────────────────────────────
class QuestionRequest(BaseModel):
    question: str


@router.post("/question")
async def ask_question(
    req: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    
    # 세무 관련 질문만 허용
    blocked_keywords = ["비밀번호", "개인정보", "다른 사용자", "시스템", "프롬프트"]
    if any(kw in req.question for kw in blocked_keywords):
        raise HTTPException(status_code=400, detail="허용되지 않는 질문입니다.")

    data = await fetch_transactions_for_llm(current_user, db)

    if not data:
        async def empty_stream():
            yield "거래 내역이 없어서 분석할 데이터가 없습니다. 먼저 거래를 등록해 주세요!"

        return StreamingResponse(empty_stream(), media_type="text/plain")

    context = build_context_text(data)

    system_prompt = f"""당신은 프리랜서·크리에이터를 위한 AI 세무 비서입니다.
아래는 이 사용자의 실제 거래 데이터입니다. 이 데이터만을 근거로 질문에 답하세요.
데이터에 없는 내용은 "데이터에서 확인할 수 없습니다"라고 솔직하게 말하세요.
답변은 간결하고 실용적으로, 한국어로 작성하세요.

[사용자 거래 데이터]
{context}"""

    async def stream_response():
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.question},
            ],
            temperature=0.4,
            max_tokens=500,
            stream=True,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    
    return StreamingResponse(
        stream_response(),
        media_type="text/plain; charset=utf-8",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        }
    )

    # return StreamingResponse(stream_response(), media_type="text/plain; charset=utf-8")