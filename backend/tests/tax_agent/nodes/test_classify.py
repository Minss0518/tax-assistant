import json
from unittest.mock import AsyncMock, MagicMock, patch

from app.tax_agent.nodes.classify import classify_node


async def test_classify_node_produces_search_queries_per_income_type():
    state = {
        "user_query": "", "income_types": ["근로소득", "사업소득"], "income_data": {},
        "missing_info": [], "search_queries": [], "retrieved_docs": [], "deductions": [],
        "tax_result": None, "verified": False, "verification_notes": "", "retry_count": 0,
        "final_answer": "",
    }
    fake_response = MagicMock()
    fake_response.choices = [MagicMock(message=MagicMock(content=json.dumps({
        "search_queries": ["근로소득공제 소득세법", "사업소득 필요경비 소득세법"],
    }, ensure_ascii=False)))]
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_response)

    with patch("app.tax_agent.nodes.classify.AsyncOpenAI", return_value=fake_client):
        result = await classify_node(state)

    assert len(result["search_queries"]) == 2
    assert "근로소득공제 소득세법" in result["search_queries"]
