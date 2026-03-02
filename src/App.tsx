import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  LayoutDashboard, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  AlertTriangle, 
  Download,
  GraduationCap,
  FileText,
  MonitorPlay,
  Layers,
  Edit3,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Subject, Attendance, Activities, WebContent, DashboardData, Period } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- Components ---

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center py-2 px-4 transition-all duration-200 border-b-2",
      active ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
    )}
  >
    <Icon size={20} className="mb-1" />
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </button>
);

const Card = ({ children, title, icon: Icon }: { children: React.ReactNode, title?: string, icon?: any, key?: any }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
    {title && (
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
        {Icon && <Icon size={18} className="text-indigo-600" />}
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

const Input = ({ label, type = "text", ...props }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
    <input
      type={type}
      autoComplete="off"
      spellCheck="false"
      {...props}
      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
    <select
      {...props}
      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
    >
      <option value="">Selecione...</option>
      {options.map((opt: any) => (
        <option key={opt.id} value={opt.id}>{opt.month_year} - {opt.subject_name}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('all');
  const [selectedSubjectDashboardFilter, setSelectedSubjectDashboardFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);

  // Form States
  const [subjectForm, setSubjectForm] = useState({ 
    month_year: '', 
    subject_name: '', 
    professor: '', 
    workload: '', 
    period_id: ''
  });
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const [periodForm, setPeriodForm] = useState({ name: '' });
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  
  const [attendanceForm, setAttendanceForm] = useState<Partial<Attendance>>({});
  const [activitiesForm, setActivitiesForm] = useState<Partial<Activities>>({});
  const [webContentForm, setWebContentForm] = useState<Partial<WebContent>>({});
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [settingsSubjectId, setSettingsSubjectId] = useState<string>('');

  const [settingsForm, setSettingsForm] = useState<Partial<Activities>>({});

  const toggleEdit = (key: string) => {
    setIsEditing(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = async (data: any) => {
    if (!settingsSubjectId) return;
    
    // Convert empty strings to null
    const payload = Object.entries(data).reduce((acc: any, [key, value]) => {
      acc[key] = value === '' ? null : value;
      return acc;
    }, {});

    try {
      const res = await fetch(`/api/activities/${settingsSubjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDashboard();
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (e) {
      alert("Erro de conexão ao salvar.");
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/periods');
      const data = await res.json();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching periods:", e);
      setPeriods([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching subjects:", e);
      setSubjects([]);
    }
  };

  const calculateFinalScore = (item: DashboardData) => {
    const av1 = Math.min(item.act1_grade || 0, 2500);
    const av2 = Math.min(item.act2_grade || 0, 2500);
    const exam = Math.min(item.exam_grade || 0, 5000);
    
    const activityBonus = (item.act1_status === 'Concluída' ? 200 : 0) + (item.act2_status === 'Concluída' ? 200 : 0);
    const webBonus = (item.c1_watched || 0) * 400 + (item.c2_watched || 0) * 400 + (item.c3_watched || 0) * 400 + (item.c4_watched || 0) * 400;
    
    return av1 + av2 + exam + activityBonus + webBonus;
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      const dashboardArray = Array.isArray(data) ? data : [];
      setDashboardData(dashboardArray);
      
      // Check for alerts
      const newAlerts: string[] = [];
      dashboardArray.forEach((item: DashboardData) => {
        const presenceTotal = item.aula1_present + item.aula2_present + item.aula3_present + item.aula4_present;
        const presencePct = (presenceTotal / 4) * 100;
        const finalScore = calculateFinalScore(item);
        const maxPossible = 12000;

        if (presencePct < 75) newAlerts.push(`Presença baixa em ${item.subject_name} (${presencePct}%)`);
        if (finalScore < (maxPossible * 0.6)) newAlerts.push(`Nota abaixo da média em ${item.subject_name} (${finalScore})`);
        
        if (item.act1_status !== 'Concluída') newAlerts.push(`Atividade 1 pendente: ${item.subject_name}`);
        if (item.act2_status !== 'Concluída') newAlerts.push(`Atividade 2 pendente: ${item.subject_name}`);
      });
      setAlerts(newAlerts);
    } catch (e) {
      console.error("Error fetching dashboard:", e);
      setDashboardData([]);
    }
  };

  useEffect(() => {
    fetchPeriods();
    fetchSubjects();
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      const loadData = async () => {
        const [attRes, actRes, webRes] = await Promise.all([
          fetch(`/api/attendance/${selectedSubjectId}`),
          fetch(`/api/activities/${selectedSubjectId}`),
          fetch(`/api/web_contents/${selectedSubjectId}`)
        ]);
        const attData = await attRes.json();
        const actData = await actRes.json();
        const webData = await webRes.json();
        
        setAttendanceForm(attData);
        setActivitiesForm(actData);
        setWebContentForm(webData);

        // Initialize editing state: if data exists, it's "saved" (not editing)
        const newEditingState: Record<string, boolean> = {};
        
        // Attendance
        [1, 2, 3, 4].forEach(num => {
          const hasData = attData[`data_aula_${num}`] || attData[`aula_${num}`];
          newEditingState[`attendance_${num}`] = !hasData;
        });

        // Activities
        [1, 2].forEach(num => {
          const hasData = actData[`atividade_${num}_prazo`] || actData[`atividade_${num}_nota`] > 0 || actData[`atividade_${num}_status`] !== 'Não iniciada';
          newEditingState[`activity_${num}`] = !hasData;
        });
        const hasExamData = actData.prova_data || actData.prova_nota > 0;
        newEditingState[`activity_prova`] = !hasExamData;

        // Web Content
        [1, 2, 3, 4].forEach(num => {
          const hasData = webData[`data_${num}`] || webData[`conteudo_${num}_assistido`];
          newEditingState[`web_${num}`] = !hasData;
        });

        setIsEditing(newEditingState);
      };
      loadData();
    }
  }, [selectedSubjectId]);

  const handleSaveSubject = async () => {
    if (!subjectForm.period_id) {
      alert('Por favor, selecione um período.');
      return;
    }

    // Check for duplicates: Mês/Ano + Nome da Matéria + Período
    const isDuplicate = subjects.some(s => 
      s.month_year.trim().toLowerCase() === subjectForm.month_year.trim().toLowerCase() &&
      s.subject_name.trim().toLowerCase() === subjectForm.subject_name.trim().toLowerCase() &&
      (s.period_id?.toString() || '') === (subjectForm.period_id?.toString() || '') &&
      (!editingSubject || s.id !== editingSubject.id)
    );

    if (isDuplicate) {
      alert("Já existe uma matéria cadastrada para este mês e período.");
      return;
    }


    setLoading(true);
    const method = editingSubject ? 'PUT' : 'POST';
    const url = editingSubject ? `/api/subjects/${editingSubject.id}` : '/api/subjects';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subjectForm)
    });
    
    setSubjectForm({ 
      month_year: '', 
      subject_name: '', 
      professor: '', 
      workload: '', 
      period_id: ''
    });
    setEditingSubject(null);
    fetchSubjects();
    fetchDashboard();
    setLoading(false);
  };

  const handleSavePeriod = async () => {
    if (!periodForm.name) return;
    
    setLoading(true);
    const method = editingPeriod ? 'PUT' : 'POST';
    const url = editingPeriod ? `/api/periods/${editingPeriod.id}` : '/api/periods';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(periodForm)
    });
    
    setPeriodForm({ name: '' });
    setEditingPeriod(null);
    fetchPeriods();
    setLoading(false);
  };

  const handleDeletePeriod = async (id: number) => {
    if (confirm('Deseja realmente excluir este período? Isso pode afetar matérias vinculadas.')) {
      try {
        const res = await fetch(`/api/periods/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          alert(`Erro ao excluir: ${err.message || 'Erro desconhecido'}`);
        } else {
          fetchPeriods();
          fetchSubjects();
          fetchDashboard();
        }
      } catch (e) {
        alert("Erro de conexão ao excluir.");
      }
    }
  };

  const handleDeleteSubject = async (id: number) => {
    const hasData = dashboardData.find(d => d.id === id && (d.aula1_present || d.act1_grade || d.c1_watched));
    const msg = hasData 
      ? 'Esta matéria já possui lançamentos. Deseja realmente excluir?' 
      : 'Deseja realmente excluir este mês/matéria?';
    
    if (confirm(msg)) {
      try {
        const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          alert(`Erro ao excluir: ${err.message || 'Erro desconhecido'}`);
        } else {
          fetchSubjects();
          fetchDashboard();
        }
      } catch (e) {
        alert("Erro de conexão ao excluir.");
      }
    }
  };

  const handleAutoSave = useCallback(async (type: 'attendance' | 'activities' | 'web_contents', data: any) => {
    if (!selectedSubjectId) return;
    
    // Convert empty strings to null for API payload to avoid date errors
    const payload = Object.entries(data).reduce((acc: any, [key, value]) => {
      acc[key] = value === '' ? null : value;
      return acc;
    }, {});

    try {
      const res = await fetch(`/api/${type}/${selectedSubjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Error auto-saving:", err);
        alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
      } else {
        fetchDashboard();
      }
    } catch (e) {
      console.error("Network error auto-saving:", e);
      alert("Erro de conexão ao salvar.");
    }
  }, [selectedSubjectId]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório Acadêmico Mensal", 14, 15);
    
    const tableData = dashboardData.map(item => {
      const presenceTotal = item.aula1_present + item.aula2_present + item.aula3_present + item.aula4_present;
      const presencePct = (presenceTotal / 4) * 100;
      const webTotal = item.c1_watched + item.c2_watched + item.c3_watched + item.c4_watched;
      const webPct = (webTotal / 4) * 100;
      const finalScore = calculateFinalScore(item);
      const maxPossible = 12000;
      
      let status = "Em dia";
      if (presencePct < 75 || finalScore < (maxPossible * 0.6)) status = "Em risco";
      else if (item.act1_status !== 'Concluída' || item.act2_status !== 'Concluída' || webPct < 100) status = "Com pendências";

      return [item.month_year, item.subject_name, `${presencePct}%`, `${webPct}%`, `${finalScore} / ${maxPossible}`, status];
    });

    autoTable(doc, {
      head: [['Mês', 'Matéria', 'Presença', 'Web', 'Nota Final', 'Status']],
      body: tableData,
      startY: 25,
    });
    doc.save('relatorio_academico.pdf');
  };

  const exportExcel = () => {
    const data = dashboardData.map(item => {
      const presenceTotal = item.aula1_present + item.aula2_present + item.aula3_present + item.aula4_present;
      const avgGrade = (item.act1_grade + item.act2_grade + item.exam_grade) / 3;
      return {
        'Mês': item.month_year,
        'Matéria': item.subject_name,
        'Presença %': (presenceTotal / 4) * 100,
        'Média': avgGrade.toFixed(1)
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
    XLSX.writeFile(wb, "relatorio_academico.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Acadêmico</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Controle Mensal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportPDF} className="p-2 text-gray-500 hover:text-indigo-600 transition-colors" title="Exportar PDF">
              <Download size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Alerts Section */}
        {alerts.length > 0 && activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-2"
          >
            {alerts.slice(0, 3).map((alert, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-3 text-amber-800 text-sm font-medium">
                <AlertTriangle size={16} className="shrink-0" />
                {alert}
              </div>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'subjects' && (
            <motion.div key="subjects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card title="Cadastrar Mês / Matéria" icon={Plus}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Período *</label>
                    <select
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={subjectForm.period_id}
                      onChange={(e: any) => setSubjectForm({ ...subjectForm, period_id: e.target.value })}
                    >
                      <option value="">Selecione um período...</option>
                      {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <Input 
                    label="Mês/Ano" 
                    placeholder="Ex: Fevereiro/2026" 
                    value={subjectForm.month_year} 
                    onChange={(e: any) => setSubjectForm({ ...subjectForm, month_year: e.target.value })} 
                  />
                  <Input 
                    label="Nome da Matéria" 
                    placeholder="Ex: Contabilidade" 
                    value={subjectForm.subject_name} 
                    onChange={(e: any) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })} 
                  />
                  <Input 
                    label="Professor" 
                    placeholder="Opcional" 
                    value={subjectForm.professor} 
                    onChange={(e: any) => setSubjectForm({ ...subjectForm, professor: e.target.value })} 
                  />
                  <Input 
                    label="Carga Horária (h)" 
                    type="number" 
                    value={subjectForm.workload} 
                    onChange={(e: any) => setSubjectForm({ ...subjectForm, workload: e.target.value })} 
                  />
                </div>
                <button 
                  onClick={handleSaveSubject}
                  disabled={loading || !subjectForm.month_year || !subjectForm.subject_name || !subjectForm.period_id}
                  className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingSubject ? 'Atualizar' : 'Cadastrar'}
                </button>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Matérias Cadastradas</h3>
                {subjects.map(s => (
                  <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{s.month_year} • {periods.find(p => p.id === s.period_id)?.name}</p>
                      <h4 className="font-bold text-gray-800">{s.subject_name}</h4>
                      {s.professor && <p className="text-sm text-gray-500">Prof. {s.professor}</p>}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingSubject(s); setSubjectForm({ month_year: s.month_year, subject_name: s.subject_name, professor: s.professor || '', workload: s.workload?.toString() || '', period_id: s.period_id?.toString() || '' }); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSubject(s.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'periods' && (
            <motion.div key="periods" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card title="Cadastrar Período" icon={Layers}>
                <Input 
                  label="Nome do Período" 
                  placeholder="Ex: 1º Período, 2026/1" 
                  value={periodForm.name} 
                  onChange={(e: any) => setPeriodForm({ name: e.target.value })} 
                />
                <button 
                  onClick={handleSavePeriod}
                  disabled={loading || !periodForm.name}
                  className="w-full mt-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingPeriod ? 'Atualizar' : 'Cadastrar'}
                </button>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Períodos Cadastrados</h3>
                {periods.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                    <h4 className="font-bold text-gray-800">{p.name}</h4>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingPeriod(p); setPeriodForm({ name: p.name }); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeletePeriod(p.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div key="attendance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Select 
                label="Selecionar Mês/Matéria" 
                options={subjects} 
                value={selectedSubjectId} 
                onChange={(e: any) => setSelectedSubjectId(e.target.value)} 
              />
              
              {selectedSubjectId && (
                <div className="space-y-6">
                  {[1, 2, 3, 4].map(num => {
                    const key = `attendance_${num}`;
                    const editing = isEditing[key];
                    const saved = !editing;

                    return (
                      <Card key={num} title={`Aula ${num}`}>
                        <div className={cn(
                          "transition-all duration-300",
                          saved ? "opacity-60 pointer-events-none" : "opacity-100"
                        )}>
                          <div className="grid grid-cols-2 gap-4 items-end">
                            <Input 
                              label="Data" 
                              type="date" 
                              value={(attendanceForm as any)[`data_aula_${num}`] || ''} 
                              onChange={(e: any) => {
                                const newData = { ...attendanceForm, [`data_aula_${num}`]: e.target.value };
                                setAttendanceForm(newData);
                              }}
                            />
                            <div className="mb-4">
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                              <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button 
                                  onClick={() => {
                                    const newData = { ...attendanceForm, [`aula_${num}`]: true };
                                    setAttendanceForm(newData);
                                  }}
                                  className={cn(
                                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                                    (attendanceForm as any)[`aula_${num}`] === true ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
                                  )}
                                >
                                  Presente
                                </button>
                                <button 
                                  onClick={() => {
                                    const newData = { ...attendanceForm, [`aula_${num}`]: false };
                                    setAttendanceForm(newData);
                                  }}
                                  className={cn(
                                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                                    (attendanceForm as any)[`aula_${num}`] === false ? "bg-white text-red-600 shadow-sm" : "text-gray-500"
                                  )}
                                >
                                  Faltou
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-50">
                          {!saved ? (
                            <>
                              <button 
                                onClick={() => {
                                  const newData = { ...attendanceForm, [`data_aula_${num}`]: '', [`aula_${num}`]: false };
                                  setAttendanceForm(newData);
                                  handleAutoSave('attendance', newData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                              <button 
                                onClick={() => {
                                  handleAutoSave('attendance', attendanceForm);
                                  toggleEdit(key);
                                }}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                              >
                                <Save size={14} /> Salvar
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                disabled
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed opacity-50"
                              >
                                <Save size={14} /> Salvo
                              </button>
                              <button 
                                onClick={() => toggleEdit(key)}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                              >
                                <Edit3 size={14} /> Editar
                              </button>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}

                  {/* Stats */}
                  <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">Resumo de Presença</h3>
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-indigo-100 text-xs uppercase font-bold tracking-wider">Total</p>
                        <p className="text-3xl font-bold">
                          {(attendanceForm.aula_1 ? 1 : 0) + (attendanceForm.aula_2 ? 1 : 0) + (attendanceForm.aula_3 ? 1 : 0) + (attendanceForm.aula_4 ? 1 : 0)} / 4
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-indigo-100 text-xs uppercase font-bold tracking-wider">Status</p>
                        <p className="text-lg font-bold">
                          {((((attendanceForm.aula_1 ? 1 : 0) + (attendanceForm.aula_2 ? 1 : 0) + (attendanceForm.aula_3 ? 1 : 0) + (attendanceForm.aula_4 ? 1 : 0)) / 4) * 100) >= 75 ? 'Aprovado' : 'Reprovado'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'activities' && (
            <motion.div key="activities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Select 
                label="Selecionar Mês/Matéria" 
                options={subjects} 
                value={selectedSubjectId} 
                onChange={(e: any) => setSelectedSubjectId(e.target.value)} 
              />

              {selectedSubjectId && (
                <div className="space-y-6">
                  {[1, 2].map(num => {
                    const key = `activity_${num}`;
                    const editing = isEditing[key];
                    const saved = !editing;

                    return (
                      <Card key={num} title={`Atividade Virtual ${num}`}>
                        <div className={cn(
                          "transition-all duration-300",
                          saved ? "opacity-60 pointer-events-none" : "opacity-100"
                        )}>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input 
                              label="Data" 
                              type="date" 
                              readOnly
                              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none cursor-not-allowed"
                              value={(activitiesForm as any)[`atividade_${num}_prazo`] || ''}
                            />
                            <div className="mb-4">
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                              <select 
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={(activitiesForm as any)[`atividade_${num}_status`] || 'Não iniciada'}
                                onChange={(e: any) => {
                                  const newData = { ...activitiesForm, [`atividade_${num}_status`]: e.target.value };
                                  setActivitiesForm(newData);
                                }}
                              >
                                <option>Não iniciada</option>
                                <option>Em andamento</option>
                                <option>Concluída</option>
                              </select>
                            </div>
                            <Input 
                              label="Nota (Máx 2500)" 
                              type="number" 
                              max={2500}
                              value={(activitiesForm as any)[`atividade_${num}_nota`] || 0}
                              onChange={(e: any) => {
                                const val = Math.min(parseFloat(e.target.value) || 0, 2500);
                                const newData = { ...activitiesForm, [`atividade_${num}_nota`]: val };
                                setActivitiesForm(newData);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-50">
                          {!saved ? (
                            <>
                              <button 
                                onClick={() => {
                                  const newData = { ...activitiesForm, [`atividade_${num}_prazo`]: '', [`atividade_${num}_status`]: 'Não iniciada', [`atividade_${num}_nota`]: 0 };
                                  setActivitiesForm(newData);
                                  handleAutoSave('activities', newData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                              <button 
                                onClick={() => {
                                  handleAutoSave('activities', activitiesForm);
                                  toggleEdit(key);
                                }}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                              >
                                <Save size={14} /> Salvar
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                disabled
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed opacity-50"
                              >
                                <Save size={14} /> Salvo
                              </button>
                              <button 
                                onClick={() => toggleEdit(key)}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                              >
                                <Edit3 size={14} /> Editar
                              </button>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}

                  <Card title="Prova Mensal" icon={FileText}>
                    <div className={cn(
                      "transition-all duration-300",
                      !isEditing['activity_prova'] && (activitiesForm.prova_data || activitiesForm.prova_nota > 0) ? "opacity-60 pointer-events-none" : "opacity-100"
                    )}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                          label="Data da Prova" 
                          type="date" 
                          readOnly
                          className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none cursor-not-allowed"
                          value={activitiesForm.prova_data || ''}
                        />
                        <Input 
                          label="Nota da Prova (Máx 5000)" 
                          type="number" 
                          max={5000}
                          value={activitiesForm.prova_nota || 0}
                          onChange={(e: any) => {
                            const val = Math.min(parseFloat(e.target.value) || 0, 5000);
                            const newData = { ...activitiesForm, prova_nota: val };
                            setActivitiesForm(newData);
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-50">
                      {isEditing['activity_prova'] || !(activitiesForm.prova_data || activitiesForm.prova_nota > 0) ? (
                        <>
                          <button 
                            onClick={() => {
                              const newData = { ...activitiesForm, prova_data: '', prova_nota: 0 };
                              setActivitiesForm(newData);
                              handleAutoSave('activities', newData);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                          <button 
                            onClick={() => {
                              handleAutoSave('activities', activitiesForm);
                              toggleEdit('activity_prova');
                            }}
                            className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                          >
                            <Save size={14} /> Salvar
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            disabled
                            className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed opacity-50"
                          >
                            <Save size={14} /> Salvo
                          </button>
                          <button 
                            onClick={() => toggleEdit('activity_prova')}
                            className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                          >
                            <Edit3 size={14} /> Editar
                          </button>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'web' && (
            <motion.div key="web" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Select 
                label="Selecionar Mês/Matéria" 
                options={subjects} 
                value={selectedSubjectId} 
                onChange={(e: any) => setSelectedSubjectId(e.target.value)} 
              />

              {selectedSubjectId && (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(num => {
                    const key = `web_${num}`;
                    const editing = isEditing[key];
                    const saved = !editing;

                    return (
                      <div key={num} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                        <div className={cn(
                          "transition-all duration-300",
                          saved ? "opacity-60 pointer-events-none" : "opacity-100"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                (webContentForm as any)[`conteudo_${num}_assistido`] ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                              )}>
                                <MonitorPlay size={24} />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-800">Conteúdo Web {num}</h4>
                                <Input 
                                  type="date" 
                                  className="mt-1 text-xs bg-transparent border-none p-0 focus:ring-0" 
                                  value={(webContentForm as any)[`data_${num}`] || ''}
                                  onChange={(e: any) => {
                                    const newData = { ...webContentForm, [`data_${num}`]: e.target.value };
                                    setWebContentForm(newData);
                                  }}
                                />
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                const newData = { ...webContentForm, [`conteudo_${num}_assistido`]: !(webContentForm as any)[`conteudo_${num}_assistido`] };
                                setWebContentForm(newData);
                              }}
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                                (webContentForm as any)[`conteudo_${num}_assistido`] ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-200 text-gray-300"
                              )}
                            >
                              <CheckCircle2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                          {!saved ? (
                            <>
                              <button 
                                onClick={() => {
                                  const newData = { ...webContentForm, [`data_${num}`]: '', [`conteudo_${num}_assistido`]: false };
                                  setWebContentForm(newData);
                                  handleAutoSave('web_contents', newData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                              <button 
                                onClick={() => {
                                  handleAutoSave('web_contents', webContentForm);
                                  toggleEdit(key);
                                }}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                              >
                                <Save size={14} /> Salvar
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                disabled
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed opacity-50"
                              >
                                <Save size={14} /> Salvo
                              </button>
                              <button 
                                onClick={() => toggleEdit(key)}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                              >
                                <Edit3 size={14} /> Editar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-800">Resumo Geral</h2>
                <div className="flex flex-wrap gap-2">
                  <select 
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                    value={selectedPeriodFilter}
                    onChange={(e) => {
                      setSelectedPeriodFilter(e.target.value);
                      setSelectedSubjectDashboardFilter('all');
                    }}
                  >
                    <option value="all">Todos os Períodos</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>

                  <select 
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                    value={selectedSubjectDashboardFilter}
                    onChange={(e) => setSelectedSubjectDashboardFilter(e.target.value)}
                  >
                    <option value="all">Todas as Matérias</option>
                    {subjects
                      .filter(s => selectedPeriodFilter === 'all' || s.period_id.toString() === selectedPeriodFilter)
                      .map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)
                    }
                  </select>

                  <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors">
                    <Download size={16} /> Excel
                  </button>
                </div>
              </div>

              {/* Countdown Block for Filtered Subject */}
              {selectedSubjectDashboardFilter !== 'all' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {(() => {
                    const item = dashboardData.find(d => d.id.toString() === selectedSubjectDashboardFilter);
                    if (!item) return null;

                    const getCountdown = (dateStr?: string) => {
                      if (!dateStr) return { text: "Não definido", color: "text-gray-400 bg-gray-50" };
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const deadline = new Date(dateStr);
                      deadline.setHours(0, 0, 0, 0);
                      const diffTime = deadline.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays < 0) return { text: "Prazo expirado", color: "text-red-600 bg-red-50" };
                      if (diffDays === 0) return { text: "Vence hoje", color: "text-orange-600 bg-orange-50" };
                      return { text: `Faltam ${diffDays} dias`, color: "text-indigo-600 bg-indigo-50" };
                    };

                    return (
                      <>
                        {[
                          { label: 'Atividade Virtual 1', date: item.act1_deadline },
                          { label: 'Atividade Virtual 2', date: item.act2_deadline },
                          { label: 'Data da Prova', date: item.exam_date }
                        ].map((d, i) => {
                          const countdown = getCountdown(d.date);
                          return (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{d.label}</p>
                              <span className={cn("px-3 py-1 rounded-full text-xs font-bold", countdown.color)}>
                                {countdown.text}
                              </span>
                              {d.date && <p className="mt-2 text-[10px] text-gray-400">{new Date(d.date).toLocaleDateString('pt-BR')}</p>}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </motion.div>
              )}

              <div className="space-y-6">
                {dashboardData
                  .filter(item => (selectedPeriodFilter === 'all' || item.period_id.toString() === selectedPeriodFilter) && (selectedSubjectDashboardFilter === 'all' || item.id.toString() === selectedSubjectDashboardFilter))
                  .map(item => {
                  const presenceTotal = item.aula1_present + item.aula2_present + item.aula3_present + item.aula4_present;
                  const presencePct = (presenceTotal / 4) * 100;
                  const webTotal = item.c1_watched + item.c2_watched + item.c3_watched + item.c4_watched;
                  const webPct = (webTotal / 4) * 100;
                  
                  const av1Concluded = item.act1_status === 'Concluída';
                  const av2Concluded = item.act2_status === 'Concluída';
                  const avPct = (( (av1Concluded ? 1 : 0) + (av2Concluded ? 1 : 0) ) / 2) * 100;

                  const finalScore = calculateFinalScore(item);
                  const maxPossible = 12000;
                  
                  let status = "Em dia";
                  let statusColor = "text-emerald-600 bg-emerald-50";
                  
                  if (presencePct < 75 || finalScore < (maxPossible * 0.6)) {
                    status = "Em risco";
                    statusColor = "text-red-600 bg-red-50";
                  } else if (!av1Concluded || !av2Concluded || webPct < 100) {
                    status = "Com pendências";
                    statusColor = "text-amber-600 bg-amber-50";
                  }

                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">
                              {item.month_year} • {periods.find(p => p.id === item.period_id)?.name}
                            </p>
                            <h3 className="text-lg font-bold text-gray-800">{item.subject_name}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusColor)}>
                              {status}
                            </span>
                            {/* Deadline Alerts */}
                            <div className="flex flex-col gap-1 items-end">
                              {[
                                { label: 'Ativ. 1', date: item.act1_deadline },
                                { label: 'Ativ. 2', date: item.act2_deadline },
                                { label: 'Prova', date: item.exam_date }
                              ].map((d, idx) => {
                                if (!d.date) return null;
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const deadline = new Date(d.date);
                                deadline.setHours(0,0,0,0);
                                const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                
                                let alertText = '';
                                let alertColor = '';
                                
                                if (diffDays < 0) {
                                  alertText = 'Prazo expirado';
                                  alertColor = 'text-red-600 bg-red-50';
                                } else if (diffDays === 0) {
                                  alertText = 'Vence hoje';
                                  alertColor = 'text-orange-600 bg-orange-50';
                                } else if (diffDays <= 2) {
                                  alertText = `Vence em ${diffDays} dias`;
                                  alertColor = 'text-amber-600 bg-amber-50';
                                }

                                if (!alertText) return null;

                                return (
                                  <span key={idx} className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase", alertColor)}>
                                    {d.label}: {alertText}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Presença</p>
                            <p className={cn("text-xl font-bold", presencePct < 75 ? "text-red-500" : "text-gray-800")}>{presencePct}%</p>
                          </div>
                          <div className="text-center border-x border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Final</p>
                            <p className={cn("text-xl font-bold", finalScore < (maxPossible * 0.6) ? "text-red-500" : "text-gray-800")}>
                              {finalScore.toLocaleString()} <span className="text-xs text-gray-400">/ {maxPossible.toLocaleString()}</span>
                            </p>
                          </div>
                          <div className="text-center border-r border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Web</p>
                            <p className="text-xl font-bold text-gray-800">{webPct}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Atividades</p>
                            <p className="text-xl font-bold text-gray-800">{avPct}%</p>
                          </div>
                        </div>
                        
                        {/* Deadlines Display */}
                        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ativ. 1</p>
                            <p className="text-xs font-semibold text-gray-600">{item.act1_deadline ? new Date(item.act1_deadline).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ativ. 2</p>
                            <p className="text-xs font-semibold text-gray-600">{item.act2_deadline ? new Date(item.act2_deadline).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prova</p>
                            <p className="text-xs font-semibold text-gray-600">{item.exam_date ? new Date(item.exam_date).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <div key={n} className={cn("w-2 h-2 rounded-full", (item as any)[`aula${n}_present`] ? "bg-emerald-500" : "bg-gray-200")} />
                          ))}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aulas do Mês</p>
                      </div>
                    </div>
                  );
                })}

                {dashboardData.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <LayoutDashboard size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Nenhum dado cadastrado ainda.</p>
                    <button onClick={() => setActiveTab('subjects')} className="mt-4 text-indigo-600 font-bold text-sm uppercase tracking-wider">Começar Agora</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-8">
                {/* Section 1: Periods */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="text-indigo-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-800">1. Cadastro de Períodos</h2>
                  </div>
                  <Card>
                    <Input 
                      label="Nome do Período" 
                      placeholder="Ex: 1º Período, 2026/1" 
                      value={periodForm.name} 
                      onChange={(e: any) => setPeriodForm({ ...periodForm, name: e.target.value })} 
                    />
                    <button 
                      onClick={handleSavePeriod}
                      disabled={loading || !periodForm.name}
                      className="w-full mt-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {editingPeriod ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {periods.map(p => (
                      <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                        <div>
                          <h4 className="font-bold text-gray-800">{p.name}</h4>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingPeriod(p); setPeriodForm({ name: p.name }); }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeletePeriod(p.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section 2: Subjects */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="text-indigo-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-800">2. Cadastro de Mês/Matéria</h2>
                  </div>
                  <Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Período *</label>
                        <select
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          value={subjectForm.period_id}
                          onChange={(e: any) => {
                            const pId = e.target.value;
                            const selectedPeriod = periods.find(p => p.id.toString() === pId);
                            setSubjectForm({ ...subjectForm, period_id: pId });
                          }}
                        >
                          <option value="">Selecione um período...</option>
                          {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <Input 
                        label="Mês/Ano" 
                        placeholder="Ex: Fevereiro/2026" 
                        value={subjectForm.month_year} 
                        onChange={(e: any) => setSubjectForm({ ...subjectForm, month_year: e.target.value })} 
                      />
                      <Input 
                        label="Nome da Matéria" 
                        placeholder="Ex: Contabilidade" 
                        value={subjectForm.subject_name} 
                        onChange={(e: any) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })} 
                      />
                      <Input 
                        label="Professor" 
                        placeholder="Opcional" 
                        value={subjectForm.professor} 
                        onChange={(e: any) => setSubjectForm({ ...subjectForm, professor: e.target.value })} 
                      />
                      <Input 
                        label="Carga Horária (h)" 
                        type="number" 
                        value={subjectForm.workload} 
                        onChange={(e: any) => setSubjectForm({ ...subjectForm, workload: e.target.value })} 
                      />
                    </div>


                    <button 
                      onClick={handleSaveSubject}
                      disabled={loading || !subjectForm.month_year || !subjectForm.subject_name || !subjectForm.period_id}
                      className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {editingSubject ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </Card>
                  <div className="space-y-4">
                    {subjects.map(s => (
                      <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                        <div>
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{s.month_year} • {periods.find(p => p.id === s.period_id)?.name}</p>
                          <h4 className="font-bold text-gray-800">{s.subject_name}</h4>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { 
                              setEditingSubject(s); 
                              setSubjectForm({ 
                                month_year: s.month_year, 
                                subject_name: s.subject_name, 
                                professor: s.professor || '', 
                                workload: s.workload?.toString() || '', 
                                period_id: s.period_id?.toString() || ''
                              }); 
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSubject(s.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section 3: Deadlines */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-indigo-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-800">3. Configuração de Prazos</h2>
                  </div>
                  <Select 
                    label="Selecionar Matéria para Configurar Prazos" 
                    options={subjects} 
                    value={settingsSubjectId} 
                    onChange={(e: any) => {
                      const id = e.target.value;
                      setSettingsSubjectId(id);
                      if (id) {
                        fetch(`/api/activities/${id}`).then(res => res.json()).then(data => {
                          setSettingsForm(data);
                          
                          // Initialize editing state
                          const newEditing = { ...isEditing };
                          
                          // Activity 1
                          const hasAct1 = data.atividade_1_inicio || data.atividade_1_prazo;
                          newEditing['settings_act1'] = !hasAct1;
                          
                          // Activity 2
                          const hasAct2 = data.atividade_2_inicio || data.atividade_2_prazo;
                          newEditing['settings_act2'] = !hasAct2;
                          
                          // Exam
                          const hasExam = data.prova_inicio || data.prova_data;
                          newEditing['settings_exam'] = !hasExam;
                          
                          setIsEditing(newEditing);
                        });
                      } else {
                        setSettingsForm({});
                      }
                    }} 
                  />
                  
                  {settingsSubjectId && (
                    <div className="space-y-6">
                      {/* Activity 1 */}
                      <Card title="Atividade Virtual 1">
                        <div className={cn(
                          "transition-all duration-300",
                          !isEditing['settings_act1'] ? "opacity-60 pointer-events-none" : "opacity-100"
                        )}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                              label="Data de Início" 
                              type="date" 
                              value={settingsForm.atividade_1_inicio || ''}
                              onChange={(e: any) => setSettingsForm({ ...settingsForm, atividade_1_inicio: e.target.value })}
                            />
                            <Input 
                              label="Prazo Final" 
                              type="date" 
                              min={settingsForm.atividade_1_inicio}
                              value={settingsForm.atividade_1_prazo || ''}
                              onChange={(e: any) => setSettingsForm({ ...settingsForm, atividade_1_prazo: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-50">
                          {isEditing['settings_act1'] ? (
                            <>
                              <button 
                                onClick={() => {
                                  const newData = { ...settingsForm, atividade_1_inicio: '', atividade_1_prazo: '' };
                                  setSettingsForm(newData);
                                  handleSaveSettings(newData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                              <button 
                                onClick={() => {
                                  handleSaveSettings(settingsForm);
                                  toggleEdit('settings_act1');
                                }}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                              >
                                <Save size={14} /> Salvar
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                disabled
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed opacity-50"
                              >
                                <Save size={14} /> Salvo
                              </button>
                              <button 
                                onClick={() => toggleEdit('settings_act1')}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                              >
                                <Edit3 size={14} /> Editar
                              </button>
                            </>
                          )}
                        </div>
                      </Card>

                      {/* Activity 2 */}
                      <Card title="Atividade Virtual 2">
                        <div className={cn(
                          "transition-all duration-300",
                          !isEditing['settings_act2'] ? "opacity-60 pointer-events-none" : "opacity-100"
                        )}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                              label="Data de Início" 
                              type="date" 
                              value={settingsForm.atividade_2_inicio || ''}
                              onChange={(e: any) => setSettingsForm({ ...settingsForm, atividade_2_inicio: e.target.value })}
                            />
                            <Input 
                              label="Prazo Final" 
                              type="date" 
                              min={settingsForm.atividade_2_inicio}
                              value={settingsForm.atividade_2_prazo || ''}
                              onChange={(e: any) => setSettingsForm({ ...settingsForm, atividade_2_prazo: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-50">
                          {isEditing['settings_act2'] ? (
                            <>
                              <button 
                                onClick={() => {
                                  const newData = { ...settingsForm, atividade_2_inicio: '', atividade_2_prazo: '' };
                                  setSettingsForm(newData);
                                  handleSaveSettings(newData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                              <button 
                                onClick={() => {
                                  handleSaveSettings(settingsForm);
                                  toggleEdit('settings_act2');
                                }}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                              >
                                <Save size={14} /> Salvar
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                disabled
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed opacity-50"
                              >
                                <Save size={14} /> Salvo
                              </button>
                              <button 
                                onClick={() => toggleEdit('settings_act2')}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                              >
                                <Edit3 size={14} /> Editar
                              </button>
                            </>
                          )}
                        </div>
                      </Card>

                      {/* Exam */}
                      <Card title="Prova Mensal">
                        <div className={cn(
                          "transition-all duration-300",
                          !isEditing['settings_exam'] ? "opacity-60 pointer-events-none" : "opacity-100"
                        )}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                              label="Data de Início" 
                              type="date" 
                              value={settingsForm.prova_inicio || ''}
                              onChange={(e: any) => setSettingsForm({ ...settingsForm, prova_inicio: e.target.value })}
                            />
                            <Input 
                              label="Data da Prova" 
                              type="date" 
                              min={settingsForm.prova_inicio}
                              value={settingsForm.prova_data || ''}
                              onChange={(e: any) => setSettingsForm({ ...settingsForm, prova_data: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-50">
                          {isEditing['settings_exam'] ? (
                            <>
                              <button 
                                onClick={() => {
                                  const newData = { ...settingsForm, prova_inicio: '', prova_data: '' };
                                  setSettingsForm(newData);
                                  handleSaveSettings(newData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                              <button 
                                onClick={() => {
                                  handleSaveSettings(settingsForm);
                                  toggleEdit('settings_exam');
                                }}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                              >
                                <Save size={14} /> Salvar
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                disabled
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed opacity-50"
                              >
                                <Save size={14} /> Salvo
                              </button>
                              <button 
                                onClick={() => toggleEdit('settings_exam')}
                                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                              >
                                <Edit3 size={14} /> Editar
                              </button>
                            </>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe">
        <div className="max-w-4xl mx-auto flex justify-between">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dash" />
          <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={Users} label="Presença" />
          <TabButton active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={FileText} label="Notas" />
          <TabButton active={activeTab === 'web'} onClick={() => setActiveTab('web')} icon={MonitorPlay} label="Web" />
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Config" />
        </div>
      </nav>
    </div>
  );
}
