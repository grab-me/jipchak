import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToolStore } from '@/store/toolStore';
import StartButton from '@/components/home/StartButton';
import GuideButton from '@/components/home/GuideButton';
import CrayonWrapper from '@/components/common/CrayonWrapper';
import UsageGuideModal from '@/components/home/UsageGuideModal';
import { useAudio } from '@/hooks/useAudio';
import { SOUND_ASSETS } from '@/constants/soundConfig';

const Home = () => {
  const navigate = useNavigate();
  const { startSession, isAutoStarting, setAutoStarting } = useToolStore();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { playSfx } = useAudio();

  const handleStart = () => {
    playSfx(SOUND_ASSETS.SFX.BUTTON_CLICK);
    startSession(); // 세션 시작
    if (isAutoStarting) setAutoStarting(false); // 자동 시작 플래그 해제
    navigate('/play');
  };

  const handleAdminAccess = () => {
    const expected = import.meta.env.VITE_ADMIN_PASSWORD;
    if (!expected) {
      alert('관리자 접근이 설정되지 않았습니다.');
      return;
    }
    const pwd = prompt('관리자 비밀번호를 입력하세요:');
    if (pwd && pwd === expected) {
      sessionStorage.setItem('isAdmin', 'true');
      navigate('/admin');
    } else if (pwd !== null) {
      alert('비밀번호가 일치하지 않습니다.');
    }
  };

  return (
    // 모서리 제거
    <div 
      className="w-full h-screen [&>div]:!rounded-none relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      <CrayonWrapper showCharacter={false}>
        {/* 관리자 접근 버튼 */}
        <button
          onClick={handleAdminAccess}
          className="absolute top-[3%] right-[3%] z-header px-[1.5vw] py-[0.8vw] bg-red-600/90 text-white font-bold text-[clamp(12px,1.2vw,16px)] rounded-[0.5vw] active:scale-95 transition-transform shadow-sm"
        >
          Admin
        </button>

        <div className="flex flex-col items-center justify-center w-full h-screen gap-[4vw]">
          <h1 className="text-[clamp(32px,6vw,80px)] font-bold font-crayon text-yellow-400 select-none">
            JIPCHAK
          </h1>
          <div className="flex flex-col items-center justify-center w-full gap-[2.2vh]">
            <StartButton onStart={handleStart} autoClick={isAutoStarting} />
            <GuideButton
              onClick={() => setIsGuideOpen(true)}
            />
          </div>
        </div>

        <UsageGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </CrayonWrapper>
    </div>
  );
};

export default Home;
