import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from langgraph.types import Command
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.tax_agent.state import TaxAgentState

router = APIRouter(prefix="/tax-agent", tags=["tax-agent"])


class ConsultRequest(BaseModel):
    message: str
    session_id: str | None = None


def _initial_state(user_query: str) -> TaxAgentState:
    return {
        "user_query": user_query, "income_types": [], "income_data": {},
        "missing_info": [], "search_queries": [], "retrieved_docs": [], "deductions": [],
        "tax_result": None, "verified": False, "verification_notes": "", "retry_count": 0,
        "final_answer": "",
    }


@router.post("/consult")
async def consult(
    request: ConsultRequest,
    fastapi_request: Request,
    current_user: dict = Depends(get_current_user),
):
    graph = fastapi_request.app.state.tax_agent_graph
    session_id = request.session_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}, "recursion_limit": 25}

    try:
        if request.session_id:
            result = await graph.ainvoke(Command(resume=request.message), config)
        else:
            result = await graph.ainvoke(_initial_state(request.message), config)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="상담 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
        ) from exc

    if "__interrupt__" in result:
        interrupt_payload = result["__interrupt__"][0].value
        return {
            "session_id": session_id,
            "status": "needs_input",
            "reply": interrupt_payload["question"],
            "tax_result": None,
        }

    return {
        "session_id": session_id,
        "status": "done",
        "reply": result["final_answer"],
        "tax_result": result.get("tax_result"),
    }
