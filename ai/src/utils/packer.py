"""
FramePacker - D435 전용 페이로드 패킹

패킹 포맷:
    {
        "timestamp":      int   (time.time_ns())
        "color_3d":       bytes (JPEG, D435 RGB)
        "depth_3d":       bytes (LZ4 압축된 uint16 raw)
        "depth_3d_shape": tuple (H, W)
    }

color_2d는 웹캠 전용이므로 여기선 빈 bytes로 고정.
"""

import time
from typing import Optional

import cv2
import lz4.frame
import msgpack
import numpy as np


class FramePacker:

    @staticmethod
    def pack(
        color_3d: Optional[np.ndarray],
        depth_3d: Optional[np.ndarray],
        jpeg_quality: int = 60,
    ) -> Optional[bytes]:
        """
        D435 RGB + Depth를 하나의 msgpack 페이로드로 직렬화.

        Args:
            color_3d:     D435 RGB (uint8 HxWx3 BGR)
            depth_3d:     D435 Depth (uint16 HxW, mm)
            jpeg_quality: JPEG 압축 품질 (낮을수록 용량↓, 화질↓)

        Returns:
            msgpack bytes or None (데이터 없을 때)
        """
        # RGB → JPEG
        color_bytes = b""
        if color_3d is not None:
            ok, jpg = cv2.imencode(
                ".jpg", color_3d,
                [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality],
            )
            if ok:
                color_bytes = jpg.tobytes()

        # Depth → LZ4 압축
        depth_bytes = b""
        depth_shape: tuple = ()
        if depth_3d is not None:
            depth_bytes = lz4.frame.compress(depth_3d.tobytes())
            depth_shape = depth_3d.shape

        # 둘 다 없으면 전송 안 함
        if not color_bytes and not depth_bytes:
            return None

        payload = {
            "timestamp":      time.time_ns(),
            "color_2d":       b"",          # 웹캠 전용, D435에선 빈 값
            "color_3d":       color_bytes,
            "depth_3d":       depth_bytes,
            "depth_3d_shape": depth_shape,
        }
        return msgpack.packb(payload)

    @staticmethod
    def unpack(data: bytes) -> Optional[dict]:
        """
        msgpack 페이로드 언패킹.
        dummy_server.py 또는 EC2 서버에서 사용.

        Returns:
            {
                "timestamp":      int
                "color_3d":       np.ndarray (uint8 HxWx3) or None
                "depth_3d":       np.ndarray (uint16 HxW)  or None
                "depth_3d_shape": tuple
            }
        """
        try:
            raw = msgpack.unpackb(data)

            # color_3d 디코딩
            color_3d = None
            color_bytes = raw.get(b"color_3d", b"")
            if color_bytes:
                arr = np.frombuffer(color_bytes, dtype=np.uint8)
                color_3d = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            # depth_3d 디코딩
            depth_3d = None
            depth_bytes = raw.get(b"depth_3d", b"")
            depth_shape = tuple(raw.get(b"depth_3d_shape", ()))
            if depth_bytes and depth_shape:
                decompressed = lz4.frame.decompress(depth_bytes)
                depth_3d = np.frombuffer(decompressed, dtype=np.uint16).reshape(depth_shape)

            return {
                "timestamp":      raw.get(b"timestamp", 0),
                "color_3d":       color_3d,
                "depth_3d":       depth_3d,
                "depth_3d_shape": depth_shape,
            }

        except Exception as e:
            print(f"[FramePacker] unpack error: {e}")
            return None