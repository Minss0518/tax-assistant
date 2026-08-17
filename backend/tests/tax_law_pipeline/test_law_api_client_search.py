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
