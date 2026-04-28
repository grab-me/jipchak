import CameraView from '@/components/machine/CameraView';

const PlayGround = () => {
  return (
    <div className="flex w-full h-screen bg-[#dfdfdf] p-[calc(24/1024*100vw)] gap-[calc(16/1024*100vw)] overflow-hidden">
      <div
        className="flex-[766] bg-black rounded-[1vw] shadow-sm relative overflow-hidden"
        style={{ aspectRatio: '766 / 552' }}
      >
        <CameraView label="Cam1" />
      </div>

      <div className="flex-[194] flex flex-col gap-[calc(16/600*100vh)]">
        <div className="flex-[411] bg-white rounded-[1vw] shadow-sm relative overflow-hidden flex flex-col items-center justify-center p-[8%]">
          <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-[1vw] flex items-center justify-center">
            <span className="text-gray-400 font-bold text-[clamp(18px,2.5vw,32px)] select-none">Tool Area</span>
          </div>
        </div>

        <div className="flex-[125] bg-black rounded-[1vw] shadow-sm relative overflow-hidden">
          <CameraView label="Cam2" />
        </div>
      </div>
    </div>
  );
};

export default PlayGround;
