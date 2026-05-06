import asyncio
from dataclasses import dataclass, field
from typing import Dict, Optional

import numpy as np

from .inference.judge import CatchJudge
from .network.spring_client import SpringClient
from .recorder.video_recorder import VideoRecorder


@dataclass
class GameSession:
    """게임 한 판의 컨텍스트"""
    session_id: str
    last_color_frame: Optional[np.ndarray] = None
    last_depth_frame: Optional[np.ndarray] = None
    frame_count: int = 0
    started: bool = False


class SessionManager:
    """
    세션 시작/프레임 적재/세션 종료 -> 판정 -> Spring 전송 의 일련 흐름을 조율한다.

    의존성은 외부에서 주입(DI)하여 단위 테스트가 가능하게 한다.
    """

    def __init__(
        self,
        recorder: VideoRecorder,
        judge: CatchJudge,
        spring: SpringClient,
    ) -> None:
        self._recorder = recorder
        self._judge = judge
        self._spring = spring
        self._sessions: Dict[str, GameSession] = {}
        self._lock = asyncio.Lock()

    async def start(self, session_id: str) -> None:
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
            session.last_depth_frame = depth_frame

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
        )
        print(
            f"[SessionManager] session={session_id} frames={session.frame_count} "
            f"judge={result}"
        )

        return await self._spring.upload_game_log(
            video_path=video_path,
            is_success=result.is_caught,
        )
