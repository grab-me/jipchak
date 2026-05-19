import { useEffect, useRef, useState } from 'react';
import { useToolStore } from '@/store/toolStore';
import { DetectionItem, GraspPose, useStreamStore } from '@/store/streamStore';
import type { StreamState } from '@/store/streamStore';
import Thermometer from './Thermometer';
import { useAudio } from '@/hooks/useAudio';
import { SOUND_ASSETS } from '@/constants/soundConfig';

interface CameraViewProps {
  label: string;
  channel: '2d' | '3d';
  isMainView?: boolean;
  onClick?: () => void;
  className?: string;
}

const CameraView = ({
  label,
  channel,
  isMainView = false,
  onClick,
  className = '',
}: CameraViewProps) => {
  const {
    addRecord,
    setCatching,
    setLastResult,
    startSession,
    setSessionId,
    forceStopGame,
    isSessionActive,
    setMaxGames,
  } = useToolStore();

  const processedRef = useRef<string | null>(null);
  const latestFrameRef = useRef<string | null>(null);
  const { playSfx } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frameUrl = useStreamStore((s: StreamState) => (channel === '2d' ? s.frame2d : s.frame3d));
  const connected = useStreamStore((s: StreamState) => s.connected);
  const graspScore = useStreamStore((s: StreamState) => s.graspScore);
  const detections = useStreamStore((s: StreamState) => s.detections);
  const graspPose = useStreamStore((s: StreamState) => s.graspPose);
  const lastSessionEvent = useStreamStore((s: StreamState) => s.lastSessionEvent);

  const hasDetection = graspPose !== null || detections.length > 0;
  const currentProbability = hasDetection ? (graspScore ?? 0) * 100 : 0;

  // 타이머 작동 상태, 집게 하강 상태, 화면에 표시할 확률값 관리
  const [timerStarted, setTimerStarted] = useState(false);
  const [grabStarted, setGrabStarted] = useState(false);
  const [displayProbability, setDisplayProbability] = useState(0);

  const lastUiEvent = useStreamStore((s: StreamState) => s.lastUiEvent);
  const lastStartTs = useRef<number | null>(null);
  const lastGrabTs = useRef<number | null>(null);

  useEffect(() => {
    latestFrameRef.current = frameUrl ?? null;
  }, [frameUrl]);

  // 세션 이벤트에 따라 상태 초기화 (게임 리셋 및 다음 판 전환 시 게이지바 0)
  useEffect(() => {
    if (
      lastSessionEvent?.type === 'SESSION_START' ||
      lastSessionEvent?.type === 'GAME_RESULT' ||
      lastSessionEvent?.type === 'SESSION_END'
    ) {
      setTimerStarted(false);
      setGrabStarted(false);
      setDisplayProbability(0);
    }
  }, [lastSessionEvent?.type, lastSessionEvent?.session_id]);

  // UI 이벤트 감지 (타이머 시작 / 집게 하강 개시)
  useEffect(() => {
    if (!lastUiEvent) return;
    if (lastUiEvent.type === 'ROUND_TIMER_START') {
      if (lastStartTs.current === lastUiEvent.ts) return;
      lastStartTs.current = lastUiEvent.ts;
      setTimerStarted(true);
      setGrabStarted(false);
    }
    if (lastUiEvent.type === 'GRAB_START') {
      if (lastGrabTs.current === lastUiEvent.ts) return;
      lastGrabTs.current = lastUiEvent.ts;
      setTimerStarted(false);
      setGrabStarted(true);
    }
  }, [lastUiEvent]);

  // 타이머가 시작되었고 아직 집게 하강 전인 경우에만 확률 게이지를 실시간으로 업데이트
  useEffect(() => {
    if (timerStarted && !grabStarted) {
      setDisplayProbability(currentProbability);
    }
  }, [currentProbability, timerStarted, grabStarted]);

  useEffect(() => {
    if (!lastSessionEvent || !isMainView) return;

    const eventKey = `${lastSessionEvent.type}_${lastSessionEvent.session_id ?? 'none'}`;
    if (processedRef.current === eventKey) return;
    processedRef.current = eventKey;

    if (lastSessionEvent.type === 'SESSION_START') {
      const sid = lastSessionEvent.session_id;
      if (!sid) return;

      // GameCountModal 비활성화로 인해 판수를 2판 고정 설정
      setMaxGames(2);

      if (!isSessionActive) {
        startSession(sid);
      } else {
        setSessionId(sid);
      }

      setCatching(true);
      setLastResult(null);
      playSfx(SOUND_ASSETS.SFX.TRY_CATCH);
      return;
    }

    if (lastSessionEvent.type === 'GAME_RESULT') {
      setCatching(false);
      const isWin = lastSessionEvent.is_caught ?? false;
      setLastResult(isWin ? 'win' : 'lose');

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const filename = [
        yy,
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        '_',
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds()),
      ].join('');

      addRecord({
        id: Date.now().toString(),
        filename: `${filename}.mp4`,
        isSuccess: isWin,
        thumbnailUrl: latestFrameRef.current ?? '',
      });

      window.setTimeout(() => setLastResult(null), 3000);
      return;
    }

    if (lastSessionEvent.type === 'SESSION_END') {
      setCatching(false);
      setLastResult(null);
      forceStopGame();
    }
  }, [
    lastSessionEvent,
    isMainView,
    isSessionActive,
    startSession,
    setSessionId,
    setCatching,
    setLastResult,
    playSfx,
    addRecord,
    forceStopGame,
  ]);

  useEffect(() => {
    if (!frameUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    let alive = true;

    img.onload = () => {
      if (!alive) return;

      // D435(3D)일 때만 시계방향 90도 회전을 위해 가로/세로 길이를 스왑
      const cw = channel === '3d' ? img.height : img.width;
      const ch = channel === '3d' ? img.width : img.height;

      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;

      ctx.clearRect(0, 0, cw, ch);

      ctx.save();
      if (channel === '3d') {
        // 1. 캔버스 중심으로 원점 이동
        ctx.translate(cw / 2, ch / 2);
        // 2. 반시계방향 90도 회전
        ctx.rotate((-90 * Math.PI) / 180);
        // 3. 원본 이미지 중심을 원점(0,0)에 맞추기 위해 이동
        ctx.translate(-img.width / 2, -img.height / 2);
      }

      // 4. 렌더링 (3D면 회전된 상태로, 2D면 원본 그대로 출력)
      ctx.drawImage(img, 0, 0, img.width, img.height);

      if (channel === '3d' && !grabStarted) {
        if (graspPose && graspPose.confidence > 0) {
          // AI 결과는 원본 이미지 기준 좌표이므로 원래 크기(img.width, img.height)를 넘겨줌
          drawGraspPose(ctx, graspPose, img.width, img.height);
        } else if (detections.length > 0) {
          drawDetections(ctx, detections);
        }
      }

      ctx.restore();
    };

    img.src = frameUrl;

    return () => {
      alive = false;
      img.onload = null;
    };
  }, [frameUrl, detections, graspPose, channel, grabStarted]);

  return (
    <div
      className={`w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden gap-[4%] ${className}`}
      onClick={onClick}
    >
      {frameUrl && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />
      )}

      {!frameUrl && (
        <span className="text-white/20 font-bold text-[clamp(24px,5vw,64px)] select-none uppercase tracking-widest">
          {label}
        </span>
      )}

      <span
        className={`absolute top-2 right-2 w-2 h-2 rounded-full z-overlay ${connected ? 'bg-green-400' : 'bg-red-500'
          }`}
        title={connected ? 'WS connected' : 'WS disconnected'}
      />

      {isMainView && <Thermometer probability={displayProbability} />}
    </div>
  );
};


function drawGraspPose(
  ctx: CanvasRenderingContext2D,
  pose: GraspPose,
  canvasW: number,
  canvasH: number,
): void {
  const sx = pose.image_width > 0 ? canvasW / pose.image_width : 1;
  const sy = pose.image_height > 0 ? canvasH / pose.image_height : 1;
  const cx = pose.center_x * sx;
  const cy = pose.center_y * sy;
  const scale = (sx + sy) / 2;
  const r = Math.max(18, pose.radius * scale);
  const baseAngle = pose.angle_rad - Math.PI / 2;
  const conf = Math.max(0, Math.min(1, pose.confidence));

  const jawCount = 3;
  const tipR = Math.max(34, r * 0.94);
  const hookDepth = Math.max(10, r * 0.18);

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';

  const outerRadius = tipR + hookDepth * 0.35;
  drawOuterGuide(ctx, cx, cy, outerRadius, conf);

  for (let i = 0; i < jawCount; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / jawCount;

    // 3발의 집게 위치를 점선 원 위에 찍어주기 (흰색 날개 그리기는 제외)
    const jawX = cx + Math.cos(angle) * outerRadius;
    const jawY = cy + Math.sin(angle) * outerRadius;
    ctx.beginPath();
    ctx.arc(jawX, jawY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
  }

  // 집게 중심에 아주 작은 빨간색 원
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'red';
  ctx.fill();

  // 중심에 집게로 인형을 뽑을 확률 수치 표시
  ctx.fillStyle = 'white';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${(pose.confidence * 100).toFixed(0)}`, cx, cy);

  ctx.restore();
}

function drawOuterGuide(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  confidence: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = getThermometerColor(confidence, 0.72);
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: DetectionItem[],
): void {
  if (detections.length === 0) return;

  const best = detections.reduce((a, b) =>
    a.grasp_confidence > b.grasp_confidence ? a : b,
  );

  for (const det of detections) {
    const [xmin, ymin, xmax, ymax] = det.bbox;
    const isBest = det === best;

    ctx.strokeStyle = isBest ? getThermometerColor(det.grasp_confidence) : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isBest ? 3 : 2;
    ctx.setLineDash(isBest ? [] : [6, 4]);
    ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
    ctx.setLineDash([]);

    const text = `${(det.grasp_confidence * 100).toFixed(0)}%`;
    ctx.font = 'bold 14px Arial';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isBest ? getThermometerColor(det.grasp_confidence, 0.8) : 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(xmin, ymin - 20, tw + 8, 20);
    ctx.fillStyle = 'white';
    ctx.fillText(text, xmin + 4, ymin - 5);

    if (!isBest && Array.isArray(det.grasp_center_px) && det.grasp_center_px.length >= 2) {
      const [gx, gy] = det.grasp_center_px as [number, number];
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  if (Array.isArray(best.grasp_center_px) && best.grasp_center_px.length >= 2) {
    const [gx, gy] = best.grasp_center_px as [number, number];
    ctx.beginPath();
    ctx.arc(gx, gy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, 8, 190, 28);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Best: ${(best.grasp_confidence * 100).toFixed(1)}%  (${detections.length} obj)`,
    14,
    27,
  );
}

export default CameraView;

// ─────────────────────────────────────────
// 헬퍼: 온도계 컴포넌트와 동일한 색상 보간 (Blue -> Green -> Yellow -> Red)
// ─────────────────────────────────────────
function getThermometerColor(confidence: number, alpha: number = 1): string {
  const v = confidence * 100;
  let r, g, b;
  if (v <= 30) {
    const p = v / 30;
    r = 59 + (34 - 59) * p;
    g = 130 + (197 - 130) * p;
    b = 246 + (94 - 246) * p;
  } else if (v <= 60) {
    const p = (v - 30) / 30;
    r = 34 + (234 - 34) * p;
    g = 197 + (179 - 197) * p;
    b = 94 + (8 - 94) * p;
  } else if (v <= 90) {
    const p = (v - 60) / 30;
    r = 234 + (239 - 234) * p;
    g = 179 + (68 - 179) * p;
    b = 8 + (68 - 8) * p;
  } else {
    r = 239; g = 68; b = 68;
  }
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}
