from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings
from llama_index.core.prompts import PromptTemplate
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
import chromadb
from app.config import settings as app_settings
from typing import AsyncGenerator, Tuple
from openai import AsyncOpenAI
import re

CHROMA_PATH = "./chroma_db"
RAG_DATA_PATH = "./rag_data"

TAX_SYSTEM_PROMPT = PromptTemplate(
    """당신은 대한민국 10년 경력의 전문 세무사입니다. 
프리랜서와 크리에이터를 전문으로 상담하며, 소득세법·부가가치세법·국세기본법에 정통합니다.

아래 참고 문서를 바탕으로 질문에 답변해주세요.

[참고 문서]
{context_str}

[질문]
{query_str}

답변 형식을 반드시 지켜주세요:

**핵심 답변**
질문에 대한 핵심 내용을 2-3문장으로 명확하게 설명해주세요.

**상세 설명**
구체적인 내용, 조건, 기준 금액 등을 설명해주세요.

**실무 적용 팁**
프리랜서/크리에이터가 실제로 적용할 수 있는 실용적인 조언을 해주세요.

**주의사항**
놓치기 쉬운 주의사항이나 예외 케이스가 있으면 알려주세요.

※ 참고 문서에 없는 내용은 일반적인 세무 지식을 바탕으로 답변하되, 반드시 전문가 상담을 권유해주세요.
※ 금액, 기한, 세율 등 구체적인 수치는 정확하게 명시해주세요.
"""
)

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
    "양도세": "양도소득세",
    "증여세": "증여세",
    "상속세": "상속세",
    "근소세": "근로소득세",
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

def extract_sources(nodes) -> str:
    """참조된 노드에서 법령 출처 추출"""
    sources = set()
    law_patterns = [
        r'소득세법\s*제\d+조',
        r'부가가치세법\s*제\d+조',
        r'국세기본법\s*제\d+조',
        r'법인세법\s*제\d+조',
        r'근로기준법\s*제\d+조',
        r'고용보험법\s*제\d+조',
        r'국민연금법\s*제\d+조',
    ]
    
    for node in nodes:
        text = node.node.text if hasattr(node, 'node') else str(node)
        for pattern in law_patterns:
            matches = re.findall(pattern, text)
            for m in matches:
                sources.add(m.strip())
    
    if sources:
        return "\n\n📚 **참고 법령:** " + ", ".join(sorted(sources))
    return ""

def init_llama_settings():
    Settings.llm = OpenAI(
        model="gpt-4o-mini",
        api_key=app_settings.OPENAI_API_KEY,
        temperature=0.1,
        max_tokens=1500,
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
    query_engine = index.as_query_engine(
        similarity_top_k=5,
        text_qa_template=TAX_SYSTEM_PROMPT,
    )
    response = query_engine.query(rewritten)
    answer = str(response)
    
    # 출처 추출 후 답변에 추가
    if hasattr(response, 'source_nodes'):
        sources = extract_sources(response.source_nodes)
        if sources:
            answer += sources
    
    return answer

async def stream_tax_knowledge(question: str) -> AsyncGenerator[str, None]:
    rewritten = await rewrite_question(question)
    index = get_or_create_index()
    query_engine = index.as_query_engine(
        similarity_top_k=5,
        streaming=True,
        text_qa_template=TAX_SYSTEM_PROMPT,
    )
    streaming_response = query_engine.query(rewritten)
    
    for token in streaming_response.response_gen:
        yield token
    
    # 스트리밍 완료 후 출처 추가
    if hasattr(streaming_response, 'source_nodes'):
        sources = extract_sources(streaming_response.source_nodes)
        if sources:
            yield sources