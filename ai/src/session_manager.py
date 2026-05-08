import asyncio
from dataclasses import dataclass
from typing import Dict, Optional

import numpy as np

from .inference.judge import CatchJudge
from .inference.grasp_service import GraspService
from .network.spring_client import SpringClient
from .recorder.video_recorder import VideoRecorder


@dataclass
class GameSession:
    """게임 한 판의 컨텍스트"""
    session_id: str
    first_depth_frame: Optional[np.ndarray] = None
    last_color_frame: Optional[np.ndarray] = None
    last_depth_frame: Optional[np.ndarray] = None
    frame_count: int = 0
    started: bool = False


class SessionManager:
    """
    세션 시작/프레임 적재/세션 종료 -> 판정 -> Spring 전송 의 일련 흐름을 조율한다.

    동시성 가정: 하나의 session_id는 단일 RPi WebSocket 핸들러에서만
    on_frame을 호출한다. 따라서 on_frame은 동기 시퀀스로 race-free 이며,
    여러 session_id 사이의 dict 조작만 lock으로 보호한다.

    의존성은 외부에서 주입(DI)하여 단위 테스트가 가능하게 한다.
    """

    def __init__(
        self,
        recorder: VideoRecorder,
        judge: CatchJudge,
        spring: SpringClient,
        grasp_service: Optional["GraspService"] = None,
    ) -> None:
        self._recorder = recorder
        self._judge = judge
        self._spring = spring
        self._grasp = grasp_service
        self._sessions: Dict[str, GameSession] = {}
        self._lock = asyncio.Lock()

    async def start(self, session_id: str) -> None:
        """
        새 세션 시작. 이미 같은 session_id가 진행 중이면
        기존 세션을 먼저 정리하여 녹화 파일이 누수되지 않게 한다.
        """
        async with self._lock:
            existing = self._sessions.pop(session_id, None)
        if existing is not None:
            print(f"[SessionManager] duplicate START for {session_id}, closing previous")
            self._recorder.stop_session(session_id)

        async with self._lock:
            self._sessions[session_id] = GameSession(session_id=session_id)
        print(f"[SessionManager] session started: {session_id}")

    async def on_frame(
        self,
        session_id: Optional[str],
        color_frame: Optional[np.ndarray],
        depth_frame: Optional[np.ndarray],
    ) -> None:
        if not session_id:
            return  # 세션 없는 프레임은 릴레이 전용으로만 처리됨

        session = self._sessions.get(session_id)
        if session is None:
            return

        # 첫 컬러 프레임이 도착했을 때 녹화 시작 (실제 해상도를 알아야 하므로)
        if not session.started and color_frame is not None:
            try:
                self._recorder.start_session(session_id, color_frame.shape)
                session.started = True
            except Exception as e:
                print(f"[SessionManager] recorder start failed: {e}")
                return

        if color_frame is not None:
            session.last_color_frame = color_frame
            session.frame_count += 1
            self._recorder.write(session_id, color_frame)

        if depth_frame is not None:
            if session.first_depth_frame is None:
                session.first_depth_frame = depth_frame.copy()
            session.last_depth_frame = depth_frame

    async def infer_grasp(self, session_id: str) -> Optional[dict]:
        """현재 세션의 마지막 프레임으로 파지점 추론."""
        session = self._sessions.get(session_id)
        if session is None or self._grasp is None:
            return None
        if session.last_color_frame is None:
            return None

        result = self._grasp.infer(session.last_color_frame, session.last_depth_frame)
        if result is None:
            return None

        data = {
            "x_mm": result.x_mm,
            "y_mm": result.y_mm,
            "z_mm": result.z_mm,
            "confidence": result.confidence,
            "center_px": list(result.center_px),
            "width_px": result.width_px,
            "angle_rad": result.angle_rad,
        }
        print(f"[SessionManager] grasp inferred: x={result.x_mm:.1f}mm y={result.y_mm:.1f}mm conf={result.confidence:.2f}")
        return data

    async def stop(self, session_id: str) -> Optional[dict]:
        """녹화 종료 -> 판정 -> Spring 업로드. Spring 응답을 반환."""
        async with self._lock:
            session = self._sessions.pop(session_id, None)

        if session is None:
            print(f"[SessionManager] unknown session: {session_id}")
            return None

        video_path = self._recorder.stop_session(session_id)
        if video_path is None:
            print(f"[SessionManager] no video produced for {session_id}")
            return None

        result = self._judge.judge(
            color_frame=session.last_color_frame,
            depth_frame=session.last_depth_frame,
            first_depth_frame=session.first_depth_frame,
        )
        print(
            f"[SessionManager] session={session_id} frames={session.frame_count} "
            f"judge={result}"
        )

        return await self._spring.upload_game_log(
            video_path=video_path,
            is_success=result.is_caught,
        )
