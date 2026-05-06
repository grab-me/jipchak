import numpy as np

from src.inference.judge import CatchJudge


def test_dummy_judge_always_returns_caught():
    judge = CatchJudge()
    result = judge.judge(
        color_frame=(np.random.rand(60, 80, 3) * 255).astype(np.uint8),
        depth_frame=(np.random.rand(60, 80) * 1000).astype(np.uint16),
    )
    assert result.is_caught is True
    assert result.confidence == 1.0
    assert result.method == "dummy"


def test_dummy_judge_works_with_no_frames():
    judge = CatchJudge()
    result = judge.judge()
    assert result.is_caught is True
