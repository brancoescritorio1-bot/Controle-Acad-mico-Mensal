import React, { useState, useEffect } from 'react';
import { Plus, Trash2, User } from 'lucide-react';

interface Responsible {
  id: number;
  name: string;
}

interface ResponsibleManagerProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  onUpdate: () => void;
}

export function ResponsibleManager({ fetchWithAuth, onUpdate }: ResponsibleManagerProps) {
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResponsibles();
  }, []);

  const fetchResponsibles = async () => {
    try {
      const res = await fetchWithAuth('/api/finance/responsibles');
      if (res.ok) {
        const data = await res.json();
        setResponsibles(data);
      }
    } catch (error) {
      console.error('Error fetching responsibles:', error);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/finance/responsibles', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() })
      });
      
      if (res.ok) {
        setNewName('');
        fetchResponsibles();
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding responsible:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este responsável?')) return;
    
    try {
      const res = await fetchWithAuth(`/api/finance/responsibles/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchResponsibles();
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting responsible:', error);
    }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <User size={20} className="text-indigo-600" />
        Gerenciar Responsáveis
      </h3>
      
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do responsável"
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newName.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Adicionar
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {responsibles.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">Nenhum responsável cadastrado.</p>
        ) : (
          responsibles.map(resp => (
            <div key={resp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
              <span className="font-medium text-gray-700">{resp.name}</span>
              <button
                onClick={() => handleDelete(resp.id)}
                className="text-gray-400 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100 p-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
