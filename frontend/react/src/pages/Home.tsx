import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-[#dfdfdf] gap-[4vw]">
      {/* 팀원분 작업 공간: 시작 화면 UI가 들어올 자리 */}
      <h1 className="text-[clamp(32px,6vw,80px)] font-bold text-gray-800 select-none">
        Jipchak Kiosk
      </h1>
      
      <button 
        onClick={() => navigate('/play')}
        className="px-[6vw] py-[2vw] bg-white rounded-[1.5vw] shadow-lg active:scale-95 transition-transform"
      >
        <span className="text-[clamp(20px,3vw,36px)] font-bold text-gray-600 select-none">
          START GAME
        </span>
      </button>

      <div className="absolute bottom-[5%] text-gray-400 text-[clamp(14px,1.5vw,20px)]">
        (팀원분의 시작 페이지 작업이 완료되면 이 곳을 교체해 주세요)
      </div>
    </div>
  );
};

export default Home;
