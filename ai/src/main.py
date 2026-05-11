"""
웹캠 + Intel RealSense D435 통합 스트리밍 메인

역할:
    - 웹캠   → color_2d (녹화용, 브라우저 Cam1)
    - D435   → color_3d (오버레이용, 브라우저 Cam2)
             → depth_3d (집게 위치 판정용)
    - 하나의 WebSocket으로 EC2 /ws/camera 에 전송

사용:
    python3 -m src.main \
        --url wss://k14d108.p.ssafy.io/ws/camera \
        --webcam 0 \
        --width 640 --height 480 --fps 15
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


# ─────────────────────────────────────────
# D435 카메라 (SDK, RGB + Depth)
# ─────────────────────────────────────────

class RealSenseCamera:
    """D435 RGB + Depth 동시 캡처. align으로 픽셀단위 동기화."""

    def __init__(self, width: int, height: int, fps: int) -> None:
        self.width = width
        self.height = height
        self.fps = fps
        self._pipeline: Optional[rs.pipeline] = None
        self._align: Optional[rs.align] = None

    def start(self) -> None:
        self._pipeline = rs.pipeline()
        config = rs.config()
        config.enable_stream(rs.stream.color, self.width, self.height, rs.format.bgr8, self.fps)
        config.enable_stream(rs.stream.depth, self.width, self.height, rs.format.z16, self.fps)
        self._pipeline.start(config)
        self._align = rs.align(rs.stream.color)
        print(f"[D435] started: {self.width}x{self.height} @ {self.fps}fps")

    def get_frames(self) -> tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """
        Returns:
            (color BGR uint8 HxWx3, depth uint16 HxW mm)
            실패 시 (None, None)
        """
        if self._pipeline is None:
            return None, None
        try:
            frames = self._pipeline.wait_for_frames(timeout_ms=500)
            aligned = self._align.process(frames)
            color_frame = aligned.get_color_frame()
            depth_frame = aligned.get_depth_frame()
            if not color_frame or not depth_frame:
                return None, None
            return (
                np.asanyarray(color_frame.get_data()),
                np.asanyarray(depth_frame.get_data()),
            )
        except Exception as e:
            print(f"[D435] frame error: {e}")
            return None, None

    def stop(self) -> None:
        if self._pipeline:
            try:
                self._pipeline.stop()
            except Exception:
                pass
            self._pipeline = None
        print("[D435] stopped")


# ─────────────────────────────────────────
# 웹캠 (cv2, RGB only)
# ─────────────────────────────────────────

class WebcamCamera:
    """일반 USB 웹캠. V4L2 backend 명시."""

    def __init__(self, device, width: int, height: int, fps: int) -> None:
        self.device = device
        self.width = width
        self.height = height
        self.fps = fps
        self._cap: Optional[cv2.VideoCapture] = None

    def start(self) -> None:
        self._cap = cv2.VideoCapture(self.device, cv2.CAP_V4L2)
        if not self._cap.isOpened():
            raise RuntimeError(f"[Webcam] 열기 실패 (device={self.device})")
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self._cap.set(cv2.CAP_PROP_FPS, self.fps)
        actual_w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = self._cap.get(cv2.CAP_PROP_FPS)
        print(f"[Webcam] started: {actual_w}x{actual_h} @ {actual_fps:.1f}fps (device={self.device})")

    def get_frame(self) -> Optional[np.ndarray]:
        if self._cap is None:
            return None
        ok, frame = self._cap.read()
        return frame if ok else None

    def stop(self) -> None:
        if self._cap:
            self._cap.release()
            self._cap = None
        print("[Webcam] stopped")


# ─────────────────────────────────────────
# 페이로드 패킹
# ─────────────────────────────────────────

def _encode_jpeg(frame: Optional[np.ndarray], quality: int) -> bytes:
    if frame is None:
        return b""
    ok, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    return jpg.tobytes() if ok else b""


def _pack(
    webcam_color: Optional[np.ndarray],
    d435_color: Optional[np.ndarray],
    d435_depth: Optional[np.ndarray],
    jpeg_quality: int,
) -> Optional[bytes]:
    """
    채널 매핑:
        color_2d ← 웹캠 RGB  (녹화 대상)
        color_3d ← D435 RGB  (브라우저 오버레이)
        depth_3d ← D435 Depth (판정용, LZ4 압축)
    """
    color_2d = _encode_jpeg(webcam_color, jpeg_quality)
    color_3d = _encode_jpeg(d435_color, jpeg_quality)

    depth_3d = b""
    depth_3d_shape: tuple = ()
    if d435_depth is not None:
        depth_3d = lz4.frame.compress(d435_depth.tobytes())
        depth_3d_shape = d435_depth.shape

    if not color_2d and not color_3d and not depth_3d:
        return None

    return msgpack.packb({
        "timestamp":      time.time_ns(),
        "color_2d":       color_2d,
        "color_3d":       color_3d,
        "depth_3d":       depth_3d,
        "depth_3d_shape": depth_3d_shape,
    })


# ─────────────────────────────────────────
# 메인 루프
# ─────────────────────────────────────────

async def stream_loop(
    d435: RealSenseCamera,
    webcam: Optional[WebcamCamera],
    url: str,
    fps: int,
    jpeg_quality: int,
) -> None:
    interval = 1.0 / max(fps, 1)
    session_id = f"rpi-{uuid.uuid4().hex[:8]}"
    stop = asyncio.Event()

    def _on_signal():
        print("\n[Main] shutdown signal received")
        stop.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _on_signal)
        except NotImplementedError:
            pass

    while not stop.is_set():
        try:
            print(f"[WS] connecting to {url} ...")
            async with websockets.connect(url, max_size=None) as ws:
                print(f"[WS] connected | session={session_id}")
                await ws.send(json.dumps({"event": "START", "session_id": session_id}))

                sent = 0
                dropped = 0
                t_start = time.time()

                while not stop.is_set():
                    loop_start = time.monotonic()

                    # 프레임 캡처
                    d435_color, d435_depth = d435.get_frames()
                    webcam_color = webcam.get_frame() if webcam else None

                    # 패킹 + 전송
                    payload = _pack(webcam_color, d435_color, d435_depth, jpeg_quality)
                    if payload:
                        try:
                            await ws.send(payload)
                            sent += 1
                        except websockets.ConnectionClosed:
                            print("[WS] connection closed by server")
                            dropped += 1
                            break
                    else:
                        dropped += 1

                    # FPS 로그 (100프레임마다)
                    if sent > 0 and sent % 100 == 0:
                        elapsed = time.time() - t_start
                        print(
                            f"[Main] sent={sent} dropped={dropped} "
                            f"fps={sent / elapsed:.1f}"
                        )
                        sent = 0
                        dropped = 0
                        t_start = time.time()

                    # FPS 유지
                    elapsed_loop = time.monotonic() - loop_start
                    await asyncio.sleep(max(interval - elapsed_loop, 0))

                # 종료 신호 전송
                try:
                    await ws.send(json.dumps({"event": "STOP", "session_id": session_id}))
                    print(f"[WS] sent STOP")
                except Exception:
                    pass

        except Exception as e:
            print(f"[WS] disconnected: {e}")

        if not stop.is_set():
            print("[WS] retrying in 3s ...")
            await asyncio.sleep(3)


# ─────────────────────────────────────────
# 진입점
# ─────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="웹캠 + D435 통합 스트리밍")
    p.add_argument("--url",          required=True, help="EC2 WebSocket 주소 (예: wss://도메인/ws/camera)")
    p.add_argument("--webcam",       default="0",   help="웹캠 장치 번호 또는 /dev/v4l/by-id/... (기본 0)")
    p.add_argument("--width",        type=int, default=640, help="해상도 너비 (기본 640)")
    p.add_argument("--height",       type=int, default=480, help="해상도 높이 (기본 480)")
    p.add_argument("--fps",          type=int, default=15,  help="FPS (기본 15)")
    p.add_argument("--jpeg-quality", type=int, default=60,  help="JPEG 품질 0~100 (기본 60)")
    p.add_argument("--no-webcam",    action="store_true",   help="웹캠 없이 D435만 전송")
    return p.parse_args()


def _to_device(v: str):
    try:
        return int(v)
    except ValueError:
        return v


if __name__ == "__main__":
    args = parse_args()

    d435 = RealSenseCamera(args.width, args.height, args.fps)
    d435.start()

    webcam = None
    if not args.no_webcam:
        try:
            webcam = WebcamCamera(_to_device(args.webcam), args.width, args.height, args.fps)
            webcam.start()
        except RuntimeError as e:
            print(f"[Main] webcam disabled: {e}")

    try:
        asyncio.run(stream_loop(d435, webcam, args.url, args.fps, args.jpeg_quality))
    except KeyboardInterrupt:
        pass
    finally:
        if webcam:
            webcam.stop()
        d435.stop()
        print("[Main] exited gracefully")