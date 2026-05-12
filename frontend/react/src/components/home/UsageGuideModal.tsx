import { AnimatePresence, motion } from 'framer-motion';

interface UsageGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const cardBaseStyle =
  'rounded-[1.6vw] border-[clamp(2px,0.35vw,4px)] border-crayon-line/20 bg-white/95 p-[clamp(14px,1.8vw,18px)]';

const UsageGuideModal = ({ isOpen, onClose }: UsageGuideModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-modal flex items-center justify-center bg-black/45 p-[4%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          onContextMenu={(e) => e.preventDefault()}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="사용 가이드"
            className="w-full max-w-[min(92vw,980px)] max-h-[92vh] overflow-y-auto rounded-[2vw] border-[clamp(3px,0.5vw,6px)] border-crayon-line bg-crayon-bg p-[clamp(18px,2.6vw,30px)] shadow-2xl"
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-[2vw]">
              <div>
                <h2 className="font-crayon text-[clamp(26px,3.4vw,42px)] font-black text-crayon-line leading-tight">
                  인형뽑기 사용 가이드
                </h2>
                <p className="mt-[0.8vh] text-[clamp(14px,1.7vw,19px)] font-semibold text-gray-700 break-keep">
                  Start부터 QR 영상 수신까지 한눈에 확인하세요.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full bg-gray-800 px-[clamp(12px,1.5vw,18px)] py-[clamp(8px,1vw,12px)] text-[clamp(13px,1.5vw,16px)] font-bold text-white active:scale-95"
              >
                닫기
              </button>
            </div>

            <div className="mt-[clamp(14px,2vw,22px)] grid gap-[clamp(10px,1.5vw,16px)]">
              <article className={cardBaseStyle}>
                <h3 className="text-[clamp(19px,2.4vw,26px)] font-black text-gray-900">1. 메인 페이지</h3>
                <p className="mt-[0.8vh] text-[clamp(14px,1.7vw,18px)] font-medium text-gray-700 break-keep">
                  홈 화면에서 <span className="font-black text-yellow-600">Start</span> 버튼을 누르면
                  플레이 페이지로 이동합니다.
                </p>
              </article>

              <article className={cardBaseStyle}>
                <h3 className="text-[clamp(19px,2.4vw,26px)] font-black text-gray-900">2. 플레이 페이지</h3>
                <p className="mt-[0.8vh] text-[clamp(14px,1.7vw,18px)] font-medium text-gray-700 break-keep">
                  메인 카메라 실시간 영상, 서브 카메라 영상, 집게 움직임 기반 뽑기 확률을
                  색상으로 확인할 수 있습니다.
                </p>
              </article>

              <article className={cardBaseStyle}>
                <h3 className="text-[clamp(19px,2.4vw,26px)] font-black text-gray-900">3. 다음 선택</h3>
                <p className="mt-[0.8vh] text-[clamp(14px,1.7vw,18px)] font-medium text-gray-700 break-keep">
                  성공/실패와 상관없이 매 판 종료 후
                  <span className="font-black text-gray-900"> 한 번 더 할지 </span>
                  선택하는 화면이 나옵니다.
                </p>
                <p className="mt-[0.4vh] text-[clamp(13px,1.55vw,17px)] font-semibold text-red-500 break-keep">
                  30초 동안 선택이 없으면 세션이 자동 종료됩니다.
                </p>
              </article>

              <article className={cardBaseStyle}>
                <h3 className="text-[clamp(19px,2.4vw,26px)] font-black text-gray-900">4. 이어하기 / 종료하기</h3>
                <p className="mt-[0.8vh] text-[clamp(14px,1.7vw,18px)] font-medium text-gray-700 break-keep">
                  이어하기를 고르면 오른쪽 <span className="font-black text-gray-900">나의 기록</span>에 플레이 기록이 누적됩니다.
                </p>
                <p className="mt-[0.4vh] text-[clamp(14px,1.7vw,18px)] font-medium text-gray-700 break-keep">
                  종료하고 영상 받기를 고르면 QR 코드가 표시됩니다.
                </p>
              </article>

              <article className={cardBaseStyle}>
                <h3 className="text-[clamp(19px,2.4vw,26px)] font-black text-gray-900">5. QR 영상 확인</h3>
                <p className="mt-[0.8vh] text-[clamp(14px,1.7vw,18px)] font-medium text-gray-700 break-keep">
                  QR 코드는 <span className="font-black text-red-500">30초</span> 동안만 활성화됩니다.
                  휴대폰으로 스캔하면 지금까지 저장된 녹화 영상을 확인할 수 있습니다.
                </p>
              </article>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UsageGuideModal;
