import json
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..session_manager import SessionManager
from ..stream.relay_hub import RelayHub


def build_router(relay_hub: RelayHub, session_manager: SessionManager) -> APIRouter:
    """
    React 브라우저용 WebSocket 엔드포인트.

    수신:
      - 텍스트 `{"event":"REQUEST_START"}` : 브라우저 시작 버튼. 활성 세션 없으면
        새 session_id 발급 후 SESSION_START broadcast. 이미 있으면 START_REJECTED 회신.

    송신: msgpack 프레임 + JSON 이벤트 (RelayHub fan-out).
    """
    router = APIRouter()

    @router.websocket("/ws/stream")
    async def stream_ws(ws: WebSocket) -> None:
        await ws.accept()
        await relay_hub.subscribe(ws)
        try:
            while True:
                msg = await ws.receive()
                if msg.get("type") == "websocket.disconnect":
                    break

                text = msg.get("text")
                if not text:
                    continue

                try:
                    data = json.loads(text)
                except json.JSONDecodeError:
                    continue

                if data.get("event") == "REQUEST_START":
                    await _handle_request_start(ws, session_manager, relay_hub)

        except WebSocketDisconnect:
            pass
        finally:
            await relay_hub.unsubscribe(ws)

    return router


async def _handle_request_start(
    ws: WebSocket,
    session_manager: SessionManager,
    relay_hub: RelayHub,
) -> None:
    active = session_manager.get_active_session_id()
    if active is not None:
        # 다른 노트북/탭에서 이미 진행 중. 요청 보낸 브라우저에만 거부 알림.
        try:
            await ws.send_text(json.dumps({
                "event": "START_REJECTED",
                "reason": "session_in_progress",
                "active_session_id": active,
            }))
        except Exception:
            pass
        return

    session_id = f"session_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    await session_manager.start(session_id)
    await relay_hub.broadcast_text(json.dumps({
        "event": "SESSION_START",
        "session_id": session_id,
    }).encode())
    print(f"[ws_browser] REQUEST_START -> SESSION_START broadcast: {session_id}")
