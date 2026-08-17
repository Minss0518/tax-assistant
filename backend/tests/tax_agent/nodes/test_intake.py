import json
from unittest.mock import AsyncMock, MagicMock, patch

from app.tax_agent.nodes.intake import intake_node


def _fake_openai_client(content: dict):
    fake_response = MagicMock()
    fake_response.choices = [MagicMock(message=MagicMock(content=json.dumps(content, ensure_ascii=False)))]
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_response)
    return fake_client


async def test_intake_node_extracts_income_and_reports_missing_info():
    state = {
        "user_query": "작년에 근로소득이랑 사업소득이 있었어요", "income_types": [],
        "income_data": {}, "missing_info": [], "search_queries": [], "retrieved_docs": [],
        "deductions": [], "tax_result": None, "verified": False, "verification_notes": "",
        "retry_count": 0, "final_answer": "",
    }
    fake_client = _fake_openai_client({
        "income_types": ["근로소득", "사업소득"],
        "income_data": {},
        "missing_info": ["근로소득 금액", "사업소득 금액", "사업소득 필요경비"],
    })

    with patch("app.tax_agent.nodes.intake.AsyncOpenAI", return_value=fake_client):
        result = await intake_node(state)

    assert result["income_types"] == ["근로소득", "사업소득"]
    assert result["missing_info"] == ["근로소득 금액", "사업소득 금액", "사업소득 필요경비"]


async def test_intake_node_reevaluates_with_existing_income_data():
    state = {
        "user_query": "작년에 근로소득이랑 사업소득이 있었어요", "income_types": ["근로소득", "사업소득"],
        "income_data": {"근로소득": {"gross": 30_000_000}}, "missing_info": ["사업소득 금액"],
        "search_queries": [], "retrieved_docs": [], "deductions": [], "tax_result": None,
        "verified": False, "verification_notes": "", "retry_count": 0, "final_answer": "",
    }
    fake_client = _fake_openai_client({
        "income_types": ["근로소득", "사업소득"],
        "income_data": {
            "근로소득": {"gross": 30_000_000},
            "사업소득": {"gross": 50_000_000, "expense": 20_000_000},
        },
        "missing_info": [],
    })

    with patch("app.tax_agent.nodes.intake.AsyncOpenAI", return_value=fake_client):
        result = await intake_node(state)

    assert result["missing_info"] == []
    assert result["income_data"]["사업소득"]["gross"] == 50_000_000
