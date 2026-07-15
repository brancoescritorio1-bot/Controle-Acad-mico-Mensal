import React, { useState, useEffect } from 'react';
import { Save, Trash2, Droplets, Zap, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

export const ChacaraOfflineLogger: React.FC<{ setActiveTab: (tab: string) => void, fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response> }> = ({ setActiveTab, fetchWithAuth }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [waterReadings, setWaterReadings] = useState<string[]>(['']);
  const [energyReadings, setEnergyReadings] = useState<string[]>(['']);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const savedLogs = localStorage.getItem('chacaraOfflineLogs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    
    const fetchUsers = async () => {
        try {
            const res = await fetchWithAuth('/api/chacara/users');
            if(res.ok) setUsers(await res.json());
        } catch(e) { console.error(e); }
    };
    fetchUsers();
  }, []);

  const saveLog = () => {
    if (!selectedUser) return;
    const newLog = { 
        id: Date.now(), 
        date, 
        userId: selectedUser.id,
        waterReadings: waterReadings.filter(r => r !== ''),
        energyReadings: energyReadings.filter(r => r !== '')
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('chacaraOfflineLogs', JSON.stringify(updatedLogs));
    setWaterReadings(['']);
    setEnergyReadings(['']);
  };

  const exportToMain = (log: any) => {
    localStorage.setItem('chacaraPreFill', JSON.stringify(log));
    setActiveTab('chacara_main');
  };

  const deleteLog = (id: number) => {
    const filtered = logs.filter(l => l.id !== id);
    setLogs(filtered);
    localStorage.setItem('chacaraOfflineLogs', JSON.stringify(filtered));
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-700">
        <Droplets size={20} /> <Zap size={20} /> Lançar (Offline)
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Usuário</label>
          <select value={selectedUser ? selectedUser.id : ''} onChange={e => setSelectedUser(users.find(u => u.id === Number(e.target.value)))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <option value="">Selecione...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {selectedUser && selectedUser.last_bill && (
            <div className="mt-2 text-xs text-gray-600 bg-indigo-50 p-2 rounded">
              Última: H:{selectedUser.last_bill.water_curr_reading} | E:{selectedUser.last_bill.curr_reading}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Hidrômetros</label>
              {waterReadings.map((r, i) => <input key={i} type="number" value={r} onChange={e => { const n = [...waterReadings]; n[i] = e.target.value; setWaterReadings(n); }} className="w-full p-2 mt-1 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Valor" />)}
              <button onClick={() => setWaterReadings([...waterReadings, ''])} className="mt-1 text-xs text-indigo-600">+ Adicionar</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Energia</label>
              {energyReadings.map((r, i) => <input key={i} type="number" value={r} onChange={e => { const n = [...energyReadings]; n[i] = e.target.value; setEnergyReadings(n); }} className="w-full p-2 mt-1 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Valor" />)}
              <button onClick={() => setEnergyReadings([...energyReadings, ''])} className="mt-1 text-xs text-indigo-600">+ Adicionar</button>
            </div>
        </div>
        <button onClick={saveLog} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">
          <Save size={18} /> Salvar
        </button>
      </div>

      <div className="mt-8">
        <h3 className="font-bold text-gray-800 mb-4 text-sm">Registros</h3>
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-gray-800">{users.find(u => u.id === log.userId)?.name || '?'}</p>
                <p className="text-gray-500">💧{log.waterReadings.join(',')} | ⚡{log.energyReadings.join(',')}</p>
              </div>
              <div className='flex gap-2'>
                <button 
                  onClick={() => exportToMain(log)} 
                  className="text-indigo-600 hover:bg-indigo-100 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg transition-all" 
                  title="Lançar Conta no Sistema"
                >
                  <Upload size={14} className="stroke-[3px]" /> 
                  <span className="font-bold">Lançar Conta</span>
                </button>
                <button onClick={() => deleteLog(log.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
