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
    title: '조작방법',
    description: (
      <>
        <span className="font-black text-blue-500">파란</span> 버튼 누르면 인형뽑기 시작
        <br></br>
        <span className="font-black text-red-500">빨간</span> 버튼 누르면 집게 하강
        <br></br>
        <span className="font-black text-green-500">조이스틱</span>으로 집게 위치 이동
      </>
    ),
  },
  {
    step: '2',
    title: '메인 페이지',
    description: (
      <>
        <span className="font-black text-yellow-600">Start</span> 클릭 시 플레이 페이지로
        <br></br>
        <span className="font-black text-yellow-600">Guide</span> 클릭 시 사용법 보여줌
      </>
    ),
  },
  {
    step: '3',
    title: '판 개수 선택',
    description: (
      <>
      1, 3, 5판 중 하나 선택
      </>
    ),
  },
  {
    step: '4',
    title: '플레이 페이지',
    description: (
      <>
        실시간 영상, 집기 확률 확인
        <br></br>
        서브 카메라(대각선) 클릭 시
        <br></br>
        메인 카메라(탑뷰)와 위치 변경
        <br></br>
        <span className="font-black text-yellow-600">설정</span> 클릭 시 소리 설정
      </>
    ),
  },
  {
    step: '5',
    title: '소리 설정',
    description: (
      <>
      배경음, 효과음, 안내음 크기 조절
      </>
    ),
  },
  {
    step: '6',
    title: '뽑기 완료',
    description: (
      <>
        선택한 판만큼 플레이하면
        <br></br>
        한 판 더 할지 선택
        <br></br>
        <span className="font-black text-red-500">30초</span> 동안 미 선택 시 자동 종료
      </>
    ),
  },
  {
    step: '7',
    title: 'QR 코드 생성',
    description: (
      <>
        <span className="font-black text-yellow-600">그만하기</span>를 고르면
        <br></br>
        <span className="font-black text-yellow-600">QR 코드</span> 생성
        <br></br>
        <span className="font-black text-red-500">1분</span> 동안만 활성화
      </>
    ),
  },
  {
    step: '8',
    title: '다운로드',
    description: (
      <>
        휴대폰 카메라로 스캔 시
        <br></br>
        지금까지 저장된 영상 다운로드
        <br></br>
        <span className="font-black text-red-500">선택한 판의 수</span>까지만 저장
      </>
    ),
  },
];
