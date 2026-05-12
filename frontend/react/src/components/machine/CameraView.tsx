import { useEffect, useRef } from 'react';
import { useToolStore } from '@/store/toolStore';
import { useCameraStream } from '@/hooks/useCameraStream';
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

  const { frameUrl, connected, graspScore, lastSessionEvent } = useCameraStream(channel);

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

      // 집게 하강 효과음 재생 (메인 화면에서만 1번 재생되도록)
      if (isMainView) {
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

  return (
    <div 
      className={`w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden gap-[4%] ${className}`}
      onClick={onClick}
    >
      {frameUrl && (
        <img
          src={frameUrl}
          alt={`${label} live`}
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
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

export default CameraView;
