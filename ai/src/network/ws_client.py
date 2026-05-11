"""
WebSocket 클라이언트 - EC2 서버로 D435 데이터 전송

특징:
    - 재연결 자동 처리 (연결 끊기면 재시도)
    - 전송 실패 시 프레임 드랍 (버퍼 쌓지 않음)
    - 연결 상태 외부에서 확인 가능
"""

import asyncio
import json
import uuid
from typing import Optional

import websockets
from websockets.exceptions import ConnectionClosed


class WebSocketClient:

    def __init__(
        self,
        url: str,
        retry_interval: float = 3.0,
    ) -> None:
        """
        Args:
            url:            EC2 WebSocket 주소 (예: ws://1.2.3.4:8000/ws/camera)
            retry_interval: 재연결 대기 시간 (초)
        """
        self.url = url
        self.retry_interval = retry_interval
        self.session_id = f"rpi-d435-{uuid.uuid4().hex[:8]}"

        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._connected = False
        self._stop = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    async def connect(self) -> None:
        """EC2 서버에 연결. 끊기면 자동 재연결."""
        while not self._stop:
            try:
                print(f"[WS] connecting to {self.url} ...")
                async with websockets.connect(self.url, max_size=None) as ws:
                    self._ws = ws
                    self._connected = True
                    print(f"[WS] connected | session={self.session_id}")

                    # 연결 시작 알림
                    await ws.send(json.dumps({
                        "event": "START",
                        "session_id": self.session_id,
                        "source": "d435",
                    }))

                    # 연결 유지 (서버가 닫을 때까지)
                    await ws.wait_closed()

            except Exception as e:
                print(f"[WS] disconnected: {e}")
            finally:
                self._ws = None
                self._connected = False

            if not self._stop:
                print(f"[WS] retrying in {self.retry_interval}s ...")
                await asyncio.sleep(self.retry_interval)

    async def send_binary(self, data: bytes) -> bool:
        """
        바이너리 데이터 전송.
        연결 안 됐거나 실패하면 False 반환 (프레임 드랍).
        """
        if not self._connected or self._ws is None:
            return False
        try:
            await self._ws.send(data)
            return True
        except ConnectionClosed:
            self._connected = False
            return False
        except Exception as e:
            print(f"[WS] send error: {e}")
            return False

    async def stop(self) -> None:
        """클라이언트 종료."""
        self._stop = True
        if self._ws is not None:
            try:
                await self._ws.send(json.dumps({
                    "event": "STOP",
                    "session_id": self.session_id,
                }))
                await self._ws.close()
            except Exception:
                pass
        print("[WS] stopped")