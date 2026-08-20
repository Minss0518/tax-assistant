"""law/prec/expc 파싱 결과를 청크로 만들고 별도 ChromaDB 컬렉션(tax_law_api_v1)에
인덱싱한다.

재실행할 때마다 컬렉션을 통째로 삭제하고 새로 만든다 — upsert 대신 전체 재구축을 택해
법 개정 전/후 조문이 동시에 검색되는 문제를 없앤다 (설계 문서 [5]번 참고).

인덱싱 자체은 reset_law_api_collection() + index_chunks_batch()로 나뉘어 있다.
컬렉션 삭제/재생성은 한 번만 하고, 문서 추가는 작은 배치 단위로 반복 호출해야
한다 — 판례가 1000건이 넘는데 전체를 한 번에 메모리에 올려서 임베딩하면 무료
호스팅 환경(Render 512MB)에서 실제로 OOM으로 프로세스가 강제 종료되는 것을
확인했다.

배치로 나눠도 여전히 OOM이 재현됐는데, 원인은 청크 리스트 크기가 아니라
`VectorStoreIndex.insert()`를 같은 인덱스 객체에 계속 호출하면 그 인덱스의
내부 docstore(모든 삽입 문서의 메타데이터/해시를 담는 인메모리 dict)가 파이프라인
실행 내내 계속 누적되기 때문이었다 — 배치 크기를 줄여도 "같은 index 객체에 총
몇 건을 넣었는가"에 비례해서 계속 커진다. 그래서 이제는 VectorStoreIndex를 아예
쓰지 않고, ChromaVectorStore에 직접 노드를 임베딩해서 add()하는 저수준 경로로
우회한다 — 배치가 끝나면 그 배치의 노드/임베딩은 참조가 사라져 GC되고, 어떤
객체도 누적 상태를 들고 있지 않는다.
"""

import chromadb
from llama_index.core import Document, Settings
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


def reset_law_api_collection(chroma_path: str | None = None) -> ChromaVectorStore:
    """tax_law_api_v1 컬렉션을 삭제 후 빈 상태로 재생성하고, index_chunks_batch()로
    바로 채워넣을 수 있는 ChromaVectorStore를 반환한다. 파이프라인 실행당 한 번만
    호출한다.

    VectorStoreIndex가 아니라 ChromaVectorStore를 직접 반환하는 이유: 파이프라인
    실행 내내 하나의 VectorStoreIndex 객체를 계속 재사용하면(.insert() 반복 호출)
    그 인덱스의 내부 docstore가 무한정 누적되어 OOM을 일으킨다(위 모듈 docstring
    참고). ChromaVectorStore만 반환하면 그런 누적 상태 자체가 없다."""
    init_llama_settings()
    chroma_client = chromadb.PersistentClient(path=chroma_path or CHROMA_PATH)

    try:
        chroma_client.delete_collection(name=LAW_API_COLLECTION_NAME)
    except chromadb.errors.NotFoundError:
        pass  # 첫 실행이면 컬렉션이 아직 없음

    collection = chroma_client.get_or_create_collection(LAW_API_COLLECTION_NAME)
    return ChromaVectorStore(chroma_collection=collection)


def index_chunks_batch(vector_store: ChromaVectorStore, chunks: list[dict]) -> None:
    """청크 배치 하나를 노드로 쪼개고 임베딩해서 vector_store에 직접 추가한다.
    VectorStoreIndex를 거치지 않는다 — 배치가 끝나면 이 배치의 노드/임베딩에 대한
    참조가 전부 사라져 GC되고, 다음 배치로 넘어갈 때 아무 상태도 남지 않는다.
    호출자가 작은 배치로 나눠서 반복 호출해야 전체 데이터셋을 한 번에 메모리에
    모으지 않는다."""
    if not chunks:
        return

    documents = [
        Document(text=chunk["text"], metadata={"file_name": chunk["file_name"], **chunk["metadata"]})
        for chunk in chunks
    ]
    splitter = SentenceSplitter(chunk_size=2048, chunk_overlap=0)
    nodes = splitter.get_nodes_from_documents(documents)

    texts = [node.get_content() for node in nodes]
    embeddings = Settings.embed_model.get_text_embedding_batch(texts)
    for node, embedding in zip(nodes, embeddings):
        node.embedding = embedding

    vector_store.add(nodes)
