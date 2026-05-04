import { create } from 'zustand';
import { sessionService } from '@/services/sessionService';

export type ToolAreaView = 'RECORDS' | 'CHEERING' | 'QR_CONSENT' | 'QR_DISPLAY';

export interface RecordItem {
  id: string;
  filename: string;
  thumbnailUrl?: string;
  isSuccess: boolean;
}

interface ToolState {
  viewType: ToolAreaView;
  qrValue: string;
  
  // 세션 상태 관리
  isSessionActive: boolean;
  records: RecordItem[];
  qrTimer: number;

  // 뽑기 프로세스 상태
  isCatching: boolean;
  lastResult: 'win' | 'lose' | null;

  // Actions
  setViewType: (view: ToolAreaView) => void;
  startSession: () => void;
  addRecord: (record: RecordItem) => void;
  forceStopGame: () => void;
  handleQRConsent: (agreed: boolean) => Promise<void>;
  tickQrTimer: () => void;
  resetSession: () => void;
  setCatching: (catching: boolean) => void;
  setLastResult: (result: 'win' | 'lose' | null) => void;
}

const MAX_RECORDS = 5;
const QR_TIMEOUT_SECONDS = 30;

/**
 * useToolStore
 * 비로그인 세션 기반 기록 관리 및 ToolArea 제어
 */
export const useToolStore = create<ToolState>((set, get) => ({
  viewType: 'RECORDS',
  qrValue: '',
  isSessionActive: false,
  records: [],
  qrTimer: 0,
  isCatching: false,
  lastResult: null,

  setViewType: (view) => set({ viewType: view }),

  // 1. 시작하기 버튼 클릭 시 세션 시작
  startSession: () => {
    set({
      isSessionActive: true,
      records: [],
      viewType: 'RECORDS',
      qrValue: '',
      qrTimer: 0,
    });
    console.log('[Session] 새로운 세션이 시작되었습니다.');
  },

  // 2. 게임 한판 끝날 때마다 영상 추가
  addRecord: (record) => {
    const { isSessionActive, records, forceStopGame } = get();
    
    if (!isSessionActive) return;

    const newRecords = [...records, record];
    set({ records: newRecords });
    console.log(`[Session] 기록 추가됨: ${newRecords.length} / ${MAX_RECORDS}`);

    // 최대 개수 도달 시 강제 중지 로직 트리거
    if (newRecords.length >= MAX_RECORDS) {
      forceStopGame();
    }
  },

  // 3. 5개가 차면 강제 중지 및 동의 화면 전환
  forceStopGame: () => {
    console.log('[Session] 최대 기록 도달. 게임을 강제 중지하고 QR 동의를 받습니다.');
    // TODO: 게임 로직 멈추는 트리거(전역 상태 변경 등) 필요 시 여기에 추가
    set({ viewType: 'QR_CONSENT' });
  },

  // 4. QR 수락 / 거절 처리
  handleQRConsent: async (agreed: boolean) => {
    const { resetSession } = get();

    try {
      if (!agreed) {
        // 거절 시: EC2 영상 삭제 후 홈으로 강제 이동
        await sessionService.deleteSessionVideos();
        resetSession();
      } else {
        // 수락 시: QR 생성 후 화면 전환 및 30초 타이머 시작
        const qrUrl = await sessionService.generateSessionQr();
        set({ 
          qrValue: qrUrl, 
          viewType: 'QR_DISPLAY',
          qrTimer: QR_TIMEOUT_SECONDS
        });
      }
    } catch (error) {
      console.error('[Session] QR 처리 중 오류 발생:', error);
      alert('요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
      // 에러 시 세션 초기화하여 안전하게 홈으로 복귀 유도 (상황에 따라 조정 가능)
      resetSession();
    }
  },

  // 5. 타이머 틱 (컴포넌트에서 호출)
  tickQrTimer: () => {
    const currentTimer = get().qrTimer;
    if (currentTimer <= 1) {
      // 0초가 되면 세션 초기화 및 홈으로 이동
      console.log('[Session] QR 표시 시간이 만료되어 세션을 초기화합니다.');
      get().resetSession();
    } else {
      set({ qrTimer: currentTimer - 1 });
    }
  },

  // 6. 세션 초기화 및 홈으로 강제 이동
  resetSession: () => {
    set({
      isSessionActive: false,
      records: [],
      viewType: 'RECORDS',
      qrValue: '',
      qrTimer: 0,
      isCatching: false,
      lastResult: null,
    });
    console.log('[Session] 세션 초기화 완료. 홈으로 이동합니다.');
    
    window.location.hash = '#/';
  },

  setCatching: (catching) => set({ isCatching: catching }),
  setLastResult: (result) => set({ lastResult: result }),
}));
