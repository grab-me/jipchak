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
    title: '조작기기',
    description: (
      <>
        <span className="font-black text-red-500">빨간</span> 버튼 클릭 시 인형뽑기가 시작됩니다.
        <br></br>
        <span className="font-black text-blue-500">파란</span> 버튼 클릭 시 집게가 내려옵니다.
        <br></br>
        <span className="font-black text-green-500">조이스틱</span>을 움직여 집게를 상하좌우로 이동시킵니다.
      </>
    ),
  },
  {
    step: '2',
    title: '메인 페이지',
    description: (
      <>
        <span className="font-black text-yellow-600">Start</span> 버튼 클릭 시 플레이 페이지로 이동하며,
        <br></br>
        영상 녹화가 시작됩니다.
        <br></br>
        <span className="font-black text-yellow-600">Guide</span> 버튼 클릭 시 사용 가이드를 보여줍니다.
      </>
    ),
  },
  {
    step: '3',
    title: '플레이 페이지',
    description: (
      <>
        실시간 영상,
        <br></br>
        뽑기 확률,
        <br></br>
        저장된 영상을 확인할 수 있습니다.
        <br></br>
        <span className="font-black text-yellow-600">설정</span> 버튼 클릭 시 소리 설정을 보여줍니다.
      </>
    ),
  },
  {
    step: '4',
    title: '메인 카메라',
    description: (
      <>
        <span className="font-black text-yellow-600">깊이 카메라</span> 버전의 실시간 영상을 보여줍니다.
      </>
    ),
  },
  {
    step: '5',
    title: '서브 카메라',
    description: (
      <>
        <span className="font-black text-yellow-600">웹 카메라</span> 버전의 실시간 영상을 보여줍니다.
        <br></br>
        화면을 클릭 시 깊이 카메라와 영상 위치가 바뀝니다.
        <br></br>
        해당 버전으로 녹화가 진행됩니다.
      </>
    ),
  },
  {
    step: '6',
    title: '확률',
    description: (
      <>
        집게 움직임 기반의 뽑기 확률을 색으로 보여줍니다.
      </>
    ),
  },
  {
    step: '7',
    title: '소리 설정',
    description: (
      <>
      배경음, 효과음, 안내음의 소리 크기를 설정할 수 있습니다.
      </>
    ),
  },
  {
    step: '8',
    title: '뽑기 이후',
    description: (
      <>
        매 판 종료 후 해당 녹화본은 저장되며,
        <br></br>
        <span className="font-black text-yellow-600">한 번 더 할지</span> 선택할 수 있습니다.
        <br></br>
        선택은 <span className="font-black text-red-500">4번</span>까지 가능하며,
        <br></br>
        <span className="font-black text-red-500">30초</span> 동안 미선택 시 자동 종료됩니다.
      </>
    ),
  },
  {
    step: '9',
    title: '이어하기',
    description: (
      <>
        <span className="font-black text-yellow-600">이어하기</span>를 고르면
        <br></br>
        녹화 영상이 <span className="font-black text-yellow-600">나의 기록</span>에 누적되어 보여집니다.
        <br></br>
        영상은 <span className="font-black text-red-500">4개</span>까지 저장됩니다.        
      </>
    ),
  },
  {
    step: '10',
    title: '종료하기',
    description: (
      <>
        <span className="font-black text-yellow-600">그만하기</span>를 고르면
        <br></br>
        지금까지 저장된 영상을 다운로드 받을 수 있는 <span className="font-black text-yellow-600">QR 코드</span>가 생성됩니다.
        <br></br>
        QR 코드는 <span className="font-black text-red-500">30초</span> 동안만 활성화됩니다.
      </>
    ),
  },
  {
    step: '11',
    title: 'QR 영상 확인',
    description: (
      <>
        휴대폰 카메라로 스캔하면
        <br></br>
        지금까지 저장된 영상을 확인할 수 있습니다.
        <br></br>
        영상은 <span className="font-black text-red-500">5개</span>까지 저장됩니다.
      </>
    ),
  },
];
