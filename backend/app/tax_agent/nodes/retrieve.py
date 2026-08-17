import asyncio

from app.services.rag_service import get_or_create_index
from app.tax_agent.state import TaxAgentState

_index_cache = None


def _get_cached_index():
    global _index_cache
    if _index_cache is None:
        _index_cache = get_or_create_index()
    return _index_cache


async def _search_one(query: str) -> list[dict]:
    index = _get_cached_index()
    retriever = index.as_retriever(similarity_top_k=5)
    nodes = await retriever.aretrieve(query)
    return [
        {
            "source": n.node.metadata.get("file_name", "unknown"),
            "content": n.get_content(),
            "score": n.score,
        }
        for n in nodes
    ]


async def retrieve_node(state: TaxAgentState) -> dict:
    results_per_query = await asyncio.gather(
        *[_search_one(q) for q in state["search_queries"]]
    )
    new_docs = [doc for docs in results_per_query for doc in docs]
    return {"retrieved_docs": state["retrieved_docs"] + new_docs}
