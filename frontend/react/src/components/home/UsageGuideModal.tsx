import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface UsageGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * UsageGuideModal
 * 사용 가이드를 위한 모달입니다.
 * 슬라이드를 좌우 스와이프로 넘겨 내용을 확인할 수 있습니다.
 */
const slides = [
  {
    step: '1',
    title: '메인 페이지',
    description: (
      <>
        <span className="font-black text-yellow-600">Start</span> 버튼을 누르면 플레이 페이지로 이동합니다.
      </>
    ),
  },
  {
    step: '2',
    title: '사용 가이드',
    description: (
      <>
        집착의 사용 가이드를 보여줍니다.
      </>
    ),
  },
  {
    step: '3',
    title: '플레이 페이지',
    description: (
      <>
        메인 카메라 실시간 영상, 서브 카메라 영상, 집게 움직임 기반 뽑기 확률을 색상으로 확인할 수 있습니다.
      </>
    ),
  },
  {
    step: '4',
    title: '다음 선택',
    description: (
      <>
        매 판 종료 후 <span className="font-black text-gray-900">한 번 더 할지</span> 선택하는 화면이 나옵니다.
        선택은 <span className="font-black text-red-500">최대 4번</span>까지 가능하며,
        30초 동안 선택이 없으면 자동 종료됩니다.
      </>
    ),
  },
  {
    step: '5',
    title: '이어하기',
    description: (
      <>
        이어하기를 고르면 <span className="font-black text-gray-900">나의 기록</span>에 누적되어 보여집니다.
        기록은 <span className="font-black text-red-500">최대 4개</span>까지 저장됩니다.
      </>
    ),
  },
  {
    step: '6',
    title: 'QR 코드 생성',
    description: (
      <>
        그만하거나 종료하게 되면 지금까지 저장된 영상을 다운로드 받을 수 있는 <span className="font-black text-gray-900">QR 코드</span>가 생성됩니다.
      </>
    ),
  },
  {
    step: '7',
    title: 'QR 영상 확인',
    description: (
      <>
        QR 코드는 <span className="font-black text-red-500">30초</span> 동안만 활성화됩니다.
        휴대폰으로 스캔하면 녹화 영상을 확인할 수 있습니다.
        영상은 <span className="font-black text-red-500">최대 5개</span>까지 저장됩니다.
      </>
    ),
  },
];

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
    const wrapped = (nextIndex + slides.length) % slides.length;
    // 마지막→첫 슬라이드는 앞으로, 첫→마지막은 뒤로
    const isWrappingForward = currentIndex === slides.length - 1 && wrapped === 0;
    const isWrappingBackward = currentIndex === 0 && wrapped === slides.length - 1;
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
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-full bg-gray-800 px-[clamp(9px,1.2vw,14px)] text-[clamp(20px,2.8vw,34px)] font-bold text-white active:scale-95"
              >
                X
              </button>
            </div>

            {/* 슬라이드 영역 */}
            <div className="relative overflow-hidden flex-1 rounded-[1.4vw]">
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
                  className="flex flex-col h-[clamp(320px,55vh,480px)] w-full"
                >
                  {/* 이미지 영역 */}
                  <div className="flex-1 rounded-[1.2vw] bg-gray-200 flex flex-col items-center justify-center gap-[1vh] min-h-0">
                    <span className="text-[clamp(32px,4.5vw,56px)] text-gray-400 select-none">🖼</span>
                    <span className="text-[clamp(12px,1.4vw,15px)] font-semibold text-gray-400 select-none">
                      이미지 준비 중
                    </span>
                  </div>

                  {/* 텍스트 영역 */}
                  <div className="shrink-0 mt-[clamp(10px,1.4vh,16px)] px-[clamp(4px,0.6vw,8px)]">
                    <p className="text-[clamp(20px,2.8vw,34px)] font-black text-crayon-line mb-[0.4vh]">
                      {slides[currentIndex].description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 내용 영역 좌우 이동 버튼 */}
              <button
                type="button"
                onClick={() => goTo(currentIndex - 1)}
                className="absolute left-[clamp(6px,1vw,12px)] top-1/2 -translate-y-1/2 z-10 rounded-full bg-gray-800/90 text-white font-bold active:scale-90 flex items-center justify-center w-[clamp(30px,3.8vw,44px)] h-[clamp(30px,3.8vw,44px)] text-[clamp(20px,2.8vw,34px)]"
                aria-label="이전 슬라이드"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={() => goTo(currentIndex + 1)}
                className="absolute right-[clamp(6px,1vw,12px)] top-1/2 -translate-y-1/2 z-10 rounded-full bg-gray-800/90 text-white font-bold active:scale-90 flex items-center justify-center w-[clamp(30px,3.8vw,44px)] h-[clamp(30px,3.8vw,44px)] text-[clamp(20px,2.8vw,34px)]"
                aria-label="다음 슬라이드"
              >
                ›
              </button>
            </div>

            {/* 하단 내비게이션 */}
            <div className="shrink-0 mt-[clamp(10px,1.4vh,16px)] flex items-center justify-center gap-[clamp(8px,1.2vw,14px)]">
              {/* 인디케이터 점 */}
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all active:scale-90 ${
                    i === currentIndex
                      ? 'w-[clamp(20px,2.8vw,32px)] h-[clamp(8px,1.1vw,12px)] bg-crayon-line'
                      : 'w-[clamp(8px,1.1vw,12px)] h-[clamp(8px,1.1vw,12px)] bg-gray-300'
                  }`}
                  aria-label={`${i + 1}번 슬라이드로 이동`}
                />
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UsageGuideModal;
