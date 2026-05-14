import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Search, Cpu, AlertCircle, Star, Trash2, X, MapPin, StickyNote, Edit2 } from 'lucide-react';

interface DeviceInfo {
  id: string; // e.g., "47190-002"
  registeredAt: string;
  isFavorite?: boolean;
  memo?: string;
}

import regionCodesData from '../assets/data/regionCodes.json';

const REGION_MAP: Record<string, string> = regionCodesData;

const MOCK_DEVICES: DeviceInfo[] = [
  { id: '11680-001', registeredAt: '2026-05-01 10:00:00', isFavorite: true, memo: '1층 로비' },
  { id: '47190-002', registeredAt: '2026-05-10 14:30:00', isFavorite: false, memo: '오락실 구석' },
];

const AdminDeviceSelection = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceInfo[]>(MOCK_DEVICES);
  
  // 분할된 입력 상태
  const [newDevicePrefix, setNewDevicePrefix] = useState('');
  const [newDeviceSuffix, setNewDeviceSuffix] = useState('');
  const [newDeviceMemo, setNewDeviceMemo] = useState('');
  
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Focus 이동을 위한 Ref
  const suffixInputRef = useRef<HTMLInputElement>(null);

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
    setNewDevicePrefix(val);
    setError('');
    
    // 5자리가 다 입력되면 뒷자리 칸으로 포커스 이동
    if (val.length === 5 && suffixInputRef.current) {
      suffixInputRef.current.focus();
    }
  };

  const handleSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setNewDeviceSuffix(val);
    setError('');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation: Prefix 5 digits, Suffix 3~4 digits
    if (newDevicePrefix.length !== 5) {
      setError('행정표준코드(앞자리)는 5자리 숫자여야 합니다.');
      return;
    }
    
    if (newDeviceSuffix.length < 3 || newDeviceSuffix.length > 4) {
      setError('기기 일련번호(뒷자리)는 3~4자리 숫자여야 합니다.');
      return;
    }

    const newDeviceId = `${newDevicePrefix}-${newDeviceSuffix}`;

    if (devices.some(d => d.id === newDeviceId)) {
      setError('이미 등록된 기기 번호입니다.');
      return;
    }

    const newDevice: DeviceInfo = {
      id: newDeviceId,
      registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      isFavorite: false,
      memo: newDeviceMemo.trim() || undefined
    };

    setDevices([newDevice, ...devices]);
    setNewDevicePrefix('');
    setNewDeviceSuffix('');
    setNewDeviceMemo('');
  };

  const handleSelectDevice = (id: string) => {
    navigate(`/admin/dashboard/${id}`);
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setDevices(devices.map(d => 
      d.id === id ? { ...d, isFavorite: !d.isFavorite } : d
    ));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (window.confirm(`정말 ${id} 기기를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) {
      setDevices(devices.filter(d => d.id !== id));
    }
  };

  const handleEditMemo = (e: React.MouseEvent, id: string, currentMemo: string = '') => {
    e.stopPropagation();
    const newMemo = window.prompt(`[${id}] 기기의 새로운 메모를 입력하세요 (최대 12자):`, currentMemo);
    if (newMemo !== null) {
      if (newMemo.length > 12) {
        alert('메모는 최대 12자까지만 입력 가능합니다.');
        return;
      }
      setDevices(devices.map(d => 
        d.id === id ? { ...d, memo: newMemo.trim() || undefined } : d
      ));
    }
  };

  const favoriteDevices = devices.filter(d => d.isFavorite);
  const normalDevices = devices.filter(d => !d.isFavorite);

  const getRegionName = (id: string) => {
    const code = id.split('-')[0];
    return REGION_MAP[code] || '알 수 없는 지역';
  };

  return (
    <div 
      className="flex flex-col w-full min-h-screen bg-[#fdfbf7] text-slate-800 font-pretendard"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 모달 등 그대로 유지됨 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Search size={20} className="text-blue-600" /> 법정동코드 안내
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-sm font-bold text-slate-600 border-b border-gray-200">지역명</th>
                    <th className="p-3 text-sm font-bold text-slate-600 border-b border-gray-200">행정표준코드(앞5자리)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(REGION_MAP).map(([code, name]) => (
                    <tr key={code} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-semibold text-slate-700">{name}</td>
                      <td className="p-3 font-bold text-blue-600">{code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-slate-500 font-medium text-center">
                * 위 목록은 대한민국 주요 시/군/구 단위 행정표준코드입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-30">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          JIPCHAK <span className="text-blue-600 text-lg font-bold">Admin Portal</span>
        </h1>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-600 active:scale-95 transition-transform border border-red-100"
        >
          <LogOut size={18} />
          종료
        </button>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-10 flex flex-col gap-8">
        
        {/* Title */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Cpu className="text-blue-600" size={32} /> 기기 선택 및 관리
          </h2>
          <p className="text-slate-500 font-medium">
            대시보드를 확인할 기기를 선택하거나 새로운 기기를 등록하세요.
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus size={20} className="text-blue-600" /> 신규 기기 등록
            </h3>
            <button 
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 border border-blue-100"
            >
              <Search size={16} /> 법정동코드 조회
            </button>
          </div>
          
          <form onSubmit={handleRegister} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* 분할된 기기 번호 입력 영역 */}
              <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <input 
                  type="text" 
                  value={newDevicePrefix}
                  onChange={handlePrefixChange}
                  placeholder="앞자리(5자)"
                  className={`w-full md:w-32 bg-gray-50 border ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:ring-2 transition-all placeholder:text-gray-400 placeholder:font-medium text-center`}
                />
                <span className="text-slate-400 font-bold">-</span>
                <input 
                  type="text" 
                  ref={suffixInputRef}
                  value={newDeviceSuffix}
                  onChange={handleSuffixChange}
                  placeholder="뒷자리(3~4자)"
                  className={`w-full md:w-36 bg-gray-50 border ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:ring-2 transition-all placeholder:text-gray-400 placeholder:font-medium text-center`}
                />
              </div>

              {/* 메모 입력 영역 */}
              <div className="w-full md:w-auto flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <StickyNote size={18} className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  maxLength={12}
                  value={newDeviceMemo}
                  onChange={(e) => setNewDeviceMemo(e.target.value)}
                  placeholder="메모 입력 (선택사항, 예: 1층 로비)"
                  className="w-full bg-gray-50 border border-gray-300 focus:ring-blue-500 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-800 outline-none focus:ring-2 transition-all placeholder:text-gray-400 placeholder:font-medium"
                />
              </div>
              
              <button 
                type="submit"
                className="w-full md:w-auto bg-blue-600 text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform whitespace-nowrap"
              >
                등록하기
              </button>
            </div>
          </form>
          {error && (
            <p className="text-red-500 text-sm font-bold flex items-center gap-1">
              <AlertCircle size={16} /> {error}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1 font-medium">
            * 기기 번호는 [행정표준코드 5자리]-[기기 식별번호 3~4자리] 형태의 규칙을 따릅니다.
          </p>
        </div>

        {/* Favorite Devices */}
        {favoriteDevices.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Star size={20} className="text-yellow-500 fill-yellow-500" /> 즐겨찾는 기기 ({favoriteDevices.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteDevices.map((device) => (
                <div 
                  key={device.id}
                  onClick={() => handleSelectDevice(device.id)}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-yellow-200 flex flex-col gap-3 cursor-pointer active:scale-95 transition-transform group relative"
                >
                  <div className="flex items-center justify-between min-h-[32px]">
                    {device.memo ? (
                      <span className="bg-gray-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md border border-gray-200 truncate max-w-[150px]">
                        {device.memo}
                      </span>
                    ) : (
                      <div />
                    )}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleEditMemo(e, device.id, device.memo)}
                        className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                        title="메모 수정"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, device.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="기기 삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => toggleFavorite(e, device.id)}
                        className="p-1.5 text-yellow-500 hover:bg-yellow-50 rounded-md transition-colors"
                      >
                        <Star size={20} className="fill-yellow-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col mt-2">
                    <span className="text-xs font-bold text-slate-400 mb-1">기기 번호 (Serial ID)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-900 tracking-tight">{device.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-slate-600 bg-gray-50 px-3 py-2 rounded-lg mt-1 border border-gray-100">
                    <MapPin size={16} className="text-blue-500" />
                    <span className="text-sm font-bold">{getRegionName(device.id)}</span>
                  </div>

                  <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">최초 등록일</span>
                    <span className="text-slate-600 font-bold">{device.registeredAt.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Devices */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Search size={20} className="text-blue-600" /> 등록된 전체 기기 ({normalDevices.length})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {normalDevices.map((device) => (
              <div 
                key={device.id}
                onClick={() => handleSelectDevice(device.id)}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col gap-3 cursor-pointer active:scale-95 transition-transform group"
              >
                <div className="flex items-center justify-between min-h-[32px]">
                  {device.memo ? (
                    <span className="bg-gray-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md border border-gray-200 truncate max-w-[150px]">
                      {device.memo}
                    </span>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleEditMemo(e, device.id, device.memo)}
                      className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                      title="메모 수정"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, device.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="기기 삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => toggleFavorite(e, device.id)}
                      className="p-1.5 text-gray-300 hover:text-yellow-500 hover:bg-yellow-50 rounded-md transition-colors"
                    >
                      <Star size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col mt-2">
                  <span className="text-xs font-bold text-slate-400 mb-1">기기 번호 (Serial ID)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{device.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-600 bg-gray-50 px-3 py-2 rounded-lg mt-1 border border-gray-100">
                  <MapPin size={16} className="text-blue-500" />
                  <span className="text-sm font-bold">{getRegionName(device.id)}</span>
                </div>

                <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">최초 등록일</span>
                  <span className="text-slate-600 font-bold">{device.registeredAt.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>

          {normalDevices.length === 0 && devices.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center gap-3 mt-4">
              <Cpu size={48} className="text-gray-300" />
              <p className="text-slate-500 font-bold text-lg">등록된 기기가 없습니다.</p>
              <p className="text-slate-400 text-sm">상단에서 새로운 기기를 등록해주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDeviceSelection;
