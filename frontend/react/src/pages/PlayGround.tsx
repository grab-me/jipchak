import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToolStore } from '@/store/toolStore';
import CameraView from '@/components/machine/CameraView';
import ToolArea from '@/components/machine/ToolArea';
import Confetti from '@/components/common/Confetti';

const PlayGround = () => {
  const navigate = useNavigate();
  const { isSessionActive } = useToolStore();
  
  // 연타 지원을 위한 폭죽 리스트 상태
  const [confettiBursts, setConfettiBursts] = useState<{ id: number; options?: any; type?: 'direct' | 'launch' }[]>([]);

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

  if (!isSessionActive) return null; // 리다이렉트 전 찰나의 렌더링 방지
  return (
    <div className="flex w-full h-screen bg-[#dfdfdf] p-[calc(24/1024*100vw)] gap-[calc(16/1024*100vw)] overflow-hidden">
      {/* 폭죽 버스트 매니저 (연타 지원) */}
      <Confetti bursts={confettiBursts} onBurstComplete={removeBurst} />
      
      <div className="fixed bottom-[4%] left-[4%] z-toast flex gap-[1vw]">
        <button 
          onClick={() => triggerConfetti('direct')}
          className="px-[1.5vw] py-[0.8vw] bg-[#FF5E7E] text-white rounded-full shadow-lg font-bold active:scale-90 transition-all hover:brightness-110"
        >
          🎊 일반 폭죽
        </button>
        <button 
          onClick={() => triggerConfetti('launch')}
          className="px-[1.5vw] py-[0.8vw] bg-[#FFA62D] text-white rounded-full shadow-lg font-bold active:scale-90 transition-all border-[0.2vw] border-white hover:brightness-110"
        >
          🚀 조준 사격!
        </button>
      </div>

      <div
        className="flex-[766] bg-black rounded-[1vw] shadow-sm relative overflow-hidden"
        style={{ aspectRatio: '766 / 552' }}
      >
        <CameraView label="Cam1" />
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
