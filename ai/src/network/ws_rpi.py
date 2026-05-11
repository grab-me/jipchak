import asyncio
import json
import time
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..session_manager import SessionManager
from ..stream.relay_hub import RelayHub
from ..stream.unpacker import FrameUnpacker


def _sync_infer_grasp(session_manager: SessionManager, session_id: str):
    """infer_grasp를 동기 컨텍스트에서 실행하기 위한 래퍼."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(session_manager.infer_grasp(session_id))
    finally:
        loop.close()


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
        infer_interval: float = 1.0
        infer_state = {"running": False}

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
                        await session_manager.on_frame(
                            current_session, frame.color_2d, frame.depth_3d
                        )

                # ③ 주기적 파지 확률 추론 → 별도 스레드에서 실행 (이벤트 루프 블로킹 방지)
                now = time.monotonic()
                if (current_session
                        and now - last_infer_time >= infer_interval
                        and not infer_state["running"]):
                    last_infer_time = now
                    infer_state["running"] = True
                    asyncio.create_task(
                        _run_inference(
                            session_manager, current_session,
                            relay_hub, infer_state,
                        )
                    )

        except WebSocketDisconnect:
            pass
        finally:
            if current_session is not None:
                await session_manager.stop(current_session)
            print(f"[ws_rpi] disconnected")

    return router


async def _run_inference(
    session_manager: SessionManager,
    session_id: str,
    relay_hub: RelayHub,
    infer_state: dict,
) -> None:
    """추론을 스레드 풀에서 실행하여 메인 이벤트 루프를 블로킹하지 않는다."""
    try:
        t0 = time.monotonic()
        grasp = await asyncio.to_thread(
            _sync_infer_grasp, session_manager, session_id
        )
        elapsed = (time.monotonic() - t0) * 1000
        if grasp:
            print(f"[ws_rpi] inference {elapsed:.0f}ms conf={grasp['confidence']:.3f}")
            score_data = {
                "event": "GRASP_SCORE",
                "confidence": grasp["confidence"],
                "center_px": grasp["center_px"],
                "width_px": grasp.get("width_px", 0.0),
            }
            if "detections" in grasp:
                score_data["detections"] = grasp["detections"]
            await relay_hub.broadcast_text(json.dumps(score_data).encode())
    except Exception as e:
        print(f"[ws_rpi] inference error: {e}")
    finally:
        infer_state["running"] = False


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
