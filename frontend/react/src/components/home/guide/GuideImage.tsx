/**
 * GuideImage
 * 사용 가이드 모달에서 이미지가 표시됩니다.
 */
const GuideImage = () => {
  return (
    <div className="flex-1 rounded-[1.2vw] bg-gray-200 flex flex-col items-center justify-center gap-[1vh] min-h-0">
      <span className="text-[clamp(32px,4.5vw,56px)] text-gray-400 select-none">🖼</span>
      <span className="text-[clamp(12px,1.4vw,15px)] font-semibold text-gray-400 select-none">
        이미지 준비 중
      </span>
    </div>
  );
};

export default GuideImage;
