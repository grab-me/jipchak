import { useState, useEffect, useRef } from 'react';
import { useToolStore } from '@/store/toolStore';
import Thermometer from './Thermometer';

interface CameraViewProps {
  label: string;
}

const CameraView = ({ label }: CameraViewProps) => {
  const { addRecord, setCatching, setLastResult, isCatching, records } = useToolStore();
  const timer1Ref = useRef<NodeJS.Timeout | null>(null);
  const timer2Ref = useRef<NodeJS.Timeout | null>(null);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timer1Ref.current) clearTimeout(timer1Ref.current);
      if (timer2Ref.current) clearTimeout(timer2Ref.current);
    };
  }, []);

  const [testProb, setTestProb] = useState(0);

  // 테스트용 연속 확률 생성 로직 (사인파 형태)
  useEffect(() => {
    if (label !== 'Cam1') return;
    
    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // 4초 주기: 0 -> 100 -> 0으로 부드럽게 왕복
      const wave = (Math.sin((elapsed / 2000) * Math.PI) + 1) / 2; 
      setTestProb(wave * 100);
    }, 100); // 100ms마다 업데이트 (Thermometer 내부의 spring이 부드럽게 보간함)

    return () => clearInterval(interval);
  }, [label]);

  const handleTestRecord = () => {
    if (isCatching) return; // 이미 진행 중이면 중복 실행 방지

    // 1. 뽑기 애니메이션 시작
    setCatching(true);
    setLastResult(null);

    // 2. 5초 후 결과 산출
    timer1Ref.current = setTimeout(() => {
      setCatching(false);
      
      const isWin = records.length % 2 === 0;
      const resultValue = isWin ? '1' : '0';
      
      setLastResult(isWin ? 'win' : 'lose');

      // 기록 추가 (isSuccess 필드 명시적 전달)
      addRecord({
        id: Date.now().toString(),
        filename: `test_${Date.now()}_${resultValue}.mp4`,
        isSuccess: isWin,
      });

      // 3. 3초 후 결과 화면 닫기
      timer2Ref.current = setTimeout(() => {
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

      {/* 확률 표시 온도계 (Cam1 전용 테스트) */}
      {label === 'Cam1' && <Thermometer probability={testProb} />}
    </div>
  );
};

export default CameraView;
