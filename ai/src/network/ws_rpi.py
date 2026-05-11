import json
import time
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
        last_infer_time: float = 0.0
        infer_interval: float = 1.0  # 초당 1회 추론

        try:
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break

                # 텍스트 = 제어 신호
                if "text" in msg and msg["text"] is not None:
                    current_session = await _apply_control(
                        msg["text"], session_manager, relay_hub, current_session
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
                        # D435는 color_3d, 웹캠은 color_2d를 사용
                        color_frame = frame.color_3d if frame.color_3d is not None else frame.color_2d
                        await session_manager.on_frame(
                            current_session, color_frame, frame.depth_3d
                        )

                # ③ 주기적 파지 확률 추론 → 브라우저로 전송
                now = time.monotonic()
                if current_session and now - last_infer_time >= infer_interval:
                    last_infer_time = now
                    grasp = await session_manager.infer_grasp(current_session)
                    if grasp:
                        # grasp는 이미 ThreeJawGraspService에서 GRASP_POSE JSON 형태로 만들어 반환됨
                        await relay_hub.broadcast_text(
                            json.dumps(grasp).encode()
                        )
                    else:
                        # 감지된 객체가 없으면 빈 오버레이 전송하여 화면 지우기
                        await relay_hub.broadcast_text(json.dumps({
                            "event": "GRASP_POSE",
                            "confidence": 0.0,
                            "center_x": 0,
                            "center_y": 0,
                            "angle_rad": 0,
                            "radius": 0,
                            "jaw_count": 0,
                            "image_width": 0,
                            "image_height": 0
                        }).encode())

        except WebSocketDisconnect:
            pass
        finally:
            if current_session is not None:
                await session_manager.stop(current_session)
            print(f"[ws_rpi] disconnected")

    return router


async def _apply_control(
    text: str,
    session_manager: SessionManager,
    relay_hub: RelayHub,
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
        await relay_hub.broadcast_text(json.dumps({
            "event": "SESSION_START",
            "session_id": session_id,
        }).encode())
        return session_id

    if event == "STOP" and session_id:
        result = await session_manager.stop(session_id)
        judge = session_manager.last_judge_result
        await relay_hub.broadcast_text(json.dumps({
            "event": "GAME_RESULT",
            "session_id": session_id,
            "is_caught": judge.is_caught if judge else False,
            "confidence": judge.confidence if judge else 0.0,
        }).encode())
        return None

    print(f"[ws_rpi] unknown control: {data}")
    return current_session
