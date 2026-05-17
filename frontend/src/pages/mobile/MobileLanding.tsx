import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { sessionService } from '../../services/sessionService';

import ExpiredModal from '../../components/mobile/ExpiredModal';
import LandingHeader from '../../components/mobile/LandingHeader';
import VideoCard from '../../components/mobile/VideoCard';

// --- 세션 설정 상수 ---
const MOCK_SESSION_TIME_MINUTES = 5; // 5분 유효기간

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

  // 가상의 생성 시간 (방금 생성된 것으로 가정 — 만료까지 5분)
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
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

      {/* 1. 만료 안내 모달 */}
      <ExpiredModal isExpired={isExpired} />

      {/* 2. 정상 화면 (만료 전) */}
      <div className="w-full h-full max-w-[500px] flex flex-col flex-1 pb-safe relative">

        {/* 상단 헤더 및 타이머 */}
        <LandingHeader 
          timeLeft={timeLeft} 
          formatTime={formatTime} 
          triggerExpireTest={triggerExpireTest} 
        />

        {/* 영상 리스트 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-[5%] pb-[5%] flex flex-col gap-[4%] snap-y snap-mandatory">

          {videos.map((video, index) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              index={index} 
              filename={formatFilename(createdAt, index)}
              onDownload={handleDownload} 
            />
          ))}

          {/* 하단 여백 확보용 */}
          <div className="h-[40px] shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default MobileLanding;
