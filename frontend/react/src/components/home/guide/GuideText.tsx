import { ReactNode } from 'react';

interface GuideTextProps {
  description: ReactNode;
}

/**
 * GuideText
 * 사용 가이드 모달의 텍스트를 표시합니다.
 */
const GuideText = ({ description }: GuideTextProps) => {
  return (
    <div className="flex-1 h-full px-[clamp(4px,0.6vw,8px)] flex items-center">
      <p className="text-[clamp(20px,2.8vw,34px)] font-black text-crayon-line mb-[0.4vh]">
        {description}
      </p>
    </div>
  );
};

export default GuideText;
