import { useToolStore } from '@/store/toolStore';

interface CameraViewProps {
  label: string;
}

const CameraView = ({ label }: CameraViewProps) => {
  const { addRecord, setCatching, setLastResult, isCatching, records } = useToolStore();

  const handleTestRecord = () => {
    if (isCatching) return; // 이미 진행 중이면 중복 실행 방지

    // 1. 뽑기 애니메이션 시작
    setCatching(true);
    setLastResult(null);

    // 2. 5초 후 결과 산출
    setTimeout(() => {
      setCatching(false);
      
      // 현재 기록 개수를 기준으로 성공/실패 교대 발생 (짝수: 성공, 홀수: 실패)
      const isWin = records.length % 2 === 0;
      const resultValue = isWin ? '1' : '0';
      
      setLastResult(isWin ? 'win' : 'lose');

      // 기록 추가
      addRecord({
        id: Date.now().toString(),
        filename: `test_${Date.now()}_${resultValue}.mp4`,
      });

      // 3. 3초 후 결과 화면 닫기 (다시 목록으로 복귀)
      setTimeout(() => {
        setLastResult(null);
      }, 3000);
    }, 5000);
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
          className="px-4 py-2 bg-red-600/80 text-white rounded-lg font-bold text-[clamp(12px,1vw,16px)] shadow-lg active:scale-95 transition-all z-overlay absolute"
        >
          로직 테스트<br/>(기록 추가)
        </button>
      )}
    </div>
  );
};

export default CameraView;
