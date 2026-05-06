import asyncio
from typing import Set

from fastapi import WebSocket


class RelayHub:
    """
    RPi에서 받은 영상을 구독 중인 브라우저(WebSocket)들에게 fan-out 한다.

    - subscribe()로 새 브라우저 연결을 등록
    - unsubscribe()로 끊긴 브라우저 제거
    - broadcast()로 한 프레임을 전체 구독자에게 즉시 송신
    - 송신 실패한 클라이언트는 자동 정리 (느린 클라이언트가 전체를 막지 않게)
    """

    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.add(ws)
        print(f"[RelayHub] subscribed (total={len(self._clients)})")

    async def unsubscribe(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)
        print(f"[RelayHub] unsubscribed (total={len(self._clients)})")

    async def broadcast(self, payload: bytes) -> None:
        if not self._clients:
            return

        # 송신 중 set이 변경되지 않게 스냅샷
        async with self._lock:
            targets = list(self._clients)

        # 모든 클라이언트에 동시 송신, 실패한 것만 수거
        results = await asyncio.gather(
            *[self._safe_send(ws, payload) for ws in targets],
            return_exceptions=False,
        )
        dead = [ws for ws, ok in zip(targets, results) if not ok]
        if dead:
            async with self._lock:
                for ws in dead:
                    self._clients.discard(ws)
            print(f"[RelayHub] cleaned {len(dead)} dead client(s)")

    @staticmethod
    async def _safe_send(ws: WebSocket, payload: bytes) -> bool:
        try:
            await ws.send_bytes(payload)
            return True
        except Exception:
            return False

    @property
    def subscriber_count(self) -> int:
        return len(self._clients)
