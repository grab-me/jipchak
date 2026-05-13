import { ReactNode } from 'react';

/**
 * GuideSlides
 * 사용 가이드 모달의 슬라이드 정보를 정의합니다.
 */
export interface GuideSlide {
  step: string;
  title: string;
  description: ReactNode;
}

export const guideSlides: GuideSlide[] = [
  {
    step: '1',
    title: '메인 페이지',
    description: (
      <>
        <span className="font-black text-yellow-600">Start</span> 버튼 클릭 시 플레이 페이지로 이동합니다.
      </>
    ),
  },
  {
    step: '2',
    title: '사용 가이드',
    description: (
      <>
        집착의 사용 가이드를 보여줍니다.
      </>
    ),
  },
  {
    step: '3',
    title: '플레이 페이지',
    description: (
      <>
        메인 카메라의 실시간 영상을 확인할 수 있습니다.
      </>
    ),
  },
  {
    step: '4',
    title: '플레이 페이지',
    description: (
      <>
        서브 카메라의 실시간 영상을 확인할 수 있습니다.
      </>
    ),
  },
  {
    step: '5',
    title: '플레이 페이지',
    description: (
      <>
        집게 움직임 기반의 뽑기 확률을 색으로 확인할 수 있습니다.
      </>
    ),
  },
  {
    step: '6',
    title: '플레이 페이지',
    description: (
      <>
        설정 버튼 클릭 시 소리 설정을 보여줍니다.
      </>
    ),
  },
  {
    step: '7',
    title: '소리 설정',
    description: (
      <>
        배경음, 효과음, 안내음 소리를 설정할 수 있습니다.
      </>
    ),
  },
  {
    step: '8',
    title: '다음 선택',
    description: (
      <>
        매 판 종료 후 <span className="font-black text-gray-400">한 번 더 할지</span> 선택하는 화면이 나옵니다.
        선택은 <span className="font-black text-red-500">최대 4번</span>까지 가능하며, <span className="font-black text-red-500">30초</span> 동안 선택이 없으면 자동 종료됩니다.
      </>
    ),
  },
  {
    step: '9',
    title: '이어하기',
    description: (
      <>
        이어하기를 고르면 <span className="font-black text-gray-400">나의 기록</span>에 누적되어 보여집니다.
        기록은 <span className="font-black text-red-500">최대 4개</span>까지 저장됩니다.
      </>
    ),
  },
  {
    step: '10',
    title: 'QR 코드 생성',
    description: (
      <>
        그만하거나 종료하게 되면 지금까지 저장된 영상을 다운로드 받을 수 있는 <span className="font-black text-gray-400">QR 코드</span>가 생성됩니다.
      </>
    ),
  },
  {
    step: '11',
    title: 'QR 영상 확인',
    description: (
      <>
        QR 코드는 <span className="font-black text-red-500">30초</span> 동안만 활성화됩니다.
        휴대폰으로 스캔하면 녹화 영상을 확인할 수 있습니다.
        영상은 <span className="font-black text-red-500">최대 5개</span>까지 저장됩니다.
      </>
    ),
  },
];
