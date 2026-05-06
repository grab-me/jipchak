import { useNavigate } from 'react-router-dom';
import { useToolStore } from '@/store/toolStore';
import StartButton from '@/components/common/StartButton';
import CrayonWrapper from '@/components/common/CrayonWrapper';

const Home = () => {
  const navigate = useNavigate();
  const { startSession } = useToolStore();

  const handleStart = () => {
    startSession(); // 세션 시작
    navigate('/play');
  };

  return (
    // 모서리 제거
    <div className="w-full h-screen [&>div]:!rounded-none">
      <CrayonWrapper showCharacter={false}>
        <div className="flex flex-col items-center justify-center w-full h-screen gap-[4vw]">
          <h1 className="text-[clamp(32px,6vw,80px)] font-bold font-crayon text-yellow-400 select-none">
            JIPCHAK
          </h1>
          <StartButton onStart={handleStart} />
        </div>
      </CrayonWrapper>
    </div>
  );
};

export default Home;
