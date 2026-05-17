import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStreamStore, StreamState } from '@/store/streamStore';

/**
 * PlayingTimer
 *
 * SESSION_START 가 도착한 순간부터 15초 카운트다운을 표시한다.
 * Arduino 의 PLAY_TIMEOUT_MS (15000ms) 와 동일한 시간이며, 만료되면
 * Arduino 가 자동으로 집기 시퀀스로 진입하므로 클라이언트는 0 까지만 보여주면 된다.
 *
 * MainCameraPanel 에서 isCatching === true 일 때만 마운트되므로,
 * 한 판이 끝나면 자동으로 unmount → 다시 마운트될 때 새 SESSION_START 로 reset 된다.
 */
const PLAY_DURATION_MS = 15000;

const PlayingTimer = () => {
  const lastSessionEvent = useStreamStore((s: StreamState) => s.lastSessionEvent);
  const [remainingMs, setRemainingMs] = useState<number>(PLAY_DURATION_MS);

  useEffect(() => {
    if (lastSessionEvent?.type !== 'SESSION_START') return;

    const startedAt = Date.now();
    setRemainingMs(PLAY_DURATION_MS);

    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, PLAY_DURATION_MS - elapsed);
      setRemainingMs(left);
      if (left === 0) clearInterval(id);
    }, 100);

    return () => clearInterval(id);
    // session_id 가 바뀌면 새 판이 시작된 것 → 타이머 초기화
  }, [lastSessionEvent?.type, lastSessionEvent?.session_id]);

  const seconds = Math.ceil(remainingMs / 1000);
  const isUrgent = seconds <= 5;

  return (
    <div className="absolute top-[6%] left-1/2 -translate-x-1/2 pointer-events-none z-sub">
      <motion.div
        key={isUrgent ? 'urgent' : 'normal'}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`px-[clamp(16px,2.4vw,28px)] py-[clamp(6px,1vw,12px)] rounded-full font-crayon font-black text-white shadow-lg border-[clamp(3px,0.5vw,6px)] ${
          isUrgent ? 'bg-red-500 border-white' : 'bg-black/60 border-white/70'
        }`}
      >
        <span className="text-[clamp(28px,4.5vw,52px)] tabular-nums drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
          {seconds}
        </span>
        <span className="text-[clamp(16px,2vw,24px)] ml-[0.4em] opacity-90">초</span>
      </motion.div>
    </div>
  );
};

export default PlayingTimer;
