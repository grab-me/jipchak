import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamStore, StreamState } from '@/store/streamStore';

const PLAY_DURATION_MS = 20000;

// 웹 오디오 API를 이용한 비프음 (경고음) 발생
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // 경고음 느낌의 주파수 (1000Hz)
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime); // 볼륨 작게
    
    osc.start();
    // 0.15초 동안 짧게 재생
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {
    console.warn("Beep sound failed:", e);
  }
};

const PlayingTimer = () => {
  const lastSessionEvent = useStreamStore((s: StreamState) => s.lastSessionEvent);
  const lastUiEvent = useStreamStore((s: StreamState) => s.lastUiEvent);

  const [started, setStarted] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(PLAY_DURATION_MS);
  const lastStartTs = useRef<number | null>(null);
  
  // 타이머 시작 토스트 메시지 표시 여부
  const [showStartToast, setShowStartToast] = useState(false);
  
  // 이미 비프음을 재생한 초를 기록 (중복 재생 방지)
  const beepedSeconds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (lastSessionEvent?.type !== 'SESSION_START') return;
    setStarted(false);
    setRemainingMs(PLAY_DURATION_MS);
    setShowStartToast(false);
    beepedSeconds.current.clear();
  }, [lastSessionEvent?.type, lastSessionEvent?.session_id]);

  useEffect(() => {
    if (lastUiEvent?.type !== 'ROUND_TIMER_START') return;
    if (lastStartTs.current === lastUiEvent.ts) return;
    lastStartTs.current = lastUiEvent.ts;
    
    setStarted(true);
    setShowStartToast(true);
    beepedSeconds.current.clear();
    
    // 2초 뒤에 '타이머 시작!' 메시지 숨김
    setTimeout(() => {
      setShowStartToast(false);
    }, 2000);
  }, [lastUiEvent]);

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

  const seconds = Math.ceil(remainingMs / 1000);
  const isUrgent = seconds <= 5 && seconds > 0;

  // 5초 이하일 때 1초마다 비프음 재생
  useEffect(() => {
    if (started && isUrgent) {
      if (!beepedSeconds.current.has(seconds)) {
        beepedSeconds.current.add(seconds);
        playBeep();
      }
    }
  }, [seconds, started, isUrgent]);

  if (!started) {
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

  return (
    <div className="absolute top-[6%] left-1/2 -translate-x-1/2 pointer-events-none z-sub flex flex-col items-center">
      <AnimatePresence>
        {showStartToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-[clamp(16px,2.4vw,28px)] py-[clamp(6px,1vw,12px)] rounded-full font-crayon font-black text-white bg-blue-500/80 border-[clamp(3px,0.5vw,6px)] border-white shadow-lg"
          >
            <span className="text-[clamp(18px,2.4vw,28px)]">타이머 시작! (20초)</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(!showStartToast && isUrgent) && (
          <motion.div
            key={seconds}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="px-[clamp(16px,2.4vw,28px)] py-[clamp(6px,1vw,12px)] rounded-full font-crayon font-black text-white shadow-lg border-[clamp(3px,0.5vw,6px)] bg-red-500 border-white mt-2"
          >
            <span className="text-[clamp(28px,4.5vw,52px)] tabular-nums drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
              {seconds}
            </span>
            <span className="text-[clamp(16px,2vw,24px)] ml-[0.4em] opacity-90">초 남음!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayingTimer;
