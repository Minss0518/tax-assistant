"""종합소득세 계산 순수 함수.

이 모듈은 LLM을 호출하지 않는다. 계산 로직은 반드시 결정론적이어야 하며, 단위 테스트로
정확성을 담보한다.

구현 스코프(2024년 기준, 단순화):
- 근로소득공제: 소득세법 제47조 5단계 구간표.
- 사업소득 필요경비: 실제 필요경비(기장 기준)만 지원. 단순경비율/기준경비율 업종별 표는
  제외 — 사용자가 명시한 expense 금액을 그대로 사용한다.
- 종합소득공제: 본인 기본공제 150만원만 적용. 부양가족 공제 등은 제외.
- 세액공제: 0으로 고정.
"""

TAX_BRACKETS_2024 = [
    (14_000_000, 0.06, 0),
    (50_000_000, 0.15, 1_260_000),
    (88_000_000, 0.24, 5_760_000),
    (150_000_000, 0.35, 15_440_000),
    (300_000_000, 0.38, 19_940_000),
    (500_000_000, 0.40, 25_940_000),
    (1_000_000_000, 0.42, 35_940_000),
    (float("inf"), 0.45, 65_940_000),
]

BASIC_PERSONAL_DEDUCTION = 1_500_000


def calc_employment_income_deduction(gross: int) -> int:
    if gross <= 5_000_000:
        return int(gross * 0.7)
    if gross <= 15_000_000:
        return int(3_500_000 + (gross - 5_000_000) * 0.4)
    if gross <= 45_000_000:
        return int(7_500_000 + (gross - 15_000_000) * 0.15)
    if gross <= 100_000_000:
        return int(12_000_000 + (gross - 45_000_000) * 0.05)
    return int(14_750_000 + (gross - 100_000_000) * 0.02)


def calc_progressive_tax(taxable_income: int) -> int:
    if taxable_income <= 0:
        return 0
    for threshold, rate, deduction in TAX_BRACKETS_2024:
        if taxable_income <= threshold:
            return int(taxable_income * rate - deduction)
    raise ValueError("과세표준 구간을 찾을 수 없습니다")


def calculate_tax(income_data: dict) -> tuple[dict, list[dict]]:
    deductions: list[dict] = []
    total_income_amount = 0

    for income_type, entry in income_data.items():
        gross = entry["gross"]
        if income_type == "근로소득":
            deduction = calc_employment_income_deduction(gross)
            deductions.append({"name": "근로소득공제", "amount": deduction, "basis": "소득세법 제47조"})
            total_income_amount += max(gross - deduction, 0)
        elif income_type == "사업소득":
            expense = entry.get("expense", 0)
            deductions.append({"name": "필요경비", "amount": expense, "basis": "소득세법 제27조"})
            total_income_amount += max(gross - expense, 0)
        else:
            total_income_amount += gross

    deductions.append({
        "name": "기본공제(본인)",
        "amount": BASIC_PERSONAL_DEDUCTION,
        "basis": "소득세법 제50조",
    })
    taxable_income = max(total_income_amount - BASIC_PERSONAL_DEDUCTION, 0)

    income_tax = calc_progressive_tax(taxable_income)
    final_tax = max(income_tax, 0)
    local_tax = round(final_tax * 0.1)
    total_tax = final_tax + local_tax
    gross_income_total = sum(entry["gross"] for entry in income_data.values())

    tax_result = {
        "gross_income": gross_income_total,
        "taxable_income": taxable_income,
        "income_tax": income_tax,
        "tax_credits": 0,
        "final_tax": final_tax,
        "local_tax": local_tax,
        "total_tax": total_tax,
    }
    return tax_result, deductions
