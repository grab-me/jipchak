import React, { useState } from 'react';

// 임시 데이터 타입
interface RecordItem {
  id: string;
  filename: string;
  thumbnailUrl?: string; // 썸네일 URL (없거나 로드 실패할 수 있음)
}

// 테스트용 임시 데이터
// 끝자리가 1이면 성공(메달+광채), 0이면 실패
const MOCK_RECORDS: RecordItem[] = [
  { id: '1', filename: '260428_14431.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=200&h=150&fit=crop' },
  { id: '2', filename: '260428_14450.mp4' }, 
  { id: '3', filename: '260428_14481.mp4', thumbnailUrl: 'invalid-url-test' }, 
];

const RecordList = () => {
  const [records] = useState<RecordItem[]>(MOCK_RECORDS); 

  // 파일명 끝이 1(성공)인지 0(실패)인지 판별
  const isSuccess = (filename: string) => {
    const nameWithoutExt = filename.split('.')[0];
    return nameWithoutExt.endsWith('1');
  };

  // 확장자를 제외한 파일명만 출력
  const getDisplayName = (filename: string) => {
    return filename.split('.')[0];
  };

  return (
    <div className="w-full h-full flex flex-col p-[6%] bg-white rounded-[1vw]">
      {/* 타이틀 */}
      <h2 className="text-[clamp(20px,2.8vw,32px)] font-bold text-center text-gray-800 mb-[8%] select-none">
        나의 기록
      </h2>

      {/* 리스트 영역: 커스텀 스크롤바 적용 */}
      <div className="flex-1 w-full overflow-y-auto px-[4%] pt-[12%] pb-[8%] flex flex-col gap-[2%] custom-scrollbar">
        {records.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-gray-400/60 font-bold text-[clamp(16px,2vw,24px)] text-center select-none">
              아직 기록이 없어요!
            </span>
          </div>
        ) : (
          [...records].reverse().map((record, index) => {
            const displayIndex = records.length - index;
            const success = isSuccess(record.filename);

            return (
              <div 
                key={record.id} 
                className="relative flex flex-col w-[92%] mx-auto shrink-0 bg-slate-50 p-[5%] rounded-[1vw] border border-slate-200 shadow-lg gap-[4%] mb-[12%]"
              >
                {/* 순번 배지 영역 (성공=메달, 실패=일반 배지) */}
                <div className="absolute -top-[12%] -left-[6%] z-10 flex flex-col items-center">
                  {success ? (
                    <>
                      {/* 금메달 본체 (디테일 퀄리티 업그레이드) */}
                      <div className="relative w-[clamp(36px,5vw,50px)] aspect-square bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-full flex items-center justify-center border-[3px] border-yellow-600 shadow-[0_4px_10px_rgba(234,179,8,0.4),inset_0_2px_4px_rgba(255,255,255,0.7)] z-20">
                        {/* 내부 장식 테두리 */}
                        <div className="absolute inset-[2px] rounded-full border border-yellow-200/60 pointer-events-none" />
                        
                        {/* 숫자 (정중앙 절대 배치, 기울임과 그림자를 제거하여 시각적 정중앙 보정) */}
                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[clamp(16px,2vw,24px)] select-none">
                          {displayIndex}
                        </span>
                      </div>
                      
                      {/* 붉은 리본 (그라데이션 및 디테일 추가) */}
                      <div className="flex -mt-[18%] gap-[2px] z-10">
                        <div className="w-[12px] h-[26px] bg-gradient-to-b from-red-500 to-red-800 origin-top rotate-[25deg] rounded-b-[2px] border-x border-b border-red-900 shadow-md" />
                        <div className="w-[12px] h-[26px] bg-gradient-to-b from-red-500 to-red-800 origin-top -rotate-[25deg] rounded-b-[2px] border-x border-b border-red-900 shadow-md" />
                      </div>
                    </>
                  ) : (
                    /* 일반 배지 (실패 시) */
                    <div className="relative w-[clamp(28px,4vw,40px)] aspect-square bg-gray-800 rounded-full border-[2px] border-white shadow-md z-20 mt-[10%]">
                      {/* 숫자 (정중앙 절대 배치) */}
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[clamp(14px,1.6vw,20px)] select-none">
                        {displayIndex}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 썸네일 컨테이너: 성공 시 광채 효과 */}
                <div
                  className={`relative w-full aspect-[4/3] rounded-[0.8vw] flex items-center justify-center overflow-hidden transition-all duration-500
                    ${success 
                      ? 'shadow-[0_0_20px_rgba(255,191,0,0.4)] ring-2 ring-yellow-400/30' 
                      : 'bg-gray-200'
                    }`}
                >
                  <div className="relative w-full h-full bg-gray-200 rounded-[0.6vw] overflow-hidden flex items-center justify-center">
                    {record.thumbnailUrl ? (
                      <img
                        src={record.thumbnailUrl}
                        alt={record.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}

                    {/* No Image Fallback */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gray-300 text-gray-400 ${record.thumbnailUrl ? 'hidden' : ''}`}>
                      <svg className="w-[30%] h-[30%] mb-[4%] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span className="text-[clamp(12px,1.5vw,16px)] font-bold">No Image</span>
                    </div>
                  </div>
                  {/* 성공 시 금빛 오버레이 */}
                  {success && <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/10 to-transparent pointer-events-none" />}
                </div>

                {/* 파일명 표시 (확장자 제거) */}
                <span className="text-[clamp(14px,1.6vw,20px)] font-bold text-gray-800 break-words leading-tight select-none text-center">
                  {getDisplayName(record.filename)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecordList;
