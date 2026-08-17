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


def test_run_continues_when_one_fetch_raises_after_exhausting_retries(monkeypatch):
    # I2: fetch_prec/fetch_expc already retry 3x internally (law_api_client's
    # _get_with_retry). If all retries still fail for one item out of
    # potentially 1000+, that single item must not abort the whole run and
    # discard everything already fetched successfully.
    monkeypatch.setattr(run_pipeline.settings, "LAW_API_OC", "test-oc")
    monkeypatch.setattr(run_pipeline.time, "sleep", lambda s: None)

    law_search_result = [
        {"법령일련번호": "280405", "법령명한글": "소득세법", "법령구분명": "법률"},
    ]
    prec_search_result = [
        {"판례일련번호": "618513"},  # 이 건은 재시도 소진 후에도 계속 예외를 던짐
        {"판례일련번호": "622745"},  # 이 건은 정상적으로 성공함
    ]
    expc_search_result = [{"법령해석례일련번호": "313517"}]

    law_detail = {"조문": {"조문단위": [{"조문번호": "15", "조문여부": "조문", "조문내용": "제15조 종합소득..."}]}}
    prec_detail = {"사건번호": "2025두35585", "사건명": "x", "판시사항": "", "판결요지": "", "참조조문": ""}
    expc_detail = {"안건번호": "11-0150", "안건명": "x", "질의요지": "", "회답": "", "이유": ""}

    def fake_search(target, query, oc):
        return {"law": law_search_result, "prec": prec_search_result, "expc": expc_search_result}[target]

    def fake_fetch_prec(prec_id, oc):
        if prec_id == "618513":
            raise Exception("network error - retries exhausted")
        return prec_detail

    with (
        patch.object(run_pipeline.law_api_client, "search", side_effect=fake_search),
        patch.object(run_pipeline.law_api_client, "fetch_law", return_value=law_detail),
        patch.object(run_pipeline.law_api_client, "fetch_prec", side_effect=fake_fetch_prec) as mock_fetch_prec,
        patch.object(run_pipeline.law_api_client, "fetch_expc", return_value=expc_detail),
        patch.object(run_pipeline, "rebuild_law_api_collection") as mock_rebuild,
    ):
        summary = run_pipeline.run()

    assert mock_fetch_prec.call_count == 2
    assert summary["prec_cases"] == 1  # 618513은 예외로 제외, 622745만 반영됨
    assert summary["expc_cases"] == 1
    mock_rebuild.assert_called_once()
