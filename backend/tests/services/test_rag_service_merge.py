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


def test_retrieve_context_degrades_gracefully_when_law_api_retrieval_raises():
    pdf_retriever = MagicMock()
    pdf_retriever.retrieve.return_value = [_fake_node("PDF 문서 내용", 0.7, "income_tax_law.pdf")]
    pdf_index = MagicMock()
    pdf_index.as_retriever.return_value = pdf_retriever

    with (
        patch.object(rag_service, "get_or_create_index", return_value=pdf_index),
        patch.object(rag_service, "get_or_create_law_api_index", side_effect=Exception("chroma error")),
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
