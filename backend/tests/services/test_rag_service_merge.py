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


def test_retrieve_context_guarantees_minimum_law_api_results_even_when_outscored():
    # PDF 청크(512자)가 법령 API 청크(최대 2048자)보다 코사인 유사도 점수가
    # 체계적으로 높게 나오는 경향이 있어서, 순수 점수 기반 병합만 쓰면 PDF가
    # 상위 5개를 전부 차지해 새로 인덱싱한 법령 API 데이터가 전혀 노출되지 않는
    # 문제가 실사용 중 확인됐다. 법령 API 결과는 점수와 무관하게 최소
    # LAW_API_MERGE_FLOOR개는 보장돼야 한다.
    pdf_retriever = MagicMock()
    pdf_retriever.retrieve.return_value = [
        _fake_node(f"PDF 문서 내용 {i}", 0.9, f"pdf_{i}.pdf") for i in range(5)
    ]
    pdf_index = MagicMock()
    pdf_index.as_retriever.return_value = pdf_retriever

    law_api_retriever = MagicMock()
    law_api_retriever.retrieve.return_value = [
        _fake_node("API 판례 A", 0.2, "판례 A"),
        _fake_node("API 판례 B", 0.1, "판례 B"),
    ]
    law_api_index = MagicMock()
    law_api_index.as_retriever.return_value = law_api_retriever

    with (
        patch.object(rag_service, "get_or_create_index", return_value=pdf_index),
        patch.object(rag_service, "get_or_create_law_api_index", return_value=law_api_index),
    ):
        result = rag_service.retrieve_context("종합소득세 계산 방법")

    assert "API 판례 A" in result
    assert "API 판례 B" in result


def test_merge_with_law_api_floor_fills_remaining_slots_by_score():
    pdf_nodes = [_fake_node(f"pdf{i}", score, f"pdf{i}") for i, score in enumerate([0.9, 0.8, 0.7, 0.6, 0.5])]
    law_api_nodes = [_fake_node("law0", 0.2, "law0"), _fake_node("law1", 0.1, "law1")]

    merged = rag_service.merge_with_law_api_floor(pdf_nodes, law_api_nodes)

    assert len(merged) == 5
    assert law_api_nodes[0] in merged
    assert law_api_nodes[1] in merged
    # 나머지 3자리는 점수 순으로 PDF 상위 3개가 채워야 한다.
    assert pdf_nodes[0] in merged
    assert pdf_nodes[1] in merged
    assert pdf_nodes[2] in merged


def test_merge_with_law_api_floor_handles_fewer_law_api_results_than_floor():
    pdf_nodes = [_fake_node(f"pdf{i}", score, f"pdf{i}") for i, score in enumerate([0.9, 0.8, 0.7, 0.6, 0.5])]
    law_api_nodes = [_fake_node("law0", 0.2, "law0")]

    merged = rag_service.merge_with_law_api_floor(pdf_nodes, law_api_nodes)

    assert len(merged) == 5
    assert law_api_nodes[0] in merged


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
