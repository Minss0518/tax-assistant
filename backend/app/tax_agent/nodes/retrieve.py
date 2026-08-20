import asyncio

from app.services.rag_service import get_or_create_index, get_or_create_law_api_index, merge_with_law_api_floor
from app.tax_agent.state import TaxAgentState

_index_cache = None
_law_api_index_cache = None


def _get_cached_index():
    global _index_cache
    if _index_cache is None:
        _index_cache = get_or_create_index()
    return _index_cache


def _get_cached_law_api_index():
    global _law_api_index_cache
    if _law_api_index_cache is None:
        _law_api_index_cache = get_or_create_law_api_index()
    return _law_api_index_cache


async def _search_one(query: str) -> list[dict]:
    # get_or_create_index()/get_or_create_law_api_index()는 동기 함수라 콜드 스타트 시
    # 디스크 I/O나 전체 문서 임베딩을 블로킹으로 수행할 수 있다. retrieve_node에서
    # asyncio.gather로 이 코루틴을 병렬 실행하므로, 직접 호출하면 이벤트 루프 전체가
    # 멈춘다 — 그래서 to_thread로 스레드풀에 위임한다.
    index = await asyncio.to_thread(_get_cached_index)
    law_api_index = await asyncio.to_thread(_get_cached_law_api_index)

    retriever = index.as_retriever(similarity_top_k=5)
    law_api_retriever = law_api_index.as_retriever(similarity_top_k=5)

    nodes_result, law_api_result = await asyncio.gather(
        retriever.aretrieve(query),
        law_api_retriever.aretrieve(query),
        return_exceptions=True,
    )

    if isinstance(nodes_result, BaseException):
        nodes = []
    else:
        nodes = nodes_result

    if isinstance(law_api_result, BaseException):
        # 법령 API 컬렉션이 파이프라인 재실행으로 막 재구축된 직후라 캐시된 핸들이
        # 삭제된 컬렉션을 가리키는 경우에도, 전체 상담이 502로 실패하지 않도록
        # PDF 검색 결과만으로 계속 진행한다.
        law_api_nodes = []
    else:
        law_api_nodes = law_api_result

    merged = merge_with_law_api_floor(nodes, law_api_nodes)

    return [
        {
            "source": n.node.metadata.get("file_name", "unknown"),
            "content": n.get_content(),
            "score": n.score,
        }
        for n in merged
    ]


async def retrieve_node(state: TaxAgentState) -> dict:
    queries = list(state["search_queries"])
    verification_notes = state.get("verification_notes")
    if verification_notes:
        # This is a retry after a failed verification: searching with the
        # exact same queries again is guaranteed to fail the same way, so
        # feed the verifier's notes in as an additional query to actually
        # look for something different this time.
        queries = queries + [verification_notes]

    results_per_query = await asyncio.gather(
        *[_search_one(q) for q in queries]
    )
    new_docs = [doc for docs in results_per_query for doc in docs]
    return {"retrieved_docs": state["retrieved_docs"] + new_docs}
