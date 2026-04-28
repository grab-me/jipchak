import CameraView from '@/components/machine/CameraView';
import RecordList from '@/components/machine/RecordList';

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
        
        {/* Tool 영역 (우상단): 각종 컨트롤러 및 정보 표시 */}
        <div className="flex-[411] rounded-[1vw] shadow-sm relative overflow-hidden flex flex-col items-center justify-center">
          <RecordList />
        </div>

        <div className="flex-[125] bg-black rounded-[1vw] shadow-sm relative overflow-hidden">
          <CameraView label="Cam2" />
        </div>
      </div>
    </div>
  );
};

export default PlayGround;
