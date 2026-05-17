import { useEffect, useCallback } from 'react';
import { useAudioStore } from '@/store/audioStore';

// --- Global Audio State ---
let bgmInstance: HTMLAudioElement | null = null;
let activeSfxCount = 0;
let globalBgmVolume = 0;

const updateBgmState = () => {
  if (!bgmInstance) return;
  // BGM Ducking: SFX가 하나라도 재생 중이면 BGM 일시정지, 아니면 재생 복구
  if (activeSfxCount > 0) {
    bgmInstance.pause();
  } else {
    bgmInstance.volume = globalBgmVolume / 100;
    const playPromise = bgmInstance.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }
};

const handleSfxStart = () => {
  activeSfxCount++;
  updateBgmState();
};

const handleSfxEnd = () => {
  activeSfxCount = Math.max(0, activeSfxCount - 1);
  updateBgmState();
};

/**
 * useAudio
 * 전역 볼륨 상태(audioStore)와 실시간 연동되며, BGM Ducking 및 체이닝 로직을 지원합니다.
 */
export const useAudio = () => {
  const { bgmVolume } = useAudioStore();

  // BGM 볼륨 실시간 동기화
  useEffect(() => {
    globalBgmVolume = bgmVolume;
    if (bgmInstance && activeSfxCount === 0) {
      bgmInstance.volume = bgmVolume / 100;
    }
  }, [bgmVolume]);

  /**
   * 배경음 재생 (Loop)
   */
  const playBgm = useCallback((path: string) => {
    if (bgmInstance) {
      bgmInstance.pause();
    }
    bgmInstance = new Audio(path);
    bgmInstance.loop = true;
    bgmInstance.volume = globalBgmVolume / 100;
    
    // SFX가 안 나오는 중일 때만 바로 재생
    if (activeSfxCount === 0) {
      const playPromise = bgmInstance.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn('[Audio] Autoplay blocked. Interaction required.');
        });
      }
    }
  }, []);

  const stopBgm = useCallback(() => {
    if (bgmInstance) {
      bgmInstance.pause();
      bgmInstance = null;
    }
  }, []);

  /**
   * 효과음 재생 (내부용 헬퍼)
   * @returns HTMLAudioElement (체이닝 제어용)
   */
  const playSfxCore = useCallback((path: string, loop: boolean = false): HTMLAudioElement => {
    const audio = new Audio(path);
    // 내부적으로 최신 상태 접근 필요, 하지만 전역이 아니므로 store를 직접 읽는 방법은 어려울 수 있음.
    // 여기서는 렌더링 시점의 sfxVolume 사용 (클로저)
    audio.volume = useAudioStore.getState().sfxVolume / 100;
    audio.loop = loop;
    
    handleSfxStart();
    
    audio.onended = () => {
      handleSfxEnd();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 재생 실패 시 즉시 카운트 복구
        handleSfxEnd();
      });
    } else {
      // JSDOM 같은 테스트 환경에서 play()가 Promise를 반환하지 않을 때
      // 정상 재생으로 간주하여 카운트 유지 (onended가 호출되지 않을 수 있으므로 주의가 필요할 수 있음)
    }

    return audio;
  }, []);

  const playSfx = useCallback((path: string) => {
    playSfxCore(path, false);
  }, [playSfxCore]);

  const playVoice = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = useAudioStore.getState().voiceVolume / 100;
    
    handleSfxStart();
    audio.onended = () => handleSfxEnd();
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => handleSfxEnd());
    }
  }, []);

  return {
    playBgm,
    stopBgm,
    playSfx,
    playVoice
  };
};
