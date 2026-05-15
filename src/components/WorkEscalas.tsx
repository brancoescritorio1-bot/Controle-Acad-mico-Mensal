import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Mail, Copy, Check } from 'lucide-react';
import { Escala, EscalaEmail } from '../types';
import { cn } from '../lib/utils';

interface WorkEscalasProps {
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
  finFilter: { month: number, year: number };
}

export const WorkEscalas: React.FC<WorkEscalasProps> = ({ fetchWithAuth, finFilter }) => {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null);
  const [emails, setEmails] = useState<EscalaEmail[]>([]);
  const [newEscalaName, setNewEscalaName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchEscalas();
  }, []);

  const fetchEscalas = async () => {
    const res = await fetchWithAuth('/api/work/escalas');
    if (res.ok) setEscalas(await res.json());
  };

  const fetchEmails = async (escalaId: number) => {
    const res = await fetchWithAuth(`/api/work/escala_emails/${escalaId}`);
    if (res.ok) setEmails(await res.json());
  };

  const handleCreateEscala = async () => {
    if (!newEscalaName) return;
    const res = await fetchWithAuth('/api/work/escalas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newEscalaName })
    });
    if (res.ok) {
      setNewEscalaName('');
      fetchEscalas();
    }
  };

  const handleAddEmail = async () => {
    if (!selectedEscala || !newEmail) return;
    const res = await fetchWithAuth('/api/work/escala_emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escala_id: selectedEscala.id, email: newEmail })
    });
    if (res.ok) {
      setNewEmail('');
      fetchEmails(selectedEscala.id);
    }
  };

  const handleDeleteEmail = async (id: number) => {
    await fetchWithAuth(`/api/work/escala_emails/${id}`, { method: 'DELETE' });
    if (selectedEscala) fetchEmails(selectedEscala.id);
  };

  const generateMessage = () => {
    if (!selectedEscala) return '';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const date = new Date(finFilter.year, finFilter.month);
    const monthName = date.toLocaleString('pt-BR', { month: 'long' });
    
    return `${greeting}!
Segue escala de revezamento ${selectedEscala.name} referente ao mês de ${monthName} de ${finFilter.year}.
Informo que as escalas da GMNL já estão disponíveis no site.
Escalas GMNL ${finFilter.year}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-lg mb-4">Escalas</h3>
        <div className="flex gap-2 mb-4">
          <input 
            className="flex-1 px-3 py-2 border rounded-lg"
            value={newEscalaName}
            onChange={(e) => setNewEscalaName(e.target.value)}
            placeholder="Nome da escala"
          />
          <button onClick={handleCreateEscala} className="bg-indigo-600 text-white px-3 py-2 rounded-lg">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-2">
          {escalas.map(e => (
            <button 
              key={e.id}
              onClick={() => { setSelectedEscala(e); fetchEmails(e.id); }}
              className={cn("w-full text-left p-2 rounded-lg", selectedEscala?.id === e.id ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-gray-50")}
            >
              {e.name}
            </button>
          ))}
        </div>
      </div>

      {selectedEscala && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Emails - {selectedEscala.name}</h3>
          <div className="flex gap-2 mb-4">
            <input 
              className="flex-1 px-3 py-2 border rounded-lg"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
            <button onClick={handleAddEmail} className="bg-emerald-600 text-white px-3 py-2 rounded-lg">
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-1 mb-6">
            {emails.map(em => (
              <div key={em.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <span>{em.email}</span>
                <button onClick={() => handleDeleteEmail(em.id)} className="text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-gray-100 rounded-lg whitespace-pre-line text-sm text-gray-700">
            {generateMessage()}
          </div>
          <button 
            onClick={() => { navigator.clipboard.writeText(generateMessage()); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="mt-2 flex items-center gap-2 text-indigo-600 font-bold text-sm"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} 
            {copied ? 'Copiado!' : 'Copiar Mensagem'}
          </button>
        </div>
      )}
    </div>
  );
};
