import { motion } from 'framer-motion';

type StartButtonProps = {
  onStart: () => void;
};

/**
 * StartButton: 홈 화면에서 플레이 시작을 위한 버튼
 * @param onStart - 버튼 클릭 시 실행되는 콜백 함수 (페이지 이동)
 */
const buttonStyle =
  'min-w-[28%] max-w-[48%] min-h-[13vh] px-[7vw] py-[3.6vh] rounded-[2vh] ' +
  'bg-[#000000] text-[#FFFFFF] font-black tracking-[0.08em] ' +
  'text-[clamp(28px,3.4vw,44px)] shadow-xl';

const StartButton = ({ onStart }: StartButtonProps) => {
  return (
    // 터치 환경에서 눌림 피드백을 주기 위해 whileTap 애니메이션을 사용한다.
    <motion.button
      type="button"
      onClick={onStart}
      whileTap={{ scale: 0.95 }}
      className={buttonStyle}
    >
      START
    </motion.button>
  );
};

export default StartButton;
