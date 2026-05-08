import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import byeByeImg from '../../assets/images/bye_bye.png';

import { sessionService } from '../../services/sessionService';

// --- 세션 설정 상수 ---
const MOCK_SESSION_TIME_MINUTES = 30; // 30분 유효기간

const MobileLanding = () => {
  const { sessionId } = useParams();

  // 비디오 데이터 관리
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    if (sessionId) {
      console.log(`[MobileLanding] Session ID ${sessionId} 데이터 로드 시작.`);
      sessionService.getSessionVideos(sessionId)
        .then(data => {
          setVideos(data);
        })
        .catch(err => console.error("데이터 로드 실패:", err));
    }
  }, [sessionId]);

  // 가상의 생성 시간 (5분 전에 생성되었다고 가정)
  const [createdAt, setCreatedAt] = useState<number>(Date.now() - 5 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // 테스트용: 만료 5초 전으로 강제 설정
  const triggerExpireTest = () => {
    const fiveSecondsInMs = 5 * 1000;
    const expireTimeInMs = MOCK_SESSION_TIME_MINUTES * 60 * 1000;
    setCreatedAt(Date.now() - (expireTimeInMs - fiveSecondsInMs));
  };

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

  // 파일명을 YYYYMMDDHHmmss 포맷으로 변환
  const formatFilename = (baseTime: number, index: number) => {
    const date = new Date(baseTime + index * 1000);
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const hh = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    return `${yy}${mm}${dd}_${hh}${min}${ss}`;
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
      a.download = `jipchak_${formatFilename(createdAt, index)}.mp4`;
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
    <div 
      className="w-full h-[100dvh] bg-crayon-bg text-crayon-line font-crayon overflow-hidden relative flex flex-col items-center"
      onContextMenu={(e) => e.preventDefault()}
    >

      {/* 1. 만료 안내 모달 (isExpired가 true일 때 전체 화면 덮음) */}
      <AnimatePresence>
        {isExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 z-modal flex flex-col items-center justify-center p-[5%]"
          >
            <div className="bg-white p-[clamp(20px,6%,32px)] rounded-3xl flex flex-col items-center text-center shadow-2xl max-w-[400px] w-full border-[4px] border-crayon-line">

              {/* 모든 환경에서 줄바꿈 없이 정돈된 구조 (노트북 겹침/줄바꿈 방지) */}
              <div className="w-full mb-8 flex items-center justify-center gap-2">
                {/* 왼쪽: 보이지 않는 공간 (데코레이션 크기 축소) */}
                <div className="w-[clamp(36px,10vw,50px)] shrink-0" aria-hidden="true" />
                
                {/* 중앙: 텍스트 (강제 줄바꿈 방지) */}
                <span
                  className="text-[clamp(30px,7.5vw,44px)] font-black text-[#FFD100] tracking-tighter leading-[1.1] text-center whitespace-nowrap"
                  style={{ WebkitTextStroke: '2px #1f2937' }}
                >
                  안녕히<br />가세요
                </span>

                {/* 오른쪽: 정적 이미지 (데코레이션 크기 축소) */}
                <img 
                  src={byeByeImg} 
                  alt="BYE BYE" 
                  className="w-[clamp(36px,10vw,50px)] h-auto object-contain drop-shadow-sm shrink-0"
                />
              </div>

              <h2 className="text-[clamp(20px,5vw,26px)] font-bold mb-3 text-crayon-line break-keep text-center">세션이 만료되었습니다</h2>
              <p className="text-[clamp(14px,3.5vw,16px)] text-gray-500 leading-relaxed mb-4 break-keep text-center">
                보안을 위해 30분이 지난 영상은 서버에서 영구적으로 삭제되었습니다.
              </p>

              {/* 버튼은 연결할 곳이 없으므로 삭제됨 */}
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
          <h1 className="text-[clamp(24px,6vw,32px)] font-bold mb-1 tracking-wide text-center text-crayon-line break-keep">
            CONGRATULATIONS!
          </h1>
          <p className="text-[clamp(14px,3.5vw,18px)] text-gray-500 mb-4 text-center break-keep">
            성공적인 플레이를 축하합니다!<br />영상을 기기에 저장해 보세요.
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-50 text-red-500 px-4 py-2 rounded-full border border-red-100 shadow-sm">
              <span className="text-sm font-bold break-keep">만료까지</span>
              <span className="text-lg font-bold tracking-widest">{formatTime(timeLeft)}</span>
            </div>

            {/* 테스트용 버튼 (개발 단계에서만 사용) */}
            <button
              onClick={triggerExpireTest}
              className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded border border-gray-300 active:scale-95"
            >
              TEST
            </button>
          </div>
        </header>

        {/* 영상 리스트 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-[5%] pb-[5%] flex flex-col gap-[4%] snap-y snap-mandatory">

          {videos.map((video, index) => {
            const isSuccess = video.isSuccess;

            return (
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

                {/* 하단 컨트롤 영역 (2단 구조로 개선) */}
                <div className="p-[4%] flex flex-col bg-[#FAFAFA] border-t-[3px] border-crayon-line">

                  {/* 상단: 성공/실패 안내 문구 */}
                  <div className={`w-full text-center py-2.5 rounded-xl mb-3 border-2 ${isSuccess ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-[clamp(14px,3.8vw,17px)] font-bold break-keep ${isSuccess ? 'text-blue-600' : 'text-red-500'}`}>
                      이 영상은 뽑기에 <span className="underline underline-offset-4 decoration-[3px]">{isSuccess ? '성공' : '실패'}</span>한 영상이에요!
                    </p>
                  </div>

                  {/* 하단: 파일명 및 저장 버튼 */}
                  <div className="flex items-center justify-between gap-2">
                    {/* 왼쪽: 파일명 */}
                    <span className="font-bold text-[clamp(11px,3vw,13px)] text-gray-400">
                      {formatFilename(createdAt, index)}
                    </span>

                    {/* 오른쪽: 저장 버튼 */}
                    <button
                      onClick={() => handleDownload(video.url, index)}
                      className="px-5 py-2.5 bg-[#FFD100] text-crayon-line border-[3px] border-crayon-line rounded-2xl font-bold shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] active:shadow-none active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all flex items-center justify-center min-w-[110px] shrink-0"
                    >
                      <span className="text-[clamp(15px,4vw,18px)] tracking-tight break-keep">저장하기</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* 하단 여백 확보용 */}
          <div className="h-[40px] shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default MobileLanding;
