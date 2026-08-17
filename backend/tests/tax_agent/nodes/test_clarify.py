import json
from unittest.mock import AsyncMock, MagicMock, patch

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command

from app.tax_agent.nodes.clarify import clarify_node
from app.tax_agent.state import TaxAgentState


def _build_single_node_graph():
    builder = StateGraph(TaxAgentState)
    builder.add_node("clarify", clarify_node)
    builder.add_edge(START, "clarify")
    builder.add_edge("clarify", END)
    return builder.compile(checkpointer=InMemorySaver())


def _initial_state():
    return {
        "user_query": "", "income_types": ["사업소득"], "income_data": {},
        "missing_info": ["사업소득 필요경비"], "search_queries": [], "retrieved_docs": [],
        "deductions": [], "tax_result": None, "verified": False, "verification_notes": "",
        "retry_count": 0, "final_answer": "",
    }


async def test_clarify_node_interrupts_and_resumes_with_merged_income_data():
    fake_response = MagicMock()
    fake_response.choices = [MagicMock(message=MagicMock(content=json.dumps({
        "income_data": {"사업소득": {"gross": 50_000_000, "expense": 20_000_000}},
    }, ensure_ascii=False)))]
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_response)

    graph = _build_single_node_graph()
    config = {"configurable": {"thread_id": "clarify-test"}}

    with patch("app.tax_agent.nodes.clarify.AsyncOpenAI", return_value=fake_client):
        interrupted = await graph.ainvoke(_initial_state(), config)
        assert "__interrupt__" in interrupted

        resumed = await graph.ainvoke(Command(resume="필요경비는 2천만원이에요"), config)

    assert resumed["income_data"]["사업소득"]["expense"] == 20_000_000
    assert resumed["income_data"]["사업소득"]["gross"] == 50_000_000
