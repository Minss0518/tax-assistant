import json
from unittest.mock import AsyncMock, MagicMock, patch

from app.tax_agent.nodes.verify import verify_node


def _state(retry_count: int) -> dict:
    return {
        "user_query": "", "income_types": ["근로소득"], "income_data": {},
        "missing_info": [], "search_queries": [],
        "retrieved_docs": [{"source": "income_tax_law.pdf", "content": "근로소득공제는...", "score": 0.9}],
        "deductions": [{"name": "근로소득공제", "amount": 1000, "basis": "소득세법 제47조"}],
        "tax_result": {"final_tax": 1000}, "verified": False, "verification_notes": "",
        "retry_count": retry_count, "final_answer": "",
    }


def _fake_client(verified: bool, notes: str):
    fake_response = MagicMock()
    fake_response.choices = [MagicMock(message=MagicMock(content=json.dumps({
        "verified": verified, "notes": notes,
    }, ensure_ascii=False)))]
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_response)
    return fake_client


async def test_verify_node_pass_keeps_retry_count():
    fake_client = _fake_client(True, "")
    with patch("app.tax_agent.nodes.verify.get_openai_client", return_value=fake_client):
        result = await verify_node(_state(retry_count=0))

    assert result["verified"] is True
    assert result["retry_count"] == 0


async def test_verify_node_fail_increments_retry_count():
    fake_client = _fake_client(False, "공제 근거 불일치")
    with patch("app.tax_agent.nodes.verify.get_openai_client", return_value=fake_client):
        result = await verify_node(_state(retry_count=1))

    assert result["verified"] is False
    assert result["verification_notes"] == "공제 근거 불일치"
    assert result["retry_count"] == 2
