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

    fake_index = MagicMock()
    indexed_batches = []

    def fake_index_chunks_batch(index, chunks):
        assert index is fake_index
        indexed_batches.append(chunks)

    with (
        patch.object(run_pipeline.law_api_client, "search", side_effect=fake_search),
        patch.object(run_pipeline.law_api_client, "fetch_law", return_value=law_detail) as mock_fetch_law,
        patch.object(run_pipeline.law_api_client, "fetch_prec", side_effect=fake_fetch_prec) as mock_fetch_prec,
        patch.object(run_pipeline.law_api_client, "fetch_expc", return_value=expc_detail) as mock_fetch_expc,
        patch.object(run_pipeline, "reset_law_api_collection", return_value=fake_index) as mock_reset,
        patch.object(run_pipeline, "index_chunks_batch", side_effect=fake_index_chunks_batch) as mock_index_batch,
    ):
        summary = run_pipeline.run()

    mock_fetch_law.assert_called_once_with("280405", "test-oc")
    assert mock_fetch_prec.call_count == 2
    mock_fetch_expc.assert_called_once_with("313517", "test-oc")

    # I3(OOM): 컬렉션 삭제/재생성은 파이프라인 실행당 한 번만 해야 한다.
    mock_reset.assert_called_once()

    assert summary["law_articles"] == 1
    assert summary["prec_cases"] == 1  # 622745는 fetch_prec이 None을 반환해서 제외됨
    assert summary["expc_cases"] == 1

    all_indexed_chunks = [chunk for batch in indexed_batches for chunk in batch]
    assert len(all_indexed_chunks) == 3  # law 1건 + prec 1건 + expc 1건
    assert summary["total_chunks"] == 3

    # I3(OOM): 전체 데이터를 한 번에 메모리에 모아 인덱싱하지 않고, law/prec/expc를
    # 각각 별도 배치로 나눠 index_chunks_batch를 여러 번 호출해야 한다 — 판례가
    # 1000건 이상이라 전부 모았다가 한 번에 임베딩하면 무료 호스팅 환경(512MB)에서
    # 실제로 OOM이 재현됐다.
    assert mock_index_batch.call_count >= 2


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

    fake_index = MagicMock()

    with (
        patch.object(run_pipeline.law_api_client, "search", side_effect=fake_search),
        patch.object(run_pipeline.law_api_client, "fetch_law", return_value=law_detail),
        patch.object(run_pipeline.law_api_client, "fetch_prec", side_effect=fake_fetch_prec) as mock_fetch_prec,
        patch.object(run_pipeline.law_api_client, "fetch_expc", return_value=expc_detail),
        patch.object(run_pipeline, "reset_law_api_collection", return_value=fake_index),
        patch.object(run_pipeline, "index_chunks_batch") as mock_index_batch,
    ):
        summary = run_pipeline.run()

    assert mock_fetch_prec.call_count == 2
    assert summary["prec_cases"] == 1  # 618513은 예외로 제외, 622745만 반영됨
    assert summary["expc_cases"] == 1
    assert mock_index_batch.call_count >= 1


def test_run_indexes_prec_results_in_batches_without_holding_entire_dataset(monkeypatch):
    # I3(OOM): INDEX_BATCH_SIZE보다 많은 판례가 있으면, 전부 모았다가 한 번에
    # 인덱싱하는 게 아니라 배치 크기가 찰 때마다 즉시 인덱싱하고 그 배치를
    # 비워야 한다 — 실제 Render 512MB 무료 인스턴스에서 전체 일괄 인덱싱 방식이
    # OOM으로 프로세스를 죽이는 것을 확인했다.
    monkeypatch.setattr(run_pipeline.settings, "LAW_API_OC", "test-oc")
    monkeypatch.setattr(run_pipeline.time, "sleep", lambda s: None)
    monkeypatch.setattr(run_pipeline, "INDEX_BATCH_SIZE", 3)

    law_search_result = [
        {"법령일련번호": "280405", "법령명한글": "소득세법", "법령구분명": "법률"},
    ]
    # 배치 크기(3)보다 많은 7건의 판례
    prec_search_result = [{"판례일련번호": str(i)} for i in range(7)]
    expc_search_result = []

    law_detail = {"조문": {"조문단위": []}}

    def fake_search(target, query, oc):
        return {"law": law_search_result, "prec": prec_search_result, "expc": expc_search_result}[target]

    def fake_fetch_prec(prec_id, oc):
        return {"사건번호": prec_id, "사건명": "x", "판시사항": "", "판결요지": "", "참조조문": ""}

    fake_index = MagicMock()
    batch_sizes = []

    def fake_index_chunks_batch(index, chunks):
        if chunks:
            batch_sizes.append(len(chunks))

    with (
        patch.object(run_pipeline.law_api_client, "search", side_effect=fake_search),
        patch.object(run_pipeline.law_api_client, "fetch_law", return_value=law_detail),
        patch.object(run_pipeline.law_api_client, "fetch_prec", side_effect=fake_fetch_prec),
        patch.object(run_pipeline, "reset_law_api_collection", return_value=fake_index),
        patch.object(run_pipeline, "index_chunks_batch", side_effect=fake_index_chunks_batch),
    ):
        summary = run_pipeline.run()

    # 7건이 배치 크기 3으로 나뉘면: 3, 3, 1 (마지막 나머지) — 어느 배치도
    # 배치 크기를 넘지 않아야 한다.
    assert all(size <= 3 for size in batch_sizes)
    assert sum(batch_sizes) == 7
    assert summary["prec_cases"] == 7


def test_run_caps_prec_items_at_max_prec_items(monkeypatch):
    # OOM 재수정: 배치 처리로도 못 막는 ChromaDB 자체의 누적 메모리 사용량 때문에,
    # 검색 결과가 아무리 많아도(실제로는 1000건 이상) 한 번 실행에서 처리하는
    # 총량 자체를 MAX_PREC_ITEMS로 제한해야 한다.
    monkeypatch.setattr(run_pipeline.settings, "LAW_API_OC", "test-oc")
    monkeypatch.setattr(run_pipeline.time, "sleep", lambda s: None)
    monkeypatch.setattr(run_pipeline, "MAX_PREC_ITEMS", 5)

    law_search_result = [
        {"법령일련번호": "280405", "법령명한글": "소득세법", "법령구분명": "법률"},
    ]
    # 실제로는 1000건 이상 나올 수 있는 상황을 흉내낸 20건
    prec_search_result = [{"판례일련번호": str(i)} for i in range(20)]
    expc_search_result = []

    law_detail = {"조문": {"조문단위": []}}

    def fake_search(target, query, oc):
        return {"law": law_search_result, "prec": prec_search_result, "expc": expc_search_result}[target]

    def fake_fetch_prec(prec_id, oc):
        return {"사건번호": prec_id, "사건명": "x", "판시사항": "", "판결요지": "", "참조조문": ""}

    fake_index = MagicMock()

    with (
        patch.object(run_pipeline.law_api_client, "search", side_effect=fake_search),
        patch.object(run_pipeline.law_api_client, "fetch_law", return_value=law_detail),
        patch.object(run_pipeline.law_api_client, "fetch_prec", side_effect=fake_fetch_prec) as mock_fetch_prec,
        patch.object(run_pipeline, "reset_law_api_collection", return_value=fake_index),
        patch.object(run_pipeline, "index_chunks_batch"),
    ):
        summary = run_pipeline.run()

    # 검색 결과가 20건이어도 MAX_PREC_ITEMS(5)만큼만 실제로 fetch/인덱싱해야 한다.
    assert mock_fetch_prec.call_count == 5
    assert summary["prec_cases"] == 5
    # 다만 전체 검색 결과 건수(20)는 요약에 별도로 남겨서, 실제로 얼마나
    # 제한됐는지 운영자가 알 수 있게 한다.
    assert summary["prec_cases_available"] == 20
