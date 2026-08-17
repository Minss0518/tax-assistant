from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models.tax_calculation
from app.config import settings
from app.database import engine, Base
import app.models.user
import app.models.transaction
import app.models.chat
import app.models.subscription
import app.models.consultation
from app.routers.ai_insights import router as ai_insights_router
from app.routers import auth, transactions, chat, ocr, users, upload, payments, tax_calculator, tax_agent
from app.routers import advisor_auth, consultations, websocket
from app.tax_agent.checkpointer import to_psycopg_dsn
from app.tax_agent.graph import build_graph
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    from psycopg.rows import dict_row
    from psycopg_pool import AsyncConnectionPool

    dsn = to_psycopg_dsn(settings.DATABASE_URL)
    # Use a pool (instead of a single from_conn_string() connection) so the
    # process doesn't wedge for the rest of its lifetime if the one
    # connection drops (e.g. behind pgbouncer/Supabase's pooler). autocommit
    # + prepare_threshold=0 match what AsyncPostgresSaver.from_conn_string()
    # sets, and are required for pgbouncer transaction-pooling compatibility.
    async with AsyncConnectionPool(
        conninfo=dsn,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        open=False,
    ) as pool:
        await pool.open(wait=True)
        checkpointer = AsyncPostgresSaver(conn=pool)
        await checkpointer.setup()
        app.state.tax_agent_graph = build_graph(checkpointer)
        yield

app = FastAPI(title="AI 세무 비서", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://tax-assistant-production-ef21.up.railway.app",
        "https://tax-assistant-dsyc.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(chat.router)
app.include_router(ocr.router)
app.include_router(users.router)
app.include_router(upload.router)
app.include_router(payments.router)
app.include_router(tax_calculator.router)
app.include_router(tax_agent.router)
app.include_router(ai_insights_router)
app.include_router(advisor_auth.router)
app.include_router(consultations.router)
app.include_router(websocket.router)

frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(frontend_dist, "index.html"))