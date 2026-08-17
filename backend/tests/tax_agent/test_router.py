from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from langgraph.checkpoint.memory import InMemorySaver

from app.core.dependencies import get_current_user
from app.routers.tax_agent import router as tax_agent_router
from app.tax_agent import graph as graph_module


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(graph_module, "guard_node", AsyncMock(return_value={}))

    call_count = {"n": 0}

    async def fake_intake(state):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return {"missing_info": ["근로소득 금액"]}
        return {"missing_info": []}

    monkeypatch.setattr(graph_module, "intake_node", fake_intake)

    async def fake_clarify(state):
        from langgraph.types import interrupt
        interrupt({"question": "근로소득이 얼마인가요?"})
        return {"income_data": {"근로소득": {"gross": 30_000_000}}}

    monkeypatch.setattr(graph_module, "clarify_node", fake_clarify)
    monkeypatch.setattr(graph_module, "classify_node", AsyncMock(return_value={"search_queries": []}))
    monkeypatch.setattr(graph_module, "retrieve_node", AsyncMock(return_value={"retrieved_docs": []}))
    monkeypatch.setattr(graph_module, "calculate_node", AsyncMock(return_value={"tax_result": {"final_tax": 1000}, "deductions": []}))
    monkeypatch.setattr(graph_module, "verify_node", AsyncMock(return_value={"verified": True, "verification_notes": "", "retry_count": 0}))
    monkeypatch.setattr(graph_module, "respond_node", AsyncMock(return_value={"final_answer": "완료된 답변"}))

    app = FastAPI()
    app.include_router(tax_agent_router)
    app.state.tax_agent_graph = graph_module.build_graph(InMemorySaver())
    app.dependency_overrides[get_current_user] = lambda: {"sub": "00000000-0000-0000-0000-000000000000"}

    with TestClient(app) as test_client:
        yield test_client


def test_consult_flow_needs_input_then_done(client):
    first = client.post("/tax-agent/consult", json={"message": "종합소득세 계산해줘"})
    assert first.status_code == 200
    first_body = first.json()
    assert first_body["status"] == "needs_input"
    session_id = first_body["session_id"]
    assert session_id

    second = client.post("/tax-agent/consult", json={"message": "3천만원이요", "session_id": session_id})
    assert second.status_code == 200
    second_body = second.json()
    assert second_body["status"] == "done"
    assert second_body["reply"] == "완료된 답변"
    assert second_body["session_id"] == session_id
    assert second_body["tax_result"] == {"final_tax": 1000}
