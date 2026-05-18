import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    latestFrameRef.current = frameUrl ?? null;
  }, [frameUrl]);

  useEffect(() => {
    if (!lastSessionEvent || !isMainView) return;

    const eventKey = `${lastSessionEvent.type}_${lastSessionEvent.session_id ?? 'none'}`;
    if (processedRef.current === eventKey) return;
    processedRef.current = eventKey;

    if (lastSessionEvent.type === 'SESSION_START') {
      const sid = lastSessionEvent.session_id;
      if (!sid) return;

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

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  spikes = 5,
): void {
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;

  ctx.beginPath();
  ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
    angle += step;
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

function drawProbabilityGauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  confidence: number,
): void {
  const maxConf = 0.9;
  const progress = Math.min(confidence / maxConf, 1);
  const hue = progress * 120;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 14;
  ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${(confidence * 100).toFixed(0)}%`, cx, cy + radius + 18);
  ctx.textAlign = 'left';
}

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
  const shoulderR = 0;
  const hingeR = Math.max(26, r * 0.66);
  const tipR = Math.max(34, r * 0.94);
  const armWidth = Math.max(2.5, r * 0.0525);
  const tipWidth = Math.max(3.5, r * 0.06);
  const hookDepth = Math.max(10, r * 0.18);

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';

  drawOuterGuide(ctx, cx, cy, tipR + hookDepth * 0.35, conf);

  for (let i = 0; i < jawCount; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / jawCount;
    drawCraneJaw(ctx, cx, cy, angle, shoulderR, hingeR, tipR, armWidth, tipWidth, hookDepth);
  }

  ctx.restore();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, 8, 160, 28);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`AI Score: ${(pose.confidence * 100).toFixed(1)}%`, 14, 27);
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
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCraneJaw(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  shoulderR: number,
  hingeR: number,
  tipR: number,
  armWidth: number,
  tipWidth: number,
  hookDepth: number,
): void {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  const bend = hookDepth * 0.48;

  const shoulder = point(cx, cy, ux, uy, shoulderR);
  const hinge = point(cx, cy, ux, uy, hingeR);
  const tipBase = point(cx, cy, ux, uy, tipR);
  const tip = {
    x: tipBase.x - ux * hookDepth + px * bend,
    y: tipBase.y - uy * hookDepth + py * bend,
  };

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.quadraticCurveTo(
    cx + ux * ((shoulderR + hingeR) / 2) + px * bend * 0.28,
    cy + uy * ((shoulderR + hingeR) / 2) + py * bend * 0.28,
    hinge.x,
    hinge.y,
  );
  ctx.quadraticCurveTo(
    cx + ux * ((hingeR + tipR) / 2) - px * bend * 0.1,
    cy + uy * ((hingeR + tipR) / 2) - py * bend * 0.1,
    tipBase.x,
    tipBase.y,
  );
  ctx.strokeStyle = 'rgba(154, 198, 226, 0.94)';
  ctx.lineWidth = armWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tipBase.x, tipBase.y);
  ctx.quadraticCurveTo(
    tipBase.x - ux * hookDepth * 0.42 + px * bend * 0.2,
    tipBase.y - uy * hookDepth * 0.42 + py * bend * 0.2,
    tip.x,
    tip.y,
  );
  ctx.strokeStyle = 'rgba(238, 248, 255, 0.98)';
  ctx.lineWidth = tipWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(hinge.x, hinge.y, Math.max(3.5, armWidth * 0.52), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(63, 93, 116, 0.96)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(235, 246, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function point(
  cx: number,
  cy: number,
  ux: number,
  uy: number,
  distance: number,
): { x: number; y: number } {
  return {
    x: cx + ux * distance,
    y: cy + uy * distance,
  };
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
    const [xmin, ymin, xmax, ymax] = best.bbox;
    const bboxR = Math.max(xmax - xmin, ymax - ymin) / 2;
    const gaugeR = Math.min(bboxR + 10, 80);

    drawProbabilityGauge(ctx, gx, gy, gaugeR, best.grasp_confidence);
    drawStar(ctx, gx, gy, 14, 7);
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
