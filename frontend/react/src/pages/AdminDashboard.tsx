import { useState, useMemo, useEffect } from 'react';
import { 
  BarChart as RechartsBarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, LogOut, Settings, Image as ImageIcon, XCircle, ChevronLeft, ChevronRight, Cpu, BarChart3, Target } from 'lucide-react'; 

// --- MOCK DATA ---
const MOCK_KPI = {
  totalPlays: 1540,
  winRate: 34.5,
  aiAccuracy: 88.2 
};

// 수백 개의 대규모 Mock 데이터 동적 생성 (ID 시간 동기화)
const MOCK_OUTLIERS = (() => {
  const rawData = Array.from({ length: 250 }).map(() => {
    const isLiftSuccess = Math.random() > 0.4;
    const dropProbability = 20; 
    
    // 성공 조건: 들어올리기 성공 && 놓칠 확률(20%)을 무사히 통과함
    const isSuccess = isLiftSuccess && (Math.random() * 100 > dropProbability);
    
    // 기본적으로 성공하면 확률이 높고, 실패하면 확률이 낮게 분포
    let confidence = isSuccess 
      ? 50 + Math.random() * 50
      : Math.random() * 60;

    // 극단적 이상치 생성
    if (Math.random() < 0.05) confidence = isSuccess ? Math.random() * 15 : 85 + Math.random() * 15;

    // 날짜 랜덤 생성 (과거로)
    const randomTime = new Date(Date.now() - Math.floor(Math.random() * 10000000000));
    
    return {
      timestamp: randomTime.toISOString().replace('T', ' ').slice(0, 19),
      confidence,
      dropProbability,
      isSuccess,
      timestampValue: randomTime.getTime()
    };
  });

  // 시간순으로 오름차순 정렬 (과거 -> 최신) 한 뒤 ID를 1부터 순차적으로 부여
  rawData.sort((a, b) => a.timestampValue - b.timestampValue);
  
  return rawData.map((data, index) => ({
    ...data,
    id: index + 1
  }));
})();

// 누적 막대 차트를 위한 확률 구간별 데이터 계산
const MOCK_BAR_DATA = [
  { range: '0~20%', key: '0-20', success: 0, fail: 0 },
  { range: '20~40%', key: '20-40', success: 0, fail: 0 },
  { range: '40~60%', key: '40-60', success: 0, fail: 0 },
  { range: '60~80%', key: '60-80', success: 0, fail: 0 },
  { range: '80~100%', key: '80-100', success: 0, fail: 0 },
];

MOCK_OUTLIERS.forEach(item => {
  let bucket = 0;
  if (item.confidence > 80) bucket = 4;
  else if (item.confidence > 60) bucket = 3;
  else if (item.confidence > 40) bucket = 2;
  else if (item.confidence > 20) bucket = 1;
  else bucket = 0;

  if (item.isSuccess) MOCK_BAR_DATA[bucket].success++;
  else MOCK_BAR_DATA[bucket].fail++;
});

type SortOption = 'latest' | 'oldest' | 'high_conf' | 'low_conf';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { deviceId } = useParams<{ deviceId: string }>();
  
  const [activeTab, setActiveTab] = useState<'overview'|'logs'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar'|'scatter'>('bar');

  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [resultFilter, setResultFilter] = useState<'all'|'success'|'fail'>('all');
  const [outlierFilter, setOutlierFilter] = useState<'all'|'high_fail'|'low_success'>('all');
  const [rangeFilter, setRangeFilter] = useState<'all'|'0-20'|'20-40'|'40-60'|'60-80'|'80-100'>('all');

  // 특정 ID 직접 검색 (산점도 클릭 시)
  const [searchTargetId, setSearchTargetId] = useState<number | null>(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // 페이지 점프용 입력 상태
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // --- 차트 인터랙션 핸들러 ---
  
  // 1. 막대 차트 클릭
  const handleBarClick = (data: any, type: 'success' | 'fail') => {
    if (!data) return;

    const clickedRangeKey = data.key; // "0-20" 등

    // 필터 세팅
    setRangeFilter(clickedRangeKey);
    setResultFilter(type);
    
    setSearchTargetId(null);
    setActiveTab('logs');
  };

  // 2. 산점도 점 클릭
  const handleScatterClick = (data: any) => {
    // Recharts onClick on Scatter returns an object. data.payload contains the item.
    if (data && data.payload) {
      setSearchTargetId(data.payload.id);
      setActiveTab('logs');
    }
  };

  const clearSearchTarget = () => {
    setSearchTargetId(null);
  };

  // 1. 필터링 로직
  const filteredData = useMemo(() => {
    // 특정 ID 검색이 최우선
    if (searchTargetId !== null) {
      return MOCK_OUTLIERS.filter(item => item.id === searchTargetId);
    }

    return MOCK_OUTLIERS.filter(item => {
      // 결과 필터
      if (resultFilter === 'success' && !item.isSuccess) return false;
      if (resultFilter === 'fail' && item.isSuccess) return false;

      // 주목 이상치 필터
      if (outlierFilter === 'high_fail' && !(item.confidence >= 80 && !item.isSuccess)) return false;
      if (outlierFilter === 'low_success' && !(item.confidence <= 20 && item.isSuccess)) return false;

      // 확률 구간 필터
      if (rangeFilter !== 'all') {
        const conf = item.confidence;
        if (rangeFilter === '0-20' && (conf < 0 || conf > 20)) return false;
        if (rangeFilter === '20-40' && (conf <= 20 || conf > 40)) return false;
        if (rangeFilter === '40-60' && (conf <= 40 || conf > 60)) return false;
        if (rangeFilter === '60-80' && (conf <= 60 || conf > 80)) return false;
        if (rangeFilter === '80-100' && (conf <= 80 || conf > 100)) return false;
      }

      return true;
    });
  }, [resultFilter, outlierFilter, rangeFilter, searchTargetId]);

  // 2. 정렬 로직
  const sortedData = useMemo(() => {
    const list = [...filteredData];
    switch (sortOption) {
      case 'latest': return list.sort((a, b) => b.timestampValue - a.timestampValue);
      case 'oldest': return list.sort((a, b) => a.timestampValue - b.timestampValue);
      case 'high_conf': return list.sort((a, b) => b.confidence - a.confidence);
      case 'low_conf': return list.sort((a, b) => a.confidence - b.confidence);
      default: return list;
    }
  }, [filteredData, sortOption]);

  // 3. 페이지네이션 로직
  const totalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE));
  const currentData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // 필터가 변경되면 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('1');
  }, [sortOption, resultFilter, outlierFilter, rangeFilter, searchTargetId]);

  // 페이지 점프 처리
  const handlePageJump = () => {
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      // 잘못된 값이면 현재 페이지로 복구
      setJumpPageInput(currentPage.toString());
    }
  };

  const handlePageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageJump();
      e.currentTarget.blur();
    }
  };

  const handlePageInputBlur = () => {
    handlePageJump();
  };

  // currentPage가 외부에서 바뀌면 input도 동기화
  useEffect(() => {
    setJumpPageInput(currentPage.toString());
  }, [currentPage]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div 
      className="flex flex-col md:flex-row w-full h-screen bg-[#fdfbf7] text-slate-800 overflow-hidden font-pretendard"
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>
        {`
          /* Recharts 포커스 아웃라인 제거 */
          .recharts-wrapper *:focus {
            outline: none !important;
          }
        `}
      </style>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={toggleSidebar} 
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-xl flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex flex-col">
            JIPCHAK <span className="text-blue-600 text-sm font-semibold mt-1">Admin Portal</span>
          </h1>
          <button className="md:hidden p-2 text-gray-500 active:scale-95" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
        </div>
        
        <div className="flex flex-col gap-2 p-4 flex-1">
          <button 
            onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
            className={`text-left px-4 py-3 rounded-lg font-bold text-lg transition-colors active:scale-95 ${
              activeTab === 'overview' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-500 bg-transparent'
            }`}
          >
            📊 통계 뷰
          </button>
          <button 
            onClick={() => { setActiveTab('logs'); setIsSidebarOpen(false); }}
            className={`text-left px-4 py-3 rounded-lg font-bold text-lg transition-colors active:scale-95 ${
              activeTab === 'logs' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-500 bg-transparent'
            }`}
          >
            📋 이상치 로그
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-30">
          <div className="flex items-center gap-2 md:gap-4">
            <button className="md:hidden p-2 text-slate-600 active:scale-95" onClick={toggleSidebar}>
              <Menu size={28} />
            </button>
            
            {/* 현재 조회 중인 기기 정보 */}
            {deviceId && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg">
                <Cpu size={16} />
                <span className="text-sm font-bold tracking-wide">Device ID: <span className="font-black">{deviceId}</span></span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 sm:gap-4 items-center ml-auto">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm sm:text-base font-semibold text-slate-600 hover:bg-gray-100 active:scale-95 transition-colors">
              <Settings size={18} />
              <span className="hidden sm:inline">설정 (기본 놓칠확률: 20%)</span>
            </button>
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm sm:text-base font-semibold bg-gray-100 text-slate-700 active:scale-95 transition-transform border border-gray-200"
            >
              <Cpu size={18} />
              <span className="hidden sm:inline">기기 선택으로 돌아가기</span>
              <span className="inline sm:hidden">기기</span>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm sm:text-base font-bold bg-red-50 text-red-600 active:scale-95 transition-transform border border-red-100"
            >
              <LogOut size={18} />
              종료
            </button>
          </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 w-full h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'overview' && (
            <div className="flex flex-col h-full gap-4 md:gap-8 max-w-7xl mx-auto">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                <div className="bg-white rounded-2xl p-6 flex flex-col justify-center shadow-md border border-gray-100">
                  <span className="text-slate-500 text-sm md:text-base font-medium mb-2">총 시행 횟수</span>
                  <span className="text-slate-900 text-3xl md:text-5xl font-black">{MOCK_KPI.totalPlays.toLocaleString()}회</span>
                </div>
                <div className="bg-white rounded-2xl p-6 flex flex-col justify-center shadow-md border border-gray-100">
                  <span className="text-slate-500 text-sm md:text-base font-medium mb-2">종합 성공률</span>
                  <span className="text-green-600 text-3xl md:text-5xl font-black">{MOCK_KPI.winRate}%</span>
                </div>
                <div className="bg-white rounded-2xl p-6 flex flex-col justify-center shadow-md border border-gray-100 relative overflow-hidden">
                  <span className="text-slate-500 text-sm md:text-base font-medium mb-2 z-10">AI 예측 적중률</span>
                  <span className="text-blue-600 text-3xl md:text-5xl font-black z-10">{MOCK_KPI.aiAccuracy}%</span>
                </div>
              </div>

              {/* Chart Container */}
              <div className="flex-1 min-h-[400px] bg-white rounded-2xl p-4 md:p-8 flex flex-col shadow-md border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <h2 className="text-slate-900 text-xl md:text-2xl font-bold flex items-center gap-2">
                    AI 신뢰도 분석
                  </h2>
                  
                  {/* Chart Toggle Buttons */}
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setChartType('bar')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                    >
                      <BarChart3 size={16} /> 막대 차트
                    </button>
                    <button 
                      onClick={() => setChartType('scatter')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${chartType === 'scatter' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                    >
                      <Target size={16} /> 산점도
                    </button>
                  </div>
                </div>
                
                <p className="text-slate-400 text-sm mb-4">
                  ※ 차트의 막대(색상 부분)나 산점도의 점을 클릭하면 해당 데이터의 로그 목록으로 바로 이동합니다.
                </p>

                <div className="flex-1 w-full h-full cursor-pointer">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <RechartsBarChart 
                        data={MOCK_BAR_DATA} 
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }} 
                        maxBarSize={80}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="range" stroke="#6b7280" tick={{ fill: '#6b7280', fontWeight: 500 }} />
                        <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontWeight: 500 }} />
                        <Tooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 600, color: '#475569' }} />
                        <Bar 
                          dataKey="success" name="성공 (Success)" stackId="a" fill="#10b981" radius={[0, 0, 6, 6]} 
                          onClick={(data) => handleBarClick(data, 'success')}
                        />
                        <Bar 
                          dataKey="fail" name="실패 (Fail)" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} 
                          onClick={(data) => handleBarClick(data, 'fail')}
                        />
                      </RechartsBarChart>
                    ) : (
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" dataKey="id" name="시행 순서(ID)" stroke="#6b7280" />
                        <YAxis type="number" dataKey="confidence" name="AI 예측 확률" unit="%" stroke="#6b7280" />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }} 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                        />
                        <Scatter 
                          name="실패 (Fail)" data={MOCK_OUTLIERS.filter(d => !d.isSuccess)} fill="#ef4444" 
                          onClick={handleScatterClick}
                          className="focus:outline-none"
                        />
                        <Scatter 
                          name="성공 (Success)" data={MOCK_OUTLIERS.filter(d => d.isSuccess)} fill="#10b981" 
                          onClick={handleScatterClick}
                          className="focus:outline-none"
                        />
                      </ScatterChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex flex-col h-full bg-white rounded-2xl p-4 md:p-8 shadow-md border border-gray-100 max-w-7xl mx-auto min-h-[600px]">
              <h2 className="text-slate-900 text-xl md:text-2xl font-bold mb-4">
                이상치 (Edge Cases) 이미지 로그
              </h2>
              
              {/* ID 검색 배너 */}
              {searchTargetId !== null && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4">
                  <span className="text-blue-800 font-bold">
                    🎯 차트에서 선택한 특정 데이터 (ID: #{searchTargetId})를 조회 중입니다.
                  </span>
                  <button 
                    onClick={clearSearchTarget}
                    className="flex items-center gap-1 bg-white text-blue-600 px-3 py-1.5 rounded-lg font-bold border border-blue-200 active:scale-95"
                  >
                    <XCircle size={18} /> 목록으로 돌아가기
                  </button>
                </div>
              )}

              {/* Advanced Filter Bar (특정 검색 상태일 땐 비활성화 시각처리) */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 ${searchTargetId !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">정렬 기준</label>
                  <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="latest">최신순</option>
                    <option value="oldest">오래된순</option>
                    <option value="high_conf">AI 확률 높은순</option>
                    <option value="low_conf">AI 확률 낮은순</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">결과 필터</label>
                  <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value as any)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">전체 (성공+실패)</option>
                    <option value="success">성공만</option>
                    <option value="fail">실패만</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">확률 구간 필터</label>
                  <select value={rangeFilter} onChange={(e) => setRangeFilter(e.target.value as any)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">전체 확률</option>
                    <option value="0-20">0% ~ 20%</option>
                    <option value="20-40">20% ~ 40%</option>
                    <option value="40-60">40% ~ 60%</option>
                    <option value="60-80">60% ~ 80%</option>
                    <option value="80-100">80% ~ 100%</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">주목 이상치 필터</label>
                  <select value={outlierFilter} onChange={(e) => setOutlierFilter(e.target.value as any)} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">전체 보기</option>
                    <option value="high_fail">🔥 높은 확률 실패</option>
                    <option value="low_success">🍀 낮은 확률 성공</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr className="text-slate-500 text-sm">
                      <th className="p-3 font-semibold">ID</th>
                      <th className="p-3 font-semibold">시간</th>
                      <th className="p-3 font-semibold">AI 예측 확률</th>
                      <th className="p-3 font-semibold text-center">놓칠 확률</th>
                      <th className="p-3 font-semibold text-center">실제 결과</th>
                      <th className="p-3 font-semibold text-center">파지 이미지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => {
                      const isExtreme = (item.confidence >= 80 && !item.isSuccess) || (item.confidence <= 20 && item.isSuccess);
                      
                      return (
                        <tr key={item.id} className={`border-b border-gray-100 transition-colors ${isExtreme ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                          <td className="p-3 text-slate-400 text-sm font-bold">#{item.id}</td>
                          <td className="p-3 text-slate-600 text-sm font-medium">{item.timestamp}</td>
                          <td className="p-3">
                            <span className={`text-base font-bold ${item.confidence > 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.confidence.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-slate-500 text-sm font-bold bg-gray-100 px-2 py-1 rounded">
                              {item.dropProbability}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-3 py-1 rounded-md font-bold text-xs ${
                              item.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.isSuccess ? '성공' : '실패'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button className="bg-blue-50 text-blue-600 p-2 rounded-lg active:scale-95 transition-transform border border-blue-200 hover:bg-blue-100 inline-flex items-center justify-center">
                              <ImageIcon size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {currentData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                          조건에 맞는 데이터가 없습니다. 필터를 변경해 보세요.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Improved Pagination */}
              {totalPages > 0 && (
                <div className="flex flex-wrap justify-center items-center gap-4 mt-6 pt-6 border-t border-gray-100">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-gray-200 text-slate-700 shadow-sm disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-all font-bold"
                  >
                    <ChevronLeft size={18} /> 이전
                  </button>
                  
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-300 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <input 
                      type="text" 
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={handlePageInputBlur}
                      onKeyDown={handlePageKeyDown}
                      className="w-12 text-center font-bold text-blue-600 bg-transparent outline-none"
                    />
                    <span className="text-gray-300">/</span>
                    <span className="font-medium text-slate-500 px-2">{totalPages}</span>
                  </div>

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-gray-200 text-slate-700 shadow-sm disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-all font-bold"
                  >
                    다음 <ChevronRight size={18} />
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
