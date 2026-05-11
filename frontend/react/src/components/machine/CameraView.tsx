import { useEffect, useRef } from 'react';
import { useToolStore } from '@/store/toolStore';
import { useCameraStream } from '@/hooks/useCameraStream';
import Thermometer from './Thermometer';

interface CameraViewProps {
  label: string;
}

const CameraView = ({ label }: CameraViewProps) => {
  const { addRecord, setCatching, setLastResult, startSession, isSessionActive } = useToolStore();
  const processedRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const channel = label === 'Cam1' ? '2d' : '3d';
  const { frameUrl, connected, graspScore, graspPose, lastSessionEvent } = useCameraStream(channel);

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

  // Handle rendering frames to canvas
  useEffect(() => {
    if (!frameUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set intrinsic canvas size to match image
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw grasp overlay on 3D channel where graspPose is meaningful
      if (channel === '3d' && graspPose && graspPose.image_width > 0 && graspPose.confidence > 0) {
        const sx = canvas.width / graspPose.image_width;
        const sy = canvas.height / graspPose.image_height;
        const cx = graspPose.center_x * sx;
        const cy = graspPose.center_y * sy;

        // Use average scale for radius
        const scale = (sx + sy) / 2;
        const r = graspPose.radius * scale;
        const baseAngle = graspPose.angle_rad - Math.PI / 2;

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,0,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw 3 jaws
        const jawColors = ['#FF4444', '#44FF44', '#4488FF'];
        for (let i = 0; i < graspPose.jaw_count; i++) {
          const a = baseAngle + i * (2 * Math.PI / graspPose.jaw_count);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          const jawX = cx + r * Math.cos(a);
          const jawY = cy + r * Math.sin(a);
          ctx.lineTo(jawX, jawY);
          ctx.strokeStyle = jawColors[i % jawColors.length];
          ctx.lineWidth = 6; // 집게 두께를 6px로 강화
          ctx.lineCap = 'round';
          ctx.stroke();

          // Jaw tip point
          ctx.beginPath();
          ctx.arc(jawX, jawY, 6, 0, Math.PI * 2);
          ctx.fillStyle = jawColors[i % jawColors.length];
          ctx.fill();
        }

        // --- 중심점: 노란색 별 모양 그리기 ---
        const drawStar = (x: number, y: number, spikes: number, outerRadius: number, innerRadius: number) => {
          let rot = Math.PI / 2 * 3;
          let step = Math.PI / spikes;
          ctx.beginPath();
          ctx.moveTo(x, y - outerRadius);
          for (let i = 0; i < spikes; i++) {
            ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
            rot += step;
          }
          ctx.lineTo(x, y - outerRadius);
          ctx.closePath();
          ctx.fillStyle = 'yellow';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,165,0,0.8)'; // 오렌지색 테두리
          ctx.lineWidth = 2;
          ctx.stroke();
        };

        drawStar(cx, cy, 5, 12, 6); // 별 모양 그리기 (5각 별)

        // --- 추가: 원형 확률 게이지 (Circular Gauge) ---
        const maxScoreForGauge = 0.9; // 90%를 만점으로 설정
        const progress = Math.min(graspPose.confidence / maxScoreForGauge, 1.0);

        // 게이지 배경 (반투명 회색 원)
        ctx.beginPath();
        ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 8;
        ctx.stroke();

        // 게이지 바 (확률에 따라 차오름)
        const hue = progress * 120; // 낮을수록 빨강(0), 높을수록 녹색(120)
        ctx.beginPath();
        ctx.arc(cx, cy, r + 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        // 글로우 효과 추가
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.stroke();
        ctx.shadowBlur = 0; // 초기화

        // 게이지 중앙 퍼센트 텍스트
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${(graspPose.confidence * 100).toFixed(0)}%`, cx, cy + 28);
        ctx.textAlign = 'left';

        // Draw score (좌측 상단 텍스트는 유지)
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(10, 10, 140, 24);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(`AI Score: ${(graspPose.confidence * 100).toFixed(1)}%`, 16, 26);
      }
    };
    img.src = frameUrl;
  }, [frameUrl, graspPose, channel]);

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
        className={`absolute top-2 right-2 w-2 h-2 rounded-full z-overlay ${connected ? 'bg-green-400' : 'bg-red-500'
          }`}
        title={connected ? 'WS connected' : 'WS disconnected'}
      />

      {/* Cam1, Cam2 모두에 온도계 표시 */}
      <Thermometer probability={graspScore * 100} />
    </div>
  );
};

export default CameraView;
