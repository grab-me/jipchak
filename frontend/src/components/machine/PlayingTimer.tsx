import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStreamStore, StreamState } from '@/store/streamStore';

/**
 * PlayingTimer
 *
 * 한 판이 시작된 후 카운트다운을 표시한다.
 *
 *   1) SESSION_START 도착 → 마운트되어 "조이스틱을 움직여 시작" 안내 표시
 *   2) ROUND_TIMER_START 이벤트 도착 → 20초 카운트다운 시작
 *      (Arduino 가 PLAYING 상태에서 조이스틱 첫 입력을 감지하면 이 이벤트 송신)
 *   3) 카운트다운 만료 또는 빨강 버튼 → Arduino 가 자동 GRAB 시퀀스 진입
 *
 * MainCameraPanel 에서 isCatching === true 일 때만 마운트되므로,
 * 한 판이 끝나면 자동으로 unmount → 다음 판 SESSION_START 시 새로 마운트되어 reset.
 */
const PLAY_DURATION_MS = 20000;

const PlayingTimer = () => {
  const lastSessionEvent = useStreamStore((s: StreamState) => s.lastSessionEvent);
  const lastUiEvent = useStreamStore((s: StreamState) => s.lastUiEvent);

  // 카운트다운이 시작되었는지 (ROUND_TIMER_START 수신 여부)
  const [started, setStarted] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(PLAY_DURATION_MS);
  const lastStartTs = useRef<number | null>(null);

  // SESSION_START (라운드 시작) 마다 reset.
  useEffect(() => {
    if (lastSessionEvent?.type !== 'SESSION_START') return;
    setStarted(false);
    setRemainingMs(PLAY_DURATION_MS);
  }, [lastSessionEvent?.type, lastSessionEvent?.session_id]);

  // ROUND_TIMER_START 이벤트 수신 → 카운트다운 시작.
  useEffect(() => {
    if (lastUiEvent?.type !== 'ROUND_TIMER_START') return;
    if (lastStartTs.current === lastUiEvent.ts) return;
    lastStartTs.current = lastUiEvent.ts;
    setStarted(true);
  }, [lastUiEvent]);

  // 카운트다운 진행.
  useEffect(() => {
    if (!started) return;

    const startedAt = Date.now();
    setRemainingMs(PLAY_DURATION_MS);

    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, PLAY_DURATION_MS - elapsed);
      setRemainingMs(left);
      if (left === 0) clearInterval(id);
    }, 100);

    return () => clearInterval(id);
  }, [started]);

  if (!started) {
    // 조이스틱 대기 안내 — 점멸로 주의 환기
    return (
      <div className="absolute top-[6%] left-1/2 -translate-x-1/2 pointer-events-none z-sub">
        <motion.div
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="px-[clamp(16px,2.4vw,28px)] py-[clamp(6px,1vw,12px)] rounded-full font-crayon font-black text-white bg-black/60 border-[clamp(3px,0.5vw,6px)] border-white/70 shadow-lg"
        >
          <span className="text-[clamp(18px,2.4vw,28px)]">조이스틱을 움직여 시작!</span>
        </motion.div>
      </div>
    );
  }

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
