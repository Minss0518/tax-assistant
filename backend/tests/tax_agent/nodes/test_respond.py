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


async def test_respond_node_grounds_prompt_in_user_query_and_retrieved_docs():
    # I4: without this, respond_node never saw retrieved_docs or user_query,
    # so cited legal basis could only ever be the hardcoded constants from
    # tax_calculator.py, never anything actually retrieved for this question.
    state = {
        "user_query": "프리랜서 사업소득 필요경비는 어떻게 계산하나요?",
        "income_types": ["사업소득"], "income_data": {},
        "missing_info": [], "search_queries": [],
        "retrieved_docs": [
            {"source": "income_tax_law.pdf", "content": "필요경비는 실제 지출 증빙에 근거하여 산정한다.", "score": 0.9},
        ],
        "deductions": [{"name": "필요경비", "amount": 20_000_000, "basis": "소득세법 제27조"}],
        "tax_result": {"final_tax": 5000, "local_tax": 500, "total_tax": 5500},
        "verified": True, "verification_notes": "", "retry_count": 0, "final_answer": "",
    }
    fake_response = MagicMock()
    fake_response.choices = [MagicMock(message=MagicMock(content="답변"))]
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_response)

    with patch("app.tax_agent.nodes.respond.AsyncOpenAI", return_value=fake_client):
        await respond_node(state)

    call_kwargs = fake_client.chat.completions.create.call_args.kwargs
    user_message = next(m["content"] for m in call_kwargs["messages"] if m["role"] == "user")
    assert "프리랜서 사업소득 필요경비는 어떻게 계산하나요?" in user_message
    assert "필요경비는 실제 지출 증빙에 근거하여 산정한다." in user_message
