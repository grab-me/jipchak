import React, { useEffect } from 'react';

const CameraView = ({ label }: { label: string }) => {
  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
       <span className="text-white/20 font-bold text-[clamp(24px,5vw,64px)] select-none uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
};

const App = () => {
  // 앱 전역 설정: 우클릭 방지 등 키오스크 최적화
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    // 메인 컨테이너: 1024x600 비율 기반 동적 레이아웃
    <div className="flex w-full h-screen bg-[#dfdfdf] p-[calc(24/1024*100vw)] gap-[calc(16/1024*100vw)] overflow-hidden">
      
      {/* Cam1 영역 (좌측): 정면 고정 카메라 */}
      <div 
        className="flex-[766] bg-black rounded-[1vw] shadow-sm relative overflow-hidden"
        style={{ aspectRatio: '766 / 552' }}
      >
        <CameraView label="Cam1" />
      </div>

      {/* 우측 컬럼: Tool & Cam2 */}
      <div className="flex-[194] flex flex-col gap-[calc(16/600*100vh)]">
        
        {/* Tool 영역 (우상단): 각종 컨트롤러 및 정보 표시 */}
        <div className="flex-[411] bg-white rounded-[1vw] shadow-sm relative overflow-hidden flex flex-col items-center justify-center p-[8%]">
          <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-[1vw] flex items-center justify-center">
             <span className="text-gray-400 font-bold text-[clamp(18px,2.5vw,32px)] select-none">Tool Area</span>
          </div>
        </div>

        {/* Cam2 영역 (우하단): 집게 이동형 카메라 */}
        <div className="flex-[125] bg-black rounded-[1vw] shadow-sm relative overflow-hidden">
          <CameraView label="Cam2" />
        </div>

      </div>
    </div>
  );
};

export default App;
