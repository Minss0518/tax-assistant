import httpx
import base64
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..models.subscription import Subscription

router = APIRouter(prefix="/payments", tags=["payments"])

TOSS_SECRET_KEY = os.getenv("TOSS_SECRET_KEY")
TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm"

def get_toss_auth_header():
    encoded = base64.b64encode(f"{TOSS_SECRET_KEY}:".encode()).decode()
    return {
        "Authorization": f"Basic {encoded}",
        "Content-Type": "application/json"
    }

@router.post("/confirm")
async def confirm_payment(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment_key = payload.get("paymentKey")
    order_id = payload.get("orderId")
    amount = payload.get("amount")

    # 토스 서버에 최종 승인 요청
    async with httpx.AsyncClient() as client:
        res = await client.post(
            TOSS_CONFIRM_URL,
            json={"paymentKey": payment_key, "orderId": order_id, "amount": amount},
            headers=get_toss_auth_header()
        )

    if res.status_code != 200:
        detail = res.json().get("message", "결제 승인 실패")
        raise HTTPException(status_code=400, detail=detail)

    # DB에 구독 저장
    subscription = Subscription(
        user_id=current_user.id,
        plan="pro",
        payment_key=payment_key,
        order_id=order_id,
        amount=amount,
        status="active",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(subscription)

    # 유저 플랜 업데이트
    current_user.plan = "pro"
    await db.commit()

    return {"success": True, "expires_at": str(subscription.expires_at)}


@router.get("/status")
async def get_payment_status(
    current_user: User = Depends(get_current_user)
):
    return {
        "plan": current_user.plan,
        "is_pro": current_user.plan == "pro"
    }