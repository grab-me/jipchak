import React from 'react';
import { Menu, Cpu, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  deviceId?: string;
  toggleSidebar: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ deviceId, toggleSidebar }) => {
  const navigate = useNavigate();

  return (
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
  );
};

export default DashboardHeader;
