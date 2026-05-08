"""
파지점 추론 서비스.
GraspPipeline (three-jaw-grasp) 을 감싸서
RGB-D 프레임 → 최적 파지점 (x_mm, y_mm) 를 반환한다.
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
    """
    프레임 → 파지점 추론 서비스.

    사용법:
        service = GraspService(checkpoint_path="path/to/model.pth")
        result = service.infer(rgb, depth)
        # result.x_mm, result.y_mm → Arduino 로 전달
    """

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        evaluator_type: str = "chick",
        device: str = "cpu",
        intrinsics: Optional[CameraIntrinsics] = None,
        detector_threshold: float = 0.35,
        detector_target_labels: Optional[list] = None,
    ):
        self.intrinsics = intrinsics or CameraIntrinsics()
        self.device = device
        self._pipeline = None
        self._checkpoint_path = checkpoint_path
        self._evaluator_type = evaluator_type
        self._detector_threshold = detector_threshold
        self._detector_target_labels = detector_target_labels

    def load(self) -> None:
        """모델 로드. 서버 시작 시 한 번만 호출."""
        from three_jaw_grasp.pipeline import GraspPipeline
        from three_jaw_grasp.factory import ModelFactory, AdapterFactory, EvaluatorFactory
        from three_jaw_grasp.detector import SSDLiteDetector

        # GR-ConvNet 모델
        import external_models.grconvnet.plugin  # noqa: F401 (register)
        model = ModelFactory.create(
            "grconvnet",
            checkpoint_path=self._checkpoint_path,
            device=self.device,
        )

        adapter = AdapterFactory.create("grconvnet")

        # Evaluator (register decorator 트리거)
        import three_jaw_grasp.evaluator_chick  # noqa: F401
        evaluator = EvaluatorFactory.create(self._evaluator_type)

        detector = SSDLiteDetector(
            score_threshold=self._detector_threshold,
            target_labels=self._detector_target_labels,
            device=self.device,
        )

        self._pipeline = GraspPipeline(
            model=model,
            adapter=adapter,
            evaluator=evaluator,
            detector=detector,
        )
        print("[GraspService] pipeline loaded")

    def pixel_to_mm(
        self, px_x: float, px_y: float, depth_mm: float
    ) -> tuple:
        """
        pixel 좌표 + depth(mm) → 카메라 좌표계 mm.
        X_mm = (px_x - cx) * depth_mm / fx
        Y_mm = (px_y - cy) * depth_mm / fy
        """
        intr = self.intrinsics
        x_mm = (px_x - intr.cx) * depth_mm / intr.fx
        y_mm = (px_y - intr.cy) * depth_mm / intr.fy
        return x_mm, y_mm

    def infer(self, rgb: np.ndarray, depth: np.ndarray) -> Optional[GraspResult]:
        """
        RGB-D 프레임으로 최적 파지점을 추론한다.

        Parameters
        ----------
        rgb : np.ndarray (H, W, 3) uint8 BGR
        depth : np.ndarray (H, W) uint16 mm 단위

        Returns
        -------
        GraspResult or None (추론 실패 시)
        """
        if self._pipeline is None:
            raise RuntimeError("load()를 먼저 호출하세요")

        depth_m = depth.astype(np.float32) / 1000.0 if depth is not None else None

        try:
            best = self._pipeline.predict_best(rgb, depth_m)
        except ValueError:
            return None

        px_x, px_y = best.center_x, best.center_y
        ix, iy = int(round(px_x)), int(round(px_y))

        depth_at_center_mm = 0.0
        if depth is not None:
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
            confidence=best.original_score,
            center_px=(px_x, px_y),
            width_px=best.width,
            angle_rad=best.angle,
        )
