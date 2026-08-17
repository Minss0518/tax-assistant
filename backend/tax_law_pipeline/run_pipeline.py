"""전체 파이프라인 진입점: 검색 -> 본문조회 -> 필터링 -> 청크화 -> 인덱싱.

사용법: cd backend && .venv/Scripts/python.exe -m tax_law_pipeline.run_pipeline
(LAW_API_OC는 backend/.env에서 읽는다)
"""

import time

from app.config import settings
from tax_law_pipeline import law_api_client
from tax_law_pipeline.chunk_and_index import (
    build_expc_chunks,
    build_law_chunks,
    build_prec_chunks,
    rebuild_law_api_collection,
)
from tax_law_pipeline.filter_articles import filter_comprehensive_income_articles

FETCH_SLEEP_SECONDS = 0.15


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

    prec_search_results = law_api_client.search("prec", "종합소득세", oc)
    prec_details = []
    for item in prec_search_results:
        prec_id = item.get("판례일련번호")
        if not prec_id:
            continue
        detail = law_api_client.fetch_prec(prec_id, oc)
        time.sleep(FETCH_SLEEP_SECONDS)
        if detail is not None:
            prec_details.append(detail)

    expc_search_results = law_api_client.search("expc", "종합소득세", oc)
    expc_details = []
    for item in expc_search_results:
        expc_id = item.get("법령해석례일련번호")
        if not expc_id:
            continue
        detail = law_api_client.fetch_expc(expc_id, oc)
        time.sleep(FETCH_SLEEP_SECONDS)
        if detail is not None:
            expc_details.append(detail)

    chunks = (
        build_law_chunks(articles, law_name)
        + build_prec_chunks(prec_details)
        + build_expc_chunks(expc_details)
    )

    rebuild_law_api_collection(chunks)

    return {
        "law_articles": len(articles),
        "prec_cases": len(prec_details),
        "expc_cases": len(expc_details),
        "total_chunks": len(chunks),
    }


if __name__ == "__main__":
    result = run()
    print(f"인덱싱 완료: {result}")
