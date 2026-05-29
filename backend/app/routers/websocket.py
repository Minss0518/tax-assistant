from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(tags=["websocket"])

# 채팅방별 연결 관리
# { consultation_id: [ws1, ws2, ...] }
active_connections: Dict[str, List[WebSocket]] = {}


async def connect(consultation_id: str, websocket: WebSocket):
    await websocket.accept()
    if consultation_id not in active_connections:
        active_connections[consultation_id] = []
    active_connections[consultation_id].append(websocket)


def disconnect(consultation_id: str, websocket: WebSocket):
    if consultation_id in active_connections:
        active_connections[consultation_id].remove(websocket)
        if not active_connections[consultation_id]:
            del active_connections[consultation_id]


async def broadcast(consultation_id: str, message: dict):
    if consultation_id in active_connections:
        for ws in active_connections[consultation_id]:
            await ws.send_text(json.dumps(message, ensure_ascii=False))


@router.websocket("/ws/consultation/{consultation_id}")
async def consultation_websocket(websocket: WebSocket, consultation_id: str):
    await connect(consultation_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # 같은 방의 모든 연결에 브로드캐스트
            await broadcast(consultation_id, {
                "type": "message",
                "sender_type": message.get("sender_type"),
                "sender_id": message.get("sender_id"),
                "content": message.get("content"),
                "created_at": message.get("created_at")
            })

    except WebSocketDisconnect:
        disconnect(consultation_id, websocket)
        await broadcast(consultation_id, {
            "type": "system",
            "content": "상대방이 연결을 끊었습니다."
        })