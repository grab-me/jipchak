import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- 가상(Mock) 데이터 정의 ---
const MOCK_SESSION_TIME_MINUTES = 30; // 30분 유효기간
const MOCK_VIDEOS = [
  { id: 'vid1', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumb: 'https://www.w3schools.com/html/pic_trulli.jpg' },
  { id: 'vid2', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumb: 'https://www.w3schools.com/html/pic_trulli.jpg' },
  { id: 'vid3', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumb: 'https://www.w3schools.com/html/pic_trulli.jpg' },
  { id: 'vid4', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumb: 'https://www.w3schools.com/html/pic_trulli.jpg' },
  { id: 'vid5', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumb: 'https://www.w3schools.com/html/pic_trulli.jpg' },
];

const MobileLanding = () => {
  const { sessionId } = useParams();
  
  // 가상의 생성 시간 (5분 전에 생성되었다고 가정)
  const [createdAt] = useState<number>(Date.now() - 5 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // 실시간 만료 체크 로직
  useEffect(() => {
    const expireTime = createdAt + MOCK_SESSION_TIME_MINUTES * 60 * 1000;
    
    const checkTime = () => {
      const now = Date.now();
      const remaining = expireTime - now;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
      } else {
        setTimeLeft(Math.floor(remaining / 1000));
      }
    };

    checkTime(); // 초기 체크
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // 시간을 MM:SS 포맷으로 변환
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 영상 다운로드 핸들러
  const handleDownload = async (url: string, index: number) => {
    try {
      // 모바일에서 직접 다운로드를 유도하기 위해 Blob으로 변환 후 다운로드 처리
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = `jipchak_catch_${index + 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('영상 다운로드에 실패했습니다.');
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-crayon-bg text-crayon-line font-crayon overflow-hidden relative flex flex-col items-center">
      
      {/* 1. 만료 안내 모달 (isExpired가 true일 때 전체 화면 덮음) */}
      <AnimatePresence>
        {isExpired && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 z-modal flex flex-col items-center justify-center p-[5%]"
          >
            <div className="bg-white p-[8%] rounded-2xl flex flex-col items-center text-center shadow-2xl max-w-[400px] w-full">
              <span className="text-[clamp(40px,10vw,60px)] mb-4">⏳</span>
              <h2 className="text-[clamp(20px,5vw,28px)] font-bold mb-2">세션이 만료되었습니다</h2>
              <p className="text-[clamp(14px,3.5vw,18px)] text-gray-600 mb-6 leading-relaxed">
                보안을 위해 30분이 지난 영상은<br />서버에서 영구적으로 삭제되었습니다.
              </p>
              <button 
                onClick={() => window.location.href = 'https://jipchak.com'} // 임시 리디렉션
                className="w-full py-4 bg-crayon-line text-white rounded-xl font-bold text-[clamp(16px,4vw,20px)] active:scale-95 transition-transform"
              >
                홈으로 돌아가기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. 정상 화면 (만료 전) */}
      <div className="w-full h-full max-w-[500px] flex flex-col flex-1 pb-safe relative">
        
        {/* 상단 헤더 및 타이머 */}
        <header className="w-full p-[5%] flex flex-col items-center pt-[10%] shrink-0">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="text-[clamp(32px,8vw,48px)] mb-2"
          >
            🎉
          </motion.div>
          <h1 className="text-[clamp(24px,6vw,32px)] font-bold mb-1 tracking-wide text-center">
            CONGRATULATIONS!
          </h1>
          <p className="text-[clamp(14px,3.5vw,18px)] text-gray-500 mb-4 text-center">
            성공적인 플레이를 축하합니다!<br/>영상을 기기에 저장해 보세요.
          </p>
          
          <div className="flex items-center gap-2 bg-red-50 text-red-500 px-4 py-2 rounded-full border border-red-100 shadow-sm">
            <span className="text-sm font-bold">만료까지</span>
            <span className="text-lg font-bold tracking-widest">{formatTime(timeLeft)}</span>
          </div>
        </header>

        {/* 영상 리스트 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-[5%] pb-[5%] flex flex-col gap-[4%] snap-y snap-mandatory">
          
          {MOCK_VIDEOS.map((video, index) => (
            <motion.div 
              key={video.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="w-full bg-white rounded-[24px] shadow-md border-[3px] border-crayon-line overflow-hidden flex flex-col shrink-0 snap-center"
            >
              {/* 비디오 플레이어 영역 */}
              <div className="w-full aspect-video bg-black relative">
                <video 
                  src={video.url} 
                  poster={video.thumb}
                  controls 
                  muted
                  controlsList="novolume"
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* 하단 컨트롤 영역 */}
              <div className="p-[5%] flex items-center justify-between bg-[#FAFAFA] border-t-[3px] border-crayon-line">
                <span className="font-bold text-[clamp(18px,4.5vw,22px)]">Catch #{index + 1}</span>
                <button
                  onClick={() => handleDownload(video.url, index)}
                  className="px-6 py-3 bg-[#FFD100] text-crayon-line border-[3px] border-crayon-line rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2"
                >
                  <span className="text-xl">💾</span>
                  <span>저장하기</span>
                </button>
              </div>
            </motion.div>
          ))}
          
          {/* 하단 여백 확보용 */}
          <div className="h-[40px] shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default MobileLanding;
