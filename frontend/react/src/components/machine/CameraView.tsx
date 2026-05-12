import { useEffect, useRef } from 'react';
import { useToolStore } from '@/store/toolStore';
import { useCameraStream, DetectionItem } from '@/hooks/useCameraStream';
import Thermometer from './Thermometer';
import { useAudio } from '@/hooks/useAudio';
import { SOUND_ASSETS } from '@/constants/soundConfig';

interface CameraViewProps {
  label: string;
}

const CameraView = ({ label }: CameraViewProps) => {
  const { addRecord, setCatching, setLastResult, startSession, isSessionActive } = useToolStore();
  const processedRef = useRef<string | null>(null);
  const { playSfx } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const channel = label === 'Cam1' ? '3d' : '2d';
  const { frameUrl, connected, graspScore, detections, lastSessionEvent } = useCameraStream(channel);

  useEffect(() => {
    if (!lastSessionEvent) return;

    const eventKey = `${lastSessionEvent.type}_${lastSessionEvent.session_id}`;
    if (processedRef.current === eventKey) return;
    processedRef.current = eventKey;

    if (lastSessionEvent.type === 'SESSION_START') {
      if (!isSessionActive) {
        startSession();
      }
      setCatching(true);
      setLastResult(null);

      // 집게 하강 효과음 재생
      if (label === 'Cam1') {
        playSfx(SOUND_ASSETS.SFX.TRY_CATCH);
      }
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
  }, [lastSessionEvent]);

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

      if (channel === '3d' && detections.length > 0) {
        drawDetections(ctx, detections);
      }
    };
    img.src = frameUrl;
  }, [frameUrl, detections, channel]);

  return (
    <div className="w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden gap-[4%]">
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

      {label === 'Cam1' && <Thermometer probability={graspScore * 100} />}
    </div>
  );
};

function drawDetections(ctx: CanvasRenderingContext2D, detections: DetectionItem[]) {
  const best = detections.reduce((a, b) =>
    a.grasp_confidence > b.grasp_confidence ? a : b
  );

  for (const det of detections) {
    const [xmin, ymin, xmax, ymax] = det.bbox;
    const isBest = det === best;
    const conf = det.grasp_confidence;
    const hue = conf * 120; // 0=red, 120=green

    // bbox
    ctx.strokeStyle = isBest ? `hsl(${hue}, 100%, 50%)` : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isBest ? 3 : 2;
    ctx.setLineDash(isBest ? [] : [6, 4]);
    ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
    ctx.setLineDash([]);

    // confidence label
    const text = `${(conf * 100).toFixed(0)}%`;
    ctx.font = 'bold 14px Arial';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isBest ? `hsl(${hue}, 100%, 30%)` : 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(xmin, ymin - 20, tw + 8, 20);
    ctx.fillStyle = 'white';
    ctx.fillText(text, xmin + 4, ymin - 5);

    // grasp center point
    if (det.grasp_center_px) {
      const [cx, cy] = det.grasp_center_px;
      ctx.beginPath();
      ctx.arc(cx, cy, isBest ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isBest ? `hsl(${hue}, 100%, 50%)` : 'rgba(255, 255, 0, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // crosshair for best
      if (isBest) {
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy);
        ctx.lineTo(cx + 12, cy);
        ctx.moveTo(cx, cy - 12);
        ctx.lineTo(cx, cy + 12);
        ctx.stroke();
      }
    }
  }

  // top-left score
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, 8, 160, 28);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(
    `Best: ${(best.grasp_confidence * 100).toFixed(1)}%  (${detections.length} obj)`,
    14, 27
  );
}

export default CameraView;
