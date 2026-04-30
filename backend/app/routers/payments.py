import httpx
import base64
import os
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..core.dependencies import get_current_user
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
    current_user: dict = Depends(get_current_user)
):
    payment_key = payload.get("paymentKey")
    order_id = payload.get("orderId")
    amount = payload.get("amount")
    user_id = uuid.UUID(current_user["sub"])

    async with httpx.AsyncClient() as client:
        res = await client.post(
            TOSS_CONFIRM_URL,
            json={"paymentKey": payment_key, "orderId": order_id, "amount": amount},
            headers=get_toss_auth_header()
        )

    if res.status_code != 200:
        detail = res.json().get("message", "결제 승인 실패")
        raise HTTPException(status_code=400, detail=detail)

    subscription = Subscription(
        user_id=user_id,
        plan="pro",
        payment_key=payment_key,
        order_id=order_id,
        amount=amount,
        status="active",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(subscription)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.plan = "pro"
    await db.commit()

    return {"success": True, "expires_at": str(subscription.expires_at)}


@router.get("/status")
async def get_payment_status(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = uuid.UUID(current_user["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return {
        "plan": user.plan if user else "free",
        "is_pro": user.plan == "pro" if user else False
    }

@router.post("/cancel")
async def cancel_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = uuid.UUID(current_user["sub"])

    # 활성 구독 찾기
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == "active"
        )
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(status_code=404, detail="활성 구독이 없어요.")

    # 취소 처리 (만료일은 유지, status만 cancelled로)
    subscription.status = "cancelled"
    subscription.cancelled_at = datetime.utcnow()
    await db.commit()

    return {
        "success": True,
        "message": "구독이 취소됐어요. 만료일까지 Pro 기능을 사용할 수 있어요.",
        "expires_at": str(subscription.expires_at)
    }