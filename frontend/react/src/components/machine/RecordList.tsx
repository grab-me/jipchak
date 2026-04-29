import React, { useState, useRef } from 'react';
import fallbackImage from '@/assets/images/X_sign_character.png';

// 임시 데이터 타입
interface RecordItem {
  id: string;
  filename: string;
  thumbnailUrl?: string;
}

// 테스트용 임시 데이터 (최대 10개)
const MOCK_RECORDS: RecordItem[] = [
  { id: '1', filename: '260428_14011.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=200&h=150&fit=crop' },
  { id: '2', filename: '260428_14050.mp4' }, 
  { id: '3', filename: '260428_14101.mp4', thumbnailUrl: 'invalid-url-test' }, 
  { id: '4', filename: '260428_14150.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1551085254-e96b210db58a?w=200&h=150&fit=crop' },
  { id: '5', filename: '260428_14201.mp4' },
  { id: '6', filename: '260428_14251.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200&h=150&fit=crop' },
  { id: '7', filename: '260428_14300.mp4' },
  { id: '8', filename: '260428_14351.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=200&h=150&fit=crop' },
  { id: '9', filename: '260428_14400.mp4' },
  { id: '10', filename: '260428_14451.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1551085254-e96b210db58a?w=200&h=150&fit=crop' },
];

// 개별 기록의 썸네일을 관리하는 컴포넌트
const RecordThumbnail = ({ src, alt, success }: { src?: string; alt: string; success: boolean }) => {
  const [imgSrc, setImgSrc] = React.useState(src || fallbackImage);
  const [isError, setIsError] = React.useState(!src);

  const handleError = () => {
    setImgSrc(fallbackImage);
    setIsError(true);
  };

  return (
    <div
      className={`relative w-full aspect-[4/3] rounded-[0.8vw] flex items-center justify-center overflow-hidden transition-all duration-500
        ${success 
          ? 'shadow-[0_0_20px_rgba(255,191,0,0.4)] ring-2 ring-yellow-400/30' 
          : 'bg-gray-200'
        }`}
    >
      <div className="relative w-full h-full bg-white rounded-[0.6vw] overflow-hidden flex items-center justify-center">
        <img
          src={imgSrc}
          alt={alt}
          className={`w-full h-full transition-opacity duration-300 ${isError ? 'object-contain p-[15%] opacity-80' : 'object-cover'}`}
          onError={handleError}
        />
      </div>
      {success && <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/10 to-transparent pointer-events-none" />}
    </div>
  );
};

const RecordList = () => {
  const [records] = useState<RecordItem[]>(MOCK_RECORDS); 
  const scrollRef = useRef<HTMLDivElement>(null);

  // 파일명 끝이 1(성공)인지 0(실패)인지 판별
  const isSuccess = (filename: string) => {
    const nameWithoutExt = filename.split('.')[0];
    return nameWithoutExt.endsWith('1');
  };

  // 확장자를 제외한 파일명만 출력
  const getDisplayName = (filename: string) => {
    return filename.split('.')[0];
  };

  // 최상단으로 이동
  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full h-full flex flex-col p-[6%] bg-transparent relative overflow-hidden font-crayon">
      {/* 타이틀: 크레파스 외곽선 효과 적용 - clamp로 뭉침 방지 */}
      <h2 className="text-[clamp(24px,3.2vw,36px)] font-bold text-center text-yellow-400 mb-[8%] select-none [text-shadow:clamp(1px,0.2vw,2.5px)_clamp(1px,0.2vw,2.5px)_0_#1f2937,_-clamp(0.5px,0.15vw,2px)_-clamp(0.5px,0.15vw,2px)_0_#1f2937,clamp(0.5px,0.15vw,2px)_-clamp(0.5px,0.15vw,2px)_0_#1f2937,_-clamp(0.5px,0.15vw,2px)_clamp(0.5px,0.15vw,2px)_0_#1f2937]">
        나의 기록
      </h2>

      {/* 리스트 영역 */}
      <div 
        ref={scrollRef}
        className="flex-1 w-full overflow-y-auto px-[4%] pt-[12%] flex flex-col gap-[2%] custom-scrollbar z-10"
      >
        {records.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-gray-400/60 font-medium text-[clamp(16px,2vw,24px)] text-center select-none">
              아직 기록이 없어요!
            </span>
          </div>
        ) : (
          <>
            {[...records].reverse().map((record, index) => {
              const displayIndex = records.length - index;
              const success = isSuccess(record.filename);

              return (
                <div 
                  key={record.id} 
                  className="relative flex flex-col w-[92%] mx-auto shrink-0 bg-white p-[5%] rounded-[1vw] gap-[4%] mb-[15%]"
                >
                  {/* 크레파스 느낌의 카드 외곽선 레이어들 - clamp 적용 */}
                  <div className="absolute inset-0 border-[clamp(1.5px,0.5vw,4px)] border-crayon-line opacity-40 pointer-events-none rounded-[255px_15px_225px_15px/15px_225px_15px_255px]" />
                  <div className="absolute inset-0 border-[clamp(1.5px,0.5vw,4px)] border-crayon-line opacity-60 pointer-events-none rounded-[15px_225px_15px_255px/255px_15px_225px_15px] rotate-1" />

                  {/* 순번 배지 영역 */}
                  <div className="absolute -top-[12%] -left-[6%] z-10 flex flex-col items-center">
                    {success ? (
                      <>
                        <div className="relative w-[clamp(36px,5vw,50px)] aspect-square bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-full flex items-center justify-center border-[clamp(1.5px,0.3vw,3px)] border-yellow-600 shadow-[0_clamp(2px,0.5vw,10px)_clamp(4px,1.2vw,20px)_rgba(234,179,8,0.4),inset_0_clamp(1px,0.2vw,4px)_clamp(2px,0.5vw,10px)_rgba(255,255,255,0.7)] z-20">
                          <div className="absolute inset-[clamp(1px,0.2vw,3px)] rounded-full border-[clamp(0.5px,0.1vw,1.5px)] border-yellow-200/60 pointer-events-none" />
                          <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[clamp(16px,2vw,24px)] select-none">
                            {displayIndex}
                          </span>
                        </div>
                        <div className="flex -mt-[18%] gap-[0.2vw] z-10">
                          <div className="w-[1.5vw] h-[3.2vw] min-w-[8px] min-h-[18px] max-w-[15px] max-h-[35px] bg-gradient-to-b from-red-500 to-red-800 origin-top rotate-[25deg] rounded-b-[0.2vw] border-x-[clamp(0.5px,0.1vw,1.5px)] border-b-[clamp(0.5px,0.1vw,1.5px)] border-red-900 shadow-md" />
                          <div className="w-[1.5vw] h-[3.2vw] min-w-[8px] min-h-[18px] max-w-[15px] max-h-[35px] bg-gradient-to-b from-red-500 to-red-800 origin-top -rotate-[25deg] rounded-b-[0.2vw] border-x-[clamp(0.5px,0.1vw,1.5px)] border-b-[clamp(0.5px,0.1vw,1.5px)] border-red-900 shadow-md" />
                        </div>
                      </>
                    ) : (
                      <div className="relative w-[clamp(32px,4.5vw,44px)] aspect-square bg-white rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-[clamp(1.5px,0.3vw,3px)] border-crayon-line shadow-md z-20 mt-[10%] flex items-center justify-center">
                        <span className="text-gray-800 font-bold text-[clamp(14px,1.6vw,20px)] select-none">
                          {displayIndex}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <RecordThumbnail 
                    src={record.thumbnailUrl} 
                    alt={record.filename} 
                    success={success} 
                  />

                  {/* 파일명: 크레파스 느낌 살리기 */}
                  <span className="text-[clamp(14px,1.6vw,20px)] font-medium text-gray-800 break-words leading-tight select-none text-center [text-shadow:clamp(0.5px,0.1vw,1.5px)_clamp(0.5px,0.1vw,1.5px)_0_#ccc]">
                    {getDisplayName(record.filename)}
                  </span>
                </div>
              );
            })}

            {/* TOP 버튼 */}
            {records.length >= 3 && (
              <div className="w-full flex justify-center pt-[4%] pb-[12%] shrink-0">
                <button 
                  onClick={scrollToTop}
                  className="px-[clamp(24px,3vw,48px)] py-[clamp(10px,1.2vw,20px)] bg-gray-800 text-white rounded-[255px_15px_225px_15px/15px_225px_15px_255px] font-bold shadow-xl border-[clamp(1px,0.2vw,3px)] border-white flex items-center gap-[1vw] active:scale-95 transition-transform"
                >
                  <svg className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-[clamp(14px,1.8vw,22px)]">TOP</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecordList;
