from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..stream.relay_hub import RelayHub


def build_router(relay_hub: RelayHub) -> APIRouter:
    """
    React 브라우저용 WebSocket 엔드포인트를 만든다.

    브라우저는 ws://<host>/ws/stream 에 접속해서
    msgpack(JPEG/LZ4) 페이로드를 수신한다.
    디코딩 책임은 클라이언트에 있다(단순 fan-out).
    """
    router = APIRouter()

    @router.websocket("/ws/stream")
    async def stream_ws(ws: WebSocket) -> None:
        await ws.accept()
        await relay_hub.subscribe(ws)
        try:
            # 브라우저는 송신할 일이 없지만 ping/close를 수신해야 하므로 receive 로 대기.
            # disconnect 메시지를 받은 직후 다시 receive() 를 호출하면 starlette 가
            # RuntimeError 를 던지므로, type 을 보고 명시적으로 break.
            while True:
                msg = await ws.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
        except WebSocketDisconnect:
            pass
        finally:
            await relay_hub.unsubscribe(ws)

    return router
