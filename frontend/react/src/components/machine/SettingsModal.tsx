import { motion, AnimatePresence } from 'framer-motion';
import { useAudioStore } from '@/store/audioStore';

const SettingsModal = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    bgmVolume,
    setBgmVolume,
    sfxVolume,
    setSfxVolume,
    voiceVolume,
    setVoiceVolume
  } = useAudioStore();

  if (!isSettingsOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="absolute inset-0 z-modal flex items-center justify-center p-[5%] font-crayon"
        // 모달 바깥쪽을 클릭하면 닫히도록 설정. 내부 클릭은 전파를 막아 모달 유지.
        onClick={() => setSettingsOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[440px] bg-crayon-bg rounded-[2.5vw] shadow-2xl p-[clamp(24px,6vw,48px)] border-[clamp(4px,0.8vw,8px)] border-crayon-line flex flex-col items-center pointer-events-auto"
        >
          {/* 타이틀 및 닫기 버튼 영역 */}
          <div className="w-full flex justify-between items-center mb-[clamp(16px,3vw,24px)] border-b-[clamp(2px,0.4vw,4px)] border-crayon-line pb-[clamp(8px,1.5vw,12px)]">
            <h2 className="text-[clamp(22px,4vw,32px)] font-black text-crayon-line tracking-tighter select-none break-keep">
              소리 설정
            </h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-gray-400 active:scale-90 transition-transform flex items-center justify-center p-[1vw] -mr-[1vw]"
            >
              <svg className="w-[clamp(20px,3.5vw,32px)] h-[clamp(20px,3.5vw,32px)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 슬라이더 영역 */}
          <div className="w-full flex flex-col gap-[clamp(16px,3vw,24px)] w-full">
            <VolumeSlider
              label="배경음 (BGM)"
              value={bgmVolume}
              onChange={setBgmVolume}
              colorClass="accent-blue-500"
            />
            <VolumeSlider
              label="효과음 (SFX)"
              value={sfxVolume}
              onChange={setSfxVolume}
              colorClass="accent-yellow-500"
            />
            <VolumeSlider
              label="안내음 (Voice)"
              value={voiceVolume}
              onChange={setVoiceVolume}
              colorClass="accent-pink-500"
            />
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// 재사용을 위한 슬라이더 하위 컴포넌트
interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  colorClass: string;
}

const VolumeSlider = ({ label, value, onChange, colorClass }: VolumeSliderProps) => {
  return (
    <div className="flex flex-col w-full gap-[clamp(6px,1vw,8px)]">
      <div className="flex justify-between items-end w-full select-none">
        <span className="text-[clamp(14px,2vw,18px)] font-bold text-gray-700 break-keep">
          {label}
        </span>
        <span className="text-[clamp(12px,1.8vw,16px)] font-black text-gray-400">
          {value}%
        </span>
      </div>

      {/* 
        터치 환경을 고려해 높이를 키우고, 크레파스 느낌의 둥근 슬라이더 적용 
        Tailwind CSS accent-color 를 활용하여 간편하게 커스텀 색상 지정
      */}
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-[clamp(10px,1.5vw,16px)] bg-gray-200 rounded-full appearance-none cursor-pointer shadow-inner outline-none ${colorClass}`}
        style={{
          WebkitAppearance: 'none',
        }}
      />

      {/* Thumb(슬라이더 핸들)을 크고 둥글게 만들어 터치하기 쉽게 하는 CSS 주입 */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: clamp(20px, 3.5vw, 28px);
          height: clamp(20px, 3.5vw, 28px);
          border-radius: 50%;
          background: #fff;
          border: clamp(2px, 0.4vw, 4px) solid currentColor;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;
