/**
 * sessionService.ts
 * 비로그인 기반 세션 관리 및 QR 생성 관련 모의(Mock) API 서비스
 * 백엔드 API가 완성되면 실제 axios 호출로 교체해야 합니다.
 */

export const sessionService = {
  /**
   * 사용자가 QR 생성을 거부했을 때 EC2에 저장된 현재 세션의 영상들을 삭제 요청
   */
  deleteSessionVideos: async (): Promise<void> => {
    console.log('[Mock API] EC2의 현재 세션 영상들을 삭제합니다...');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[Mock API] 영상 일괄 삭제 완료.');
        resolve();
      }, 500); // 0.5초 딜레이 모방
    });
  },

  /**
   * 5개의 영상이 모두 모인 후 QR 생성을 요청하여 결과 URL을 반환
   */
  generateSessionQr: async (): Promise<string> => {
    console.log('[Mock API] 저장된 5개 영상 리스트의 QR 코드를 생성합니다...');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[Mock API] QR 생성 완료.');
        // 임시로 다운로드 페이지(또는 깃허브) URL 반환
        resolve('https://github.com/grab-me/jipchak');
      }, 1000); // 1초 딜레이 모방
    });
  }
};
