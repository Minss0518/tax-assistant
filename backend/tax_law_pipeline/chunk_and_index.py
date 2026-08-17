"""law/prec/expc 파싱 결과를 청크로 만들고 별도 ChromaDB 컬렉션(tax_law_api_v1)에
인덱싱한다.

재실행할 때마다 컬렉션을 통째로 삭제하고 새로 만든다 — upsert 대신 전체 재구축을 택해
법 개정 전/후 조문이 동시에 검색되는 문제를 없앤다 (설계 문서 [5]번 참고).
"""

import chromadb
from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.chroma import ChromaVectorStore

from app.services.rag_service import CHROMA_PATH, LAW_API_COLLECTION_NAME, init_llama_settings
from tax_law_pipeline.clean_text import clean_text


def build_law_chunks(articles: list[dict], law_name: str) -> list[dict]:
    chunks = []
    for unit in articles:
        content = clean_text(unit.get("조문내용", ""))
        if not content:
            continue
        article_no = unit.get("조문번호", "")
        branch_no = unit.get("조문가지번호")
        article_label = f"제{article_no}조의{branch_no}" if branch_no else f"제{article_no}조"
        chunks.append(
            {
                "text": content,
                "file_name": f"{law_name} {article_label}",
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
    except chromadb.errors.NotFoundError:
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
