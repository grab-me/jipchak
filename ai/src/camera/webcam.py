"""
웹캠 전용 카메라 모듈

역할:
    - RGB 스트리밍 (480p, 15fps) → EC2 → 브라우저
    - 녹화 트리거 신호 수신 → 로컬 녹화 시작/종료
    - 녹화 완료 후 EC2로 파일 전송

의존성:
    pip install opencv-python-headless
"""

import subprocess
import os
import time
from typing import Optional

import cv2
import numpy as np


class WebcamCamera:

    def __init__(
        self,
        device: int = 0,
        stream_width: int = 640,
        stream_height: int = 480,
        stream_fps: int = 15,
        record_width: int = 1280,
        record_height: int = 720,
        record_fps: int = 30,
        output_dir: str = "/tmp/recordings",
    ) -> None:
        """
        Args:
            device:        웹캠 장치 번호 (기본 /dev/video0)
            stream_width:  스트리밍 해상도 너비
            stream_height: 스트리밍 해상도 높이
            stream_fps:    스트리밍 FPS
            record_width:  녹화 해상도 너비
            record_height: 녹화 해상도 높이
            record_fps:    녹화 FPS
            output_dir:    녹화 파일 저장 경로
        """
        self.device = device
        self.stream_width = stream_width
        self.stream_height = stream_height
        self.stream_fps = stream_fps
        self.record_width = record_width
        self.record_height = record_height
        self.record_fps = record_fps
        self.output_dir = output_dir

        self._cap: Optional[cv2.VideoCapture] = None
        self._ffmpeg_proc: Optional[subprocess.Popen] = None
        self._current_file: Optional[str] = None
        self._is_recording = False

        os.makedirs(output_dir, exist_ok=True)

    def start(self) -> None:
        """웹캠 스트리밍 캡처 시작."""
        self._cap = cv2.VideoCapture(self.device, cv2.CAP_V4L2)
        if not self._cap.isOpened():
            raise RuntimeError(f"웹캠 열기 실패 (device={self.device})")

        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.stream_width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.stream_height)
        self._cap.set(cv2.CAP_PROP_FPS, self.stream_fps)

        actual_w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = self._cap.get(cv2.CAP_PROP_FPS)
        print(f"[Webcam] started: {actual_w}x{actual_h} @ {actual_fps:.1f}fps (device={self.device})")

    def get_frame(self) -> Optional[np.ndarray]:
        """스트리밍용 프레임 반환 (BGR uint8)."""
        if self._cap is None:
            return None
        ok, frame = self._cap.read()
        return frame if ok else None

    @property
    def is_recording(self) -> bool:
        return self._is_recording

    def start_recording(self) -> Optional[str]:
        """
        ffmpeg로 로컬 녹화 시작.
        스트리밍과 독립적으로 동작 (별도 프로세스).

        Returns:
            녹화 파일 경로 or None (이미 녹화 중일 때)
        """
        if self._is_recording:
            print("[Webcam] 이미 녹화 중")
            return None

        timestamp = int(time.time())
        filename = f"recording_{timestamp}.mp4"
        filepath = os.path.join(self.output_dir, filename)

        # ffmpeg로 웹캠 직접 캡처 → mp4 저장
        # h264_v4l2m2m: RP5 하드웨어 인코딩 사용
        cmd = [
            "ffmpeg",
            "-f", "v4l2",
            "-input_format", "mjpeg",
            "-video_size", f"{self.record_width}x{self.record_height}",
            "-framerate", str(self.record_fps),
            "-i", f"/dev/video{self.device}",
            "-c:v", "h264_v4l2m2m",   # RP5 하드웨어 인코딩
            "-b:v", "2M",
            "-y",                      # 덮어쓰기
            filepath,
        ]

        try:
            self._ffmpeg_proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self._current_file = filepath
            self._is_recording = True
            print(f"[Webcam] 녹화 시작: {filepath}")
            return filepath
        except Exception as e:
            print(f"[Webcam] 녹화 시작 실패: {e}")
            return None

    def stop_recording(self) -> Optional[str]:
        """
        녹화 종료.

        Returns:
            완료된 녹화 파일 경로 or None
        """
        if not self._is_recording or self._ffmpeg_proc is None:
            print("[Webcam] 녹화 중이 아님")
            return None

        try:
            # ffmpeg에 종료 신호 (SIGINT → 정상 종료, 파일 손상 없음)
            self._ffmpeg_proc.send_signal(signal.SIGINT)
            self._ffmpeg_proc.wait(timeout=10)
        except Exception as e:
            print(f"[Webcam] ffmpeg 종료 오류: {e}")
            self._ffmpeg_proc.kill()

        filepath = self._current_file
        self._ffmpeg_proc = None
        self._current_file = None
        self._is_recording = False
        print(f"[Webcam] 녹화 완료: {filepath}")
        return filepath

    def stop(self) -> None:
        """웹캠 종료. 녹화 중이면 먼저 종료."""
        if self._is_recording:
            self.stop_recording()
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        print("[Webcam] stopped")