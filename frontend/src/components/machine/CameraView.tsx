import { useEffect, useRef } from 'react';
import { useToolStore } from '@/store/toolStore';
import { useStreamStore, DetectionItem, GraspPose } from '@/store/streamStore';
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

const CameraView = ({ label, channel, isMainView = false, onClick, className = '' }: CameraViewProps) => {
  const { addRecord, setCatching, setLastResult, startSession, isSessionActive } = useToolStore();
  const processedRef = useRef<string | null>(null);
  const { playSfx } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 단일 streamStore 에서 채널별 프레임 + AI 분석 데이터 구독.
  // 두 CameraView 인스턴스가 같은 store 를 본다 → WS 는 페이지 레벨에서 1 개만.
  const frameUrl = useStreamStore((s) => (channel === '2d' ? s.frame2d : s.frame3d));
  const connected = useStreamStore((s) => s.connected);
  const graspScore = useStreamStore((s) => s.graspScore);
  const detections = useStreamStore((s) => s.detections);
  const graspPose = useStreamStore((s) => s.graspPose);
  const lastSessionEvent = useStreamStore((s) => s.lastSessionEvent);

  useEffect(() => {
    if (!lastSessionEvent) return;
    // 세션 이벤트로 인한 부수 효과(startSession/addRecord/효과음)는 메인 뷰 1 곳에서만 처리.
    // 두 인스턴스가 같은 store 를 보므로 가드가 없으면 중복 호출됨.
    if (!isMainView) return;

    const eventKey = `${lastSessionEvent.type}_${lastSessionEvent.session_id}`;
    if (processedRef.current === eventKey) return;
    processedRef.current = eventKey;

    if (lastSessionEvent.type === 'SESSION_START') {
      if (!isSessionActive) {
        // 서버(AI) 가 발급한 session_id 를 그대로 채택 → Spring 백엔드 / 모바일과 동일한 키 사용.
        startSession(lastSessionEvent.session_id);
      }
      setCatching(true);
      setLastResult(null);
      playSfx(SOUND_ASSETS.SFX.TRY_CATCH);
    }

    if (lastSessionEvent.type === 'GAME_RESULT') {
      setCatching(false);
      const isWin = lastSessionEvent.is_caught ?? false;
      setLastResult(isWin ? 'win' : 'lose');

      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      const hh = now.getHours().toString().padStart(2, '0');
      const min = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');

      addRecord({
        id: Date.now().toString(),
        filename: `${yy}${mm}${dd}_${hh}${min}${ss}.mp4`,
        isSuccess: isWin,
      });

      setTimeout(() => setLastResult(null), 3000);
    }
  }, [lastSessionEvent, isMainView]);

  useEffect(() => {
    if (!frameUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (channel === '3d') {
        // GraspPose 우선 (YOLOv8-seg + ChickEvaluator)
        if (graspPose && graspPose.confidence > 0) {
          drawGraspPose(ctx, graspPose, canvas.width, canvas.height);
        } else if (detections.length > 0) {
          drawDetections(ctx, detections);
        }
      }
    };
    img.src = frameUrl;
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
        className={`absolute top-2 right-2 w-2 h-2 rounded-full z-overlay ${
          connected ? 'bg-green-400' : 'bg-red-500'
        }`}
        title={connected ? 'WS connected' : 'WS disconnected'}
      />

      {/* 온도계는 메인 뷰(큰 화면)일 때만 표시 */}
      {isMainView && <Thermometer probability={graspScore * 100} />}
    </div>
  );
};

// ─────────────────────────────────────────
// Overlay 드로잉 헬퍼
// ─────────────────────────────────────────

/** 노란 5각 별 (오렌지 테두리). best 중심점 강조용. */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  outerR: number, innerR: number,
  spikes = 5,
) {
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2; // 위쪽에서 시작
  ctx.beginPath();
  ctx.moveTo(x, y - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(x + Math.cos(rot) * innerR, y + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = '#FFEB3B';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 140, 0, 0.95)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** 원형 확률 게이지 (HSL 빨강→녹색 + glow). best 주변에 표시. */
function drawProbabilityGauge(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  confidence: number,
) {
  const MAX_CONF = 0.9; // 90%를 만점으로 매핑
  const progress = Math.min(confidence / MAX_CONF, 1);
  const hue = progress * 120;

  // 배경 링
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 8;
  ctx.stroke();

  // 진행 링 (12시 방향부터 시계방향)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 14;
  ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 중앙 하단 퍼센트
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${(confidence * 100).toFixed(0)}%`, cx, cy + radius + 18);
  ctx.textAlign = 'left';
}

/**
 * YOLOv8-seg + ChickEvaluator 결과로 회전된 3-jaw 그리퍼를 그린다.
 * - dashed 외곽선 원 + RGB 3-jaw 라인 + 별 마커 + 원형 게이지
 */
function drawGraspPose(
  ctx: CanvasRenderingContext2D,
  pose: GraspPose,
  canvasW: number,
  canvasH: number,
) {
  // 추론한 원본 이미지 해상도와 캔버스 해상도가 다를 수 있어 스케일 보정
  const sx = pose.image_width > 0 ? canvasW / pose.image_width : 1;
  const sy = pose.image_height > 0 ? canvasH / pose.image_height : 1;
  const cx = pose.center_x * sx;
  const cy = pose.center_y * sy;
  const r = pose.radius * ((sx + sy) / 2);
  const baseAngle = pose.angle_rad - Math.PI / 2;

  // 1) 외곽 점선 원 (그리퍼 작동 반경 시각화)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 235, 59, 0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2) N개 jaw (각 jaw는 다른 색)
  const jawColors = ['#FF4444', '#44FF44', '#4488FF', '#FFB347', '#66B2FF', '#DDA0DD'];
  const jaws = Math.max(2, pose.jaw_count);
  for (let i = 0; i < jaws; i++) {
    const a = baseAngle + i * (2 * Math.PI / jaws);
    const jx = cx + r * Math.cos(a);
    const jy = cy + r * Math.sin(a);
    const color = jawColors[i % jawColors.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(jx, jy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // jaw tip 점
    ctx.beginPath();
    ctx.arc(jx, jy, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // 3) 원형 확률 게이지 (jaw 바깥 링)
  drawProbabilityGauge(ctx, cx, cy, r + 20, pose.confidence);

  // 4) 중심 별 마커 (z-order 최상위)
  drawStar(ctx, cx, cy, 14, 7);

  // 5) 좌상단 AI Score 패널
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, 8, 160, 28);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`AI Score: ${(pose.confidence * 100).toFixed(1)}%`, 14, 27);
}

function drawDetections(ctx: CanvasRenderingContext2D, detections: DetectionItem[]) {
  const best = detections.reduce((a, b) =>
    a.grasp_confidence > b.grasp_confidence ? a : b
  );

  // 1) bbox + confidence 라벨 (모든 detection)
  for (const det of detections) {
    const [xmin, ymin, xmax, ymax] = det.bbox;
    const isBest = det === best;
    const conf = det.grasp_confidence;
    const hue = conf * 120;

    ctx.strokeStyle = isBest ? `hsl(${hue}, 100%, 50%)` : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isBest ? 3 : 2;
    ctx.setLineDash(isBest ? [] : [6, 4]);
    ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
    ctx.setLineDash([]);

    const text = `${(conf * 100).toFixed(0)}%`;
    ctx.font = 'bold 14px Arial';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isBest ? `hsl(${hue}, 100%, 30%)` : 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(xmin, ymin - 20, tw + 8, 20);
    ctx.fillStyle = 'white';
    ctx.fillText(text, xmin + 4, ymin - 5);

    // non-best는 grasp center 작은 점만
    if (!isBest && det.grasp_center_px) {
      const [cx, cy] = det.grasp_center_px;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 2) best detection 강조: 확률 게이지 → 별 마커 (z-order)
  if (best.grasp_center_px) {
    const [cx, cy] = best.grasp_center_px;
    const [xmin, ymin, xmax, ymax] = best.bbox;
    const bboxR = Math.max(xmax - xmin, ymax - ymin) / 2;
    const gaugeR = Math.min(bboxR + 10, 80); // bbox 크기 기반, 최대 80px

    drawProbabilityGauge(ctx, cx, cy, gaugeR, best.grasp_confidence);
    drawStar(ctx, cx, cy, 14, 7);
  }

  // 3) 좌상단 정보 패널
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, 8, 180, 28);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(
    `Best: ${(best.grasp_confidence * 100).toFixed(1)}%  (${detections.length} obj)`,
    14, 27
  );
}

export default CameraView;
