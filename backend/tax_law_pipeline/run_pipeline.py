"""전체 파이프라인 진입점: 검색 -> 본문조회 -> 필터링 -> 청크화 -> 인덱싱.

사용법: cd backend && .venv/Scripts/python.exe -m tax_law_pipeline.run_pipeline
(LAW_API_OC는 backend/.env에서 읽는다)

판례(prec) 검색 결과만 1000건이 넘는다. 문서 추가를 작은 배치로 나누고
(index_chunks_batch), VectorStoreIndex 대신 ChromaVectorStore에 직접 쓰는
저수준 경로로 바꿔도(chunk_and_index.py 참고) Render 512MB 무료 인스턴스에서
여전히 OOM이 재현됐다 — ChromaDB 자체가 컬렉션에 추가된 벡터의 검색 인덱스를
프로세스 메모리에 계속 들고 있어서, "한 번 실행에서 이 컬렉션에 총 몇 건을
넣었는가"에 비례해 메모리가 계속 쌓이는 구조이기 때문이다. 이건 인덱싱을 어떻게
배치로 나누든 피할 수 없다.

그래서 배치 처리에 더해 한 실행당 인덱싱하는 총량 자체를 MAX_PREC_ITEMS로
제한한다. 판례 API 검색 결과가 관련도순으로 오는 것으로 보이므로, 상위
MAX_PREC_ITEMS건만 사용해도 RAG 검색 품질에 큰 손해는 없을 것으로 판단했다.
"""

import time

from app.config import settings
from tax_law_pipeline import law_api_client
from tax_law_pipeline.chunk_and_index import (
    build_expc_chunks,
    build_law_chunks,
    build_prec_chunks,
    index_chunks_batch,
    reset_law_api_collection,
)
from tax_law_pipeline.filter_articles import filter_comprehensive_income_articles

FETCH_SLEEP_SECONDS = 0.15
INDEX_BATCH_SIZE = 20
MAX_PREC_ITEMS = 300
MAX_EXPC_ITEMS = 300
PROGRESS_LOG_EVERY = 50


def run() -> dict:
    oc = settings.LAW_API_OC
    if not oc:
        raise RuntimeError("LAW_API_OC가 설정되지 않았습니다. backend/.env를 확인하세요.")

    law_search_results = law_api_client.search("law", "소득세법", oc)
    law_result = next(
        (r for r in law_search_results if r.get("법령구분명") == "법률"),
        law_search_results[0] if law_search_results else None,
    )
    if law_result is None:
        raise RuntimeError("소득세법 검색 결과가 없습니다.")

    mst = law_result["법령일련번호"]
    law_name = law_result["법령명한글"]

    law_detail = law_api_client.fetch_law(mst, oc)
    time.sleep(FETCH_SLEEP_SECONDS)
    articles = filter_comprehensive_income_articles(law_detail)
    law_chunks = build_law_chunks(articles, law_name)

    # 컬렉션 삭제/재생성은 파이프라인 실행당 한 번만 한다. 이후 문서 추가는
    # index_chunks_batch()로 작은 배치씩 흘려보낸다.
    vector_store = reset_law_api_collection()
    index_chunks_batch(vector_store, law_chunks)

    total_chunks = len(law_chunks)

    prec_search_results_all = law_api_client.search("prec", "종합소득세", oc)
    prec_search_results = prec_search_results_all[:MAX_PREC_ITEMS]
    prec_count = 0
    batch: list[dict] = []
    for item in prec_search_results:
        prec_id = item.get("판례일련번호")
        if not prec_id:
            continue
        try:
            detail = law_api_client.fetch_prec(prec_id, oc)
        except Exception:
            # fetch_prec은 이미 내부적으로 3회 재시도한다 — 그래도 실패하면
            # (네트워크 순단 등) 이 한 건만 건너뛰고 나머지 항목들은 계속
            # 진행한다.
            continue
        time.sleep(FETCH_SLEEP_SECONDS)
        if detail is None:
            continue
        prec_count += 1
        batch.extend(build_prec_chunks([detail]))
        if len(batch) >= INDEX_BATCH_SIZE:
            index_chunks_batch(vector_store, batch)
            total_chunks += len(batch)
            batch = []
        if prec_count % PROGRESS_LOG_EVERY == 0:
            print(f"[law-pipeline] 진행중: 판례 {prec_count}/{len(prec_search_results)}건 처리")
    if batch:
        index_chunks_batch(vector_store, batch)
        total_chunks += len(batch)
        batch = []

    expc_search_results = law_api_client.search("expc", "종합소득세", oc)[:MAX_EXPC_ITEMS]
    expc_count = 0
    for item in expc_search_results:
        expc_id = item.get("법령해석례일련번호")
        if not expc_id:
            continue
        try:
            detail = law_api_client.fetch_expc(expc_id, oc)
        except Exception:
            # 위 prec 루프와 동일한 이유로, 재시도 후에도 실패한 건 하나 때문에
            # 전체 실행이 중단되지 않도록 건너뛴다.
            continue
        time.sleep(FETCH_SLEEP_SECONDS)
        if detail is None:
            continue
        expc_count += 1
        batch.extend(build_expc_chunks([detail]))
        if len(batch) >= INDEX_BATCH_SIZE:
            index_chunks_batch(vector_store, batch)
            total_chunks += len(batch)
            batch = []
    if batch:
        index_chunks_batch(vector_store, batch)
        total_chunks += len(batch)

    return {
        "law_articles": len(articles),
        "prec_cases": prec_count,
        "prec_cases_available": len(prec_search_results_all),
        "expc_cases": expc_count,
        "total_chunks": total_chunks,
    }


if __name__ == "__main__":
    result = run()
    print(f"인덱싱 완료: {result}")
