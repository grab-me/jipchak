interface CameraViewProps {
  label: string;
}

/**
 * CameraView: 카메라 영상을 보여주는 공통 UI 컴포넌트
 * @param label - 카메라 식별 라벨 (예: Cam1, Cam2)
 */
const CameraView = ({ label }: CameraViewProps) => {
  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      <span className="text-white/20 font-bold text-[clamp(24px,5vw,64px)] select-none uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
};

export default CameraView;
