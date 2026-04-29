import { useState } from 'react';
import RecordList from './RecordList';
import CrayonWrapper from '../common/CrayonWrapper';

/**
 * ToolArea 컴포넌트
 * 우상단 영역의 동적 콘텐츠를 관리합니다.
 * 상황에 따라 나의 기록, 응원 문구, QR 코드 등을 스위칭합니다.
 */
type ToolAreaView = 'RECORDS' | 'CHEERING' | 'QR_CONSENT' | 'QR_DISPLAY';

const ToolArea = () => {
  // 현재 보여줄 뷰 상태 (기본값: 'RECORDS')
  const [viewType] = useState<ToolAreaView>('RECORDS');
  
  // 테마 모드 상태 (기본값: true - 나의 기록 시에는 항상 적용)
  const [isCrayon] = useState<boolean>(true);

  const renderContent = () => {
    switch (viewType) {
      case 'RECORDS':
        return <RecordList />;
      case 'CHEERING':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white rounded-[1vw]">
            <span className="text-gray-500 font-bold">인형뽑기 진행 중...</span>
          </div>
        );
      case 'QR_CONSENT':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white rounded-[1vw]">
            <span className="text-gray-500 font-bold">QR 코드 생성 동의</span>
          </div>
        );
      case 'QR_DISPLAY':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white rounded-[1vw]">
            <span className="text-gray-500 font-bold">QR 코드 송출 중</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full">
      {isCrayon ? (
        <CrayonWrapper>
          {renderContent()}
        </CrayonWrapper>
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default ToolArea;
