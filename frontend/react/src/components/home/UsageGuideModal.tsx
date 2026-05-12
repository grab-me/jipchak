import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import GuideCloseButton from '@/components/home/guide/GuideCloseButton';
import GuideImage from '@/components/home/guide/GuideImage';
import GuideIndicators from '@/components/home/guide/GuideIndicators';
import GuideNextButton from '@/components/home/guide/GuideNextButton';
import GuidePrevButton from '@/components/home/guide/GuidePrevButton';
import GuideText from '@/components/home/guide/GuideText';
import { guideSlides } from '@/components/home/guide/guideSlides';

interface UsageGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * UsageGuideModal
 * 사용 가이드를 위한 모달입니다.
 * 슬라이드를 좌우 스와이프로 넘겨 내용을 확인할 수 있습니다.
 */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const SWIPE_THRESHOLD = 50;

const UsageGuideModal = ({ isOpen, onClose }: UsageGuideModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (nextIndex: number) => {
    const wrapped = (nextIndex + guideSlides.length) % guideSlides.length;
    // 마지막→첫 슬라이드는 앞으로, 첫→마지막은 뒤로
    const isWrappingForward = currentIndex === guideSlides.length - 1 && wrapped === 0;
    const isWrappingBackward = currentIndex === 0 && wrapped === guideSlides.length - 1;
    if (isWrappingForward) setDirection(1);
    else if (isWrappingBackward) setDirection(-1);
    else setDirection(wrapped > currentIndex ? 1 : -1);
    setCurrentIndex(wrapped);
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(currentIndex + 1);
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(currentIndex - 1);
  };

  const handleModalClose = () => {
    setCurrentIndex(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-modal flex items-center justify-center bg-black/45 p-[4%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleModalClose}
          onContextMenu={(e) => e.preventDefault()}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="사용 가이드"
            className="flex flex-col w-full max-w-[min(88vw,860px)] max-h-[90vh] rounded-[2vw] border-[clamp(3px,0.5vw,6px)] border-crayon-line bg-crayon-bg p-[clamp(16px,2.2vw,28px)] shadow-2xl"
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between shrink-0 mb-[clamp(10px,1.4vh,16px)]">
              <h2 className="font-crayon text-[clamp(22px,3vw,38px)] font-black text-crayon-line leading-tight">
                집착 사용 가이드
              </h2>
              <GuideCloseButton onClick={handleModalClose} />
            </div>

            {/* 슬라이드 영역 */}
            <div className="relative overflow-hidden flex-1 rounded-[1.4vw] [--guide-side-pad:clamp(42px,5.2vw,58px)] w-full">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={handleDragEnd}
                  className="flex flex-row items-stretch h-[clamp(320px,55vh,480px)] w-full px-[var(--guide-side-pad)] gap-[clamp(10px,1.4vw,16px)]"
                >
                  <GuideImage />
                  <GuideText description={guideSlides[currentIndex].description} />
                </motion.div>
              </AnimatePresence>

              <GuidePrevButton onClick={() => goTo(currentIndex - 1)} />
              <GuideNextButton onClick={() => goTo(currentIndex + 1)} />
            </div>

            <GuideIndicators count={guideSlides.length} currentIndex={currentIndex} onSelect={goTo} />
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UsageGuideModal;
