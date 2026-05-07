from pathlib import Path
from typing import Optional

import httpx

from ..config import SPRING_API_BASE_URL, SPRING_GAME_LOG_PATH


class SpringClient:
    """
    Spring Boot 백엔드에 게임 결과(영상 + 성공여부)를 전송한다.

    Spring 측 컨트롤러는 backend/src/main/java/.../GameLogController 의
    multipart/form-data 엔드포인트를 사용한다:
        - field 'isSuccess' : "true"/"false"
        - field 'video'     : mp4 파일
    """

    def __init__(self) -> None:
        self.base_url = SPRING_API_BASE_URL.rstrip("/")
        self._client = httpx.AsyncClient(timeout=30.0)

    async def upload_game_log(self, video_path: str, is_success: bool) -> Optional[dict]:
        url = f"{self.base_url}{SPRING_GAME_LOG_PATH}"
        path = Path(video_path)

        if not path.exists():
            print(f"[SpringClient] video file not found: {video_path}")
            return None

        try:
            with path.open("rb") as f:
                files = {"video": (path.name, f, "video/mp4")}
                data = {"isSuccess": "true" if is_success else "false"}
                resp = await self._client.post(url, files=files, data=data)
                resp.raise_for_status()
                return resp.json() if resp.content else {}
        except httpx.HTTPError as e:
            print(f"[SpringClient] upload failed: {e}")
            return None

    async def close(self) -> None:
        await self._client.aclose()
