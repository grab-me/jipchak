import argparse
import cv2
from ultralytics import YOLO
import torch
import time
import os
import sys

# `python src/camera/test_camera_recognition.py` 형태로 실행해도
# `src.*` 절대 임포트가 되도록 프로젝트 루트를 sys.path에 추가한다.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.camera.realsense import RealSenseCamera

def main(args):
    """
    실시간 카메라 피드를 사용하여 YOLO 모델의 객체 인식 성능을 테스트하는 스크립트.
    """
    # 실행 위치에 상관없이 모델 경로를 올바르게 찾도록 수정
    weights_path = args.weights
    if not os.path.isabs(weights_path):
        # 이 스크립트 파일의 위치를 기준으로 프로젝트 루트를 계산 (src/camera/ -> jipchak/)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        weights_path = os.path.join(project_root, weights_path)

    if not os.path.exists(weights_path):
        print(f"[ERROR] Model weights not found at the specified path: '{weights_path}'")
        print(f"[INFO] Please make sure the file exists or provide the correct path using '--weights'.")
        return

    # 1. 모델 로드
    print(f"[INFO] Loading model from '{weights_path}'...")
    # 라즈베리파이와 같은 저사양 환경에서는 CPU를 명시적으로 지정하는 것이 안정적일 수 있습니다.
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = YOLO(weights_path)
    model.to(device)
    print(f"[INFO] Model loaded successfully on '{device}'.")

    # 2. 카메라 연결
    cap = None
    d435 = None
    if args.camera_type == "webcam":
        # /dev/video0에 해당하는 카메라를 엽니다. 여러 대일 경우 1, 2 등으로 변경
        cap = cv2.VideoCapture(args.camera_id)
        if not cap.isOpened():
            print(f"[ERROR] Cannot open webcam with ID: {args.camera_id}")
            return
    else:
        d435 = RealSenseCamera(
            width=args.rs_width,
            height=args.rs_height,
            fps=args.rs_fps,
        )
        try:
            d435.start()
        except Exception as e:
            print(f"[ERROR] Failed to start RealSense camera: {e}")
            return

    print(f"[INFO] Camera connected ({args.camera_type}). Press 'q' to quit.")

    # 3. 실시간 추론 및 시각화
    prev_time = 0
    while True:
        # 프레임 읽기
        if args.camera_type == "webcam":
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Failed to grab webcam frame. Exiting...")
                break
            depth_frame = None
        else:
            frame, depth_frame = d435.get_frames()
            if frame is None:
                continue

        # 모델 추론 수행
        # stream=True 옵션은 긴 비디오나 실시간 스트림에 더 효율적입니다.
        results = model(frame, stream=True, verbose=False, conf=args.conf)

        # 결과 시각화
        for r in results:
            # ultralytics의 plot() 함수는 바운딩 박스, 마스크 등을 그려줍니다.
            annotated_frame = r.plot()

            # 터미널에 인식된 객체 정보 출력
            boxes = r.boxes
            names = r.names
            for box in boxes:
                class_id = int(box.cls)
                class_name = names[class_id]
                confidence = float(box.conf)
                print(f"  [Detection] Class: {class_name}, Confidence: {confidence:.2f}")

            # FPS 계산 및 표시
            curr_time = time.time()
            if prev_time > 0:
                fps = 1 / (curr_time - prev_time)
                cv2.putText(annotated_frame, f"FPS: {int(fps)}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            prev_time = curr_time

            cv2.imshow("YOLO Real-time Recognition", annotated_frame)

            if depth_frame is not None and args.show_depth:
                # 깊이값(16bit)을 화면에 보기 좋게 컬러맵으로 변환
                depth_vis = cv2.convertScaleAbs(depth_frame, alpha=0.03)
                depth_vis = cv2.applyColorMap(depth_vis, cv2.COLORMAP_JET)
                cv2.imshow("RealSense Depth", depth_vis)

        # 'q' 키를 누르면 종료
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # 4. 자원 해제
    if cap is not None:
        cap.release()
    if d435 is not None:
        d435.stop()
    cv2.destroyAllWindows()
    print("[INFO] Resources released.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YOLO Real-time Camera Test")
    parser.add_argument("--weights", type=str, default="trained_models/best_v3.pt", help="Path to the YOLO model weights (.pt file)")
    parser.add_argument("--camera-type", type=str, choices=["webcam", "realsense"], default="webcam", help="Camera source type")
    parser.add_argument("--camera-id", type=int, default=0, help="ID of the camera device to use")
    parser.add_argument("--rs-width", type=int, default=640, help="RealSense width")
    parser.add_argument("--rs-height", type=int, default=480, help="RealSense height")
    parser.add_argument("--rs-fps", type=int, default=30, help="RealSense FPS")
    parser.add_argument("--show-depth", action="store_true", help="Show RealSense depth preview window")
    parser.add_argument("--conf", type=float, default=0.25, help="Object detection confidence threshold")
    args = parser.parse_args()
    main(args)
