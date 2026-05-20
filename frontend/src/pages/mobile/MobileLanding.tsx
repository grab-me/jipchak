import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { sessionService } from '../../services/sessionService';

import ExpiredModal from '../../components/mobile/ExpiredModal';
import LandingHeader from '../../components/mobile/LandingHeader';
import VideoCard from '../../components/mobile/VideoCard';

// --- 세션 설정 상수 ---
const MOCK_SESSION_TIME_MINUTES = 10; // 10분 유효기간

// 백엔드 영상 업로드가 아직 불안정해서 Redis 가 비어있는 경우를 대비한
// 임시 목업 데이터. 실제 영상이 들어오면 자동으로 대체된다.
// TODO: AI→Spring 업로드 파이프라인 안정화 후 제거.
const MOCK_VIDEOS = [
  { id: 'mock-1', url: '', thumb: '/logo.png', isSuccess: true },
  { id: 'mock-2', url: '', thumb: '/logo.png', isSuccess: false },
];

// sessionId 별 첫 방문 시각을 localStorage 에 저장해서 새로고침해도
// 만료 시점을 보존한다. (서버 Redis TTL 이 불안정한 동안 클라이언트 안전망)
const STORAGE_PREFIX = 'jipchak-mobile-firstAt:';

const MobileLanding = () => {
  const { sessionId } = useParams();

  // 비디오 데이터 관리 — 초기값은 목업으로 두어 페이지가 무조건 뜨도록 한다.
  const [videos, setVideos] = useState<any[]>(MOCK_VIDEOS);

  // 첫 방문 시각: sessionId 가 정해진 이후에 lazy 계산해서 새로고침에도 유지.
  // 같은 sessionId 로 재방문하면 동일한 firstAt 반환, 새 sessionId 면 now 저장.
  const [createdAt, setCreatedAt] = useState<number>(() => {
    if (!sessionId) return Date.now();
    const key = STORAGE_PREFIX + sessionId;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId) return;

    // 이미 만료된 sessionId 로 (새로고침) 재진입 시 즉시 모달.
    const elapsed = Date.now() - createdAt;
    if (elapsed >= MOCK_SESSION_TIME_MINUTES * 60 * 1000) {
      setIsExpired(true);
      return;
    }

    // 실제 영상이 있으면 목업을 덮어쓰고, 없으면 60초까지 폴링.
    // 폴링 끝까지 실패해도 목업 유지 (만료 모달은 타이머가 다 됐을 때만).
    const POLL_INTERVAL_MS = 2000;
    const MAX_ATTEMPTS = 30;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      timer = setTimeout(load, POLL_INTERVAL_MS);
    };

    const load = async () => {
      if (cancelled) return;
      try {
        const data = await sessionService.getSessionVideos(sessionId);
        if (cancelled) return;
        const fetched = data.videos || [];

        if (fetched.length === 0 && attempts < MAX_ATTEMPTS) {
          attempts += 1;
          schedule();
          return;
        }

        if (fetched.length > 0) {
          setVideos(fetched);
        }
        // fetched.length === 0 & 폴링 한계 도달 → 목업 유지
      } catch (err) {
        if (cancelled) return;
        if (attempts < MAX_ATTEMPTS) {
          attempts += 1;
          schedule();
          return;
        }
        console.warn("데이터 로드 실패, 목업 데이터 유지:", err);
      }
    };

    console.log(`[MobileLanding] Session ID ${sessionId} 데이터 로드 시작.`);
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, createdAt]);


  // 실시간 만료 체크 로직 — 타이머가 0 이 되면 ExpiredModal.
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
      {isExpired ? (
        <ExpiredModal isExpired={isExpired} />
      ) : (
        <div className="w-full h-full max-w-[500px] flex flex-col flex-1 pb-safe relative">
          {/* 상단 헤더 및 타이머 */}
          <LandingHeader 
            timeLeft={timeLeft} 
            formatTime={formatTime} 
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
      )}
    </div>
  );
};

export default MobileLanding;
