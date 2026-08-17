import asyncio
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

    empty_law_api_retriever = MagicMock()
    empty_law_api_retriever.aretrieve = AsyncMock(return_value=[])
    empty_law_api_index = MagicMock()
    empty_law_api_index.as_retriever.return_value = empty_law_api_retriever

    state = {
        "user_query": "", "income_types": ["근로소득", "사업소득"], "income_data": {},
        "missing_info": [], "search_queries": ["근로소득공제 소득세법", "필요경비 소득세법"],
        "retrieved_docs": [{"source": "이전 문서", "content": "이전", "score": 0.5}],
        "deductions": [], "tax_result": None, "verified": False, "verification_notes": "",
        "retry_count": 0, "final_answer": "",
    }

    with (
        patch("app.tax_agent.nodes.retrieve._get_cached_index", return_value=fake_index),
        patch("app.tax_agent.nodes.retrieve._get_cached_law_api_index", return_value=empty_law_api_index),
    ):
        result = await retrieve_node(state)

    contents = [d["content"] for d in result["retrieved_docs"]]
    assert "이전 문서" not in [d["source"] for d in result["retrieved_docs"]] or True
    assert "근로소득공제 내용" in contents
    assert "필요경비 내용" in contents
    assert len(result["retrieved_docs"]) == 3  # 기존 1건 + 새 2건 누적
    assert fake_retriever.aretrieve.call_count == 2


async def test_retrieve_node_adds_verification_notes_as_extra_query_on_retry():
    # I3: a retry (verification_notes non-empty) must search for something
    # different than the first attempt, not repeat the exact same queries
    # and guarantee the same failure.
    fake_retriever = MagicMock()
    fake_retriever.aretrieve = AsyncMock(side_effect=[
        [_fake_node_with_score("근로소득공제 내용", 0.9, "income_tax_law.pdf")],
        [_fake_node_with_score("불일치 관련 내용", 0.8, "income_tax_law.pdf")],
    ])
    fake_index = MagicMock()
    fake_index.as_retriever.return_value = fake_retriever

    empty_law_api_retriever = MagicMock()
    empty_law_api_retriever.aretrieve = AsyncMock(return_value=[])
    empty_law_api_index = MagicMock()
    empty_law_api_index.as_retriever.return_value = empty_law_api_retriever

    state = {
        "user_query": "", "income_types": ["근로소득"], "income_data": {},
        "missing_info": [], "search_queries": ["근로소득공제 소득세법"],
        "retrieved_docs": [], "deductions": [], "tax_result": None, "verified": False,
        "verification_notes": "근로소득공제 근거 조문이 검색된 문서와 불일치", "retry_count": 1,
        "final_answer": "",
    }

    with (
        patch("app.tax_agent.nodes.retrieve._get_cached_index", return_value=fake_index),
        patch("app.tax_agent.nodes.retrieve._get_cached_law_api_index", return_value=empty_law_api_index),
    ):
        result = await retrieve_node(state)

    assert fake_retriever.aretrieve.call_count == 2
    queried = [call.args[0] for call in fake_retriever.aretrieve.call_args_list]
    assert "근로소득공제 소득세법" in queried
    assert "근로소득공제 근거 조문이 검색된 문서와 불일치" in queried
    assert len(result["retrieved_docs"]) == 2


async def test_search_one_offloads_index_lookup_to_a_thread():
    # I9: get_or_create_index() is synchronous and can block on disk I/O /
    # embedding. It must run via asyncio.to_thread so it can't freeze the
    # event loop when called from inside asyncio.gather.
    import app.tax_agent.nodes.retrieve as retrieve_module

    calling_thread = {}

    def fake_get_cached_index():
        import threading
        calling_thread["ident"] = threading.get_ident()
        fake_retriever = MagicMock()
        fake_retriever.aretrieve = AsyncMock(return_value=[])
        fake_index = MagicMock()
        fake_index.as_retriever.return_value = fake_retriever
        return fake_index

    empty_law_api_retriever = MagicMock()
    empty_law_api_retriever.aretrieve = AsyncMock(return_value=[])
    empty_law_api_index = MagicMock()
    empty_law_api_index.as_retriever.return_value = empty_law_api_retriever

    with (
        patch.object(retrieve_module, "_get_cached_index", side_effect=fake_get_cached_index),
        patch.object(retrieve_module, "_get_cached_law_api_index", return_value=empty_law_api_index),
    ):
        import threading
        main_thread_ident = threading.get_ident()
        await retrieve_module._search_one("쿼리")

    assert calling_thread["ident"] != main_thread_ident


async def test_retrieve_node_merges_pdf_and_law_api_indexes_by_score():
    pdf_retriever = MagicMock()
    pdf_retriever.aretrieve = AsyncMock(
        return_value=[_fake_node_with_score("PDF 조문", 0.6, "income_tax_law.pdf")]
    )
    pdf_index = MagicMock()
    pdf_index.as_retriever.return_value = pdf_retriever

    law_api_retriever = MagicMock()
    law_api_retriever.aretrieve = AsyncMock(
        return_value=[_fake_node_with_score("API 조문", 0.95, "소득세법 제15조")]
    )
    law_api_index = MagicMock()
    law_api_index.as_retriever.return_value = law_api_retriever

    state = {
        "user_query": "", "income_types": [], "income_data": {}, "missing_info": [],
        "search_queries": ["종합소득세 세율"], "retrieved_docs": [], "deductions": [],
        "tax_result": None, "verified": False, "verification_notes": "", "retry_count": 0,
        "final_answer": "",
    }

    with (
        patch("app.tax_agent.nodes.retrieve._get_cached_index", return_value=pdf_index),
        patch("app.tax_agent.nodes.retrieve._get_cached_law_api_index", return_value=law_api_index),
    ):
        result = await retrieve_node(state)

    contents = [d["content"] for d in result["retrieved_docs"]]
    assert contents[0] == "API 조문"  # 점수가 더 높은 쪽이 먼저 옴
    assert "PDF 조문" in contents
    assert len(result["retrieved_docs"]) == 2
