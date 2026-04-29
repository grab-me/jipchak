import { useState } from 'react';
import RecordList from './RecordList';

/**
 * ToolArea 컴포넌트
 * 우상단 영역의 동적 콘텐츠를 관리합니다.
 * 상황에 따라 나의 기록, 응원 문구, QR 코드 등을 스위칭합니다.
 */
type ToolAreaView = 'RECORDS' | 'CHEERING' | 'QR_CONSENT' | 'QR_DISPLAY';

const ToolArea = () => {
  // 현재 보여줄 뷰 상태 (기본값: 'RECORDS')
  const [viewType] = useState<ToolAreaView>('RECORDS');

  return (
    <div className="w-full h-full">
      {/* 상태에 따른 컴포넌트 스위칭 */}
      {viewType === 'RECORDS' && <RecordList />}
      
      {/* 추후 구현될 뷰들 (플레이스홀더) */}
      {viewType === 'CHEERING' && (
        <div className="w-full h-full flex items-center justify-center bg-white rounded-[1vw]">
          <span className="text-gray-500 font-bold">인형뽑기 진행 중...</span>
        </div>
      )}
      
      {viewType === 'QR_CONSENT' && (
        <div className="w-full h-full flex items-center justify-center bg-white rounded-[1vw]">
          <span className="text-gray-500 font-bold">QR 코드 생성 동의</span>
        </div>
      )}

      {viewType === 'QR_DISPLAY' && (
        <div className="w-full h-full flex items-center justify-center bg-white rounded-[1vw]">
          <span className="text-gray-500 font-bold">QR 코드 송출 중</span>
        </div>
      )}
    </div>
  );
};

export default ToolArea;
