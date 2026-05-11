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

  const channel = label === 'Cam1' ? '2d' : '3d';
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
    <div className="w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden gap-[4%]">
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

      {label === 'Cam1' && <Thermometer probability={graspScore * 100} />}
    </div>
  );
};

export default CameraView;
