import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToolStore } from '@/store/toolStore';
import { useStreamSocket, useStreamStore, StreamState } from '@/store/streamStore';
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
  // 메인 페이지에서도 WS 연결 유지 — 아두이노 버튼으로 페이지 자동 전환 / 모달 호출.
  // streamStore 의 mountCount 가 PlayGround 와 공유하므로 추가 비용 없음.
  useStreamSocket();
  const lastUiEvent = useStreamStore((s: StreamState) => s.lastUiEvent);

  const handleStart = () => {
    playSfx(SOUND_ASSETS.SFX.BUTTON_CLICK);
    startSession(); // 세션 시작
    if (isAutoStarting) setAutoStarting(false); // 자동 시작 플래그 해제
    navigate('/play');
  };

  // 🔵 파랑 버튼 (물리) → BLUE_BUTTON_PRESS 이벤트 수신 → 게임 화면으로 자동 전환
  const lastBlueButtonTs = useRef<number | null>(null);
  useEffect(() => {
    if (lastUiEvent?.type === 'BLUE_BUTTON_PRESS') {
      if (lastBlueButtonTs.current === lastUiEvent.ts) return;
      lastBlueButtonTs.current = lastUiEvent.ts;
      handleStart();
    }
    // handleStart 를 의존성에 넣지 않음 — 매 렌더마다 새 함수라 무한 루프 됨.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUiEvent]);

  // �🔴 빨강 버튼 (IDLE) → GUIDE 이벤트 → 사용 가이드 모달 자동 오픈.
  // ts 가 매번 새 값이라 같은 사용자가 빨강 두 번 눌러도 effect 가 다시 실행됨.
  const lastGuideTs = useRef<number | null>(null);
  useEffect(() => {
    if (lastUiEvent?.type !== 'GUIDE') return;
    if (lastGuideTs.current === lastUiEvent.ts) return;
    lastGuideTs.current = lastUiEvent.ts;
    setIsGuideOpen(true);
  }, [lastUiEvent]);

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
