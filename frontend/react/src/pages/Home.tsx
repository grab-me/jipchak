import React from 'react';
import { useNavigate } from 'react-router-dom';
import StartButton from '@/components/common/StartButton';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-[radial-gradient(circle_at_center,#FFFFFF_0%,#D9D9D9_40%,#8A8A8A_100%)] gap-[4vw]">
      {/* 시작 화면 UI */}
      <h1 className="text-[clamp(32px,6vw,80px)] font-bold text-gray-800 select-none">
        JIPCHAK
      </h1>
      <StartButton onStart={() => navigate('/play')} />
    </div>
  );
};

export default Home;
