"""국가법령정보 Open API(law.go.kr) 호출 래퍼.

lawSearch.do(목록조회)와 lawService.do(본문조회)를 감싼다. 이 모듈에 나오는 필드명·
파라미터명·응답 구조는 전부 실제 API를 호출해서 확인한 것이다
(docs/superpowers/specs/2026-08-18-tax-law-api-pipeline-design.md 참고).

law/prec/expc 세 target은 응답 스키마가 서로 다르므로(래핑 키, 상세조회 파라미터명 모두
다름) target별로 분리해서 처리한다.
"""

import time
from typing import Any

import httpx

BASE_URL = "https://www.law.go.kr/DRF/"
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = (1, 2, 4)

_SEARCH_WRAPPER_KEY = {"law": "LawSearch", "prec": "PrecSearch", "expc": "Expc"}
_FETCH_WRAPPER_KEY = {"law": "법령", "prec": "PrecService", "expc": "ExpcService"}
_FETCH_ID_PARAM = {"law": "MST", "prec": "ID", "expc": "ID"}


def _coerce_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _get_with_retry(endpoint: str, params: dict) -> dict:
    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(BASE_URL + endpoint, params=params, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            last_exc = exc
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF_SECONDS[attempt])
    raise last_exc


def search(target: str, query: str, oc: str, display: int = 100) -> list[dict]:
    wrapper_key = _SEARCH_WRAPPER_KEY[target]
    results: list[dict] = []
    page = 1
    total_cnt = None

    while total_cnt is None or len(results) < total_cnt:
        data = _get_with_retry(
            "lawSearch.do",
            {
                "OC": oc,
                "target": target,
                "type": "JSON",
                "query": query,
                "display": display,
                "page": page,
            },
        )
        section = data.get(wrapper_key, {})
        total_cnt = int(section.get("totalCnt", 0))
        page_items = _coerce_list(section.get(target))
        if not page_items:
            break
        results.extend(page_items)
        page += 1

    return results


def _fetch(target: str, item_id: str, oc: str) -> dict | None:
    id_param = _FETCH_ID_PARAM[target]
    data = _get_with_retry(
        "lawService.do",
        {"OC": oc, "target": target, id_param: item_id, "type": "JSON"},
    )
    return data.get(_FETCH_WRAPPER_KEY[target])


def fetch_law(mst: str, oc: str) -> dict | None:
    return _fetch("law", mst, oc)


def fetch_prec(prec_id: str, oc: str) -> dict | None:
    return _fetch("prec", prec_id, oc)


def fetch_expc(expc_id: str, oc: str) -> dict | None:
    return _fetch("expc", expc_id, oc)
