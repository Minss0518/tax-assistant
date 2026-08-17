from app.tax_agent.state import TaxAgentState
from app.tax_agent.tools.tax_calculator import calculate_tax


async def calculate_node(state: TaxAgentState) -> dict:
    tax_result, deductions = calculate_tax(state["income_data"])
    return {"tax_result": tax_result, "deductions": deductions}
