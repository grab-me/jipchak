import { useToolStore } from '@/store/toolStore';

interface CameraViewProps {
  label: string;
}

const CameraView = ({ label }: CameraViewProps) => {
  const { addRecord } = useToolStore();

  const handleTestRecord = () => {
    // 썸네일 목데이터 없이, 강제 에러 유도를 위해 빈 썸네일 또는 더미만 전달
    addRecord({
      id: Date.now().toString(),
      filename: `test_${Date.now()}_1.mp4`, // _1은 성공을 의미 (RecordList.tsx의 isSuccess 로직 기준)
    });
  };

  return (
    <div className="w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden gap-[4%]">
      {/* 실제 영상 연결 전까지는 카메라 구분용 라벨만 표시한다. */}
      <span className="text-white/20 font-bold text-[clamp(24px,5vw,64px)] select-none uppercase tracking-widest">
        {label}
      </span>
      
      {/* 임시 로직 테스트 버튼 (Cam1에만 표시) */}
      {label === 'Cam1' && (
        <button 
          onClick={handleTestRecord}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-bold text-[clamp(12px,1vw,16px)] shadow-lg active:scale-95 transition-all z-50 absolute"
        >
          로직 테스트<br/>(기록 추가)
        </button>
      )}
    </div>
  );
};

export default CameraView;
