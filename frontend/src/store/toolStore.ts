import { create } from 'zustand';
import { sessionService } from '@/services/sessionService';
import { useStreamStore } from './streamStore';

export type ToolAreaView = 'RECORDS' | 'QR_CONSENT' | 'QR_DISPLAY';

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
  sessionId: string;
  isSessionActive: boolean;
  records: RecordItem[];
  qrTimer: number;

  // 사용자가 GameCountModal 에서 선택한 판수 (1 / 3 / 5).
  // addRecord 시 records.length 가 이 값에 도달하면 forceStopGame.
  maxGames: number;

  // 뽑기 프로세스 상태
  isCatching: boolean;
  lastResult: 'win' | 'lose' | null;

  // Actions
  // DEAD: setViewType 은 어디서도 호출되지 않음. viewType 은 records.length / qrValue 로 derive 가능.
  //       Phase 2 의 SessionState 머신 통합 작업에서 제거 예정.
  // setViewType: (view: ToolAreaView) => void;
  /**
   * 세션 시작.
   *
   * @param sessionId 서버(AI)가 발급한 session_id. 있으면 그대로 채택하여
   *   Spring 백엔드와 모바일 QR 영상 조회의 키를 일치시킨다.
   *   없으면 클라이언트 임시 ID 를 생성 (SESSION_START 전에 UI 만 띄울 때 등).
   */
  startSession: (sessionId?: string) => void;
  /**
   * 진행 중인 세션의 sessionId 만 교체.
   *
   * 사용 케이스:
   *   사용자가 START 클릭 시 startSession() 으로 임시 client id 가 발급되고,
   *   이후 첫 SESSION_START 이벤트가 도착하면 그 server id 로 교체해야 한다.
   *   startSession 을 다시 호출하면 records 가 초기화되므로 분리.
   */
  setSessionId: (sessionId: string) => void;
  /** GameCountModal 에서 사용자가 1/3/5 중 선택 시 호출. */
  setMaxGames: (max: number) => void;
  addRecord: (record: RecordItem) => void;
  forceStopGame: () => void;
  handleQRConsent: (agreed: boolean) => Promise<void>;
  tickQrTimer: () => void;
  resetSession: () => void;
  setCatching: (catching: boolean) => void;
  setLastResult: (result: 'win' | 'lose' | null) => void;
  isAskingNextStep: boolean;
  setAskingNextStep: (val: boolean) => void;
  isAutoStarting: boolean;
  setAutoStarting: (val: boolean) => void;
}

const DEFAULT_MAX_GAMES = 2; // 2판 고정 (GameCountModal 비활성화로 인해 하드코딩)
const QR_TIMEOUT_SECONDS = 30;

/**
 * useToolStore
 * 비로그인 세션 기반 기록 관리 및 ToolArea 제어
 */
export const useToolStore = create<ToolState>((set, get) => ({
  viewType: 'RECORDS',
  qrValue: '',
  sessionId: '',
  isSessionActive: false,
  records: [],
  qrTimer: 0,
  maxGames: DEFAULT_MAX_GAMES,
  isCatching: false,
  lastResult: null,
  isAskingNextStep: false,
  isAutoStarting: false,

  // DEAD (see interface comment above): setViewType: (view) => set({ viewType: view }),

  // 1. 시작하기 버튼 클릭 또는 SESSION_START 수신 시 세션 시작.
  //    서버 id 를 넘기면 그대로 채택하여 Spring 백엔드 / 모바일과 동일한 키 사용.
  startSession: (sessionId?: string) => {
    const newSessionId = sessionId ?? '';
    set({
      sessionId: newSessionId,
      isSessionActive: true,
      records: [],
      viewType: 'RECORDS',
      qrValue: '',
      qrTimer: 0,
    });
    console.log(`[Session] 새로운 세션이 시작되었습니다. id=${newSessionId}`);
  },

  // 1-1. 진행 중 세션의 sessionId 만 교체 (records 등 다른 상태는 유지).
  //      START 클릭 후 발급된 client fallback id 를 첫 SESSION_START 의 server id 로 갈아끼울 때 사용.
  setSessionId: (sessionId: string) => {
    const prev = get().sessionId;
    if (prev === sessionId) return;
    set({ sessionId });
    console.log(`[Session] sessionId 갱신: ${prev} → ${sessionId}`);
  },

  // 1-2. GameCountModal 에서 사용자가 1/3/5 선택 시 호출.
  setMaxGames: (max) => {
    set({ maxGames: max });
    console.log(`[Session] maxGames = ${max}`);
  },

  // 2. 게임 한판 끝날 때마다 영상 추가
  addRecord: (record) => {
    const { isSessionActive, records, maxGames, forceStopGame } = get();

    if (!isSessionActive || records.length >= maxGames) return;

    const newRecords = [...records, record];
    set({ records: newRecords });
    console.log(`[Session] 기록 추가됨: ${newRecords.length} / ${maxGames}`);

    // 사용자 선택 판수 도달 시 강제 중지 로직 트리거
    if (newRecords.length >= maxGames) {
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
        const { sessionId } = get();
        const qrUrl = await sessionService.generateSessionQr(sessionId);
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
    // Clear stream store frames and events to prevent auto-start loop on Home page
    useStreamStore.setState({
      frame2d: null,
      frame3d: null,
      lastSessionEvent: null,
      lastUiEvent: null,
      graspScore: 0,
      detections: [],
      graspPose: null,
    });

    set({
      sessionId: '',
      isSessionActive: false,
      records: [],
      viewType: 'RECORDS',
      qrValue: '',
      qrTimer: 0,
      isCatching: false,
      lastResult: null,
      isAskingNextStep: false,
    });
    console.log('[Session] 세션 초기화 완료. 홈으로 이동합니다.');
    
    window.location.hash = '#/';
  },

  setCatching: (catching) => set({ isCatching: catching }),
  setLastResult: (result) => set({ lastResult: result }),
  setAskingNextStep: (val) => set({ isAskingNextStep: val }),
  setAutoStarting: (val) => set({ isAutoStarting: val }),
}));
