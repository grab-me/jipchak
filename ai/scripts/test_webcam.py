"""
노트북 웹캠으로 실시간 영상을 캡처하여 AI 서버로 전송하는 테스트 스크립트입니다.
D435 카메라가 없을 때 노트북의 기본 웹캠을 사용하여 병아리 인식 및 파지점 오버레이를 테스트할 수 있습니다.
"""
import argparse
import asyncio
import json
import time
import uuid

import cv2
import lz4.frame
import msgpack
import numpy as np
import websockets


def make_payload(color_bgr: np.ndarray, h: int, w: int) -> bytes:
    """웹캠의 BGR 프레임을 받아서 RPi의 FramePacker 형식으로 패킹합니다."""
    # 화질 80으로 JPEG 압축
    ok, jpeg = cv2.imencode(".jpg", color_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    jpeg_bytes = jpeg.tobytes() if ok else b""

    # Depth는 500mm로 고정된 더미 데이터 사용 (YOLO는 RGB만 사용하므로 무방함)
    depth = np.full((h, w), 500, dtype=np.uint16)
    depth_lz4 = lz4.frame.compress(depth.tobytes())

    payload = {
        "timestamp": time.time_ns(),
        "color_2d": jpeg_bytes, # Cam1 (2D)
        "color_3d": jpeg_bytes, # Cam2 (3D) - 오버레이 테스트를 위해 똑같은 영상을 넣음
        "depth_3d": depth_lz4,
        "depth_3d_shape": depth.shape,
    }
    return msgpack.packb(payload)


async def run(url: str, camera_id: int, fps: int) -> None:
    session_id = f"mock-webcam-{uuid.uuid4().hex[:8]}"
    interval = 1.0 / fps

    print(f"[test_webcam] 웹캠({camera_id})을 여는 중...")
    cap = cv2.VideoCapture(camera_id)
    if not cap.isOpened():
        print(f"[test_webcam] 오류: 웹캠({camera_id})을 열 수 없습니다.")
        return

    # 해상도 설정
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[test_webcam] 웹캠 시작됨: {actual_w}x{actual_h}")

    print(f"[test_webcam] 서버에 연결 중: {url} ...")
    try:
        async with websockets.connect(url, max_size=None) as ws:
            print(f"[test_webcam] 연결 완료! session_id={session_id}")
            
            await ws.send(json.dumps({"event": "START", "session_id": session_id}))
            print(f"[test_webcam] START 신호 전송 (종료하려면 Ctrl+C를 누르세요)")

            sent = 0
            start_time = time.time()
            
            try:
                while True:
                    loop_start = time.monotonic()
                    
                    ok, frame = cap.read()
                    if not ok:
                        print("[test_webcam] 웹캠에서 프레임을 읽을 수 없습니다.")
                        break
                        
                    payload = make_payload(frame, actual_h, actual_w)
                    await ws.send(payload)
                    sent += 1
                    
                    if sent % 30 == 0:
                        elapsed = time.time() - start_time
                        print(f"[test_webcam] {sent} 프레임 전송됨... ({sent/elapsed:.1f} fps)")

                    # FPS 맞추기
                    elapsed_loop = time.monotonic() - loop_start
                    await asyncio.sleep(max(interval - elapsed_loop, 0))

            except asyncio.CancelledError:
                pass
            except websockets.ConnectionClosed:
                print("[test_webcam] 서버와의 연결이 끊어졌습니다.")
            except KeyboardInterrupt:
                pass
            
            # 종료 신호 전송
            try:
                await ws.send(json.dumps({"event": "STOP", "session_id": session_id}))
                print(f"\n[test_webcam] STOP 신호 전송, 스트리밍 종료")
            except Exception:
                pass

    except ConnectionRefusedError:
        print("[test_webcam] 오류: 서버 연결이 거부되었습니다. AI 서버가 켜져 있는지 확인하세요.")
    finally:
        cap.release()
        print("[test_webcam] 웹캠 자원 해제됨")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="ws://localhost:8000/ws/camera")
    p.add_argument("--camera", type=int, default=0, help="사용할 웹캠 장치 번호 (기본: 0)")
    p.add_argument("--fps", type=int, default=15, help="전송할 FPS (기본: 15)")
    args = p.parse_args()
    
    try:
        asyncio.run(run(args.url, args.camera, args.fps))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
