import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, MonitorSmartphone } from 'lucide-react'; // 햄버거, 기기변경, 종료 아이콘

// --- MOCK DATA ---
const MOCK_KPI = {
  totalPlays: 1540,
  winRate: 34.5, // %
  aiAccuracy: 88.2 // %
};

// 누적 막대 차트를 위한 확률 구간별 데이터
const MOCK_BAR_DATA = [
  { range: '0~20%', success: 5, fail: 150 },
  { range: '20~40%', success: 15, fail: 120 },
  { range: '40~60%', success: 40, fail: 80 },
  { range: '60~80%', success: 100, fail: 30 },
  { range: '80~100%', success: 250, fail: 10 },
];

// 이상치 로그 데이터 (극단적 값 포함)
const MOCK_OUTLIERS = [
  { id: 1, timestamp: '2024-05-13 14:02:11', confidence: 99.2, isSuccess: false, tag: '🚨 치명적 오판' },
  { id: 2, timestamp: '2024-05-13 13:45:00', confidence: 85.0, isSuccess: false, tag: '🔍 미끄러짐 의심' },
  { id: 3, timestamp: '2024-05-13 11:20:05', confidence: 5.1, isSuccess: true, tag: '🍀 럭키 캐치' },
  { id: 4, timestamp: '2024-05-13 09:10:30', confidence: 15.4, isSuccess: true, tag: '🛠️ 라벨링 확인 요망' },
  { id: 5, timestamp: '2024-05-12 18:30:22', confidence: 95.8, isSuccess: false, tag: '🚨 기계 결함 의심' },
  { id: 6, timestamp: '2024-05-12 15:10:00', confidence: 82.1, isSuccess: false, tag: '🔍 미끄러짐 의심' },
];

type SortOption = 'latest' | 'high_conf' | 'low_conf';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview'|'logs'>('overview');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 모바일 서랍 제어

  // 이상치 정렬 로직
  const sortedOutliers = useMemo(() => {
    const list = [...MOCK_OUTLIERS];
    if (sortOption === 'high_conf') {
      return list.sort((a, b) => b.confidence - a.confidence);
    }
    if (sortOption === 'low_conf') {
      return list.sort((a, b) => a.confidence - b.confidence);
    }
    return list.sort((a, b) => b.id - a.id);
  }, [sortOption]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div 
      className="flex flex-col md:flex-row w-full h-screen bg-[#fdfbf7] text-slate-800 overflow-hidden font-pretendard"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={toggleSidebar} 
        />
      )}

      {/* Sidebar (Desktop 고정, Mobile 서랍) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-xl flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex flex-col">
            JIPCHAK <span className="text-blue-600 text-sm font-semibold mt-1">Admin Portal</span>
          </h1>
          {/* 모바일 닫기 버튼 */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Top Header */}
        <div className="flex items-center justify-between md:justify-end px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-30">
          {/* 모바일 햄버거 버튼 */}
          <button className="md:hidden p-2 text-slate-600 active:scale-95" onClick={toggleSidebar}>
            <Menu size={28} />
          </button>
          
          <div className="flex gap-2 sm:gap-4 items-center">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm sm:text-base font-semibold bg-gray-100 text-slate-700 active:scale-95 transition-transform border border-gray-200">
              <MonitorSmartphone size={18} />
              <span className="hidden sm:inline">기기 선택</span>
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

        {/* Scrollable Content Area */}
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
                <div className="bg-white rounded-2xl p-6 flex flex-col justify-center shadow-md border border-blue-100 relative overflow-hidden">
                  <span className="text-slate-500 text-sm md:text-base font-medium mb-2 z-10">AI 예측 적중률</span>
                  <span className="text-blue-600 text-3xl md:text-5xl font-black z-10">{MOCK_KPI.aiAccuracy}%</span>
                  <div className="absolute right-[-10%] top-[-10%] w-[50%] h-[150%] bg-blue-50 rounded-full blur-2xl pointer-events-none" />
                </div>
              </div>

              {/* Stacked Bar Chart */}
              <div className="flex-1 min-h-[400px] bg-white rounded-2xl p-4 md:p-8 flex flex-col shadow-md border border-gray-100">
                <h2 className="text-slate-900 text-xl md:text-2xl font-bold mb-4">
                  AI 신뢰도 분석 <span className="text-slate-400 text-sm md:text-base font-medium ml-2">(구간별 성공/실패 분포)</span>
                </h2>
                <div className="flex-1 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MOCK_BAR_DATA} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} maxBarSize={80}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="range" stroke="#6b7280" tick={{ fill: '#6b7280', fontWeight: 500 }} />
                      <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontWeight: 500 }} />
                      <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 600, color: '#475569' }} />
                      <Bar dataKey="success" name="성공 (Success)" stackId="a" fill="#10b981" radius={[0, 0, 6, 6]} />
                      <Bar dataKey="fail" name="실패 (Fail)" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex flex-col h-full bg-white rounded-2xl p-4 md:p-8 shadow-md border border-gray-100 max-w-7xl mx-auto min-h-[500px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-slate-900 text-xl md:text-2xl font-bold">
                  이상치 (Edge Cases) 영상 로그
                </h2>
                <select 
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-white text-slate-700 border border-gray-300 rounded-lg px-3 py-2 text-sm md:text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  <option value="latest">최신순</option>
                  <option value="high_conf">AI 예측 확률 높은순 (오판 의심)</option>
                  <option value="low_conf">AI 예측 확률 낮은순 (요행 의심)</option>
                </select>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr className="text-slate-500 text-sm md:text-base">
                      <th className="p-4 font-semibold">시간</th>
                      <th className="p-4 font-semibold">AI 예측 확률</th>
                      <th className="p-4 font-semibold">실제 결과</th>
                      <th className="p-4 font-semibold">분석 태그</th>
                      <th className="p-4 font-semibold text-right">영상 보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOutliers.map((item) => {
                      // 극단적 이상치 하이라이트 (95% 이상 실패 OR 10% 이하 성공)
                      const isExtreme = (item.confidence >= 95 && !item.isSuccess) || (item.confidence <= 10 && item.isSuccess);
                      
                      return (
                        <tr key={item.id} className={`border-b border-gray-100 transition-colors ${isExtreme ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                          <td className="p-4 text-slate-600 text-sm md:text-base font-medium">{item.timestamp}</td>
                          <td className="p-4">
                            <span className={`text-base md:text-xl font-bold ${item.confidence > 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.confidence.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1.5 rounded-md font-bold text-xs md:text-sm ${
                              item.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.isSuccess ? '성공' : '실패'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`font-bold text-sm md:text-base flex items-center gap-2 ${isExtreme ? 'text-red-600' : 'text-slate-700'}`}>
                              {isExtreme && <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75 -ml-4"></span>}
                              {item.tag}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold text-sm md:text-base active:scale-95 transition-transform border border-blue-200 hover:bg-blue-100">
                              ▶ Replay
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
