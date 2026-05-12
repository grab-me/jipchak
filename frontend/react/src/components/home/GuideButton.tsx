type GuideButtonProps = {
  onClick: () => void;
  className?: string;
};

/**
 * GuideButton
 * 홈 화면에서 사용 가이드를 열기 위한 버튼입니다.
 * 클릭 시 사용 가이드 모달이 열립니다.
 */
const GuideButton = ({ onClick, className }: GuideButtonProps) => {
  const defaultStyle =
    'whitespace-nowrap rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-[clamp(2px,0.3vw,3px)] border-crayon-line bg-white px-[clamp(10px,1.2vw,14px)] py-[clamp(8px,1vw,10px)] text-[clamp(12px,1.4vw,16px)] font-black text-crayon-line shadow-md active:translate-y-[1px] active:shadow-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={className ? `${defaultStyle} ${className}` : defaultStyle}
    >
      사용 가이드
    </button>
  );
};

export default GuideButton;
