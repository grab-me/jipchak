import numpy as np
from typing import List, Optional
from .candidate import GraspCandidate

class FeatureExtractor:
    """
    GraspCandidate를 평가 모델용 특징 벡터로 변환.
    """
    FEATURE_DIM = 19  # 기본 7 + 깊이 8 + 모양 4

    def extract(self, grasp: GraspCandidate, depth: Optional[np.ndarray] = None) -> np.ndarray:
        """
        단일 파지 후보에 대한 특징 추출.
        """
        # 기본 특징 (7개)
        features = [
            grasp.width,
            grasp.original_score,
            grasp.center_z,
            np.sin(grasp.angle),
            np.cos(grasp.angle)
        ]

        # Depth 기반 추가 특징 (8개)
        if depth is not None:
            depth_patch = self._get_depth_patch(grasp, depth)
            valid_depth_patch = depth_patch[depth_patch > 0] # 0이 아닌 유효한 깊이 값만 사용

            features.extend([
                np.mean(depth_patch),
                np.min(depth_patch),
                np.max(depth_patch),
                np.median(depth_patch),
                np.percentile(depth_patch, 25),
                np.percentile(depth_patch, 75),
                # 개선: 센서 무효값 비율과 표면 굴곡으로 분리
                np.mean(depth_patch == 0), # sensor_invalid_ratio
                np.std(valid_depth_patch) if valid_depth_patch.size > 0 else 0.0, # depth_roughness
            ])
        else:
            features.extend([0.0] * 8)

        # 모양 기반 추가 특징 (6개 -> 4개)e
        # center_x, center_y를 대체하는 상대 좌표 2개 추가
        features.extend(self._shape_features(grasp, depth))

        return np.array(features, dtype=np.float32)

    def extract_batch(self, candidates: List[GraspCandidate], depth: Optional[np.ndarray] = None) -> np.ndarray:
        """
        학습 또는 추론 시 배치 처리를 위한 특징 추출.
        """
        features_list = [self.extract(c, depth) for c in candidates]
        return np.stack(features_list)

    def _get_depth_patch(self, grasp: GraspCandidate, depth: np.ndarray, size: int = 20) -> np.ndarray:
        """
        파지 중심 주변의 depth 맵 패치 추출.
        주 좌표계 불일치 시 보정 로직이 필요할 수 있음.
        """
        h, w = depth.shape
        # 단순화를 위해 center_x, center_y를 픽셀 좌표로 가정 (현실적으로는 좌표계 변환 필요)
        cx, cy = int(grasp.center_x), int(grasp.center_y)
        
        x1 = max(0, cx - size // 2)
        x2 = min(w, cx + size // 2)
        y1 = max(0, cy - size // 2)
        y2 = min(h, cy + size // 2)
        
        patch = depth[y1:y2, x1:x2]
        if patch.size == 0:
            return np.zeros((size, size))
        return patch

    def _shape_features(self, grasp: GraspCandidate, depth: Optional[np.ndarray]) -> list:
        """인형의 전체적인 모양과 관련된 특징 4개를 추출합니다."""
        if getattr(grasp, "mask", None) is None:
            return [0.0] * 4

        # 마스크의 바운딩 박스 계산
        rows = np.any(grasp.mask, axis=1)
        cols = np.any(grasp.mask, axis=0)
        if not np.any(rows) or not np.any(cols):
            return [0.0] * 4
        
        y_min, y_max = np.where(rows)[0][[0, -1]]
        x_min, x_max = np.where(cols)[0][[0, -1]]

        h = float(y_max - y_min)
        w = float(x_max - x_min)

        aspect_ratio = h / (w + 1e-6)

        # 마스크의 열별 너비 표준편차 (정규화)
        col_widths = np.sum(grasp.mask, axis=0)[x_min:x_max]
        width_variance = np.std(col_widths) / (w + 1e-6) if w > 0 else 0.0

        # 개선: 절대 좌표를 인형 기준 상대 좌표로 변경
        relative_grasp_x = (grasp.center_x - x_min) / (w + 1e-6)
        relative_grasp_y = (grasp.center_y - y_min) / (h + 1e-6)

        return [
            aspect_ratio, 
            width_variance, 
            # center_x, center_y를 대체
            relative_grasp_x, 
            relative_grasp_y
        ]
