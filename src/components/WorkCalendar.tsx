import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Gift,
  Megaphone,
  X,
  FileText
} from 'lucide-react';
import { useDialog } from './DialogContext';

interface WorkCalendarProps {
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
}

interface HolidayPost {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  social_network: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'other';
  status: 'rascunho' | 'programado' | 'feito' | 'aprovado' | 'publicado';
  caption: string;
  attachment_url: string;
  client_id?: string;
}

export const WorkCalendar: React.FC<WorkCalendarProps> = ({ fetchWithAuth }) => {
  const dialog = useDialog();
  
  // Tab/View States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data States
  const [posts, setPosts] = useState<HolidayPost[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayPost | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    title: '',
    scheduled_date: '',
    type: '[FERIADO]' as '[FERIADO]' | '[DATA_COMEMORATIVA]'
  });

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postForm, setPostForm] = useState({
    title: '',
    scheduled_date: '',
    scheduled_time: '12:00',
    social_network: 'instagram' as 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'other',
    status: 'rascunho' as 'rascunho' | 'programado' | 'feito' | 'aprovado' | 'publicado',
    caption: '',
    client_id: ''
  });

  // Load holidays and clients
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [postsRes, clientsRes] = await Promise.all([
        fetchWithAuth('/api/marketing/posts'),
        fetchWithAuth('/api/marketing/clients')
      ]);

      if (postsRes.ok) {
        setPosts(await postsRes.json());
      }
      if (clientsRes.ok) {
        setClients(await clientsRes.json());
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Separate real posts from holidays/commemorative dates
  const realPosts = useMemo(() => {
    return posts.filter(p => p.caption !== '[FERIADO]' && p.caption !== '[DATA_COMEMORATIVA]');
  }, [posts]);

  const holidays = useMemo(() => {
    return posts.filter(p => p.caption === '[FERIADO]' || p.caption === '[DATA_COMEMORATIVA]');
  }, [posts]);

  // Calendar Helpers
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Group holidays by date
  const holidaysByDateMap = useMemo(() => {
    const map: Record<string, HolidayPost[]> = {};
    holidays.forEach(holiday => {
      const dateStr = holiday.scheduled_date.split('T')[0];
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(holiday);
    });
    return map;
  }, [holidays]);

  // Group real posts by date
  const postsByDateMap = useMemo(() => {
    const map: Record<string, HolidayPost[]> = {};
    realPosts.forEach(post => {
      const dateStr = post.scheduled_date.split('T')[0];
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(post);
    });
    return map;
  }, [realPosts]);

  // Holiday CRUD Handlers
  const handleOpenHolidayModal = (holiday?: HolidayPost, defaultDate?: string) => {
    const today = defaultDate || new Date().toISOString().split('T')[0];
    if (holiday) {
      setEditingHoliday(holiday);
      setHolidayForm({
        title: holiday.title,
        scheduled_date: holiday.scheduled_date,
        type: holiday.caption as '[FERIADO]' | '[DATA_COMEMORATIVA]'
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({
        title: '',
        scheduled_date: today,
        type: '[FERIADO]'
      });
    }
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.title || !holidayForm.scheduled_date) return;

    try {
      const payload = {
        title: holidayForm.title,
        scheduled_date: holidayForm.scheduled_date,
        scheduled_time: '00:00',
        social_network: 'other',
        status: 'programado',
        caption: holidayForm.type,
        attachment_url: '',
        client_id: null
      };

      const url = editingHoliday 
        ? `/api/marketing/posts/${editingHoliday.id}` 
        : '/api/marketing/posts';
      const method = editingHoliday ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsHolidayModalOpen(false);
        fetchAllData();
        dialog.alert(
          editingHoliday 
            ? 'Data comemorativa / feriado atualizado com sucesso!' 
            : 'Data comemorativa / feriado adicionado com sucesso!',
          'Sucesso'
        );
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert(`Erro ao salvar data: ${err.error || 'Erro desconhecido'}`, 'Erro');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    const confirmed = await dialog.confirm(
      'Deseja realmente excluir esta data comemorativa / feriado?',
      {
        title: 'Excluir Data?',
        confirmText: 'Sim, Excluir',
        cancelText: 'Cancelar',
        type: 'danger'
      }
    );
    if (!confirmed) return;

    try {
      const res = await fetchWithAuth(`/api/marketing/posts/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchAllData();
        dialog.alert('Data excluída com sucesso!', 'Sucesso');
      } else {
        dialog.alert('Erro ao excluir data.', 'Erro');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro');
    }
  };

  // Sugerir + Agendar Post Handler
  const handleOpenPostModal = (holiday: HolidayPost) => {
    setPostForm({
      title: `Especial: ${holiday.title}`,
      scheduled_date: holiday.scheduled_date,
      scheduled_time: '12:00',
      social_network: 'instagram',
      status: 'rascunho',
      caption: `Postagem especial de comemoração: ${holiday.title}. #marketing #comemoração`,
      client_id: clients[0]?.id || ''
    });
    setIsPostModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title || !postForm.scheduled_date) return;

    try {
      const payload = {
        title: postForm.title,
        scheduled_date: postForm.scheduled_date,
        scheduled_time: postForm.scheduled_time,
        social_network: postForm.social_network,
        status: postForm.status,
        caption: postForm.caption,
        attachment_url: '',
        client_id: postForm.client_id || null
      };

      const res = await fetchWithAuth('/api/marketing/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsPostModalOpen(false);
        fetchAllData();
        dialog.alert('Post agendado com sucesso para a data temática!', 'Sucesso');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert(`Erro ao agendar post: ${err.error || 'Erro desconhecido'}`, 'Erro');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro');
    }
  };

  // Filtered holidays for List View
  const filteredHolidays = holidays.filter(h => {
    const matchesSearch = h.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (viewMode === 'list') {
      // If list view, don't strictly bind to calendar month filter, or do, let's keep it searchable for all
      return true;
    }
    return true;
  });

  const getPortugueseMonthName = (monthIdx: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIdx] || '';
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header & Quick Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100/80 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-rose-500 text-white rounded-xl shadow-rose-200 shadow-md">
            <Gift size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-900/60 uppercase tracking-wider">Feriados e Datas</p>
            <h4 className="text-2xl font-bold text-slate-800">{holidays.length}</h4>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/80 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-indigo-200 shadow-md">
            <Megaphone size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">Posts Agendados</p>
            <h4 className="text-2xl font-bold text-slate-800">{realPosts.length}</h4>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/80 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-emerald-200 shadow-md">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-900/60 uppercase tracking-wider">Sugestões de Conteúdo</p>
            <h4 className="text-2xl font-bold text-emerald-700">Ativas</h4>
          </div>
        </div>
      </div>

      {/* Control Bar: View Switches, Month navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm gap-4">
        
        {/* Navigation & view selection */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Grade Mensal
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Lista de Datas
            </button>
          </div>

          {viewMode === 'grid' && (
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition">
                <ChevronLeft size={16} />
              </button>
              <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wide min-w-[120px] text-center">
                {getPortugueseMonthName(selectedMonth)} {selectedYear}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Search and action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {viewMode === 'list' && (
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar data por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          )}
          <button
            onClick={() => handleOpenHolidayModal()}
            className="w-full sm:w-auto justify-center bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-100 transition active:scale-95"
          >
            <Plus size={14} /> Adicionar Data
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin"></div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-4 sm:p-6">
              
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-100 text-center py-2 bg-gray-50/20 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Monthly grid */}
              <div className="grid grid-cols-7 bg-gray-100/30 gap-px">
                {/* Empty starting cells */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-gray-50/10 min-h-[90px] sm:min-h-[110px]"></div>
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const dayHolidays = holidaysByDateMap[dateStr] || [];
                  const dayPosts = postsByDateMap[dateStr] || [];

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => handleOpenHolidayModal(undefined, dateStr)}
                      className="bg-white min-h-[95px] sm:min-h-[115px] p-2 border-b border-r border-gray-100 hover:bg-indigo-50/10 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <span className="font-extrabold text-xs text-gray-400 self-start">{day}</span>
                      
                      <div className="space-y-1.5 mt-1 flex-1 overflow-y-auto max-h-[70px] sm:max-h-[90px] scrollbar-thin">
                        {/* Holidays */}
                        {dayHolidays.map(holiday => (
                          <div
                            key={holiday.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenHolidayModal(holiday);
                            }}
                            className="p-1 rounded text-[9px] bg-rose-50 border border-rose-100 text-rose-800 font-extrabold flex flex-col hover:bg-rose-100 transition-all"
                            title={`Editar Data: ${holiday.title}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate">
                                {holiday.caption === '[FERIADO]' ? '🚩' : '🎉'} {holiday.title}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPostModal(holiday);
                                }}
                                className="text-[7px] bg-white text-indigo-700 px-1 rounded hover:bg-indigo-50 transition-all font-black border border-indigo-150 shrink-0"
                                title="Agendar Post temático sugerido"
                              >
                                +Post
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Regular Posts linked to this day */}
                        {dayPosts.map(post => (
                          <div
                            key={post.id}
                            className="p-1 rounded text-[8.5px] bg-indigo-50/50 border border-indigo-100/60 text-indigo-800 truncate"
                            title={`Post agendado: ${post.title}`}
                          >
                            📝 {post.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">
                  Todas as Datas Cadastradas ({filteredHolidays.length})
                </h3>
              </div>

              {filteredHolidays.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p className="text-xs font-semibold">Nenhuma data cadastrada correspondente.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredHolidays.map(holiday => {
                    // Check if there is any scheduled post on the same day
                    const isPostScheduled = postsByDateMap[holiday.scheduled_date.split('T')[0]]?.length > 0;
                    
                    return (
                      <div key={holiday.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/40 transition">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{holiday.caption === '[FERIADO]' ? '🚩' : '🎉'}</span>
                            <h4 className="font-bold text-gray-800 text-sm">{holiday.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${holiday.caption === '[FERIADO]' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-pink-50 text-pink-600 border border-pink-100'}`}>
                              {holiday.caption === '[FERIADO]' ? 'Feriado' : 'Data Comemorativa'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-gray-500 font-mono font-semibold">
                              Data: {new Date(holiday.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </p>
                            
                            {isPostScheduled ? (
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                ✓ Tema com post agendado
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                                💡 Sem post agendado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenPostModal(holiday)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Sparkles size={12} /> Agendar Post sugerido
                          </button>
                          <button
                            onClick={() => handleOpenHolidayModal(holiday)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition"
                            title="Editar Data"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteHoliday(holiday.id)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: ADD/EDIT HOLIDAY */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-rose-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                {editingHoliday ? 'Editar Data Especial' : 'Cadastrar Nova Data / Feriado'}
              </h3>
              <button 
                onClick={() => setIsHolidayModalOpen(false)} 
                className="text-white hover:opacity-80 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-lg"
              >
                Voltar
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Título da Data Especial *</label>
                <input
                  type="text"
                  required
                  value={holidayForm.title}
                  onChange={(e) => setHolidayForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Dia das Mães, Tiradentes, Aniversário da Empresa"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Data correspondente *</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.scheduled_date}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Classificação *</label>
                  <select
                    value={holidayForm.type}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="[FERIADO]">🚩 Feriado Nacional/Local</option>
                    <option value="[DATA_COMEMORATIVA]">🎉 Data Comemorativa</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-rose-700 transition-all shadow-md"
                >
                  Salvar Data
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD TEMATIC POST FROM SUGGESTION */}
      {isPostModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                Agendar Post sugerido
              </h3>
              <button 
                onClick={() => setIsPostModalOpen(false)} 
                className="text-white hover:opacity-80 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-lg"
              >
                Voltar
              </button>
            </div>

            <form onSubmit={handleSavePost} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Título do Post / Tema *</label>
                <input
                  type="text"
                  required
                  value={postForm.title}
                  onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Post de Feliz Dia das Mães"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Cliente Vinculado</label>
                  <select
                    value={postForm.client_id}
                    onChange={(e) => setPostForm(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="">-- Tema Livre (Sem Cliente) --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Rede Social Principal</label>
                  <select
                    value={postForm.social_network}
                    onChange={(e) => setPostForm(prev => ({ ...prev, social_network: e.target.value as any }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="other">Outra / Geral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Data Programada</label>
                  <input
                    type="date"
                    required
                    value={postForm.scheduled_date}
                    onChange={(e) => setPostForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Horário</label>
                  <input
                    type="text"
                    value={postForm.scheduled_time}
                    placeholder="12:00"
                    onChange={(e) => setPostForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1.5">Fluxo de Aprovação / Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'rascunho', label: 'Rascunho' },
                    { id: 'programado', label: 'Programado' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPostForm(prev => ({ ...prev, status: item.id as any }))}
                      className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all border flex items-center justify-between ${
                        postForm.status === item.id 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span>{item.label}</span>
                      {postForm.status === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Legenda sugerida / Texto do Post</label>
                <textarea
                  rows={3}
                  value={postForm.caption}
                  onChange={(e) => setPostForm(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Insira as hashtags, CTAs e texto do post..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                >
                  Agendar Post
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
