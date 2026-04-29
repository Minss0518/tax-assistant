from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from app.database import get_db
from app.models.chat import ChatHistory
from app.core.dependencies import get_current_user
from app.services.rag_service import query_tax_knowledge, stream_tax_knowledge
import uuid
import json
import asyncio

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

@router.post("/")
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    user_msg = ChatHistory(
        id=uuid.uuid4(),
        user_id=user_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    await db.commit()

    answer = await query_tax_knowledge(request.message)

    ai_msg = ChatHistory(
        id=uuid.uuid4(),
        user_id=user_id,
        role="assistant",
        content=answer,
    )
    db.add(ai_msg)
    await db.commit()

    return {"answer": answer}

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    user_msg = ChatHistory(
        id=uuid.uuid4(),
        user_id=user_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    await db.commit()

    full_answer = []

    async def event_generator():
        try:
            async for token in stream_tax_knowledge(request.message):
                full_answer.append(token)
                yield f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0)  # 버퍼 즉시 플러시

            answer = "".join(full_answer)
            ai_msg = ChatHistory(
                id=uuid.uuid4(),
                user_id=user_id,
                role="assistant",
                content=answer,
            )
            db.add(ai_msg)
            await db.commit()

            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
        }
    )

@router.get("/history")
async def get_chat_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatHistory).where(
            ChatHistory.user_id == uuid.UUID(current_user["sub"])
        ).order_by(ChatHistory.created_at.asc())
    )
    history = result.scalars().all()
    return [{"role": h.role, "content": h.content} for h in history]

@router.delete("/history")
async def clear_chat_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        delete(ChatHistory).where(
            ChatHistory.user_id == uuid.UUID(current_user["sub"])
        )
    )
    await db.commit()
    return {"message": "대화 기록이 초기화되었습니다."}