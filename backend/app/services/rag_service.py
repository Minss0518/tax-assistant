from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
import chromadb
from app.config import settings as app_settings
from typing import AsyncGenerator
from openai import AsyncOpenAI

CHROMA_PATH = "./chroma_db"
RAG_DATA_PATH = "./rag_data"

# 줄임말/동의어 사전
TAX_SYNONYMS = {
    "종소세": "종합소득세",
    "부가세": "부가가치세",
    "법세": "법인세",
    "원천세": "원천징수세",
    "소득세": "종합소득세",
    "3.3%": "3.3% 원천징수",
    "4대보험": "4대 사회보험",
    "국민연금": "국민연금 보험료",
    "건보": "건강보험료",
    "실업급여": "고용보험 실업급여",
}

def normalize_question(question: str) -> str:
    for short, full in TAX_SYNONYMS.items():
        question = question.replace(short, full)
    return question

async def rewrite_question(question: str) -> str:
    normalized = normalize_question(question)
    client = AsyncOpenAI(api_key=app_settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """당신은 세무 질문 최적화 전문가입니다.
사용자의 질문을 세무 법령 검색에 최적화된 형태로 변환해주세요.
- 줄임말은 정식 용어로 변환 (예: 종소세 → 종합소득세)
- 모호한 표현은 구체적으로 변환
- 핵심 세무 키워드를 포함
- 원래 질문의 의도를 유지
- 변환된 질문만 출력하고 다른 말은 하지 마세요"""
            },
            {"role": "user", "content": normalized}
        ],
        max_tokens=200,
        temperature=0.1,
    )
    return response.choices[0].message.content.strip()

def init_llama_settings():
    Settings.llm = OpenAI(
        model="gpt-4o-mini",
        api_key=app_settings.OPENAI_API_KEY
    )
    Settings.embed_model = OpenAIEmbedding(
        model="text-embedding-3-small",
        api_key=app_settings.OPENAI_API_KEY
    )

def get_or_create_index():
    init_llama_settings()
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = chroma_client.get_or_create_collection("tax_documents")
    vector_store = ChromaVectorStore(chroma_collection=collection)

    if collection.count() > 0:
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_vector_store(vector_store, storage_context=storage_context)
    else:
        documents = SimpleDirectoryReader(RAG_DATA_PATH).load_data()
        splitter = SentenceSplitter(chunk_size=512, chunk_overlap=50)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            transformations=[splitter]
        )
    return index

async def query_tax_knowledge(question: str) -> str:
    rewritten = await rewrite_question(question)
    index = get_or_create_index()
    query_engine = index.as_query_engine(similarity_top_k=3)
    response = query_engine.query(rewritten)
    return str(response)

async def stream_tax_knowledge(question: str) -> AsyncGenerator[str, None]:
    rewritten = await rewrite_question(question)
    index = get_or_create_index()
    query_engine = index.as_query_engine(
        similarity_top_k=3,
        streaming=True,
    )
    streaming_response = query_engine.query(rewritten)
    # 동기 generator를 async generator로 변환
    for token in streaming_response.response_gen:
        yield token