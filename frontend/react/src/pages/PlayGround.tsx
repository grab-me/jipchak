import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToolStore } from '@/store/toolStore';
import CameraView from '@/components/machine/CameraView';
import ToolArea from '@/components/machine/ToolArea';
import NextStepModal from '@/components/machine/NextStepModal';
import Confetti, { ConfettiOptions } from '@/components/common/Confetti';

const PlayGround = () => {
  const navigate = useNavigate();
  const { isSessionActive, lastResult, setAskingNextStep, records, resetSession, setAutoStarting } = useToolStore();
  
  // 연타 지원을 위한 폭죽 리스트 상태
  const [confettiBursts, setConfettiBursts] = useState<{ id: number; options?: ConfettiOptions; type?: 'direct' | 'launch' }[]>([]);

  // 성공 결과 감시: win 상태가 되는 '그 순간'에만 폭죽 발사
  const lastProcessedResult = useRef<string | null>(null);

  useEffect(() => {
    // 이전 결과와 현재 결과가 다를 때만 로직 수행
    if (lastResult !== lastProcessedResult.current) {
      if (lastResult === 'win') {
        triggerConfetti('launch');
      }
      lastProcessedResult.current = lastResult;
    }
  }, [lastResult]);

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
      // 스페이스바 등으로 포커스된 버튼이 클릭되는 기본 동작 방지
      e.preventDefault();

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
    <div className="flex w-full h-screen bg-[#dfdfdf] p-[calc(24/1024*100vw)] gap-[calc(16/1024*100vw)] overflow-hidden">
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
        {/* 세션 지속 여부 확인 모달 (Cam1 위에 배치) */}
        <NextStepModal />
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
