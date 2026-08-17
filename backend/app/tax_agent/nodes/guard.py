from app.services.rag_service import NON_TAX_RESPONSE, is_tax_related
from app.tax_agent.state import TaxAgentState


async def guard_node(state: TaxAgentState) -> dict:
    if is_tax_related(state["user_query"]):
        return {}
    return {"final_answer": NON_TAX_RESPONSE}
