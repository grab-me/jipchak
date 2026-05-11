# Jipchak 프로젝트 전체 데이터 흐름 및 구조 (Architecture Flow)

이 문서는 집게머신 프로젝트(Jipchak)의 전체적인 시스템 데이터 파이프라인과 주요 컴포넌트들의 역할을 요약합니다.

---

## 1. 시스템 컴포넌트

1. **Raspberry Pi (RPi) Client**
   - **역할**: 하드웨어 제어(집게 크레인), 카메라 모듈(Intel RealSense D435 + 웹캠)을 통한 영상 취득
   - **주요 파이프라인**: 
     `카메라 프레임 취득` → `LZ4/msgpack 압축 (FramePacker)` → `EC2 AI 서버로 웹소켓 전송`

2. **AI Server (EC2 - FastAPI)**
   - **역할**: 프레임 수신 및 브라우저 릴레이, AI 파지점 추론, 판정(Catch/Drop), 영상 녹화, Spring 서버와 통신
   - **주요 모듈**:
     - `ws_rpi.py`: RPi로부터 웹소켓 데이터를 수신하고 제어 신호(START/STOP) 처리
     - `SessionManager`: 세션 상태(게임 1판) 관리, 녹화 시작/종료, 추론 주기 조정
     - `ThreeJawGraspService`: (새로 추가됨) YOLOv8-seg를 활용한 병아리 마스크 추론 및 3발 집게 최적 위치 결정
     - `VideoRecorder`: 프레임을 MP4 파일로 저장
     - `CatchJudge`: 인형이 집게에 잡혀서 배출구로 나갔는지 판정
     - `SpringClient`: 게임 종료 후 녹화본과 판정 결과를 Spring 서버로 HTTP 업로드

3. **Frontend (React)**
   - **역할**: 브라우저 기반의 키오스크 및 모바일 UI 화면 제공
   - **주요 파이프라인**: 
     - AI 서버에 웹소켓 연결 (`/ws/stream`)
     - AI 서버가 보내주는 바이너리 프레임(JPEG)을 `<canvas>`에 렌더링
     - `GRASP_POSE` JSON 이벤트를 수신하여 캔버스 영상 위에 집게 파지 UI(OpenCV 스타일)를 실시간 덧그리기 (오버레이)

4. **Backend (Spring Boot)**
   - **역할**: DB 저장 및 관리, 영상 제공 API, 웹앱 전반의 비즈니스 로직 처리
   - **주요 파이프라인**: AI 서버가 업로드한 결과를 DB와 S3/로컬스토리지에 저장 후 프론트엔드로 QR 코드 등에 쓰일 세션키를 응답

---

## 2. 전체 데이터 파이프라인 (Data Flow)

### [Phase 1] 평시 (대기 상태)
1. RPi가 D435(3D)와 웹캠(2D) 프레임을 찍어서 계속 AI 서버로 전송합니다.
2. AI 서버는 이 프레임을 뜯어보고(디코딩) `ThreeJawGraspService`에 1초마다 넘겨서 집게가 어디를 잡아야 할지 파지 위치를 계산합니다.
3. AI 서버는 화면 원본과 추론된 파지 좌표(`GRASP_POSE`)를 프론트엔드로 뿌려줍니다(Broadcast).
4. 프론트엔드는 화면에 병아리 영상과 함께 예측된 3발 집게 모형을 화면 비율에 맞춰서 계속 그려줍니다.

### [Phase 2] 게임 시작 (동전 투입 / START)
1. RPi에서 `START` 신호를 AI 서버로 전송합니다.
2. `SessionManager`가 새로운 세션을 열고, `VideoRecorder`를 작동시켜 프레임을 MP4로 저장하기 시작합니다.
3. 프론트엔드는 UI를 게임 중 모드로 변경합니다. (모달 닫힘 등)

### [Phase 3] 게임 종료 (STOP)
1. RPi에서 집게 작업이 끝난 후 `STOP` 신호를 보냅니다.
2. `SessionManager`는 녹화를 중단하고 최종 녹화본 파일(.mp4)을 완성합니다.
3. `CatchJudge`가 처음 프레임과 마지막 프레임들의 Depth 정보를 비교하여 인형이 배출구로 나갔는지(잡혔는지) 최종 판단을 내립니다.
4. AI 서버의 `SpringClient`가 MP4 파일과 성공/실패 여부를 Spring 서버에 업로드합니다.
5. Spring 서버에서 발급한 결과 URL/QR 키를 프론트엔드에 `GAME_RESULT` 이벤트로 전달합니다.
6. 프론트엔드는 성공/실패 연출(폭죽 등)을 띄우고 영상 QR 코드를 생성하여 화면에 띄워줍니다.

---

## 3. 핵심 AI 추론 방식 (Three-Jaw Grasp)

**사용 모델**: `best2.pt` (YOLOv8-seg)
1. 이미지가 들어오면 YOLOv8-seg가 **병아리들의 모양(Mask)**을 픽셀 단위로 잘라냅니다 (Segmentation).
2. `YoloSegGraspAdapter`가 각 마스크의 무게중심(Center)과 타원 궤적을 분석하여 장축/단축에 맞게 3발 집게의 **벌림 폭(Radius)**과 **각도(Angle)**를 산출합니다.
3. `ChickEvaluator`가 집게 물리 크기, 가장 높이 솟아있는지(Z-height), 그리고 3개의 턱이 물체와 어떻게 만나는지 겹침도를 분석하여 가장 점수가 높은 1개의 파지점을 최종 결정합니다.
4. 이 결과가 `GRASP_POSE` JSON 형식으로 매 초 프론트엔드로 전달됩니다.
