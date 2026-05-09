import os
from dotenv import load_dotenv

load_dotenv()

# FastAPI
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))

# Spring Boot Backend
SPRING_API_BASE_URL = os.getenv("SPRING_API_BASE_URL", "http://app-jipchak:8080")
SPRING_GAME_LOG_PATH = "/api/game/log"

# 녹화 설정
RECORDING_DIR = os.getenv("RECORDING_DIR", "/data/recordings")
VIDEO_FPS = int(os.getenv("VIDEO_FPS", "30"))
VIDEO_CODEC = os.getenv("VIDEO_CODEC", "mp4v")

# GR-ConvNet 체크포인트
GRCONVNET_CHECKPOINT = os.getenv(
    "GRCONVNET_CHECKPOINT",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "trained-models",
        "cornell-randsplit-rgbd-grconvnet3-drop1-ch16",
        "epoch_30_iou_0.97",
    ),
)
GRASP_DEVICE = os.getenv("GRASP_DEVICE", "cpu")

# Object Detection (SSDLite)
DETECTION_ENABLED = os.getenv("DETECTION_ENABLED", "true").lower() == "true"
DETECTION_THRESHOLD = float(os.getenv("DETECTION_THRESHOLD", "0.35"))
DETECTION_TARGET_LABELS = [
    int(x) for x in os.getenv("DETECTION_TARGET_LABELS", "88").split(",") if x.strip()
]

# 로그
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
