from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models.user
import app.models.transaction
import app.models.chat
import app.models.subscription
from app.routers import auth, transactions, chat, ocr
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="AI 세무 비서", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://tax-assistant-production-ef21.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(chat.router)
app.include_router(ocr.router)

# 프론트엔드 정적 파일 서빙
frontend_dist = os.path.join(os.path.dirname(__file__), "../../../frontend/dist")
print(f"frontend_dist path: {frontend_dist}")
print(f"exists: {os.path.exists(frontend_dist)}")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(frontend_dist, "index.html"))