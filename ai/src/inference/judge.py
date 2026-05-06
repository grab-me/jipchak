from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class JudgeResult:
    """잡힘 판정 결과"""
    is_caught: bool
    confidence: float       # 0.0 ~ 1.0
    method: str             # 'dummy' | 'depth_threshold' | 'model_v1' ...


class CatchJudge:
    """
    영상에서 인형이 잡혔는지 판정한다.

    현재 단계: 더미 (항상 True). 추후 단계 확장 예정:
      1) Depth 임계값 기반 (numpy 연산만)
      2) RGB + Depth 결합 룰
      3) 학습된 모델 추론 (ONNX/PyTorch)
    """

    def __init__(self) -> None:
        self.method = "dummy"

    def judge(
        self,
        color_frame: Optional[np.ndarray] = None,
        depth_frame: Optional[np.ndarray] = None,
    ) -> JudgeResult:
        # TODO: 실제 판정 로직 구현
        return JudgeResult(is_caught=True, confidence=1.0, method=self.method)
