import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import PlayGround from './pages/PlayGround';

const App = () => {
  // 키오스크 모드에서는 브라우저 기본 우클릭 메뉴를 막아 의도치 않은 이탈을 줄인다.
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    // 정적/상대 경로 배포에서도 새로고침과 직접 진입이 깨지지 않도록 해시 라우팅을 사용한다.
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<PlayGround />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
