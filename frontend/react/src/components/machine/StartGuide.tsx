import { motion } from 'framer-motion';

/**
 * StartGuide Component
 * 사용자가 게임 시작 버튼(붉은 버튼)을 누르도록 유도하는 애니메이션 안내 문구.
 * 아케이드 게임의 'INSERT COIN' 스타일의 점멸 효과를 제공합니다.
 */
const StartGuide = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-sub">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          times: [0, 0.2, 0.8, 1],
          ease: "easeInOut"
        }}
        className="flex flex-col items-center gap-[1vh]"
      >
        <div className="relative">
          {/* 아웃라인 효과를 위한 그림자 레이어 */}
          <span className="absolute inset-0 text-white font-crayon text-[clamp(24px,4.5vw,48px)] font-black select-none text-center break-keep leading-tight opacity-20 blur-[2px]">
            게임 시작을 위해<br />빨간색 버튼을 눌러주세요!
          </span>

          <h2 className="relative text-white font-crayon text-[clamp(24px,4.5vw,48px)] font-black select-none text-center break-keep leading-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            게임 시작을 위해<br />
            <span className="text-red-500 [text-shadow:2px_2px_0_#fff,-2px_-2px_0_#fff,2px_-2px_0_#fff,-2px_2px_0_#fff]">빨간색 버튼</span>을 눌러주세요!
          </h2>
        </div>

        {/* 하단 화살표 또는 장식 요소 (선택사항, 아케이드 느낌 강조) */}
        <div className="flex gap-[1vw] mt-[1vh]">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-[1vw] h-[1vw] min-w-[10px] min-h-[10px] bg-red-500 rounded-full border-2 border-white shadow-sm"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default StartGuide;
