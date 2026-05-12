import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToolStore } from '@/store/toolStore';
import CameraView from '@/components/machine/CameraView';
import ToolArea from '@/components/machine/ToolArea';
import NextStepModal from '@/components/machine/NextStepModal';
import SettingsModal from '@/components/machine/SettingsModal';
import Confetti, { ConfettiOptions } from '@/components/common/Confetti';
import { useAudioStore } from '@/store/audioStore';
import { useAudio } from '@/hooks/useAudio';
import { SOUND_ASSETS } from '@/constants/soundConfig';

const PlayGround = () => {
  const navigate = useNavigate();
  const { isSessionActive, lastResult, setAskingNextStep, records, resetSession, setAutoStarting } = useToolStore();
  const { setSettingsOpen } = useAudioStore();
  const { playBgm, stopBgm, playSfx } = useAudio();

  // BGM 재생 관리
  useEffect(() => {
    playBgm(SOUND_ASSETS.BGM.MAIN);
    return () => {
      stopBgm();
    };
  }, [playBgm, stopBgm]);
  
  // 연타 지원을 위한 폭죽 리스트 상태
  const [confettiBursts, setConfettiBursts] = useState<{ id: number; options?: ConfettiOptions; type?: 'direct' | 'launch' }[]>([]);

  // 성공 결과 감시: win 상태가 되는 '그 순간'에만 폭죽 발사
  const lastProcessedResult = useRef<string | null>(null);

  useEffect(() => {
    // 이전 결과와 현재 결과가 다를 때만 로직 수행
    if (lastResult !== lastProcessedResult.current) {
      if (lastResult === 'win') {
        playSfx(SOUND_ASSETS.SFX.WIN);
        triggerConfetti('launch');
      }
      lastProcessedResult.current = lastResult;
    }
  }, [lastResult, playSfx]);

  // 폭죽 터뜨리기 (연타 방지 적용)
  const triggerConfetti = (type: 'direct' | 'launch' = 'direct') => {
    // 이미 화면에 폭죽이 동작 중이라면 중복 실행 방지 (렉 방지용)
    if (confettiBursts.length > 0) return;

    const newBurst = {
      id: Date.now(),
      type,
      options: {} 
    };
    setConfettiBursts((prev) => [...prev, newBurst]);
  };

  const removeBurst = (id: number) => {
    setConfettiBursts((prev) => prev.filter((b) => b.id !== id));
  };

  // 세션 가드: 활성화된 세션이 없으면 시작 페이지로 리다이렉트
  useEffect(() => {
    if (!isSessionActive) {
      console.warn('[SessionGuard] 활성화된 세션이 없어 시작 페이지로 이동합니다.');
      navigate('/');
    }
  }, [isSessionActive, navigate]);

  // 하드웨어 입력(키보드) 감지 시 로직 처리
  useEffect(() => {
    const handleInteraction = (e: KeyboardEvent) => {
      // 스페이스바, 엔터 등 UI 조작에 간섭할 수 있는 특정 키만 기본 동작 방지
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
      }

      if (records.length >= 5) {
        // 5판 종료 후 입력 시: 홈으로 이동하여 자동 시작 연출 실행
        console.log('[Session] 사용자 입력 감지: 자동 재시작 연출을 시작합니다.');
        resetSession();
        setAutoStarting(true);
      } else {
        // 일반 상황: 안내 모달만 닫기
        setAskingNextStep(false);
      }
    };

    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [setAskingNextStep, records, resetSession, setAutoStarting]);

  if (!isSessionActive) return null; // 리다이렉트 전 찰나의 렌더링 방지
  return (
    <div 
      className="flex w-full h-screen bg-[#dfdfdf] p-[calc(24/1024*100vw)] gap-[calc(16/1024*100vw)] overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 폭죽 버스트 매니저 (성공 화면 활성 여부 전달) */}
      <Confetti 
        bursts={confettiBursts} 
        onBurstComplete={removeBurst} 
        isActive={lastResult === 'win'} 
      />

      <div
        className="flex-[766] bg-black rounded-[1vw] shadow-sm relative overflow-hidden"
        style={{ aspectRatio: '766 / 552' }}
      >
        <CameraView label="Cam1" />

        {/* 설정 버튼 (좌상단 고정, 스와프 시에도 유지됨) */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="absolute top-[3%] left-[3%] z-overlay active:scale-95 transition-transform text-white/90"
          aria-label="Settings"
        >
          <svg className="w-[clamp(28px,4vw,48px)] h-[clamp(28px,4vw,48px)] drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </button>

        {/* 세션 지속 여부 확인 모달 (Cam1 위에 배치) */}
        <NextStepModal />

        {/* 볼륨 설정 모달 */}
        <SettingsModal />
      </div>

      <div className="flex-[194] min-w-0 flex flex-col gap-[calc(16/600*100vh)]">
        
        {/* Tool 영역 (우상단): 각종 컨트롤러 및 정보 표시 - min-h-0, min-w-0로 완전 고정 */}
        <div className="flex-[411] min-h-0 min-w-0 rounded-[1vw] shadow-sm relative overflow-hidden flex flex-col">
          <ToolArea />
        </div>

        <div className="flex-[125] min-h-0 min-w-0 bg-black rounded-[1vw] shadow-sm relative overflow-hidden">
          <CameraView label="Cam2" />
        </div>
      </div>
    </div>
  );
};

export default PlayGround;
