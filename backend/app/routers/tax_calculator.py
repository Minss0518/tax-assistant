import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..core.dependencies import get_current_user
from ..models.tax_calculation import TaxCalculation

router = APIRouter(prefix="/tax-calculator", tags=["tax-calculator"])

@router.post("/save")
async def save_calculation(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = uuid.UUID(current_user["sub"])

    calc = TaxCalculation(
        user_id=user_id,
        gross_income=payload.get("grossIncome"),
        expense=payload.get("expense"),
        taxable_income=payload.get("taxableIncome"),
        income_tax=payload.get("incomeTax"),
        local_tax=payload.get("localTax"),
        total_tax=payload.get("totalTax"),
        prepaid_tax=payload.get("prepaidTax"),
        final_tax=payload.get("finalTax"),
        is_refund=payload.get("isRefund"),
        refund_amount=payload.get("refundAmount"),
    )
    db.add(calc)
    await db.commit()
    return {"success": True}


@router.get("/history")
async def get_calculation_history(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = uuid.UUID(current_user["sub"])
    result = await db.execute(
        select(TaxCalculation)
        .where(TaxCalculation.user_id == user_id)
        .order_by(TaxCalculation.created_at.desc())
        .limit(10)
    )
    calcs = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "grossIncome": c.gross_income,
            "expense": c.expense,
            "totalTax": c.total_tax,
            "finalTax": c.final_tax,
            "isRefund": c.is_refund,
            "refundAmount": c.refund_amount,
            "createdAt": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "-",
        }
        for c in calcs
    ]