import os
import numpy as np

# ai/three_jaw_grasp 패키지 사용 (ai/three-jaw-grasp 디렉토리는 docs/examples만)
from three_jaw_grasp import GraspPipeline
from three_jaw_grasp.adapters import YoloSegGraspAdapter
from three_jaw_grasp.evaluator_chick import ChickEvaluator


class YoloV8SegWrapper:
    """Ultralytics YOLOv8-seg 모델 래퍼"""
    def __init__(self, model_path: str):
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            self.valid = True
        except ImportError:
            print("[YoloV8SegWrapper] ultralytics 패키지가 설치되지 않았습니다.")
            self.valid = False
        except Exception as e:
            print(f"[YoloV8SegWrapper] 모델 로드 실패: {e}")
            self.valid = False
    
    def predict(self, rgb, depth=None, **kwargs):
        if not self.valid:
            return []
            
        # 1. YOLO 인식 (객체 탐지) - 조금 더 잘 찾도록 0.3으로 조정
        results = self.model.predict(rgb, conf=0.3, verbose=False)
        output = []
        for r in results:
            if r.masks is not None:
                masks = r.masks.data.cpu().numpy()
                boxes = r.boxes.xyxy.cpu().numpy()
                classes = r.boxes.cls.cpu().numpy()
                confs = r.boxes.conf.cpu().numpy()
                
                h, w = rgb.shape[:2]
                total_area = h * w
                
                for i in range(len(masks)):
                    # 1. 클래스 체크: 0번(병아리)만
                    if int(classes[i]) != 0:
                        continue

                    # 2. 크기 체크: 화면의 60% 이상 차지 시 제외 (너무 가까운 경우 등)
                    box = boxes[i]
                    bw, bh = box[2] - box[0], box[3] - box[1]
                    if (bw * bh) > (total_area * 0.6):
                        continue

                    m = masks[i]
                    if m.shape[0] != h or m.shape[1] != w:
                        import cv2
                        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_NEAREST)
                    
                    output.append({
                        'mask': m,
                        'box': boxes[i].tolist(),
                        'score': float(confs[i])
                    })
        return output


class ThreeJawGraspService:
    def __init__(self):
        self._pipeline = None
        self._image_wh = (640, 480) # D435 기본 해상도
        
    def load(self, model_path: str) -> None:
        """
        YOLOv8-seg 모델과 파이프라인 초기화
        """
        if not os.path.exists(model_path):
            print(f"[ThreeJawGraspService] 모델 파일을 찾을 수 없습니다: {model_path}")
            return
            
        model = YoloV8SegWrapper(model_path)
        adapter = YoloSegGraspAdapter()
        evaluator = ChickEvaluator(jaw_count=3)
        
        self._pipeline = GraspPipeline(model=model, adapter=adapter, evaluator=evaluator)
        print(f"[ThreeJawGraspService] Pipeline 로드 완료 (YOLO: {model_path})")

    def infer(self, color_bgr: np.ndarray, depth_mm: np.ndarray) -> dict | None:
        if self._pipeline is None:
            return None
            
        try:
            # depth를 미터 단위로 변환
            depth_m = None
            if depth_mm is not None:
                depth_m = depth_mm.astype('float32') / 1000.0
                
            best = self._pipeline.predict_best(color_bgr, depth_m)
            
            # 해상도 업데이트 (들어오는 영상 기준)
            if color_bgr is not None:
                h, w = color_bgr.shape[:2]
                self._image_wh = (w, h)
            else:
                w, h = self._image_wh
                
            # --- ChickEvaluator의 정교한 점수(목 조준 등) 가져오기 ---
            score_info = self._pipeline.evaluator.score_detail(best, depth_m)
            total_quality_score = score_info.get("total", best.original_score)

            # --- 조준 정확도 점수(Centering Score) 계산 ---
            # 카메라 중심(화면 중앙) 좌표
            cam_x, cam_y = w / 2, h / 2
            # 병아리 중심과 카메라 중심 사이의 거리
            dist = np.sqrt((best.center_x - cam_x)**2 + (best.center_y - cam_y)**2)
            
            # 인형의 크기(best.width)를 기준으로 거리에 따른 감점 요인 계산 (범위 0.8로 완화)
            sigma = best.width * 0.8 
            centering_weight = np.exp(- (dist**2) / (2 * (sigma**2)))
            
            # 최종 점수 = 병아리 파지 품질 점수(목 조준 포함) * 조준 가중치
            final_confidence = float(total_quality_score * centering_weight)

            # 최종 필터링: 점수가 아주 낮지 않으면 표시 (0.15)
            if final_confidence < 0.15:
                return None

            return {
                "event": "GRASP_POSE",
                "center_x": float(best.center_x),
                "center_y": float(best.center_y),
                "angle_rad": float(best.angle),
                "radius": float(best.width * 1.5),  #(인형 크기에 맞춰 배율 1.5로 상향)
                "jaw_count": 3,
                "confidence": final_confidence,
                "image_width": w,
                "image_height": h,
            }
        except ValueError as ve:
            # "탐지된 파지 후보가 없습니다." 등의 에러
            return None
        except Exception as e:
            print(f"[ThreeJawGraspService] infer error: {e}")
            return None
