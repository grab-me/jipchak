import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..session_manager import SessionManager
from ..stream.relay_hub import RelayHub
from ..stream.unpacker import FrameUnpacker


def build_router(relay_hub: RelayHub, session_manager: SessionManager) -> APIRouter:
    """
    RPi 전용 WebSocket 엔드포인트를 만든다.

    프로토콜:
      - 텍스트 메시지: JSON 제어 신호
            {"event": "START", "session_id": "..."}
            {"event": "STOP",  "session_id": "..."}
      - 바이너리 메시지: FramePacker가 만든 msgpack 페이로드
    """
    router = APIRouter()

    @router.websocket("/ws/camera")
    async def camera_ws(ws: WebSocket) -> None:
        await ws.accept()
        print(f"[ws_rpi] connected from {ws.client}")

        current_session: Optional[str] = None

        try:
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break

                # 텍스트 = 제어 신호
                if "text" in msg and msg["text"] is not None:
                    current_session = await _apply_control(
                        msg["text"], session_manager, current_session
                    )
                    continue

                # 바이너리 = 프레임
                payload: bytes = msg.get("bytes") or b""
                if not payload:
                    continue

                # ① 브라우저로 즉시 릴레이 (지연 최소화)
                await relay_hub.broadcast(payload)

                # ② 세션 활성 시 디코딩 → 녹화 + 마지막 프레임 보관
                if current_session is not None:
                    frame = FrameUnpacker.unpack(payload)
                    if frame is not None:
                        # 영상은 2D 웹캠을 우선, 없으면 3D color
                        color = frame.color_2d if frame.color_2d is not None else frame.color_3d
                        await session_manager.on_frame(
                            current_session, color, frame.depth_3d
                        )

        except WebSocketDisconnect:
            pass
        finally:
            # 연결이 끊어진 시점에 세션이 남아있으면 정리
            if current_session is not None:
                await session_manager.stop(current_session)
            print(f"[ws_rpi] disconnected")

    return router


async def _apply_control(
    text: str,
    session_manager: SessionManager,
    current_session: Optional[str],
) -> Optional[str]:
    """텍스트 제어 메시지 파싱 후 세션 상태 갱신. 갱신된 session_id 반환."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        print(f"[ws_rpi] invalid control msg: {text!r}")
        return current_session

    event = data.get("event")
    session_id = data.get("session_id")

    if event == "START" and session_id:
        await session_manager.start(session_id)
        return session_id

    if event == "STOP" and session_id:
        await session_manager.stop(session_id)
        return None

    print(f"[ws_rpi] unknown control: {data}")
    return current_session
