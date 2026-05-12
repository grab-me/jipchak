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
    <div className="shrink-0 mt-[clamp(10px,1.4vh,16px)] px-[clamp(4px,0.6vw,8px)]">
      <p className="text-[clamp(20px,2.8vw,34px)] font-black text-crayon-line mb-[0.4vh]">
        {description}
      </p>
    </div>
  );
};

export default GuideText;
