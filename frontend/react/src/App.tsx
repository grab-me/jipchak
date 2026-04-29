<<<<<<< HEAD
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
=======
import { useState } from 'react'
import gameService from './services/gameService'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState<string>('연결 대기 중...')

  const testConnection = async () => {
    try {
      setMessage('백엔드 호출 중...')
      const data = await gameService.getHomeMessage()
      setMessage(`백엔드 응답: ${JSON.stringify(data)}`)
    } catch (error) {
      setMessage('백엔드 연결 실패! 백엔드가 8080 포트에서 실행 중인지 확인하세요.')
      console.error(error)
    }
  }

  return (
    <div className="app-container">
      <h1>집착 (Jipchak)</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <button onClick={testConnection} style={{ marginLeft: '10px', backgroundColor: '#4CAF50' }}>
          백엔드 연결 테스트
        </button>
        <p style={{ marginTop: '20px', fontWeight: 'bold', color: '#646cff' }}>
          {message}
        </p>
      </div>
      <p className="read-the-docs">
        Axios를 이용한 백엔드 연결 작업이 완료되었습니다.
      </p>
    </div>
  )
}

export default App
>>>>>>> 747cfdf412c597465de1046a5eb35d43753b1b20
