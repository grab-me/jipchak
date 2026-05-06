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

# 로그
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
