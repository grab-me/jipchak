import { useToolStore } from '@/store/toolStore';
import RecordList from './RecordList';
import QRConsent from './QRConsent';
import QRDisplay from './QRDisplay';
import CrayonWrapper from '../common/CrayonWrapper';

/**
 * ToolArea 컴포넌트
 * 전역 상태(useToolStore)에 따라 동적으로 뷰를 전환합니다.
 */
const ToolArea = () => {
  const { viewType } = useToolStore();

  const renderContent = () => {
    switch (viewType) {
      case 'RECORDS':
        return <RecordList />;
      case 'QR_CONSENT':
        return <QRConsent />;
      case 'QR_DISPLAY':
        return <QRDisplay />;
      case 'CHEERING':
        return (
          <CrayonWrapper className="justify-center">
            <span className="text-gray-500 font-bold text-[clamp(18px,2vw,28px)]">
              인형뽑기 진행 중... 화이팅! 🧸
            </span>
          </CrayonWrapper>
        );
      default:
        return <RecordList />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 min-w-0">
      {renderContent()}
    </div>
  );
};

export default ToolArea;
