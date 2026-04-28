import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlayGround from './pages/PlayGround';

const App = () => {
  // 앱 전역 설정: 우클릭 방지 등 키오스크 최적화
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* 대기 화면 (팀원분 작업 구역) */}
        <Route path="/" element={<Home />} />
        
        {/* 게임 레이아웃 화면 (우리 작업 구역) */}
        <Route path="/play" element={<PlayGround />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
