from app.tax_agent.tools.tax_calculator import (
    calc_employment_income_deduction,
    calc_progressive_tax,
    calculate_tax,
)


def test_employment_deduction_first_bracket():
    assert calc_employment_income_deduction(5_000_000) == 3_500_000  # 5,000,000 * 0.7


def test_employment_deduction_second_bracket_boundary():
    assert calc_employment_income_deduction(5_000_001) == 3_500_000  # 3,500,000 + 1*0.4 반올림 버림


def test_employment_deduction_top_bracket():
    assert calc_employment_income_deduction(150_000_000) == 14_750_000 + int(50_000_000 * 0.02)


def test_progressive_tax_zero_for_non_positive_income():
    assert calc_progressive_tax(0) == 0
    assert calc_progressive_tax(-1000) == 0


def test_progressive_tax_first_bracket():
    assert calc_progressive_tax(10_000_000) == int(10_000_000 * 0.06)


def test_progressive_tax_second_bracket():
    assert calc_progressive_tax(50_000_000) == int(50_000_000 * 0.15 - 1_260_000)


def test_calculate_tax_single_employment_income():
    tax_result, deductions = calculate_tax({"근로소득": {"gross": 30_000_000}})

    assert tax_result["gross_income"] == 30_000_000
    deduction = calc_employment_income_deduction(30_000_000)
    expected_taxable = max(30_000_000 - deduction - 1_500_000, 0)
    assert tax_result["taxable_income"] == expected_taxable
    assert tax_result["income_tax"] == calc_progressive_tax(expected_taxable)
    assert tax_result["final_tax"] == tax_result["income_tax"]
    assert tax_result["local_tax"] == round(tax_result["final_tax"] * 0.1)
    assert tax_result["total_tax"] == tax_result["final_tax"] + tax_result["local_tax"]

    names = [d["name"] for d in deductions]
    assert "근로소득공제" in names
    assert "기본공제(본인)" in names


def test_calculate_tax_business_and_employment_combined():
    tax_result, deductions = calculate_tax({
        "근로소득": {"gross": 30_000_000},
        "사업소득": {"gross": 50_000_000, "expense": 20_000_000},
    })

    assert tax_result["gross_income"] == 80_000_000
    names = [d["name"] for d in deductions]
    assert "필요경비" in names
    business_deduction = next(d for d in deductions if d["name"] == "필요경비")
    assert business_deduction["amount"] == 20_000_000


def test_calculate_tax_low_income_results_in_zero_tax():
    tax_result, _ = calculate_tax({"근로소득": {"gross": 1_000_000}})
    assert tax_result["taxable_income"] == 0
    assert tax_result["income_tax"] == 0
    assert tax_result["final_tax"] == 0
    assert tax_result["total_tax"] == 0
