import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

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

  // 이상치 정렬 로직
  const sortedOutliers = useMemo(() => {
    const list = [...MOCK_OUTLIERS];
    if (sortOption === 'high_conf') {
      return list.sort((a, b) => b.confidence - a.confidence);
    }
    if (sortOption === 'low_conf') {
      return list.sort((a, b) => a.confidence - b.confidence);
    }
    // latest (id 역순으로 임시 처리)
    return list.sort((a, b) => b.id - a.id);
  }, [sortOption]);

  return (
    <div 
      className="flex flex-col w-full h-screen bg-[#111827] text-gray-100 overflow-hidden font-crayon"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-[clamp(16px,2vw,32px)] py-[clamp(8px,1.5vh,24px)] bg-[#1f2937] border-b border-gray-800 shadow-sm">
        <h1 className="text-[clamp(20px,2.5vw,36px)] font-bold text-white tracking-wider flex items-center gap-[1vw]">
          JIPCHAK <span className="text-brand text-[clamp(14px,1.5vw,20px)] font-normal">Admin</span>
        </h1>
        
        <div className="flex gap-[clamp(8px,1vw,16px)]">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-[clamp(16px,2vw,32px)] py-[clamp(8px,1vh,16px)] rounded-lg text-[clamp(16px,1.5vw,24px)] font-bold transition-colors active:scale-95 ${
              activeTab === 'overview' ? 'bg-[#3b82f6] text-white shadow-lg' : 'bg-gray-800 text-gray-400'
            }`}
          >
            통계 뷰
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-[clamp(16px,2vw,32px)] py-[clamp(8px,1vh,16px)] rounded-lg text-[clamp(16px,1.5vw,24px)] font-bold transition-colors active:scale-95 ${
              activeTab === 'logs' ? 'bg-[#3b82f6] text-white shadow-lg' : 'bg-gray-800 text-gray-400'
            }`}
          >
            이상치 로그
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-[clamp(16px,2vw,32px)] py-[clamp(8px,1vh,16px)] rounded-lg text-[clamp(16px,1.5vw,24px)] font-bold bg-red-500/20 text-red-400 active:scale-95 transition-transform"
          >
            종료
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full p-[clamp(16px,2vw,32px)] overflow-y-auto">
        
        {activeTab === 'overview' && (
          <div className="flex flex-col h-full gap-[clamp(16px,2vw,32px)]">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-[clamp(16px,2vw,32px)] min-h-[15vh]">
              <div className="bg-[#1f2937] rounded-[1vw] p-[clamp(16px,2vw,32px)] flex flex-col justify-center shadow-lg border border-gray-800">
                <span className="text-gray-400 text-[clamp(14px,1.5vw,20px)] mb-[1vh]">총 시행 횟수</span>
                <span className="text-white text-[clamp(28px,3vw,48px)] font-bold">{MOCK_KPI.totalPlays.toLocaleString()}회</span>
              </div>
              <div className="bg-[#1f2937] rounded-[1vw] p-[clamp(16px,2vw,32px)] flex flex-col justify-center shadow-lg border border-gray-800">
                <span className="text-gray-400 text-[clamp(14px,1.5vw,20px)] mb-[1vh]">종합 성공률</span>
                <span className="text-green-400 text-[clamp(28px,3vw,48px)] font-bold">{MOCK_KPI.winRate}%</span>
              </div>
              <div className="bg-[#1f2937] rounded-[1vw] p-[clamp(16px,2vw,32px)] flex flex-col justify-center shadow-lg border border-blue-900/50 relative overflow-hidden">
                <span className="text-gray-400 text-[clamp(14px,1.5vw,20px)] mb-[1vh] z-10">AI 예측 적중률</span>
                <span className="text-blue-400 text-[clamp(28px,3vw,48px)] font-bold z-10">{MOCK_KPI.aiAccuracy}%</span>
                <div className="absolute right-[-10%] top-[-10%] w-[50%] h-[150%] bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="flex-1 bg-[#1f2937] rounded-[1vw] p-[clamp(16px,2vw,32px)] flex flex-col shadow-lg border border-gray-800">
              <h2 className="text-white text-[clamp(20px,2vw,32px)] font-bold mb-[2vh]">
                AI 신뢰도 분석 <span className="text-gray-400 text-[clamp(14px,1.2vw,20px)] font-normal ml-[1vw]">(구간별 성공/실패 분포)</span>
              </h2>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_BAR_DATA} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="range" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 'clamp(12px, 1.2vw, 16px)' }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 'clamp(12px, 1.2vw, 16px)' }} />
                    <Tooltip 
                      cursor={{ fill: '#374151', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: 'clamp(14px, 1.5vw, 20px)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '2vh', fontSize: 'clamp(14px, 1.5vw, 20px)' }} />
                    <Bar dataKey="success" name="성공 (Success)" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="fail" name="실패 (Fail)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex flex-col h-full bg-[#1f2937] rounded-[1vw] p-[clamp(16px,2vw,32px)] shadow-lg border border-gray-800">
            <div className="flex justify-between items-center mb-[3vh]">
              <h2 className="text-white text-[clamp(20px,2vw,32px)] font-bold">
                이상치 (Edge Cases) 영상 로그
              </h2>
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-[#111827] text-white border border-gray-600 rounded-lg px-[clamp(12px,1vw,16px)] py-[clamp(8px,1vh,12px)] text-[clamp(14px,1.5vw,20px)] outline-none"
              >
                <option value="latest">최신순</option>
                <option value="high_conf">AI 예측 확률 높은순 (오판 의심)</option>
                <option value="low_conf">AI 예측 확률 낮은순 (요행 의심)</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto pr-[1vw]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#1f2937] z-10 shadow-sm">
                  <tr className="border-b border-gray-600 text-gray-400 text-[clamp(14px,1.5vw,20px)]">
                    <th className="p-[1.5vh] font-normal">시간</th>
                    <th className="p-[1.5vh] font-normal">AI 예측 확률</th>
                    <th className="p-[1.5vh] font-normal">실제 결과</th>
                    <th className="p-[1.5vh] font-normal">분석 태그</th>
                    <th className="p-[1.5vh] font-normal text-right">영상 보기</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOutliers.map((item) => {
                    // 극단적 이상치 하이라이트 (95% 이상 실패 OR 10% 이하 성공)
                    const isExtreme = (item.confidence >= 95 && !item.isSuccess) || (item.confidence <= 10 && item.isSuccess);
                    
                    return (
                      <tr key={item.id} className={`border-b border-gray-800 transition-colors ${isExtreme ? 'bg-red-900/20' : 'bg-transparent'}`}>
                        <td className="p-[1.5vh] text-gray-300 text-[clamp(14px,1.5vw,20px)]">{item.timestamp}</td>
                        <td className="p-[1.5vh]">
                          <span className={`text-[clamp(16px,1.8vw,24px)] font-bold ${item.confidence > 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.confidence.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-[1.5vh]">
                          <span className={`px-[clamp(8px,1vw,16px)] py-[clamp(4px,0.5vh,8px)] rounded-lg font-bold text-[clamp(12px,1.2vw,16px)] ${
                            item.isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {item.isSuccess ? '성공' : '실패'}
                          </span>
                        </td>
                        <td className="p-[1.5vh]">
                          <span className={`font-bold text-[clamp(14px,1.5vw,20px)] ${isExtreme ? 'text-red-400 animate-pulse' : 'text-gray-300'}`}>
                            {item.tag}
                          </span>
                        </td>
                        <td className="p-[1.5vh] text-right">
                          <button className="bg-blue-500/20 text-blue-400 px-[clamp(12px,1vw,20px)] py-[clamp(6px,1vh,12px)] rounded-lg font-bold text-[clamp(14px,1.5vw,20px)] active:scale-95 transition-transform border border-blue-500/30">
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
  );
};

export default AdminDashboard;
