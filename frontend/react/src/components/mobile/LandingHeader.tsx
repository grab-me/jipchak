import React from 'react';
import { motion } from 'framer-motion';

interface LandingHeaderProps {
  timeLeft: number;
  formatTime: (seconds: number) => string;
  triggerExpireTest: () => void;
}

const LandingHeader: React.FC<LandingHeaderProps> = ({ timeLeft, formatTime, triggerExpireTest }) => {
  return (
    <header className="w-full p-[5%] flex flex-col items-center pt-[10%] shrink-0">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-[clamp(32px,8vw,48px)] mb-2"
      >
        🎉
      </motion.div>
      <h1 className="text-[clamp(24px,6vw,32px)] font-bold mb-1 tracking-wide text-center text-crayon-line break-keep">
        CONGRATULATIONS!
      </h1>
      <p className="text-[clamp(14px,3.5vw,18px)] text-gray-500 mb-4 text-center break-keep">
        성공적인 플레이를 축하합니다!<br />영상을 기기에 저장해 보세요.
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-red-50 text-red-500 px-4 py-2 rounded-full border border-red-100 shadow-sm">
          <span className="text-sm font-bold break-keep">만료까지</span>
          <span className="text-lg font-bold tracking-widest">{formatTime(timeLeft)}</span>
        </div>

        {/* 테스트용 버튼 (개발 단계에서만 사용) */}
        <button
          onClick={triggerExpireTest}
          className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded border border-gray-300 active:scale-95"
        >
          TEST
        </button>
      </div>
    </header>
  );
};

export default LandingHeader;
