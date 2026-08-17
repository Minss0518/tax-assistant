import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from langgraph.types import Command
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.services.rag_service import NON_TAX_RESPONSE, is_tax_related
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


def _thread_id(current_user: dict, session_id: str) -> str:
    # Bind the LangGraph thread to the authenticated user so one user can
    # never resume (or read the checkpoint of) another user's session, even
    # if they guess/replay a session_id.
    return f"{current_user['sub']}:{session_id}"


def _expired_response(reply: str) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={"session_id": None, "status": "expired", "reply": reply, "tax_result": None},
    )


def _unknown_session_response() -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "session_id": None,
            "status": "expired",
            "reply": "세션이 만료되었어요. 새로 시작해주세요.",
            "tax_result": None,
        },
    )


@router.post("/consult")
async def consult(
    request: ConsultRequest,
    fastapi_request: Request,
    current_user: dict = Depends(get_current_user),
):
    graph = fastapi_request.app.state.tax_agent_graph
    session_id = request.session_id or str(uuid.uuid4())
    thread_id = _thread_id(current_user, session_id)
    config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 25}

    if request.session_id:
        # Resuming an existing session: verify the thread actually exists and
        # is genuinely paused waiting for input before touching the graph.
        snapshot = await graph.aget_state(config)

        if snapshot.metadata is None:
            # No checkpoint was ever written for this thread_id (unknown/
            # forged session_id, or it belongs to a different user).
            return _unknown_session_response()

        if not snapshot.next:
            # The run already reached END (respond) on a prior turn. There is
            # no pending interrupt to resume, so Command(resume=...) would
            # silently hand back the old final state and drop this message.
            return _expired_response("이미 완료된 상담이에요. 새로 시작해주세요.")

        # Re-run the tax-relevance/injection guard on every resumed turn too:
        # Command(resume=...) re-enters clarify_node directly and never
        # passes through guard_node, so without this check a follow-up
        # message could bypass the filter entirely.
        if not is_tax_related(request.message):
            return {
                "session_id": session_id,
                "status": "done",
                "reply": NON_TAX_RESPONSE,
                "tax_result": None,
            }

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
