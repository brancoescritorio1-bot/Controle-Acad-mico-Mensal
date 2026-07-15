import React, { useState, useEffect } from 'react';
import { Save, Trash2, Droplets, Zap, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

export const ChacaraOfflineLogger: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [water, setWater] = useState('');
  const [energy, setEnergy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const savedLogs = localStorage.getItem('chacaraOfflineLogs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    
    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/chacara/users');
            if(res.ok) setUsers(await res.json());
        } catch(e) { console.error(e); }
    };
    fetchUsers();
  }, []);

  const saveLog = () => {
    if (!water || !energy || !selectedUser) return;
    const newLog = { id: Date.now(), water, energy, date, userId: selectedUser.id };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('chacaraOfflineLogs', JSON.stringify(updatedLogs));
    setWater('');
    setEnergy('');
  };

  const exportToMain = (log: any) => {
    // Navigate and assume the main screen will handle the state via some other way,
    // or just inform the user to manually enter it.
    // Given the constraints, I will navigate to 'chacara_main'
    setActiveTab('chacara_main');
    // Note: To truly pre-fill, we'd need a shared store.
    alert(`Dados preparados para o usuário ${users.find(u => u.id === log.userId)?.name || log.userId}. Por favor, preencha no formulário de Lançar Conta.`);
  };

  const deleteLog = (id: number) => {
    const filtered = logs.filter(l => l.id !== id);
    setLogs(filtered);
    localStorage.setItem('chacaraOfflineLogs', JSON.stringify(filtered));
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-700">
        <Droplets size={20} /> <Zap size={20} /> Lançar Leituras (Offline)
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Usuário</label>
          <select value={selectedUser ? selectedUser.id : ''} onChange={e => setSelectedUser(users.find(u => u.id === Number(e.target.value)))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <option value="">Selecione um usuário</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {selectedUser && selectedUser.last_bill && (
            <div className="mt-2 text-xs text-gray-600 bg-indigo-50 p-2 rounded">
              Última Leitura: Hidrômetro: {selectedUser.last_bill.water_curr_reading}, Energia: {selectedUser.last_bill.curr_reading} (Data: {new Date(selectedUser.last_bill.reading_date).toLocaleDateString('pt-BR')})
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Hidrômetro</label>
          <input type="number" value={water} onChange={e => setWater(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Ex: 1234" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Energia</label>
          <input type="number" value={energy} onChange={e => setEnergy(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Ex: 5678" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" />
        </div>
        <button onClick={saveLog} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">
          <Save size={18} /> Salvar Localmente
        </button>
      </div>

      <div className="mt-8">
        <h3 className="font-bold text-gray-800 mb-4">Registros Locais</h3>
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-800">{users.find(u => u.id === log.userId)?.name || 'Usuário Desconhecido'}</p>
                <p className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString('pt-BR')} | 💧 {log.water} | ⚡ {log.energy}</p>
              </div>
              <div className='flex gap-2'>
                <button onClick={() => exportToMain(log)} className="text-indigo-600 hover:text-indigo-800"><Upload size={18} /></button>
                <button onClick={() => deleteLog(log.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">Nenhum registro offline.</p>}
        </div>
      </div>
    </div>
  );
};
