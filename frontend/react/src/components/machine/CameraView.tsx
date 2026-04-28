interface CameraViewProps {
  label: string;
}

const CameraView = ({ label }: CameraViewProps) => {
  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      {/* 실제 영상 연결 전까지는 카메라 구분용 라벨만 표시한다. */}
      <span className="text-white/20 font-bold text-[clamp(24px,5vw,64px)] select-none uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
};

export default CameraView;
