import { useState, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import CrayonWrapper from '@/components/common/CrayonWrapper';

type StartButtonProps = {
  onStart: () => void;
  autoClick?: boolean;
};

/**
 * StartButton
 * 홈 화면에서 플레이 시작을 위한 버튼입니다. (클릭 시 축소 -> 복원 -> 콜백 함수 실행 순으로 동작)
 */
const StartButton = ({ onStart, autoClick }: StartButtonProps) => {
  const animationControls = useAnimationControls();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleStartClick = async () => {
    // 중복 클릭 방지
    if (isAnimating) return;

    setIsAnimating(true);

    // 오류 발생 시 애니메이션 상태 해제
    try {
      // 클릭 시 축소 애니메이션
      await animationControls.start({
        scale: 0.9,
        transition: { duration: 0.12, ease: 'easeOut' },
      });

      // 축소 완료 후 원래 크기로 돌아오는 애니메이션
      await animationControls.start({
        scale: 1,
        transition: { duration: 0.16, ease: 'easeOut' },
      });

      // 애니메이션 완료 후 onStart 호출
      onStart();
    } finally {
      setIsAnimating(false);
    }
  };

  useEffect(() => {
    if (autoClick && !isAnimating) {
      // 잠깐의 지연 후 자동 클릭 실행 (사용자가 홈 화면에 진입했음을 인지할 시간)
      const timer = setTimeout(() => {
        handleStartClick();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoClick, isAnimating]);

  return (
    <motion.button
      type="button"
      aria-label="START"
      onClick={handleStartClick}
      animate={animationControls}
      className="min-w-[28%] max-w-[48%] min-h-[13vh] drop-shadow-lg cursor-pointer appearance-none bg-transparent border-none p-0 outline-none"
    >
      <CrayonWrapper showCharacter={false}>
        <span className="flex items-center justify-center w-full h-full font-black tracking-[0.08em] text-[clamp(28px,3.4vw,44px)]">
          START
        </span>
      </CrayonWrapper>
    </motion.button>
  );
};

export default StartButton;
