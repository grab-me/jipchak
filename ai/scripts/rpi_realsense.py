"""
라즈베리파이에서 Intel RealSense D435(SDK pyrealsense2) + 일반 USB 웹캠을
동시에 캡처해 AI 서버(/ws/camera) 로 송신.

이 스크립트의 차별점 (vs rpi_dual_camera.py):
    - D435 를 SDK 로 다룸 → 인덱스 변동·V4L2 lock 이슈 없음
    - depth_3d 도 함께 송신 (LZ4 압축, FramePacker 와 동일 포맷)
    - RGB-Depth 를 SDK 의 align 필터로 픽셀단위 동기화

채널 매핑 (사용자 목표 "Cam1=D435, Cam2=웹캠" 반영):
    - payload["color_2d"]  ← D435 RGB        → 브라우저 Cam1
    - payload["color_3d"]  ← 일반 USB 웹캠   → 브라우저 Cam2
    - payload["depth_3d"]  ← D435 Depth (LZ4 압축, uint16 mm)

의존성 (RPi):
    pip install opencv-python-headless msgpack websockets numpy lz4
    (pyrealsense2 는 librealsense2 빌드 후 venv 에 직접 복사한 상태)

사용 예:
    python3 rpi_realsense.py \
        --url ws://192.168.100.94:8000/ws/camera \
        --webcam '/dev/v4l/by-id/usb-Web_Camera_Web_Camera_240729163401-video-index0' \
        --width 640 --height 480 --fps 30
"""
import argparse
import asyncio
import json
import signal
import time
import uuid
from typing import Optional

import cv2
import lz4.frame
import msgpack
import numpy as np
import pyrealsense2 as rs
import websockets


_stop = asyncio.Event()


def _install_signal_handlers() -> None:
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _stop.set)
        except NotImplementedError:
            pass


# ---------- D435 (pyrealsense2) ----------

class RealSensePipeline:
    """D435 RGB + Depth 를 동시에 받고, 픽셀단위로 정렬한다."""

    def __init__(self, width: int, height: int, fps: int) -> None:
        self.pipeline = rs.pipeline()
        config = rs.config()
        config.enable_stream(rs.stream.color, width, height, rs.format.bgr8, fps)
        config.enable_stream(rs.stream.depth, width, height, rs.format.z16, fps)
        profile = self.pipeline.start(config)
        # color 좌표계 기준으로 depth 정렬 (RGB 픽셀과 같은 해상도/시점으로 매핑)
        self.align = rs.align(rs.stream.color)
        # depth_scale 은 raw uint16 값을 미터로 변환할 때만 필요. 현재는 raw 그대로 송신.
        depth_sensor = profile.get_device().first_depth_sensor()
        self.depth_scale = depth_sensor.get_depth_scale()
        print(f"[d435] started: {width}x{height} @ {fps} fps, depth_scale={self.depth_scale}")

    def get_frames(self) -> tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """(color BGR uint8 HxWx3, depth uint16 HxW) 반환. 실패 시 (None, None)."""
        try:
            frames = self.pipeline.wait_for_frames(timeout_ms=1000)
            aligned = self.align.process(frames)
            color = aligned.get_color_frame()
            depth = aligned.get_depth_frame()
            if not color or not depth:
                return None, None
            color_arr = np.asanyarray(color.get_data())
            depth_arr = np.asanyarray(depth.get_data())
            return color_arr, depth_arr
        except Exception as e:
            print(f"[d435] frame read error: {e}")
            return None, None

    def stop(self) -> None:
        try:
            self.pipeline.stop()
        except Exception:
            pass
        print("[d435] stopped")


# ---------- 일반 USB 웹캠 (cv2) ----------

class WebcamCapture:
    """V4L2 backend 명시 + by-id path 지원."""

    def __init__(self, device, width: int, height: int, fps: int) -> None:
        self.cap = cv2.VideoCapture(device, cv2.CAP_V4L2)
        if not self.cap.isOpened():
            raise RuntimeError(f"webcam open failed (device={device})")
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.cap.set(cv2.CAP_PROP_FPS, fps)
        actual_w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = self.cap.get(cv2.CAP_PROP_FPS)
        print(f"[webcam] opened: {actual_w}x{actual_h} @ {actual_fps:.1f} fps (device={device})")

    def read(self) -> Optional[np.ndarray]:
        ok, frame = self.cap.read()
        return frame if ok else None

    def release(self) -> None:
        self.cap.release()
        print("[webcam] released")


# ---------- 페이로드 패킹 ----------

def _encode_jpeg(frame: Optional[np.ndarray], quality: int) -> bytes:
    if frame is None:
        return b""
    ok, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    return jpg.tobytes() if ok else b""


def _pack(d435_color: Optional[np.ndarray],
          d435_depth: Optional[np.ndarray],
          webcam_color: Optional[np.ndarray],
          jpeg_q: int) -> Optional[bytes]:
    payload = {
        "timestamp": time.time_ns(),
        # 사용자 매핑: D435 → Cam1 (color_2d), 일반 웹캠 → Cam2 (color_3d)
        "color_2d": _encode_jpeg(d435_color, jpeg_q),
        "color_3d": _encode_jpeg(webcam_color, jpeg_q),
        "depth_3d": b"",
        "depth_3d_shape": (),
    }
    if d435_depth is not None:
        payload["depth_3d"] = lz4.frame.compress(d435_depth.tobytes())
        payload["depth_3d_shape"] = d435_depth.shape
    if not payload["color_2d"] and not payload["color_3d"] and not payload["depth_3d"]:
        return None
    return msgpack.packb(payload)


# ---------- 메인 루프 ----------

async def run(url: str, webcam_dev, width: int, height: int, fps: int, jpeg_q: int) -> None:
    d435 = RealSensePipeline(width, height, fps)
    try:
        webcam = WebcamCapture(webcam_dev, width, height, fps)
    except RuntimeError as e:
        print(f"[main] webcam disabled: {e}")
        webcam = None

    interval = 1.0 / max(fps, 1)
    session_id = f"rpi-{uuid.uuid4().hex[:8]}"

    print(f"[main] connecting to {url} ...")
    try:
        async with websockets.connect(url, max_size=None) as ws:
            print(f"[main] connected, session_id={session_id}")
            await ws.send(json.dumps({"event": "START", "session_id": session_id}))

            sent = 0
            t_start = time.time()

            while not _stop.is_set():
                # D435: 동기화된 (color, depth)
                d435_color, d435_depth = d435.get_frames()
                # 웹캠 (있으면)
                webcam_color = webcam.read() if webcam else None

                payload = _pack(d435_color, d435_depth, webcam_color, jpeg_q)
                if payload is not None:
                    try:
                        await ws.send(payload)
                        sent += 1
                    except websockets.ConnectionClosed:
                        print("[main] ws closed by server")
                        break

                if sent and sent % 100 == 0:
                    elapsed = time.time() - t_start
                    print(f"[main] sent {sent} frames ({sent / elapsed:.1f} fps)")

                await asyncio.sleep(interval)

            try:
                await ws.send(json.dumps({"event": "STOP", "session_id": session_id}))
                print(f"[main] sent STOP, total={sent}")
            except Exception:
                pass

    finally:
        if webcam is not None:
            webcam.release()
        d435.stop()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--url", required=True, help="ws://<AI 서버>:8000/ws/camera")
    p.add_argument("--webcam", default="0",
                   help="일반 웹캠 인덱스 또는 /dev/v4l/by-id/... path (없으면 D435 만 송신)")
    p.add_argument("--width", type=int, default=640)
    p.add_argument("--height", type=int, default=480)
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--jpeg-quality", type=int, default=80)
    args = p.parse_args()

    def _to_device(v):
        try:
            return int(v)
        except ValueError:
            return v

    webcam_dev = _to_device(args.webcam)

    async def _main() -> None:
        _install_signal_handlers()
        await run(args.url, webcam_dev, args.width, args.height, args.fps, args.jpeg_quality)

    try:
        asyncio.run(_main())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
