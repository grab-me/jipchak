/**
 * GuideImage
 * 사용 가이드 모달에서 이미지가 표시됩니다.
 */
const GuideImage = () => {
  return (
    <div className="shrink-0 w-[clamp(260px,55%,460px)] h-full rounded-[1.2vw] bg-gray-200 border-[clamp(2px,0.3vw,4px)] border-gray-300 flex flex-col items-center justify-center gap-[1vh] px-[clamp(8px,1vw,12px)]">
      <span className="text-[clamp(28px,3.6vw,46px)] text-gray-400 select-none">🖼</span>
      <span className="text-[clamp(11px,1.2vw,14px)] font-semibold text-gray-400 select-none text-center">
        이미지 준비 중
      </span>
    </div>
  );
};

export default GuideImage;
