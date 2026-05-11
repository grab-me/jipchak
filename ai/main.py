from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.config import (
    APP_HOST, APP_PORT,
    GRCONVNET_CHECKPOINT, GRASP_DEVICE,
    DETECTION_ENABLED, DETECTION_THRESHOLD, DETECTION_TARGET_LABELS,
)
from src.inference.judge import CatchJudge
from src.inference.three_jaw_service import ThreeJawGraspService
from src.network import ws_browser, ws_rpi
from src.network.spring_client import SpringClient
from src.recorder.video_recorder import VideoRecorder
from src.session_manager import SessionManager
from src.stream.relay_hub import RelayHub

# 의존성 인스턴스 (전역 1회 생성)
relay_hub = RelayHub()
recorder = VideoRecorder()
judge = CatchJudge()
spring = SpringClient()
grasp_service = ThreeJawGraspService()

session_manager = SessionManager(
    recorder=recorder, judge=judge, spring=spring,
    grasp_service=grasp_service,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    yolo_model_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "three-jaw-grasp", "dataset", "model_chick2_v2", "best2.pt"
    )
    grasp_service.load(yolo_model_path)
    
    print(f"[main] FastAPI ready on {APP_HOST}:{APP_PORT}")
    try:
        yield
    finally:
        await spring.close()
        print("[main] shutdown complete")


app = FastAPI(title="JIPCHAK AI Server", lifespan=lifespan)
app.include_router(ws_rpi.build_router(relay_hub, session_manager))
app.include_router(ws_browser.build_router(relay_hub))


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "subscribers": relay_hub.subscriber_count,
        "grasp_loaded": grasp_service._pipeline is not None,
    }
