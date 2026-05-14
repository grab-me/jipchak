import { ReactNode } from 'react';

interface GuideTextProps {
  title: string;
  description: ReactNode;
}

/**
 * GuideText
 * 사용 가이드 모달의 텍스트를 표시합니다.
 */
const GuideText = ({ title, description }: GuideTextProps) => {
  return (
    <div className="flex-1 h-full px-[clamp(4px,0.6vw,8px)] flex flex-col items-center justify-start">
      {/* 가이드 제목 */}
      <div className="w-full pt-[1.2vh] pb-[1.2vh] flex flex-col items-center">
        <span className="block text-center text-[clamp(28px,4vw,52px)] font-extrabold text-crayon-line leading-tight">
          {title}
        </span>
      </div>

      {/* 가이드 내용 */}
      <div className="w-full flex-1 flex items-center">
        <p className="w-full text-[clamp(20px,2.8vw,34px)] font-black text-crayon-line mb-[0.4vh] text-center break-keep text-balance">
          {description}
        </p>
      </div>
    </div>
  );
};

export default GuideText;
