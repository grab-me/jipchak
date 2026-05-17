import { useEffect, useRef } from 'react';
import { useToolStore } from '@/store/toolStore';
import { useStreamStore, DetectionItem, GraspPose } from '@/store/streamStore';
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
    isSessionActive,
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

  // 최신 프레임 ref 동기화
  useEffect(() => {
    latestFrameRef.current = frameUrl ?? null;
  }, [frameUrl]);

  // ── 세션 이벤트 처리 ──────────────────────────────
  useEffect(() => {
    if (!lastSessionEvent || !isMainView) return;

    const eventKey = `${lastSessionEvent.type}_${lastSessionEvent.session_id}`;
    if (processedRef.current === eventKey) return;
    processedRef.current = eventKey;

    if (lastSessionEvent.type === 'SESSION_START') {
      if (!isSessionActive) {
        // 세션이 아직 비활성 → 서버 id 로 처음부터 시작.
        startSession(lastSessionEvent.session_id);
      } else {
        // 이미 사용자 START 클릭으로 client fallback id 가 활성 중.
        // sessionId 만 server id 로 교체 (records 등 다른 상태는 유지).
        // 이게 없으면 Spring Redis (session:rpi-*) 와 클라이언트 (session_<timestamp>) 의
        // 키가 어긋나 모바일 영상 조회가 깨진다.
        setSessionId(lastSessionEvent.session_id);
      }
      setCatching(true);
      setLastResult(null);
      playSfx(SOUND_ASSETS.SFX.TRY_CATCH);
    }

    if (lastSessionEvent.type === 'GAME_RESULT') {
      setCatching(false);
      // is_caught 는 SessionEvent 에 optional 로 정의되어 있으므로 직접 접근
      const isWin = lastSessionEvent.is_caught ?? false;
      setLastResult(isWin ? 'win' : 'lose');

      const now = new Date();
      const pad = (n: number, len = 2) => String(n).padStart(len, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const mm = pad(now.getMonth() + 1);
      const dd = pad(now.getDate());
      const hh = pad(now.getHours());
      const min = pad(now.getMinutes());
      const ss = pad(now.getSeconds());

      addRecord({
        id: Date.now().toString(),
        filename: `${yy}${mm}${dd}_${hh}${min}${ss}.mp4`,
        isSuccess: isWin,
        thumbnailUrl: latestFrameRef.current ?? '',
      });

      setTimeout(() => setLastResult(null), 3000);
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
  ]);

  // ── 캔버스 렌더링 ────────────────────────────────
  useEffect(() => {
    if (!frameUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    let alive = true;   // cleanup 후 onload 실행 방지

    img.onload = () => {
      if (!alive) return;
      if (canvas.width !== img.width) canvas.width = img.width;
      if (canvas.height !== img.height) canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (channel === '3d') {
        if (graspPose && graspPose.confidence > 0) {
          drawGraspPose(ctx, graspPose, canvas.width, canvas.height);
        } else if (detections.length > 0) {
          drawDetections(ctx, detections);
        }
      }
    };

    img.src = frameUrl;

    return () => {
      alive = false;
      img.onload = null;
    };
  }, [frameUrl, detections, graspPose, channel]);

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

      {isMainView && <Thermometer probability={(graspScore ?? 0) * 100} />}
    </div>
  );
};


// ─────────────────────────────────────────
// 헬퍼: 별 그리기
// ─────────────────────────────────────────

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  spikes = 5,
): void {
  const step = Math.PI / spikes;   // outer 꼭짓점 사이 각도의 절반
  let angle = -Math.PI / 2;       // 12시 방향에서 시작

  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    // outer 꼭짓점
    ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
    angle += step;
    // inner 꼭짓점
    ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
    angle += step;
  }
  ctx.closePath();
  ctx.fillStyle = '#FFEB3B';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 140, 0, 0.95)';
  ctx.lineWidth = 2;
  ctx.stroke();
}


// ─────────────────────────────────────────
// 헬퍼: 확률 게이지 (호 형태)
// ─────────────────────────────────────────

function drawProbabilityGauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  confidence: number,
): void {
  const MAX_CONF = 0.9;
  const progress = Math.min(confidence / MAX_CONF, 1);
  const hue = progress * 120;

  // 배경 원
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 8;
  ctx.stroke();

  // 진행 호
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 14;
  ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 퍼센트 텍스트
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${(confidence * 100).toFixed(0)}%`, cx, cy + radius + 18);
  ctx.textAlign = 'left';
}


// ─────────────────────────────────────────
// 헬퍼: GraspPose 그리기 (집게 3발)
// ─────────────────────────────────────────

function drawGraspPose(
  ctx: CanvasRenderingContext2D,
  pose: GraspPose,
  canvasW: number,
  canvasH: number,
): void {
  // 이미지 좌표 → 캔버스 좌표 스케일
  const sx = pose.image_width > 0 ? canvasW / pose.image_width : 1;
  const sy = pose.image_height > 0 ? canvasH / pose.image_height : 1;

  const cx = pose.center_x * sx;
  const cy = pose.center_y * sy;
  const r = pose.radius * ((sx + sy) / 2);
  const baseAngle = pose.angle_rad - Math.PI / 2;
  const conf = Math.max(0, Math.min(1, pose.confidence));

  const jawCount = 3;
  const ringR = Math.max(20, r * 0.95);
  const hubR = Math.max(8, r * 0.20);
  const armStartR = Math.max(6, r * 0.28);
  const armEndR = Math.max(14, r * 0.92);
  const armWidth = Math.max(5, r * 0.14);
  const padW = Math.max(8, r * 0.18);
  const padH = Math.max(4, r * 0.10);

  // 외곽 링 (신뢰도 색상)
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${conf * 120}, 95%, 58%, 0.9)`;
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.setLineDash([10, 7]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 중심 허브
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 28, 36, 0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 210, 235, 0.85)';
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.stroke();

  // 집게 3발
  for (let i = 0; i < jawCount; i++) {
    const angle = baseAngle + (i * (Math.PI * 2)) / jawCount;
    const sxArm = cx + armStartR * Math.cos(angle);
    const syArm = cy + armStartR * Math.sin(angle);
    const exArm = cx + armEndR * Math.cos(angle);
    const eyArm = cy + armEndR * Math.sin(angle);

    // 팔 라인
    ctx.beginPath();
    ctx.moveTo(sxArm, syArm);
    ctx.lineTo(exArm, eyArm);
    ctx.strokeStyle = 'rgba(145, 200, 255, 0.92)';
    ctx.lineWidth = armWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 발 끝 패드
    ctx.save();
    ctx.translate(exArm, eyArm);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(230, 245, 255, 0.95)';
    ctx.strokeStyle = 'rgba(90, 140, 185, 0.95)';
    ctx.lineWidth = Math.max(1.5, r * 0.03);
    ctx.beginPath();
    ctx.rect(-padW / 2, -padH / 2, padW, padH);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // AI 점수 배지
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, 8, 160, 28);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`AI Score: ${(pose.confidence * 100).toFixed(1)}%`, 14, 27);
}


// ─────────────────────────────────────────
// 헬퍼: Detection 목록 그리기
// ─────────────────────────────────────────

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: DetectionItem[],
): void {
  if (detections.length === 0) return;

  // 신뢰도 가장 높은 감지 결과
  const best = detections.reduce((a, b) =>
    a.grasp_confidence > b.grasp_confidence ? a : b,
  );

  for (const det of detections) {
    const [xmin, ymin, xmax, ymax] = det.bbox;
    const isBest = det === best;
    const hue = det.grasp_confidence * 120;

    // 바운딩박스
    ctx.strokeStyle = isBest
      ? `hsl(${hue}, 100%, 50%)`
      : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isBest ? 3 : 2;
    ctx.setLineDash(isBest ? [] : [6, 4]);
    ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
    ctx.setLineDash([]);

    // 신뢰도 레이블 배경 + 텍스트
    const text = `${(det.grasp_confidence * 100).toFixed(0)}%`;
    ctx.font = 'bold 14px Arial';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isBest
      ? `hsl(${hue}, 100%, 30%)`
      : 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(xmin, ymin - 20, tw + 8, 20);
    ctx.fillStyle = 'white';
    ctx.fillText(text, xmin + 4, ymin - 5);

    // best 가 아닌 감지의 파지 중심점
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

  // best 의 파지 중심 → 게이지 + 별
  if (Array.isArray(best.grasp_center_px) && best.grasp_center_px.length >= 2) {
    const [gx, gy] = best.grasp_center_px as [number, number];
    const [xmin, ymin, xmax, ymax] = best.bbox;
    const bboxR = Math.max(xmax - xmin, ymax - ymin) / 2;
    const gaugeR = Math.min(bboxR + 10, 80);

    drawProbabilityGauge(ctx, gx, gy, gaugeR, best.grasp_confidence);
    drawStar(ctx, gx, gy, 14, 7);
  }

  // 상단 요약 배지
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
