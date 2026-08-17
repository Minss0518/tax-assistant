from unittest.mock import AsyncMock

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from app.tax_agent import graph as graph_module


def _base_state(**overrides) -> dict:
    state = {
        "user_query": "종합소득세 계산해줘", "income_types": [], "income_data": {},
        "missing_info": [], "search_queries": [], "retrieved_docs": [], "deductions": [],
        "tax_result": None, "verified": False, "verification_notes": "", "retry_count": 0,
        "final_answer": "",
    }
    state.update(overrides)
    return state


async def test_guard_rejection_short_circuits_before_intake(monkeypatch):
    monkeypatch.setattr(graph_module, "guard_node", AsyncMock(return_value={"final_answer": "세무 질문만 답변합니다"}))
    monkeypatch.setattr(graph_module, "intake_node", AsyncMock(side_effect=AssertionError("intake는 호출되면 안 됨")))

    graph = graph_module.build_graph(InMemorySaver())
    result = await graph.ainvoke(_base_state(), {"configurable": {"thread_id": "guard-test"}})

    assert result["final_answer"] == "세무 질문만 답변합니다"


async def test_verify_retry_loop_stops_at_max_retry(monkeypatch):
    monkeypatch.setattr(graph_module, "guard_node", AsyncMock(return_value={}))
    monkeypatch.setattr(graph_module, "intake_node", AsyncMock(return_value={
        "missing_info": [], "income_data": {"근로소득": {"gross": 30_000_000}},
    }))
    monkeypatch.setattr(graph_module, "classify_node", AsyncMock(return_value={"search_queries": ["q"]}))
    monkeypatch.setattr(graph_module, "retrieve_node", AsyncMock(return_value={"retrieved_docs": []}))
    monkeypatch.setattr(graph_module, "calculate_node", AsyncMock(return_value={"tax_result": {}, "deductions": []}))

    call_count = {"n": 0}

    async def fake_verify(state):
        call_count["n"] += 1
        return {"verified": False, "verification_notes": "불일치", "retry_count": state["retry_count"] + 1}

    monkeypatch.setattr(graph_module, "verify_node", fake_verify)
    monkeypatch.setattr(graph_module, "respond_node", AsyncMock(return_value={"final_answer": "확인 필요 안내 포함 답변"}))

    graph = graph_module.build_graph(InMemorySaver())
    result = await graph.ainvoke(
        _base_state(),
        {"configurable": {"thread_id": "retry-test"}, "recursion_limit": 25},
    )

    assert call_count["n"] == graph_module.MAX_RETRY
    assert result["final_answer"] == "확인 필요 안내 포함 답변"


async def test_clarify_interrupt_then_resume_reaches_respond(monkeypatch):
    from langgraph.types import interrupt

    monkeypatch.setattr(graph_module, "guard_node", AsyncMock(return_value={}))

    intake_calls = {"n": 0}

    async def fake_intake(state):
        intake_calls["n"] += 1
        if intake_calls["n"] == 1:
            return {"missing_info": ["근로소득 금액"]}
        return {"missing_info": []}

    monkeypatch.setattr(graph_module, "intake_node", fake_intake)

    async def fake_clarify(state):
        interrupt({"question": "근로소득이 얼마인가요?"})
        return {"income_data": {"근로소득": {"gross": 30_000_000}}}

    monkeypatch.setattr(graph_module, "clarify_node", fake_clarify)
    monkeypatch.setattr(graph_module, "classify_node", AsyncMock(return_value={"search_queries": []}))
    monkeypatch.setattr(graph_module, "retrieve_node", AsyncMock(return_value={"retrieved_docs": []}))
    monkeypatch.setattr(graph_module, "calculate_node", AsyncMock(return_value={"tax_result": {}, "deductions": []}))
    monkeypatch.setattr(graph_module, "verify_node", AsyncMock(return_value={"verified": True, "verification_notes": "", "retry_count": 0}))
    monkeypatch.setattr(graph_module, "respond_node", AsyncMock(return_value={"final_answer": "완료"}))

    graph = graph_module.build_graph(InMemorySaver())
    config = {"configurable": {"thread_id": "clarify-test"}}

    interrupted = await graph.ainvoke(_base_state(), config)
    assert "__interrupt__" in interrupted

    resumed = await graph.ainvoke(Command(resume="3천만원이요"), config)
    assert resumed["final_answer"] == "완료"


async def test_route_after_intake_clarifies_when_income_data_empty_even_if_missing_info_empty(monkeypatch):
    # Regression guard for C2: an LLM response with income_data == {} and
    # missing_info == [] must NOT fall through to classify/calculate/respond
    # (which would silently produce a confident "0원" answer). It must be
    # routed to clarify instead.
    monkeypatch.setattr(graph_module, "guard_node", AsyncMock(return_value={}))
    monkeypatch.setattr(graph_module, "intake_node", AsyncMock(return_value={
        "income_types": [], "income_data": {}, "missing_info": [],
    }))
    monkeypatch.setattr(graph_module, "classify_node", AsyncMock(side_effect=AssertionError("classify는 호출되면 안 됨")))
    monkeypatch.setattr(graph_module, "retrieve_node", AsyncMock(side_effect=AssertionError("retrieve는 호출되면 안 됨")))
    monkeypatch.setattr(graph_module, "calculate_node", AsyncMock(side_effect=AssertionError("calculate는 호출되면 안 됨")))
    monkeypatch.setattr(graph_module, "verify_node", AsyncMock(side_effect=AssertionError("verify는 호출되면 안 됨")))
    monkeypatch.setattr(graph_module, "respond_node", AsyncMock(side_effect=AssertionError("respond는 호출되면 안 됨")))

    graph = graph_module.build_graph(InMemorySaver())
    result = await graph.ainvoke(
        _base_state(), {"configurable": {"thread_id": "empty-income-test"}}
    )

    assert "__interrupt__" in result
    assert result.get("final_answer", "") == ""
