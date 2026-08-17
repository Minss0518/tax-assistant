from unittest.mock import patch

import chromadb
import pytest
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


def test_build_law_chunks_appends_branch_number_to_avoid_citation_collision():
    # I3: 소득세법 제20조는 base article(조문가지번호 없음) 외에도 제20조의2,
    # 제20조의3(연금소득) 처럼 조문가지번호가 붙은 서로 다른 조문이 실존한다.
    # 조문가지번호를 무시하면 셋 다 "소득세법 제20조"라는 동일한 인용으로
    # 뭉개져 사용자에게 잘못된 출처가 노출된다.
    articles = [
        {
            "조문번호": "20",
            "조문가지번호": "3",
            "조문시행일자": "20260101",
            "조문제목": "연금소득",
            "조문내용": "제20조의3(연금소득) 연금소득은...",
        }
    ]
    chunks = build_law_chunks(articles, law_name="소득세법")
    assert chunks[0]["file_name"] == "소득세법 제20조의3"


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


def test_rebuild_law_api_collection_does_not_swallow_non_notfound_errors(tmp_path, monkeypatch):
    monkeypatch.setattr(Settings, "embed_model", MockEmbedding(embed_dim=8))
    monkeypatch.setattr(Settings, "llm", None)
    import tax_law_pipeline.chunk_and_index as cai
    monkeypatch.setattr(cai, "init_llama_settings", lambda: None)

    def raise_permission_error(self, name):
        raise PermissionError("simulated lock")

    # chromadb.PersistentClient is a factory function (not a class) that returns a
    # chromadb.api.client.Client instance, so we patch delete_collection on that
    # underlying class rather than on PersistentClient itself.
    with patch.object(chromadb.api.client.Client, "delete_collection", raise_permission_error):
        with pytest.raises(PermissionError):
            rebuild_law_api_collection(
                [{"text": "x", "file_name": "y", "metadata": {}}],
                chroma_path=str(tmp_path),
            )
