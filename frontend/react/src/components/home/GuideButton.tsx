import { useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import CrayonWrapper from '@/components/common/CrayonWrapper';

type GuideButtonProps = {
  onClick: () => void;
  className?: string;
};

/**
 * GuideButton
 * 홈 화면에서 사용 가이드를 열기 위한 버튼입니다.
 * 클릭 시 사용 가이드 모달이 열립니다.
 */
const GuideButton = ({ onClick, className }: GuideButtonProps) => {
  const animationControls = useAnimationControls();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleGuideClick = async () => {
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

      // 애니메이션 완료 후 onClick 호출
      onClick();
    } finally {
      setIsAnimating(false);
    }
  };

  const defaultStyle =
    'min-w-[28%] max-w-[48%] min-h-[13vh] drop-shadow-lg cursor-pointer appearance-none bg-transparent border-none p-0 outline-none';

  return (
    <motion.button
      type="button"
      onClick={handleGuideClick}
      animate={animationControls}
      aria-label="GUIDE"
      className={className ? `${defaultStyle} ${className}` : defaultStyle}
    >
      <CrayonWrapper showCharacter={false}>
        <span className="flex items-center justify-center w-full h-full font-black tracking-[0.08em] text-[clamp(28px,3.4vw,44px)]">
          GUIDE
        </span>
      </CrayonWrapper>
    </motion.button>
  );
};

export default GuideButton;
