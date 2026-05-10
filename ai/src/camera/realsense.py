"""
Intel RealSense D435 전용 카메라 모듈

역할:
    - RGB + Depth 동시 캡처 (픽셀단위 정렬)
    - RGB는 스트리밍용 (480p 저해상도)
    - Depth는 EC2에서 집게 위치 계산용

채널 매핑:
    payload["color_3d"]  ← D435 RGB   → 브라우저 오버레이 표시
    payload["depth_3d"]  ← D435 Depth → EC2 집게 위치/확률 계산

의존성:
    pip install pyrealsense2 numpy opencv-python-headless lz4
"""

from typing import Optional
import numpy as np
import pyrealsense2 as rs


class RealSenseCamera:
    """
    D435 RGB + Depth 동시 캡처.
    RGB와 Depth는 align 필터로 픽셀단위 동기화.
    """

    def __init__(
        self,
        width: int = 424,
        height: int = 240,
        fps: int = 15,
    ) -> None:
        """
        Args:
            width:  스트림 해상도 너비 (D435 지원: 424, 640, 848, 1280)
            height: 스트림 해상도 높이 (D435 지원: 240, 480)
            fps:    초당 프레임 수 (부하 고려해 15 권장)
        """
        self.width = width
        self.height = height
        self.fps = fps

        self._pipeline: Optional[rs.pipeline] = None
        self._align: Optional[rs.align] = None
        self.depth_scale: float = 0.001  # 기본값 (start() 후 실제값으로 갱신)

    def start(self) -> None:
        """D435 파이프라인 시작."""
        self._pipeline = rs.pipeline()
        config = rs.config()

        # RGB 스트림 (스트리밍용)
        config.enable_stream(
            rs.stream.color,
            self.width, self.height,
            rs.format.bgr8,
            self.fps,
        )
        # Depth 스트림 (계산용)
        config.enable_stream(
            rs.stream.depth,
            self.width, self.height,
            rs.format.z16,
            self.fps,
        )

        profile = self._pipeline.start(config)

        # Depth를 RGB 좌표계 기준으로 정렬 (픽셀단위 동기화)
        self._align = rs.align(rs.stream.color)

        # depth_scale: raw uint16 → 미터 변환 계수
        depth_sensor = profile.get_device().first_depth_sensor()
        self.depth_scale = depth_sensor.get_depth_scale()

        print(
            f"[RealSense] started: {self.width}x{self.height} @ {self.fps}fps "
            f"| depth_scale={self.depth_scale:.4f}m"
        )

    def get_frames(self) -> tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """
        RGB + Depth 프레임을 동기화해서 반환.

        Returns:
            (color_bgr, depth_mm)
            color_bgr: uint8 HxWx3  BGR 이미지
            depth_mm:  uint16 HxW   거리값 (mm 단위, raw z16)
            실패 시 (None, None)
        """
        if self._pipeline is None:
            return None, None

        try:
            # timeout 500ms (15fps 기준 66ms 간격이므로 여유 있음)
            frames = self._pipeline.wait_for_frames(timeout_ms=500)
            aligned = self._align.process(frames)

            color_frame = aligned.get_color_frame()
            depth_frame = aligned.get_depth_frame()

            if not color_frame or not depth_frame:
                return None, None

            color_arr = np.asanyarray(color_frame.get_data())   # uint8 HxWx3
            depth_arr = np.asanyarray(depth_frame.get_data())   # uint16 HxW (mm)

            return color_arr, depth_arr

        except Exception as e:
            print(f"[RealSense] frame error: {e}")
            return None, None

    def stop(self) -> None:
        """파이프라인 종료."""
        if self._pipeline is not None:
            try:
                self._pipeline.stop()
            except Exception:
                pass
            self._pipeline = None
        print("[RealSense] stopped")