# Probability v1: 합성 데이터로 학습 파이프라인 검증

## 목적

`ai/three_jaw_grasp/trainer.py` + `data_logger.py` + `feature_extractor.py` 가
실제 하드웨어 데이터 없이도 end-to-end로 동작하는지 확인.

실제 데이터 수집 전에 학습 인프라의 버그/차원 불일치/수렴성 등을 미리 잡는다.

## 흐름

1. `generate_synthetic.py` → `data/synthetic_log.jsonl` (~200건)
2. `train_test.py` → `models/evaluator_synthetic.pth`
3. (추후) `analyze_scores.py` → 학습 모델 vs rule-based 점수 분포 비교

## 합성 데이터 설계

- `FeatureExtractor.FEATURE_DIM = 19` 차원의 vector
- 각 feature는 정규/균일 분포에서 샘플링 (현실적인 범위)
- success 라벨은 feature 조합으로 결정:
  - `width` 가 이상값(55px) 부근이면 +
  - `neck_capture` 지표(여기선 합성 변수)가 높으면 +
  - `support` 가 높으면 +
- 노이즈 ~10% 섞어서 완벽 학습 방지

## 주의

이 폴더는 **실험 격리** 용도. 운영 코드(`ai/three_jaw_grasp/`, `ai/src/`)는 손대지 않는다.
