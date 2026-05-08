"""
파지점 추론 서비스.
GR-ConvNet (GraspInfer) 을 직접 사용하여
RGB-D 프레임 → 최적 파지 확률 (confidence) 을 반환한다.
"""
from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class GraspResult:
    x_mm: float
    y_mm: float
    z_mm: float
    confidence: float
    center_px: tuple  # (x, y) pixel
    width_px: float
    angle_rad: float


@dataclass
class CameraIntrinsics:
    fx: float = 616.9276
    fy: float = 616.8445
    cx: float = 318.5520
    cy: float = 237.0734


class GraspService:

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        device: str = "cpu",
        intrinsics: Optional[CameraIntrinsics] = None,
    ):
        self.intrinsics = intrinsics or CameraIntrinsics()
        self.device = device
        self._checkpoint_path = checkpoint_path
        self._infer = None

    def load(self) -> None:
        if self._checkpoint_path is None:
            print("[GraspService] no checkpoint — dummy mode")
            return

        from external_models.grconvnet.infer import GraspInfer
        self._infer = GraspInfer(
            checkpoint=self._checkpoint_path,
            device=self.device,
        )
        print("[GraspService] loaded")

    @property
    def is_ready(self) -> bool:
        return self._infer is not None

    def pixel_to_mm(
        self, px_x: float, px_y: float, depth_mm: float
    ) -> tuple:
        intr = self.intrinsics
        x_mm = (px_x - intr.cx) * depth_mm / intr.fx
        y_mm = (px_y - intr.cy) * depth_mm / intr.fy
        return x_mm, y_mm

    def infer(self, rgb: np.ndarray, depth: np.ndarray) -> Optional[GraspResult]:
        """
        RGB-D 프레임으로 최적 파지점을 추론한다.

        Parameters
        ----------
        rgb : np.ndarray (H, W, 3) uint8
        depth : np.ndarray (H, W) uint16 mm 단위

        Returns
        -------
        GraspResult or None
        """
        if self._infer is None:
            return None

        depth_m = depth.astype(np.float32) / 1000.0 if depth is not None else None
        if depth_m is None:
            return None

        try:
            candidates = self._infer.predict(
                rgb, depth_m,
                top_k=1,
                peak_threshold=0.2,
            )
        except (ValueError, Exception):
            return None

        if not candidates:
            return None

        best = candidates[0]
        px_x, px_y = best.x, best.y
        ix, iy = int(round(px_x)), int(round(px_y))

        depth_at_center_mm = 0.0
        h, w = depth.shape
        if 0 <= iy < h and 0 <= ix < w:
            depth_at_center_mm = float(depth[iy, ix])

        if depth_at_center_mm > 0:
            x_mm, y_mm = self.pixel_to_mm(px_x, px_y, depth_at_center_mm)
        else:
            x_mm, y_mm = 0.0, 0.0

        return GraspResult(
            x_mm=x_mm,
            y_mm=y_mm,
            z_mm=depth_at_center_mm,
            confidence=best.score,
            center_px=(px_x, px_y),
            width_px=0.0,
            angle_rad=0.0,
        )
