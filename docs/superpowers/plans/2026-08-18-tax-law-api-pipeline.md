# 국가법령정보 API 연동 데이터 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 법제처 국가법령정보 Open API에서 종합소득세 관련 법령/판례/법령해석례를 가져와
별도 ChromaDB 컬렉션에 인덱싱하는 배치 파이프라인을 구축하고, 기존 RAG 검색(구
`/chat`과 신규 LangGraph 에이전트) 두 곳 모두 새 컬렉션을 함께 검색하도록 연결한다.

**Architecture:** `backend/tax_law_pipeline/` 아래 독립 실행 스크립트로 구현. 검색
(`lawSearch.do`, 페이지네이션) → 본문조회(`lawService.do`, target별 파서) → 필터링 →
정제 → 청크화 → 컬렉션 전체 삭제 후 재구축 순서. LlamaIndex/ChromaDB 자체는 기존 코드
그대로 재사용.

**Tech Stack:** httpx(API 호출), LlamaIndex(`Document`, `VectorStoreIndex`,
`SentenceSplitter`), ChromaDB, pytest + pytest-asyncio(기존 인프라 재사용).

**설계 문서:** [docs/superpowers/specs/2026-08-18-tax-law-api-pipeline-design.md](../specs/2026-08-18-tax-law-api-pipeline-design.md)

## Global Constraints — 실제 API 호출로 검증된 사실 (2026-08-18, `OC` 인증키로 직접 확인)

이 섹션의 필드명/파라미터명/응답 구조는 전부 실제 `https://www.law.go.kr/DRF/`를
호출해서 확인한 것이다. 추측이 아니다.

- **검색(`lawSearch.do`) 최상위 래핑 키가 target마다 다르다**: `law` → `LawSearch`,
  `prec` → `PrecSearch`, `expc` → `Expc` (`ExpcSearch`가 아님). 결과 리스트를 담는
  내부 키는 셋 다 `target` 값 자체와 같다 (`LawSearch.law`, `PrecSearch.prec`,
  `Expc.expc`).
- **검색 결과가 1건이면 리스트가 아니라 dict로 온다.** `totalCnt`가 1일 때 위 내부 키의
  값이 리스트가 아니라 단일 dict. 모든 파싱 코드는
  `[x] if isinstance(x, dict) else x`로 항상 리스트로 강제 변환해야 한다.
- **상세조회(`lawService.do`) 파라미터명이 target마다 다르다**: `law`는 `MST`,
  `prec`/`expc`는 `MST`가 아니라 **`ID`**.
- **상세조회 응답 최상위 키**: `law` → `법령`, `prec` → `PrecService`, `expc` →
  `ExpcService`. 실패 시(예: 해당 판례가 JSON 상세조회를 지원하지 않는 경우)
  `{"Law": "일치하는 판례가 없습니다. 판례명을 확인하여 주십시오."}`처럼 기대한 키가
  아예 없는 형태로 온다 — `dict.get(기대키)`로 접근하면 자연스럽게 `None`이 되므로
  이 패턴을 그대로 실패 감지에 쓴다 (별도 예외 처리 불필요).
- **`law` 상세조회 — `조문.조문단위` 배열의 원소는 두 종류가 섞여 있다:**
  - 장/절 제목: `조문여부: '전문'`. 필드는 `조문번호`, `조문시행일자`, `조문변경여부`,
    `조문이동이전`, `조문키`, `조문내용`, `조문이동이후`, `조문여부`뿐 (`조문제목` 없음).
  - 실제 조문: `조문여부: '조문'`. 위 필드에 더해 `조문참고자료`, `항`, `조문제목`이
    추가로 있음. `조문내용`은 `"제15조(세액 계산의 순서) 거주자의 종합소득 및..."`처럼
    조번호·제목이 이미 포함된 완결된 문장.
  - 필터링은 반드시 `조문여부 == '조문'`인 것만 대상으로 한다.
- **`prec` 상세조회 필드**: `판시사항`, `참조판례`, `사건종류명`, `판결요지`, `참조조문`,
  `선고일자`, `법원명`, `사건명`, `판례내용`, `사건번호`, `사건종류코드`,
  `판례정보일련번호`, `선고`, `판결유형`, `법원종류코드`. `판시사항`/`판결요지`에
  `<br/>` 같은 HTML 태그가 실제로 섞여 있다.
- **`expc` 상세조회 필드**: `해석기관코드`, `안건번호`, `이유`, `해석기관명`,
  `관리기관코드`, `해석일자`, `안건명`, `질의요지`, `법령해석례일련번호`, `질의기관명`,
  `질의기관코드`, `등록일시`, `회답`. 단일 "본문" 필드는 없음 — `질의요지` + `회답` +
  `이유`가 실질 콘텐츠.
- **재실행 전략은 "컬렉션 전체 삭제 후 재구축"으로 확정** (upsert 아님). 매번
  `chroma_client.delete_collection(name="tax_law_api_v1")`을 시도하고(없으면 예외를
  무시), 새로 만든다.
- **메타데이터 키는 `file_name`으로 통일한다.** 기존
  `backend/app/tax_agent/nodes/retrieve.py:26`이
  `n.node.metadata.get("file_name", "unknown")`를 그대로 쓰고 있으므로, 새 데이터도
  `file_name`에 사람이 읽을 출처 문자열(`"소득세법 제15조"`, `"판례 2025두35585"`,
  `"법령해석례 11-0150"`)을 넣어 기존 코드를 수정하지 않고 호환시킨다.
- **컬렉션 분리에 따라 반드시 함께 고쳐야 하는 기존 소비처 2곳** (이 플랜의 Task 7, 8):
  `backend/app/services/rag_service.py:127`(`get_or_create_index`, 기존 `/chat`이 씀)과
  `backend/app/tax_agent/nodes/retrieve.py`(LangGraph 에이전트가 씀). 두 곳 모두 PDF
  컬렉션(`tax_documents_v2`)과 신규 컬렉션(`tax_law_api_v1`)을 각각 검색해서 점수 기준
  병합 후 상위 5개만 사용한다 (기존 `similarity_top_k=5`와 균형 — 병합 결과가 늘어나서
  프롬프트가 커지지 않도록).
- **1차 스코프**: 소득세법 본법만(시행령/시행규칙 제외), 판례/법령해석례는 검색
  키워드로만 좁히고 별도 필터링 없음, 수동 실행 스크립트까지만(cron 등 스케줄링 제외),
  `verify_node`가 새 메타데이터를 검증에 활용하도록 고치는 것도 이번 스코프 밖.
- **`OC` 인증키는 `backend/.env`의 `LAW_API_OC`에서 읽는다.** 코드에 하드코딩 금지.
  테스트에서는 실제 API를 호출하지 않고 전부 모킹한다.
- **Windows에서 pytest의 ChromaDB 관련 테스트는 `tmp_path` 픽스처를 쓴다** (`tempfile.TemporaryDirectory()`를 컨텍스트 매니저로 직접 쓰면 ChromaDB가 파일 핸들을
  잡고 있어서 Windows에서 정리 시점에 `PermissionError`가 남을 실제로 확인함 — 개발
  중 직접 재현). `tmp_path`는 pytest가 별도 시점에 정리하므로 이 문제를 피한다.

---

## Task 1: `clean_text.py` — HTML/공백 정제 유틸

**Files:**
- Create: `backend/tax_law_pipeline/__init__.py` (빈 파일)
- Create: `backend/tax_law_pipeline/clean_text.py`
- Test: `backend/tests/tax_law_pipeline/__init__.py` (빈 파일)
- Test: `backend/tests/tax_law_pipeline/test_clean_text.py`

**Interfaces:**
- Produces: `def clean_text(text: str) -> str` — HTML 태그 제거, 전각공백(`　`) →
  일반 공백, 연속 공백/개행 압축, 앞뒤 공백 제거. `None`이나 빈 문자열이 들어오면
  빈 문자열을 반환한다(예외를 던지지 않음 — 상위 파서들이 `.get(key, "")`로 넘겨줄 값을
  그대로 받아 처리해야 하므로).

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/tax_law_pipeline/test_clean_text.py`:

```python
from tax_law_pipeline.clean_text import clean_text


def test_removes_html_tags():
    assert clean_text("<br/> 소득세법 제27조 제1항, 제3항") == "소득세법 제27조 제1항, 제3항"


def test_normalizes_fullwidth_and_repeated_whitespace():
    assert clean_text("제1장   총칙　　<개정 2009.12.31>") == "제1장 총칙 <개정 2009.12.31>"


def test_strips_leading_and_trailing_whitespace():
    assert clean_text("   제15조(세액 계산의 순서)   ") == "제15조(세액 계산의 순서)"


def test_none_and_empty_input_return_empty_string():
    assert clean_text(None) == ""
    assert clean_text("") == ""


def test_real_prec_fragment_from_api():
    raw = "<br/> 소득세법 제27조 제1항, 제3항, 제33조 제1항 제13호, 소득세법 시행령 제55조 제1항 제13호"
    assert clean_text(raw) == "소득세법 제27조 제1항, 제3항, 제33조 제1항 제13호, 소득세법 시행령 제55조 제1항 제13호"
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_clean_text.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tax_law_pipeline'`

- [ ] **Step 3: 구현 작성**

`backend/tax_law_pipeline/clean_text.py`:

```python
import re

_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"[ \t　]+")
_NEWLINE_RE = re.compile(r"\n+")


def clean_text(text: str | None) -> str:
    if not text:
        return ""
    text = _TAG_RE.sub("", text)
    text = text.replace("　", " ")
    text = _WHITESPACE_RE.sub(" ", text)
    text = _NEWLINE_RE.sub(" ", text)
    return text.strip()
```

`backend/tax_law_pipeline/__init__.py`, `backend/tests/tax_law_pipeline/__init__.py`: 빈 파일.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_clean_text.py -v`
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tax_law_pipeline/ backend/tests/tax_law_pipeline/
git commit -m "feat: 국가법령정보 API 응답 정제 유틸(clean_text) 구현"
```

---

## Task 2: `law_api_client.py` — 설정 + 검색(페이지네이션/재시도)

**Files:**
- Modify: `backend/app/config.py`
- Create: `backend/tax_law_pipeline/law_api_client.py`
- Test: `backend/tests/tax_law_pipeline/test_law_api_client_search.py`

**Interfaces:**
- Produces:
  - `app.config.settings.LAW_API_OC: str` (기본값 `""`)
  - `law_api_client.BASE_URL: str`, `law_api_client.MAX_RETRIES: int = 3`
  - `def search(target: str, query: str, oc: str, display: int = 100) -> list[dict]` —
    `target`은 `"law"`/`"prec"`/`"expc"`. 전체 페이지를 순회해서 결과 항목 dict의
    리스트를 모아 반환한다 (Global Constraints의 래핑 키/단일결과 dict 처리 규칙 적용).
  - `def _get_with_retry(endpoint: str, params: dict) -> dict` (모듈 내부용, 다음
    태스크의 `fetch_law`/`fetch_prec`/`fetch_expc`가 재사용)

- [ ] **Step 1: `app/config.py`에 `LAW_API_OC` 필드 추가**

`backend/app/config.py`의 기존 내용(`backend/app/config.py:27-28`, `SUPABASE_URL`/
`SUPABASE_SERVICE_KEY` 다음 줄) 사이에 추가:

기존:
```python
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    class Config:
        env_file = ".env"
```

변경 후:
```python
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    LAW_API_OC: str = ""

    class Config:
        env_file = ".env"
```

**주의**: 반드시 기본값 `""`을 넣는다. `DATABASE_URL`/`OPENAI_API_KEY`처럼 기본값 없는
필드로 추가하면, `LAW_API_OC`가 설정 안 된 다른 모든 배포 환경에서 `Settings()`
인스턴스화 자체가 실패해 앱 전체가 부팅하지 못한다 (`config.py`는 거의 모든 모듈이
임포트한다).

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/tests/tax_law_pipeline/test_law_api_client_search.py`:

```python
from unittest.mock import MagicMock, patch

import httpx

from tax_law_pipeline import law_api_client


def _fake_response(json_body: dict, status_code: int = 200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_body
    resp.raise_for_status = MagicMock()
    return resp


def test_search_law_single_result_becomes_list():
    # 실제 API 검증: totalCnt=1일 때 law 필드가 리스트가 아니라 dict로 옴
    body = {
        "LawSearch": {
            "totalCnt": "1",
            "law": {"법령일련번호": "280405", "법령명한글": "소득세법", "법령구분명": "법률"},
        }
    }
    with patch("httpx.get", return_value=_fake_response(body)):
        results = law_api_client.search("law", "소득세법", oc="test-oc")

    assert results == [{"법령일련번호": "280405", "법령명한글": "소득세법", "법령구분명": "법률"}]


def test_search_prec_paginates_until_total_count_reached():
    page1 = {
        "PrecSearch": {
            "totalCnt": "3",
            "prec": [
                {"판례일련번호": "1", "사건명": "a"},
                {"판례일련번호": "2", "사건명": "b"},
            ],
        }
    }
    page2 = {
        "PrecSearch": {
            "totalCnt": "3",
            "prec": [{"판례일련번호": "3", "사건명": "c"}],
        }
    }
    with patch("httpx.get", side_effect=[_fake_response(page1), _fake_response(page2)]) as mock_get:
        results = law_api_client.search("prec", "종합소득세", oc="test-oc", display=2)

    assert [r["판례일련번호"] for r in results] == ["1", "2", "3"]
    assert mock_get.call_count == 2
    assert mock_get.call_args_list[0].kwargs["params"]["page"] == 1
    assert mock_get.call_args_list[1].kwargs["params"]["page"] == 2


def test_search_expc_wrapping_key_is_not_expcsearch():
    # 실제 API 검증: expc 검색 응답의 최상위 래핑 키는 "Expc"이지 "ExpcSearch"가 아님
    body = {"Expc": {"totalCnt": "1", "expc": {"법령해석례일련번호": "313517", "안건명": "x"}}}
    with patch("httpx.get", return_value=_fake_response(body)):
        results = law_api_client.search("expc", "종합소득세", oc="test-oc")

    assert results == [{"법령해석례일련번호": "313517", "안건명": "x"}]


def test_search_returns_empty_list_when_no_results():
    body = {"LawSearch": {"totalCnt": "0"}}
    with patch("httpx.get", return_value=_fake_response(body)):
        results = law_api_client.search("law", "존재하지않는법", oc="test-oc")

    assert results == []


def test_get_with_retry_succeeds_after_transient_failures(monkeypatch):
    sleep_calls = []
    monkeypatch.setattr(law_api_client.time, "sleep", lambda s: sleep_calls.append(s))

    ok_response = _fake_response({"ok": True})
    with patch("httpx.get", side_effect=[httpx.ConnectError("boom"), httpx.ConnectError("boom"), ok_response]):
        result = law_api_client._get_with_retry("lawSearch.do", {"OC": "test-oc"})

    assert result == {"ok": True}
    assert len(sleep_calls) == 2


def test_get_with_retry_raises_after_max_retries(monkeypatch):
    monkeypatch.setattr(law_api_client.time, "sleep", lambda s: None)

    with patch("httpx.get", side_effect=httpx.ConnectError("boom")):
        try:
            law_api_client._get_with_retry("lawSearch.do", {"OC": "test-oc"})
            assert False, "expected httpx.ConnectError to propagate"
        except httpx.ConnectError:
            pass
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_law_api_client_search.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tax_law_pipeline.law_api_client'`

- [ ] **Step 4: 구현 작성**

`backend/tax_law_pipeline/law_api_client.py`:

```python
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
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_law_api_client_search.py -v`
Expected: 모든 테스트 PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/config.py backend/tax_law_pipeline/law_api_client.py backend/tests/tax_law_pipeline/test_law_api_client_search.py
git commit -m "feat: LAW_API_OC 설정 추가 + 국가법령정보 API 검색/페이지네이션/재시도 구현"
```

---

## Task 3: `law_api_client.py` — target별 본문조회 (`fetch_law`/`fetch_prec`/`fetch_expc`)

**Files:**
- Modify: `backend/tax_law_pipeline/law_api_client.py`
- Test: `backend/tests/tax_law_pipeline/test_law_api_client_fetch.py`

**Interfaces:**
- Consumes: `_get_with_retry`, `_FETCH_WRAPPER_KEY`, `_FETCH_ID_PARAM` (Task 2, 같은 모듈)
- Produces:
  - `def fetch_law(mst: str, oc: str) -> dict | None` — 성공 시 `법령` 안쪽 dict
    (`조문`, `기본정보` 등을 담은 것) 반환, 실패 시 `None`
  - `def fetch_prec(prec_id: str, oc: str) -> dict | None` — 성공 시 판례 상세 dict,
    JSON 상세조회를 지원하지 않는 판례(실제로 존재함)면 `None`
  - `def fetch_expc(expc_id: str, oc: str) -> dict | None` — 성공 시 법령해석례 상세 dict

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/tax_law_pipeline/test_law_api_client_fetch.py`:

```python
from unittest.mock import MagicMock, patch

from tax_law_pipeline import law_api_client


def _fake_response(json_body: dict):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = json_body
    return resp


def test_fetch_law_returns_inner_dict():
    # 실제 API 응답 구조 (소득세법, MST=280405)
    body = {
        "법령": {
            "법령키": "001565-20260701-00280405",
            "기본정보": {"법령명_한글": "소득세법"},
            "조문": {
                "조문단위": [
                    {
                        "조문번호": "1",
                        "조문여부": "전문",
                        "조문내용": "            제1장 총칙 <개정 2009.12.31>",
                    },
                    {
                        "조문번호": "15",
                        "조문여부": "조문",
                        "조문제목": "세액 계산의 순서",
                        "조문내용": "제15조(세액 계산의 순서) 거주자의 종합소득 및 퇴직소득에 대한 소득세는...",
                    },
                ]
            },
        }
    }
    with patch("httpx.get", return_value=_fake_response(body)) as mock_get:
        result = law_api_client.fetch_law("280405", oc="test-oc")

    assert result["법령키"] == "001565-20260701-00280405"
    assert len(result["조문"]["조문단위"]) == 2
    assert mock_get.call_args.kwargs["params"]["MST"] == "280405"
    assert mock_get.call_args.kwargs["params"]["target"] == "law"


def test_fetch_prec_returns_none_when_json_detail_unavailable():
    # 실제로 재현되는 실패 응답: 검색 결과에 있는 판례라도 JSON 상세조회가 안 되는 경우가 있음
    body = {"Law": "일치하는 판례가 없습니다.  판례명을 확인하여 주십시오."}
    with patch("httpx.get", return_value=_fake_response(body)):
        result = law_api_client.fetch_prec("622745", oc="test-oc")

    assert result is None


def test_fetch_prec_returns_detail_dict_on_success():
    body = {
        "PrecService": {
            "판시사항": "<br/> 2인의 공동사업자 중...",
            "판결요지": "<br/> 소득세법 제27조 제1항...",
            "참조조문": " 소득세법 제27조 제1항, 제3항...",
            "선고일자": "20260312",
            "법원명": "대법원",
            "사건명": "종합소득세부과처분취소",
            "판례내용": "【원고, 상고인】 ...",
            "사건번호": "2025두35585",
        }
    }
    with patch("httpx.get", return_value=_fake_response(body)) as mock_get:
        result = law_api_client.fetch_prec("618513", oc="test-oc")

    assert result["사건번호"] == "2025두35585"
    assert mock_get.call_args.kwargs["params"]["ID"] == "618513"
    assert mock_get.call_args.kwargs["params"]["target"] == "prec"
    assert "MST" not in mock_get.call_args.kwargs["params"]


def test_fetch_expc_returns_detail_dict_on_success():
    body = {
        "ExpcService": {
            "해석기관코드": "1170000",
            "안건번호": "11-0150",
            "이유": "「소득세법」 제70조에서는...",
            "해석기관명": "법제처",
            "해석일자": "20110504",
            "안건명": " 민원인 - 2인으로부터 근로소득을...",
            "질의요지": "2인으로부터 지급받은 근로소득만이...",
            "회답": "2인으로부터 지급받은 근로소득만이...",
        }
    }
    with patch("httpx.get", return_value=_fake_response(body)) as mock_get:
        result = law_api_client.fetch_expc("313517", oc="test-oc")

    assert result["안건번호"] == "11-0150"
    assert mock_get.call_args.kwargs["params"]["ID"] == "313517"
    assert mock_get.call_args.kwargs["params"]["target"] == "expc"
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_law_api_client_fetch.py -v`
Expected: FAIL — `AttributeError: module 'tax_law_pipeline.law_api_client' has no attribute 'fetch_law'`

- [ ] **Step 3: 구현 작성**

`backend/tax_law_pipeline/law_api_client.py` 파일 끝에 추가 (Task 2에서 만든 `_fetch`
바로 다음):

```python
def fetch_law(mst: str, oc: str) -> dict | None:
    return _fetch("law", mst, oc)


def fetch_prec(prec_id: str, oc: str) -> dict | None:
    return _fetch("prec", prec_id, oc)


def fetch_expc(expc_id: str, oc: str) -> dict | None:
    return _fetch("expc", expc_id, oc)
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_law_api_client_fetch.py -v`
Expected: 모든 테스트 PASS. 이어서 Task 2의 검색 테스트도 회귀 없는지 확인:
`cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/ -v`

- [ ] **Step 5: Commit**

```bash
git add backend/tax_law_pipeline/law_api_client.py backend/tests/tax_law_pipeline/test_law_api_client_fetch.py
git commit -m "feat: law/prec/expc 본문조회 함수 구현 — target별 파라미터/응답 처리"
```

---

## Task 4: `filter_articles.py` — 종합소득 관련 조문 필터링

**Files:**
- Create: `backend/tax_law_pipeline/filter_articles.py`
- Test: `backend/tests/tax_law_pipeline/test_filter_articles.py`

**Interfaces:**
- Consumes: `fetch_law`(Task 3)이 반환하는 `법령` dict의 형태 —
  `{"조문": {"조문단위": [...]}, ...}`
- Produces: `def filter_comprehensive_income_articles(law_detail: dict) -> list[dict]` —
  `조문여부 == '조문'`이고 `조문제목` 또는 `조문내용`에 "종합소득"이 포함된 조문단위
  dict만 리스트로 반환. `law_detail`이 `None`이거나 `조문` 키가 없으면 빈 리스트.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/tax_law_pipeline/test_filter_articles.py`:

```python
from tax_law_pipeline.filter_articles import filter_comprehensive_income_articles


def _law_detail(units):
    return {"조문": {"조문단위": units}}


def test_excludes_chapter_heading_entries():
    # 실제 API 응답: 장 제목 항목은 조문여부가 '전문'이고 조문제목이 아예 없음
    units = [
        {"조문번호": "1", "조문여부": "전문", "조문내용": "제1장 총칙 <개정 2009.12.31>"},
    ]
    assert filter_comprehensive_income_articles(_law_detail(units)) == []


def test_includes_real_article_mentioning_comprehensive_income():
    # 실제 API 응답: 소득세법 제15조
    units = [
        {
            "조문번호": "15",
            "조문여부": "조문",
            "조문제목": "세액 계산의 순서",
            "조문내용": "제15조(세액 계산의 순서) 거주자의 종합소득 및 퇴직소득에 대한 소득세는...",
        }
    ]
    result = filter_comprehensive_income_articles(_law_detail(units))
    assert len(result) == 1
    assert result[0]["조문번호"] == "15"


def test_excludes_unrelated_article():
    units = [
        {
            "조문번호": "94",
            "조문여부": "조문",
            "조문제목": "양도소득의 범위",
            "조문내용": "제94조(양도소득의 범위) 양도소득은 다음 각 호에서 규정하는 소득으로 한다...",
        }
    ]
    assert filter_comprehensive_income_articles(_law_detail(units)) == []


def test_matches_on_title_even_when_content_does_not_mention_keyword():
    units = [
        {
            "조문번호": "5",
            "조문여부": "조문",
            "조문제목": "종합소득세 과세기간",
            "조문내용": "제5조 이 법에 따른 과세기간은 1월 1일부터 12월 31일까지로 한다.",
        }
    ]
    result = filter_comprehensive_income_articles(_law_detail(units))
    assert len(result) == 1


def test_handles_single_article_collapsed_to_dict():
    # 실제 API 특성: 조문단위가 1개면 리스트가 아니라 dict로 올 수 있음
    law_detail = {
        "조문": {
            "조문단위": {
                "조문번호": "15",
                "조문여부": "조문",
                "조문제목": "세액 계산의 순서",
                "조문내용": "제15조(세액 계산의 순서) 거주자의 종합소득...",
            }
        }
    }
    result = filter_comprehensive_income_articles(law_detail)
    assert len(result) == 1


def test_none_or_missing_articles_returns_empty_list():
    assert filter_comprehensive_income_articles(None) == []
    assert filter_comprehensive_income_articles({}) == []
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_filter_articles.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tax_law_pipeline.filter_articles'`

- [ ] **Step 3: 구현 작성**

`backend/tax_law_pipeline/filter_articles.py`:

```python
"""소득세법 조문 중 종합소득세 관련 조문만 골라내는 필터.

실제 API 응답에서 조문단위 배열에는 장/절 제목용 항목(조문여부='전문')과 실제 조문
(조문여부='조문')이 섞여 있다. 장/절 제목 항목은 조문제목 필드가 아예 없다.
"""


def filter_comprehensive_income_articles(law_detail: dict | None) -> list[dict]:
    if not law_detail:
        return []

    units = law_detail.get("조문", {}).get("조문단위", [])
    if isinstance(units, dict):
        units = [units]

    matched = []
    for unit in units:
        if unit.get("조문여부") != "조문":
            continue
        title = unit.get("조문제목") or ""
        content = unit.get("조문내용") or ""
        if "종합소득" in title or "종합소득" in content:
            matched.append(unit)

    return matched
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_filter_articles.py -v`
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tax_law_pipeline/filter_articles.py backend/tests/tax_law_pipeline/test_filter_articles.py
git commit -m "feat: 종합소득세 관련 조문 필터링 구현"
```

---

## Task 5: `chunk_and_index.py` — 청크 생성 + 컬렉션 재구축

**Files:**
- Create: `backend/tax_law_pipeline/chunk_and_index.py`
- Test: `backend/tests/tax_law_pipeline/test_chunk_and_index.py`

**Interfaces:**
- Consumes: `clean_text`(Task 1), `CHROMA_PATH`·`init_llama_settings`(기존
  `app.services.rag_service`, `backend/app/services/rag_service.py:11`, `:115`)
- Produces:
  - `LAW_API_COLLECTION_NAME = "tax_law_api_v1"`
  - `def build_law_chunks(articles: list[dict], law_name: str) -> list[dict]`
  - `def build_prec_chunks(prec_details: list[dict]) -> list[dict]`
  - `def build_expc_chunks(expc_details: list[dict]) -> list[dict]`
  - 위 세 함수는 전부 `{"text": str, "file_name": str, "metadata": dict}` 형태의
    dict 리스트를 반환한다 (`metadata`에는 `file_name` 자체는 안 들어있음 — 별도 키).
  - `def rebuild_law_api_collection(chunks: list[dict], chroma_path: str | None = None) -> None`
    — 컬렉션을 삭제 후 재생성하고 `chunks`로 채운다. `chroma_path`를 생략하면
    `app.services.rag_service.CHROMA_PATH`를 쓴다 (테스트에서 `tmp_path`로 오버라이드
    가능하도록 파라미터로 노출).

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/tax_law_pipeline/test_chunk_and_index.py`:

```python
import chromadb
from llama_index.core import Settings
from llama_index.core.embeddings import MockEmbedding

from tax_law_pipeline.chunk_and_index import (
    LAW_API_COLLECTION_NAME,
    build_expc_chunks,
    build_law_chunks,
    build_prec_chunks,
    rebuild_law_api_collection,
)


def test_build_law_chunks_uses_file_name_compatible_metadata():
    articles = [
        {
            "조문번호": "15",
            "조문시행일자": "20260101",
            "조문제목": "세액 계산의 순서",
            "조문내용": "제15조(세액 계산의 순서) 거주자의 종합소득 및 퇴직소득에 대한 소득세는...",
        }
    ]
    chunks = build_law_chunks(articles, law_name="소득세법")

    assert len(chunks) == 1
    assert chunks[0]["file_name"] == "소득세법 제15조"
    assert "종합소득" in chunks[0]["text"]
    assert chunks[0]["metadata"]["데이터유형"] == "법령"
    assert chunks[0]["metadata"]["조문번호"] == "15"


def test_build_law_chunks_skips_articles_with_empty_content():
    articles = [{"조문번호": "1", "조문내용": ""}]
    assert build_law_chunks(articles, law_name="소득세법") == []


def test_build_prec_chunks_combines_case_fields_and_cleans_html():
    prec_details = [
        {
            "사건명": "종합소득세부과처분취소",
            "판시사항": "<br/> 2인의 공동사업자 중...",
            "판결요지": "<br/> 소득세법 제27조 제1항...",
            "참조조문": " 소득세법 제27조 제1항",
            "사건번호": "2025두35585",
            "법원명": "대법원",
            "선고일자": "20260312",
        }
    ]
    chunks = build_prec_chunks(prec_details)

    assert len(chunks) == 1
    assert chunks[0]["file_name"] == "판례 2025두35585"
    assert "<br/>" not in chunks[0]["text"]
    assert "종합소득세부과처분취소" in chunks[0]["text"]
    assert chunks[0]["metadata"]["데이터유형"] == "판례"


def test_build_expc_chunks_combines_question_and_answer():
    expc_details = [
        {
            "안건명": "민원인 - 2인으로부터 근로소득을 지급받은 자가...",
            "질의요지": "2인으로부터 지급받은 근로소득만이 존재하는...",
            "회답": "2인으로부터 지급받은 근로소득만이 존재하는...",
            "이유": "「소득세법」 제70조에서는...",
            "안건번호": "11-0150",
            "해석기관명": "법제처",
            "해석일자": "20110504",
        }
    ]
    chunks = build_expc_chunks(expc_details)

    assert len(chunks) == 1
    assert chunks[0]["file_name"] == "법령해석례 11-0150"
    assert chunks[0]["metadata"]["데이터유형"] == "법령해석례"


def test_rebuild_law_api_collection_replaces_stale_documents(tmp_path, monkeypatch):
    # 실제 컬렉션 삭제/재생성 라운드트립 검증 (임베딩은 MockEmbedding으로 대체해 실제
    # OpenAI 호출 없이 테스트). tmp_path 사용 — Windows에서 TemporaryDirectory()를
    # 직접 쓰면 ChromaDB가 파일 핸들을 쥐고 있어 정리 시 PermissionError가 남을 확인함.
    monkeypatch.setattr(Settings, "embed_model", MockEmbedding(embed_dim=8))
    monkeypatch.setattr(Settings, "llm", None)

    import tax_law_pipeline.chunk_and_index as cai
    monkeypatch.setattr(cai, "init_llama_settings", lambda: None)

    chroma_path = str(tmp_path)

    rebuild_law_api_collection(
        [{"text": "구버전 조문", "file_name": "소득세법 제1조", "metadata": {}}],
        chroma_path=chroma_path,
    )
    rebuild_law_api_collection(
        [{"text": "신버전 조문", "file_name": "소득세법 제1조", "metadata": {}}],
        chroma_path=chroma_path,
    )

    client = chromadb.PersistentClient(path=chroma_path)
    collection = client.get_or_create_collection(LAW_API_COLLECTION_NAME)
    all_docs = collection.get()

    assert collection.count() == 1
    assert all_docs["documents"] == ["신버전 조문"]


def test_rebuild_law_api_collection_handles_empty_chunks(tmp_path, monkeypatch):
    monkeypatch.setattr(Settings, "embed_model", MockEmbedding(embed_dim=8))
    monkeypatch.setattr(Settings, "llm", None)
    import tax_law_pipeline.chunk_and_index as cai
    monkeypatch.setattr(cai, "init_llama_settings", lambda: None)

    rebuild_law_api_collection([], chroma_path=str(tmp_path))

    client = chromadb.PersistentClient(path=str(tmp_path))
    collection = client.get_or_create_collection(LAW_API_COLLECTION_NAME)
    assert collection.count() == 0
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_chunk_and_index.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tax_law_pipeline.chunk_and_index'`

- [ ] **Step 3: 구현 작성**

`backend/tax_law_pipeline/chunk_and_index.py`:

```python
"""law/prec/expc 파싱 결과를 청크로 만들고 별도 ChromaDB 컬렉션(tax_law_api_v1)에
인덱싱한다.

재실행할 때마다 컬렉션을 통째로 삭제하고 새로 만든다 — upsert 대신 전체 재구축을 택해
법 개정 전/후 조문이 동시에 검색되는 문제를 없앤다 (설계 문서 [5]번 참고).
"""

import chromadb
from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.chroma import ChromaVectorStore

from app.services.rag_service import CHROMA_PATH, init_llama_settings
from tax_law_pipeline.clean_text import clean_text

LAW_API_COLLECTION_NAME = "tax_law_api_v1"


def build_law_chunks(articles: list[dict], law_name: str) -> list[dict]:
    chunks = []
    for unit in articles:
        content = clean_text(unit.get("조문내용", ""))
        if not content:
            continue
        article_no = unit.get("조문번호", "")
        chunks.append(
            {
                "text": content,
                "file_name": f"{law_name} 제{article_no}조",
                "metadata": {
                    "출처": law_name,
                    "조문번호": article_no,
                    "시행일자": unit.get("조문시행일자", ""),
                    "데이터유형": "법령",
                },
            }
        )
    return chunks


def build_prec_chunks(prec_details: list[dict]) -> list[dict]:
    chunks = []
    for detail in prec_details:
        parts = [
            detail.get("사건명", ""),
            detail.get("판시사항", ""),
            detail.get("판결요지", ""),
            detail.get("참조조문", ""),
        ]
        text = clean_text(" ".join(p for p in parts if p))
        if not text:
            continue
        case_no = detail.get("사건번호", "")
        chunks.append(
            {
                "text": text,
                "file_name": f"판례 {case_no}",
                "metadata": {
                    "출처": detail.get("법원명", ""),
                    "사건번호": case_no,
                    "선고일자": detail.get("선고일자", ""),
                    "데이터유형": "판례",
                },
            }
        )
    return chunks


def build_expc_chunks(expc_details: list[dict]) -> list[dict]:
    chunks = []
    for detail in expc_details:
        parts = [
            detail.get("안건명", ""),
            detail.get("질의요지", ""),
            detail.get("회답", ""),
            detail.get("이유", ""),
        ]
        text = clean_text(" ".join(p for p in parts if p))
        if not text:
            continue
        case_no = detail.get("안건번호", "")
        chunks.append(
            {
                "text": text,
                "file_name": f"법령해석례 {case_no}",
                "metadata": {
                    "출처": detail.get("해석기관명", ""),
                    "안건번호": case_no,
                    "해석일자": detail.get("해석일자", ""),
                    "데이터유형": "법령해석례",
                },
            }
        )
    return chunks


def rebuild_law_api_collection(chunks: list[dict], chroma_path: str | None = None) -> None:
    init_llama_settings()
    chroma_client = chromadb.PersistentClient(path=chroma_path or CHROMA_PATH)

    try:
        chroma_client.delete_collection(name=LAW_API_COLLECTION_NAME)
    except Exception:
        pass  # 첫 실행이면 컬렉션이 아직 없음

    collection = chroma_client.get_or_create_collection(LAW_API_COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    if not chunks:
        return

    documents = [
        Document(text=chunk["text"], metadata={"file_name": chunk["file_name"], **chunk["metadata"]})
        for chunk in chunks
    ]
    splitter = SentenceSplitter(chunk_size=2048, chunk_overlap=0)
    VectorStoreIndex.from_documents(documents, storage_context=storage_context, transformations=[splitter])
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_chunk_and_index.py -v`
Expected: 모든 테스트 PASS. 참고: 이 테스트는 임베딩을 `MockEmbedding`으로 대체하지만
실제 ChromaDB 파일 I/O는 진짜로 수행한다(`tmp_path`에). 실행 시간이 다른 테스트보다
약간 길 수 있다(수 초 이내면 정상).

- [ ] **Step 5: Commit**

```bash
git add backend/tax_law_pipeline/chunk_and_index.py backend/tests/tax_law_pipeline/test_chunk_and_index.py
git commit -m "feat: law/prec/expc 청크 생성 및 컬렉션 삭제-후-재구축 구현"
```

---

## Task 6: `run_pipeline.py` — 전체 파이프라인 오케스트레이션

**Files:**
- Create: `backend/tax_law_pipeline/run_pipeline.py`
- Test: `backend/tests/tax_law_pipeline/test_run_pipeline.py`

**Interfaces:**
- Consumes: `law_api_client.search/fetch_law/fetch_prec/fetch_expc`(Task 2, 3),
  `filter_articles.filter_comprehensive_income_articles`(Task 4),
  `chunk_and_index.build_law_chunks/build_prec_chunks/build_expc_chunks/rebuild_law_api_collection`(Task 5),
  `app.config.settings.LAW_API_OC`(Task 2)
- Produces: `def run() -> dict` — 요약 dict
  `{"law_articles": int, "prec_cases": int, "expc_cases": int, "total_chunks": int}`
  반환. `LAW_API_OC`가 비어있으면 `RuntimeError`.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/tax_law_pipeline/test_run_pipeline.py`:

```python
from unittest.mock import MagicMock, patch

import pytest

from tax_law_pipeline import run_pipeline


def test_run_raises_when_oc_not_configured(monkeypatch):
    monkeypatch.setattr(run_pipeline.settings, "LAW_API_OC", "")

    with pytest.raises(RuntimeError, match="LAW_API_OC"):
        run_pipeline.run()


def test_run_orchestrates_search_fetch_filter_chunk_index(monkeypatch):
    monkeypatch.setattr(run_pipeline.settings, "LAW_API_OC", "test-oc")
    monkeypatch.setattr(run_pipeline.time, "sleep", lambda s: None)

    law_search_result = [
        {"법령일련번호": "280405", "법령명한글": "소득세법", "법령구분명": "법률"},
    ]
    prec_search_result = [
        {"판례일련번호": "618513"},
        {"판례일련번호": "622745"},  # 이 건은 fetch_prec이 None을 반환하는 케이스로 모킹
    ]
    expc_search_result = [{"법령해석례일련번호": "313517"}]

    law_detail = {"조문": {"조문단위": [{"조문번호": "15", "조문여부": "조문", "조문내용": "제15조 종합소득..."}]}}
    prec_detail = {"사건번호": "2025두35585", "사건명": "x", "판시사항": "", "판결요지": "", "참조조문": ""}
    expc_detail = {"안건번호": "11-0150", "안건명": "x", "질의요지": "", "회답": "", "이유": ""}

    def fake_search(target, query, oc):
        return {"law": law_search_result, "prec": prec_search_result, "expc": expc_search_result}[target]

    def fake_fetch_prec(prec_id, oc):
        return prec_detail if prec_id == "618513" else None

    with (
        patch.object(run_pipeline.law_api_client, "search", side_effect=fake_search) as mock_search,
        patch.object(run_pipeline.law_api_client, "fetch_law", return_value=law_detail) as mock_fetch_law,
        patch.object(run_pipeline.law_api_client, "fetch_prec", side_effect=fake_fetch_prec) as mock_fetch_prec,
        patch.object(run_pipeline.law_api_client, "fetch_expc", return_value=expc_detail) as mock_fetch_expc,
        patch.object(run_pipeline, "rebuild_law_api_collection") as mock_rebuild,
    ):
        summary = run_pipeline.run()

    mock_fetch_law.assert_called_once_with("280405", "test-oc")
    assert mock_fetch_prec.call_count == 2
    mock_fetch_expc.assert_called_once_with("313517", "test-oc")

    assert summary["law_articles"] == 1
    assert summary["prec_cases"] == 1  # 622745는 fetch_prec이 None을 반환해서 제외됨
    assert summary["expc_cases"] == 1
    assert summary["total_chunks"] == 3

    mock_rebuild.assert_called_once()
    passed_chunks = mock_rebuild.call_args.args[0]
    assert len(passed_chunks) == 3
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_run_pipeline.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tax_law_pipeline.run_pipeline'`

- [ ] **Step 3: 구현 작성**

`backend/tax_law_pipeline/run_pipeline.py`:

```python
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
```

**주의**: 테스트의 `fake_search`는 `search(target, query, oc)`처럼 위치/키워드 인자
호출 방식에 의존하지 않고 `target`으로 분기하므로, 실제 구현에서 `law_api_client.search`를
호출할 때 인자 순서(`target, query, oc`)가 바뀌지 않도록 위 코드 그대로 유지한다.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/test_run_pipeline.py -v`
Expected: 모든 테스트 PASS. 이어서 전체 스위트 회귀 확인:
`cd backend && .venv/Scripts/python.exe -m pytest tests/tax_law_pipeline/ -v`

- [ ] **Step 5: Commit**

```bash
git add backend/tax_law_pipeline/run_pipeline.py backend/tests/tax_law_pipeline/test_run_pipeline.py
git commit -m "feat: run_pipeline — 검색부터 인덱싱까지 전체 오케스트레이션"
```

---

## Task 7: `rag_service.py` 연동 — 기존 `/chat`이 신규 컬렉션도 검색하도록 수정

**Files:**
- Modify: `backend/app/services/rag_service.py`
- Test: `backend/tests/services/__init__.py` (빈 파일, 신규 디렉터리)
- Test: `backend/tests/services/test_rag_service_merge.py`

**Interfaces:**
- Produces: `def get_or_create_law_api_index()` (신규, `get_or_create_index`와 같은
  파일). 기존 `def retrieve_context(question: str) -> str`의 동작을 변경 — 두 컬렉션을
  각각 검색해서 병합.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/services/test_rag_service_merge.py`:

```python
from unittest.mock import MagicMock, patch

from app.services import rag_service


def _fake_node(content: str, score: float, file_name: str):
    node = MagicMock()
    node.metadata = {"file_name": file_name}
    fake = MagicMock()
    fake.node = node
    fake.get_content.return_value = content
    fake.score = score
    return fake


def test_retrieve_context_merges_pdf_and_law_api_results_by_score():
    pdf_retriever = MagicMock()
    pdf_retriever.retrieve.return_value = [_fake_node("PDF 문서 내용", 0.7, "income_tax_law.pdf")]
    pdf_index = MagicMock()
    pdf_index.as_retriever.return_value = pdf_retriever

    law_api_retriever = MagicMock()
    law_api_retriever.retrieve.return_value = [_fake_node("API로 수집한 조문 내용", 0.9, "소득세법 제15조")]
    law_api_index = MagicMock()
    law_api_index.as_retriever.return_value = law_api_retriever

    with (
        patch.object(rag_service, "get_or_create_index", return_value=pdf_index),
        patch.object(rag_service, "get_or_create_law_api_index", return_value=law_api_index),
    ):
        result = rag_service.retrieve_context("종합소득세 계산 방법")

    # 점수가 더 높은 API 결과가 먼저 오도록 병합돼야 함
    assert result.index("API로 수집한 조문 내용") < result.index("PDF 문서 내용")


def test_retrieve_context_still_works_when_law_api_collection_is_empty():
    pdf_retriever = MagicMock()
    pdf_retriever.retrieve.return_value = [_fake_node("PDF 문서 내용", 0.7, "income_tax_law.pdf")]
    pdf_index = MagicMock()
    pdf_index.as_retriever.return_value = pdf_retriever

    law_api_retriever = MagicMock()
    law_api_retriever.retrieve.return_value = []
    law_api_index = MagicMock()
    law_api_index.as_retriever.return_value = law_api_retriever

    with (
        patch.object(rag_service, "get_or_create_index", return_value=pdf_index),
        patch.object(rag_service, "get_or_create_law_api_index", return_value=law_api_index),
    ):
        result = rag_service.retrieve_context("종합소득세 계산 방법")

    assert "PDF 문서 내용" in result


def test_get_or_create_law_api_index_uses_separate_collection_name():
    fake_client = MagicMock()
    fake_collection = MagicMock()
    fake_client.get_or_create_collection.return_value = fake_collection

    with (
        patch.object(rag_service, "init_llama_settings"),
        patch.object(rag_service.chromadb, "PersistentClient", return_value=fake_client),
        patch.object(rag_service, "ChromaVectorStore"),
        patch.object(rag_service, "StorageContext"),
        patch.object(rag_service, "VectorStoreIndex"),
    ):
        rag_service.get_or_create_law_api_index()

    fake_client.get_or_create_collection.assert_called_once_with("tax_law_api_v1")
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/services/test_rag_service_merge.py -v`
Expected: FAIL — `AttributeError: module 'app.services.rag_service' has no attribute 'get_or_create_law_api_index'`

- [ ] **Step 3: 구현 작성**

`backend/app/services/rag_service.py`의 `get_or_create_index()` 함수(`:127-145`)
바로 다음에 추가:

```python
LAW_API_COLLECTION_NAME = "tax_law_api_v1"


def get_or_create_law_api_index():
    init_llama_settings()
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(LAW_API_COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(vector_store, storage_context=storage_context)
```

그다음 기존 `retrieve_context()`(`:147-156`)를 아래로 교체:

기존:
```python
def retrieve_context(question: str) -> str:
    try:
        index = get_or_create_index()
        retriever = index.as_retriever(similarity_top_k=5)
        nodes = retriever.retrieve(question)
        if not nodes:
            return ""
        return "\n\n".join([node.get_content() for node in nodes])
    except Exception:
        return ""
```

변경 후:
```python
def retrieve_context(question: str) -> str:
    try:
        index = get_or_create_index()
        retriever = index.as_retriever(similarity_top_k=5)
        nodes = retriever.retrieve(question)

        law_api_index = get_or_create_law_api_index()
        law_api_retriever = law_api_index.as_retriever(similarity_top_k=5)
        law_api_nodes = law_api_retriever.retrieve(question)

        merged = sorted(
            [*nodes, *law_api_nodes],
            key=lambda n: n.score if n.score is not None else 0.0,
            reverse=True,
        )[:5]

        if not merged:
            return ""
        return "\n\n".join([node.get_content() for node in merged])
    except Exception:
        return ""
```

`backend/tests/services/__init__.py`: 빈 파일.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/services/test_rag_service_merge.py -v`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 전체 스위트 회귀 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest -v`
Expected: 기존 `tax_agent` 스위트(35개)를 포함해 전부 PASS (이 태스크는 `rag_service.py`만
건드렸고 `tax_agent/nodes/retrieve.py`는 아직 안 건드렸으므로 회귀가 없어야 정상 — 만약
실패한다면 이 태스크의 변경이 `rag_service.py`의 다른 함수를 깬 것이니 원인을 찾는다)

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/rag_service.py backend/tests/services/
git commit -m "feat: /chat이 PDF+국가법령정보 API 컬렉션을 함께 검색하도록 연동"
```

---

## Task 8: `tax_agent/nodes/retrieve.py` 연동 — LangGraph 에이전트도 신규 컬렉션 검색

**Files:**
- Modify: `backend/app/tax_agent/nodes/retrieve.py`
- Modify: `backend/tests/tax_agent/nodes/test_retrieve.py` (기존 파일, Task 5/9의
  LangGraph 플랜에서 이미 존재 — `_get_cached_index`를 패치하는 기존 테스트가
  이번 변경으로 안 깨지는지 같이 확인)

**Interfaces:**
- Consumes: `get_or_create_law_api_index`(Task 7, `app.services.rag_service`)
- Produces: `retrieve_node`의 동작 변경 — 각 검색 쿼리마다 PDF 인덱스와 API 인덱스를
  모두 조회해서 점수 기준으로 병합 후 상위 5개만 `retrieved_docs`에 누적.

- [ ] **Step 1: 실패하는 테스트 작성 (기존 테스트 파일에 추가)**

`backend/tests/tax_agent/nodes/test_retrieve.py`에 아래 테스트를 추가한다 (기존 테스트
`test_retrieve_node_merges_results_across_queries` 등은 그대로 둔다 — 삭제하지 않음):

```python
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_agent/nodes/test_retrieve.py -v`
Expected: FAIL — `AttributeError: <module 'app.tax_agent.nodes.retrieve'> does not have the attribute '_get_cached_law_api_index'`

- [ ] **Step 3: 구현 작성**

`backend/app/tax_agent/nodes/retrieve.py`의 상단부(import ~ `_search_one` 끝까지)를
아래로 교체한다. 파일 하단의 `retrieve_node` 함수는 이 블록 밖에 있으므로 건드리지
않는다 — 아래 "기존" 블록은 파일 맨 위부터 `_search_one`의 닫는 `]`까지 정확히
일치해야 한다 (주석 포함, 한 글자도 다르면 안 됨).

기존:
```python
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
    # get_or_create_index() is synchronous and can do blocking disk I/O (and,
    # on a cold start, a full document embedding pass). Running it directly
    # here would freeze the event loop for the whole server since this
    # coroutine executes under asyncio.gather in retrieve_node.
    index = await asyncio.to_thread(_get_cached_index)
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
```

변경 후:
```python
import asyncio

from app.services.rag_service import get_or_create_index, get_or_create_law_api_index
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

    nodes, law_api_nodes = await asyncio.gather(
        retriever.aretrieve(query),
        law_api_retriever.aretrieve(query),
    )

    merged = sorted(
        [*nodes, *law_api_nodes],
        key=lambda n: n.score if n.score is not None else 0.0,
        reverse=True,
    )[:5]

    return [
        {
            "source": n.node.metadata.get("file_name", "unknown"),
            "content": n.get_content(),
            "score": n.score,
        }
        for n in merged
    ]
```

`retrieve_node` 함수 자체(파일 하단, `state["search_queries"]`를 순회해 `_search_one`을
`asyncio.gather`로 병렬 호출하는 부분)는 수정하지 않는다 — `_search_one`의 반환 형태가
그대로이므로 그대로 재사용된다.

`backend/tests/tax_agent/nodes/test_retrieve.py` 상단에 이미 있는 `patch` import를
그대로 쓰되, 새로 추가한 테스트가 `patch(...)`를 두 개 동시에 열어야 하므로 파일 상단에
`from unittest.mock import AsyncMock, MagicMock, patch`가 이미 있는지 확인하고 없으면
추가한다 (기존 파일에는 이미 있음 — Task 5의 LangGraph 플랜에서 작성됨).

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/tax_agent/nodes/test_retrieve.py -v`
Expected: 새 테스트를 포함해 이 파일의 모든 테스트가 PASS (기존 테스트들도 계속
통과해야 함 — `_get_cached_index`만 패치하고 `_get_cached_law_api_index`는 패치하지
않는 기존 테스트가 있다면, 그 테스트가 실제 `get_or_create_law_api_index()`를 호출하려
시도해서 실패할 수 있다. 만약 그런 실패가 나면, 기존 테스트에도
`patch("app.tax_agent.nodes.retrieve._get_cached_law_api_index", return_value=<law_api_index를 반환하지 않는 빈 인덱스 mock>)`을
추가해서 실제 ChromaDB/OpenAI 호출로 새지 않도록 고친다 — 정확히 어떤 기존 테스트가
깨지는지는 이 스텝을 실행해봐야 알 수 있으므로, 실패 목록을 보고 하나씩 고친다).

- [ ] **Step 5: 전체 스위트 회귀 확인**

Run: `cd backend && .venv/Scripts/python.exe -m pytest -v`
Expected: 전체 테스트(이 플랜의 8개 태스크 + 기존 LangGraph 플랜의 35개) 전부 PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/tax_agent/nodes/retrieve.py backend/tests/tax_agent/nodes/test_retrieve.py
git commit -m "feat: LangGraph retrieve_node가 PDF+국가법령정보 API 컬렉션을 함께 검색하도록 연동"
```

---

## 계획에 포함되지 않은 것 (설계 문서 기준 별도 과제)

- `verify_node`가 새 메타데이터(`시행일자`, `데이터유형` 등)를 검증에 실제로 활용하도록
  고치는 작업 (설계 문서에서 이번 스코프 제외로 확정)
- 배치 스케줄링(cron 등) — 이번엔 수동 실행(`python -m tax_law_pipeline.run_pipeline`)까지만
- 하위법령(시행령/시행규칙) 수집 — 이번 스코프는 소득세법 본법만
- 국가법령정보 Open API 이용약관(상업적 이용/출처표시 의무) 확인 — 코드 작업이 아니므로
  배포 전 별도로 직접 확인 필요
