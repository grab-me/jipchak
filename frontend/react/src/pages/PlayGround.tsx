import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToolStore } from '@/store/toolStore';
import CameraView from '@/components/machine/CameraView';
import ToolArea from '@/components/machine/ToolArea';

const PlayGround = () => {
  const navigate = useNavigate();
  const { isSessionActive } = useToolStore();

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
