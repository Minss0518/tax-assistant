from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
import chromadb
from app.config import settings as app_settings
from typing import AsyncGenerator

CHROMA_PATH = "./chroma_db"
RAG_DATA_PATH = "./rag_data"

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
    index = get_or_create_index()
    query_engine = index.as_query_engine(similarity_top_k=3)
    response = query_engine.query(question)
    return str(response)

async def stream_tax_knowledge(question: str) -> AsyncGenerator[str, None]:
    index = get_or_create_index()
    query_engine = index.as_query_engine(
        similarity_top_k=3,
        streaming=True,
    )
    streaming_response = query_engine.query(question)
    for token in streaming_response.response_gen:
        yield token