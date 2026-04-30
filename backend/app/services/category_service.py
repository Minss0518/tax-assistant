from openai import AsyncOpenAI
from app.config import settings
import json

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# 카테고리 목록
CATEGORIES = {
    # 경비 카테고리
    "식비": {"is_expense": True, "emoji": "🍽️"},
    "교통비": {"is_expense": True, "emoji": "🚗"},
    "장비/기기": {"is_expense": True, "emoji": "💻"},
    "소프트웨어/구독": {"is_expense": True, "emoji": "📱"},
    "교육비": {"is_expense": True, "emoji": "📚"},
    "통신비": {"is_expense": True, "emoji": "📡"},
    "사무용품": {"is_expense": True, "emoji": "✏️"},
    "마케팅/광고": {"is_expense": True, "emoji": "📢"},
    "외주/인건비": {"is_expense": True, "emoji": "👥"},
    "기타경비": {"is_expense": True, "emoji": "📦"},
    # 비경비 카테고리
    "개인식비": {"is_expense": False, "emoji": "🍜"},
    "개인교통": {"is_expense": False, "emoji": "🚌"},
    "쇼핑": {"is_expense": False, "emoji": "🛍️"},
    "의료/건강": {"is_expense": False, "emoji": "🏥"},
    "여가/취미": {"is_expense": False, "emoji": "🎮"},
    "기타": {"is_expense": False, "emoji": "💸"},
    # 수입 카테고리
    "프리랜서수입": {"is_expense": None, "emoji": "💼"},
    "유튜브수입": {"is_expense": None, "emoji": "🎬"},
    "강의수입": {"is_expense": None, "emoji": "🎓"},
    "기타수입": {"is_expense": None, "emoji": "💰"},
}

async def classify_transaction(memo: str, transaction_type: str) -> dict:
    """거래 메모를 보고 카테고리 자동 분류"""
    if not memo:
        return {"category": "기타", "is_deductible": False, "emoji": "💸"}

    category_list = "\n".join([
        f"- {name} ({info['emoji']}): {'경비처리 가능' if info['is_expense'] else '경비처리 불가' if info['is_expense'] is False else '수입'}"
        for name, info in CATEGORIES.items()
    ])

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"""당신은 한국 세무 전문가입니다. 프리랜서/크리에이터의 거래 내역을 보고 카테고리를 분류해주세요.

카테고리 목록:
{category_list}

반드시 아래 JSON 형식으로만 답변해주세요:
{{
  "category": "카테고리명",
  "is_deductible": true/false,
  "reason": "분류 이유 한 줄"
}}"""
            },
            {
                "role": "user",
                "content": f"거래유형: {transaction_type}\n메모: {memo}"
            }
        ],
        max_tokens=150,
        temperature=0.1,
    )

    text = response.choices[0].message.content.strip()
    text = text.replace('```json', '').replace('```', '').strip()
    result = json.loads(text)

    category_name = result.get("category", "기타")
    emoji = CATEGORIES.get(category_name, {}).get("emoji", "💸")

    return {
        "category": category_name,
        "is_deductible": result.get("is_deductible", False),
        "emoji": emoji,
        "reason": result.get("reason", ""),
    }