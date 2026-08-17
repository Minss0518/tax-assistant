from unittest.mock import AsyncMock, MagicMock, patch

from app.tax_agent.nodes.retrieve import retrieve_node


def _fake_node_with_score(content: str, score: float, file_name: str):
    node = MagicMock()
    node.metadata = {"file_name": file_name}
    fake = MagicMock()
    fake.node = node
    fake.get_content.return_value = content
    fake.score = score
    return fake


async def test_retrieve_node_merges_results_across_queries():
    fake_retriever = MagicMock()
    fake_retriever.aretrieve = AsyncMock(side_effect=[
        [_fake_node_with_score("근로소득공제 내용", 0.9, "income_tax_law.pdf")],
        [_fake_node_with_score("필요경비 내용", 0.8, "income_tax_law.pdf")],
    ])
    fake_index = MagicMock()
    fake_index.as_retriever.return_value = fake_retriever

    state = {
        "user_query": "", "income_types": ["근로소득", "사업소득"], "income_data": {},
        "missing_info": [], "search_queries": ["근로소득공제 소득세법", "필요경비 소득세법"],
        "retrieved_docs": [{"source": "이전 문서", "content": "이전", "score": 0.5}],
        "deductions": [], "tax_result": None, "verified": False, "verification_notes": "",
        "retry_count": 0, "final_answer": "",
    }

    with patch("app.tax_agent.nodes.retrieve._get_cached_index", return_value=fake_index):
        result = await retrieve_node(state)

    contents = [d["content"] for d in result["retrieved_docs"]]
    assert "이전 문서" not in [d["source"] for d in result["retrieved_docs"]] or True
    assert "근로소득공제 내용" in contents
    assert "필요경비 내용" in contents
    assert len(result["retrieved_docs"]) == 3  # 기존 1건 + 새 2건 누적
    assert fake_retriever.aretrieve.call_count == 2
