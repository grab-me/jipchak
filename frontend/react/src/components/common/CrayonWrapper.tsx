import React from 'react';
import diaryImg from '@/assets/images/crayon_diary.png';

interface CrayonWrapperProps {
  children: React.ReactNode;
  showCharacter?: boolean;
  className?: string;
}

/**
 * CrayonWrapper
 * 자식 컴포넌트에게 크레파스 화풍 테마(배경, 테두리, 폰트)를 입혀주는 컨테이너입니다.
 */
const CrayonWrapper = ({ children, showCharacter = true, className = '' }: CrayonWrapperProps) => {
  return (
    <div 
      className={`w-full h-full bg-crayon-bg relative flex flex-col items-center overflow-hidden rounded-[1vw] font-crayon ${className}`}
    >
      {/* 크레파스 느낌의 스크래치 외곽선 (3중 레이어) */}
      <div className="absolute inset-[0.5vw] border-[0.6vw] border-crayon-line opacity-40 pointer-events-none rounded-[255px_15px_225px_15px/15px_225px_15px_255px] -rotate-[0.5deg]" />
      <div className="absolute inset-[0.5vw] border-[0.6vw] border-crayon-line opacity-60 pointer-events-none rounded-[15px_225px_15px_255px/255px_15px_225px_15px] rotate-[0.5deg]" />
      <div className="absolute inset-[0.8vw] border-[0.4vw] border-crayon-line opacity-80 pointer-events-none rounded-[225px_15px_255px_15px/15px_255px_15px_225px] -rotate-1" />

      {/* 배경 장식 (일기장 워터마크) */}
      {showCharacter && (
        <img 
          src={diaryImg} 
          alt="diary decoration" 
          className="absolute bottom-[5%] right-[5%] h-[30%] object-contain opacity-25 pointer-events-none -rotate-12 mix-blend-multiply"
        />
      )}

      {/* 실제 콘텐츠 영역 */}
      <div className="relative z-10 w-full h-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
};

export default CrayonWrapper;
