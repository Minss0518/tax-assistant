from unittest.mock import AsyncMock, MagicMock, patch

from app.tax_agent.nodes.respond import respond_node


async def test_respond_node_returns_final_answer_text():
    state = {
        "user_query": "", "income_types": ["근로소득"], "income_data": {},
        "missing_info": [], "search_queries": [], "retrieved_docs": [],
        "deductions": [{"name": "근로소득공제", "amount": 1000, "basis": "소득세법 제47조"}],
        "tax_result": {"final_tax": 5000, "local_tax": 500, "total_tax": 5500},
        "verified": True, "verification_notes": "", "retry_count": 0, "final_answer": "",
    }
    fake_response = MagicMock()
    fake_response.choices = [MagicMock(message=MagicMock(content="결정세액은 5,000원입니다."))]
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_response)

    with patch("app.tax_agent.nodes.respond.AsyncOpenAI", return_value=fake_client):
        result = await respond_node(state)

    assert result["final_answer"] == "결정세액은 5,000원입니다."
