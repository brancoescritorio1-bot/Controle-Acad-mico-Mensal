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
  Download,
  GraduationCap,
  FileText,
  MonitorPlay,
  Layers,
  Edit3,
  Settings,
  LogOut,
  Shield,
  Bell,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  AlertTriangle,
  ShoppingCart,
  Clock,
  UserPlus,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Session } from '@supabase/supabase-js';
import { Subject, Attendance, Activities, WebContent, DashboardData, Period, FinancialCategory, FinancialAccount, FinancialTransaction, Client, ClientSale, ClientInstallment } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- Components ---

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 border-b-2 flex-1 min-w-0",
      active ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-gray-400 hover:text-gray-600"
    )}
  >
    <Icon size={20} className={cn("mb-1", active ? "scale-110" : "")} />
    <span className={cn("text-[9px] font-bold uppercase tracking-tight truncate w-full text-center", active ? "text-indigo-600" : "text-gray-400")}>{label}</span>
  </button>
);

const Card = ({ children, title, icon: Icon }: { children: React.ReactNode, title?: string, icon?: any, key?: any }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
    {title && (
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
        {Icon && <Icon size={18} className="text-indigo-600" />}
        <h3 className="font-semibold text-gray-800 text-sm md:text-base">{title}</h3>
      </div>
    )}
    <div className="p-4 md:p-6">
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

import { ResponsibleManager } from './components/ResponsibleManager';

export default function MainApp({ onLogout, session }: { onLogout: () => void, session: Session | null }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('all');
  const [selectedSubjectDashboardFilter, setSelectedSubjectDashboardFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Financial Module State
  const [activeModule, setActiveModule] = useState<'academic' | 'financial'>('academic');
  const [finCategories, setFinCategories] = useState<FinancialCategory[]>([]);
  const [finAccounts, setFinAccounts] = useState<FinancialAccount[]>([]);
  const [finTransactions, setFinTransactions] = useState<FinancialTransaction[]>([]);
  const [finResponsibles, setFinResponsibles] = useState<any[]>([]);
  const [finDashboard, setFinDashboard] = useState<any>(null);
  const [finFilter, setFinFilter] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  
  // Client Module State
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSales, setClientSales] = useState<ClientSale[]>([]);
  const [clientInstallments, setClientInstallments] = useState<ClientInstallment[]>([]);
  const [clientForm, setClientForm] = useState({ name: '', phone: '' });
  const [clientSaleForm, setClientSaleForm] = useState({
    client_id: '',
    description: '',
    total_amount: '',
    installment_count: '1',
    purchase_date: new Date().toISOString().split('T')[0],
    due_day: '10'
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [finCategoryForm, setFinCategoryForm] = useState({ name: '', type: 'despesa' });
  const [finAccountForm, setFinAccountForm] = useState({ name: '', initial_balance: '', type: 'corrente', closing_day: '', due_day: '' });
  const [finTransactionForm, setFinTransactionForm] = useState({ 
    description: '', 
    amount: '', 
    type: 'despesa', 
    category_id: '', 
    account_id: '', 
    date: new Date().toISOString().split('T')[0], 
    status: 'pago',
    is_installment: false,
    total_installments: '1',
    splits: [] as { name: string; amount: number }[]
  });
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('');
  
  const [editingFinCategory, setEditingFinCategory] = useState<FinancialCategory | null>(null);
  const [editingFinAccount, setEditingFinAccount] = useState<FinancialAccount | null>(null);
  const [editingFinTransaction, setEditingFinTransaction] = useState<FinancialTransaction | null>(null);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<number>>(new Set());

  const toggleTransaction = (id: number) => {
    const newSet = new Set(expandedTransactions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedTransactions(newSet);
  };

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${session?.access_token}`
    } as HeadersInit;
    return fetch(url, { ...options, headers });
  }, [session]);

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
      const res = await fetchWithAuth(`/api/activities/${settingsSubjectId}`, {
        method: 'PUT',
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
      const res = await fetchWithAuth('/api/periods');
      const data = await res.json();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching periods:", e);
      setPeriods([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetchWithAuth('/api/subjects');
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
      const res = await fetchWithAuth('/api/dashboard');
      const data = await res.json();
      const dashboardArray = Array.isArray(data) ? data : [];
      setDashboardData(dashboardArray);
    } catch (e) {
      console.error("Error fetching dashboard:", e);
      setDashboardData([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/users');
      if (res.status === 501) {
        // Service role key missing
        setUsersList([]);
        return;
      }
      const data = await res.json();
      setUsersList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching users:", e);
    }
  };

  // --- Financial Module Functions ---

  const fetchFinancialData = useCallback(async () => {
    try {
      const query = `?month=${finFilter.month}&year=${finFilter.year}`;
      const [catRes, accRes, transRes, dashRes] = await Promise.all([
        fetchWithAuth('/api/finance/categories'),
        fetchWithAuth('/api/finance/accounts'),
        fetchWithAuth('/api/finance/transactions'),
        fetchWithAuth(`/api/finance/dashboard${query}`)
      ]);
      
      const cats = await catRes.json();
      const accs = await accRes.json();
      const trans = await transRes.json();
      const dash = await dashRes.json();

      setFinCategories(Array.isArray(cats) ? cats : []);
      setFinAccounts(Array.isArray(accs) ? accs : []);
      setFinTransactions(Array.isArray(trans) ? trans : []);
      setFinDashboard(dash);
    } catch (e) {
      console.error("Error fetching financial data:", e);
    }
  }, [fetchWithAuth, finFilter]);

  const fetchResponsibles = async () => {
    try {
      const res = await fetchWithAuth('/api/finance/responsibles');
      if (res.ok) {
        const data = await res.json();
        setFinResponsibles(data);
      }
    } catch (error) {
      console.error('Error fetching responsibles:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetchWithAuth('/api/clients');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  };

  const fetchClientSales = async () => {
    try {
      const res = await fetchWithAuth('/api/client-sales');
      const data = await res.json();
      setClientSales(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching client sales:", e);
    }
  };

  const fetchClientInstallments = async () => {
    try {
      const query = `?month=${finFilter.month}&year=${finFilter.year}`;
      const res = await fetchWithAuth(`/api/client-installments${query}`);
      const data = await res.json();
      setClientInstallments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching client installments:", e);
    }
  };

  useEffect(() => {
    if (activeModule === 'financial') {
      fetchFinancialData();
      fetchResponsibles();
      fetchClients();
      fetchClientSales();
      fetchClientInstallments();
    }
  }, [activeModule, activeTab, fetchFinancialData, finFilter]);

  const handleSaveFinCategory = async () => {
    try {
      if (editingFinCategory) {
        await fetchWithAuth(`/api/finance/categories/${editingFinCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(finCategoryForm)
        });
      } else {
        await fetchWithAuth('/api/finance/categories', {
          method: 'POST',
          body: JSON.stringify(finCategoryForm)
        });
      }
      setFinCategoryForm({ name: '', type: 'despesa' });
      setEditingFinCategory(null);
      fetchFinancialData();
    } catch (e) {
      console.error("Error saving category:", e);
    }
  };

  const handleDeleteFinCategory = async (id: number) => {
    if (!confirm('Tem certeza?')) return;
    await fetchWithAuth(`/api/finance/categories/${id}`, { method: 'DELETE' });
    fetchFinancialData();
  };

  const handleSaveFinAccount = async () => {
    try {
      const payload = {
        ...finAccountForm,
        initial_balance: Number(finAccountForm.initial_balance),
        closing_day: finAccountForm.closing_day ? Number(finAccountForm.closing_day) : null,
        due_day: finAccountForm.due_day ? Number(finAccountForm.due_day) : null
      };

      if (editingFinAccount) {
        await fetchWithAuth(`/api/finance/accounts/${editingFinAccount.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchWithAuth('/api/finance/accounts', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setFinAccountForm({ name: '', initial_balance: '', type: 'corrente', closing_day: '', due_day: '' });
      setEditingFinAccount(null);
      fetchFinancialData();
    } catch (e) {
      console.error("Error saving account:", e);
    }
  };

  const handleDeleteFinAccount = async (id: number) => {
    if (!confirm('Tem certeza?')) return;
    await fetchWithAuth(`/api/finance/accounts/${id}`, { method: 'DELETE' });
    fetchFinancialData();
  };

  const handleSaveFinTransaction = async () => {
    try {
      if (editingFinTransaction) {
        await fetchWithAuth(`/api/finance/transactions/${editingFinTransaction.id}`, {
          method: 'PUT',
          body: JSON.stringify(finTransactionForm)
        });
      } else {
        await fetchWithAuth('/api/finance/transactions', {
          method: 'POST',
          body: JSON.stringify(finTransactionForm)
        });
      }
      setFinTransactionForm({ 
        description: '', 
        amount: '', 
        type: 'despesa', 
        category_id: '', 
        account_id: '', 
        date: new Date().toISOString().split('T')[0], 
        status: 'pago',
        is_installment: false,
        total_installments: '1',
        splits: []
      });
      setEditingFinTransaction(null);
      fetchFinancialData();
    } catch (e) {
      console.error("Error saving transaction:", e);
    }
  };

  const handleDeleteFinTransaction = async (id: number) => {
    if (!confirm('Tem certeza?')) return;
    await fetchWithAuth(`/api/finance/transactions/${id}`, { method: 'DELETE' });
    fetchFinancialData();
  };

  useEffect(() => {
    if (activeModule === 'financial') {
      fetchFinancialData();
    }
  }, [activeModule]);

  useEffect(() => {
    fetchPeriods();
    fetchSubjects();
    fetchDashboard();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      const loadData = async () => {
        const [attRes, actRes, webRes] = await Promise.all([
          fetchWithAuth(`/api/attendance/${selectedSubjectId}`),
          fetchWithAuth(`/api/activities/${selectedSubjectId}`),
          fetchWithAuth(`/api/web_contents/${selectedSubjectId}`)
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
    
    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(subjectForm)
      });
      
      if (res.ok) {
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
      } else {
        const err = await res.json();
        alert(`Erro ao salvar matéria: ${err.error || err.message || 'Erro desconhecido'}`);
      }
    } catch (e) {
      alert("Erro de conexão ao salvar matéria.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePeriod = async () => {
    if (!periodForm.name) return;
    
    setLoading(true);
    const method = editingPeriod ? 'PUT' : 'POST';
    const url = editingPeriod ? `/api/periods/${editingPeriod.id}` : '/api/periods';
    
    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(periodForm)
      });
      
      if (res.ok) {
        setPeriodForm({ name: '' });
        setEditingPeriod(null);
        fetchPeriods();
      } else {
        const err = await res.json();
        alert(`Erro ao salvar período: ${err.error || err.message || 'Erro desconhecido'}`);
      }
    } catch (e) {
      alert("Erro de conexão ao salvar período.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePeriod = async (id: number) => {
    if (confirm('Deseja realmente excluir este período? Isso pode afetar matérias vinculadas.')) {
      try {
        const res = await fetchWithAuth(`/api/periods/${id}`, { method: 'DELETE' });
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
        const res = await fetchWithAuth(`/api/subjects/${id}`, { method: 'DELETE' });
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
      const res = await fetchWithAuth(`/api/${type}/${selectedSubjectId}`, {
        method: 'PUT',
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

  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (dashboardData.length > 0) {
      const newNotifications: any[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      dashboardData.forEach(item => {
        const deadlines = [
          { label: 'Atividade 1', date: item.act1_deadline, status: item.act1_status },
          { label: 'Atividade 2', date: item.act2_deadline, status: item.act2_status },
          { label: 'Prova', date: item.exam_date, status: null }
        ];

        deadlines.forEach(d => {
          if (d.date && d.status !== 'Concluída') {
            const [year, month, day] = d.date.split('T')[0].split('-').map(Number);
            const deadlineDate = new Date(year, month - 1, day);
            deadlineDate.setHours(0, 0, 0, 0);
            
            const diffTime = deadlineDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 7) {
              newNotifications.push({
                id: `${item.id}-${d.label}`,
                title: `Prazo Próximo: ${d.label}`,
                message: `A matéria ${item.subject_name} tem ${d.label} vencendo em ${diffDays === 0 ? 'hoje' : diffDays + ' dias'}.`,
                type: diffDays <= 2 ? 'danger' : 'warning',
                date: d.date
              });
            } else if (diffDays < 0) {
               newNotifications.push({
                id: `${item.id}-${d.label}-late`,
                title: `Prazo Expirado: ${d.label}`,
                message: `A matéria ${item.subject_name} teve ${d.label} vencida em ${formatDateString(d.date)}.`,
                type: 'danger',
                date: d.date
              });
            }
          }
        });
      });
      setNotifications(newNotifications);
    }
  }, [dashboardData]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={cn("p-1.5 md:p-2 rounded-xl text-white transition-colors shadow-sm", activeModule === 'academic' ? "bg-indigo-600" : "bg-emerald-600")}>
                {activeModule === 'academic' ? <GraduationCap size={20} className="md:w-6 md:h-6" /> : <Wallet size={20} className="md:w-6 md:h-6" />}
              </div>
              <div>
                <h1 className="font-bold text-lg md:text-xl leading-tight text-gray-900 tracking-tight">OrganizaAI</h1>
                <p className="text-[9px] md:text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  {activeModule === 'academic' ? 'Acadêmico' : 'Financeiro'}
                </p>
              </div>
            </div>

            <div className="hidden md:flex bg-gray-100 p-1 rounded-lg items-center border border-gray-200">
              <button 
                onClick={() => { setActiveModule('academic'); setActiveTab('dashboard'); }}
                className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeModule === 'academic' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700")}
              >
                Acadêmico
              </button>
              <button 
                onClick={() => { setActiveModule('financial'); setActiveTab('fin_dashboard'); }}
                className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeModule === 'financial' ? "bg-white text-emerald-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700")}
              >
                Financeiro
              </button>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            {/* Mobile Module Switcher */}
            <div className="md:hidden flex bg-gray-100 p-1 rounded-lg items-center border border-gray-200">
              <button 
                onClick={() => { setActiveModule('academic'); setActiveTab('dashboard'); }}
                className={cn("p-2 rounded-md transition-all", activeModule === 'academic' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500")}
              >
                <GraduationCap size={18} />
              </button>
              <button 
                onClick={() => { setActiveModule('financial'); setActiveTab('fin_dashboard'); }}
                className={cn("p-2 rounded-md transition-all", activeModule === 'financial' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500")}
              >
                <Wallet size={18} />
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="p-2 text-gray-500 hover:text-indigo-600 transition-colors relative"
                title="Notificações"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800 text-sm">Notificações</h3>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{notifications.length}</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                          <CheckCircle2 size={24} className="mx-auto mb-2 opacity-50" />
                          <p>Tudo em dia!</p>
                        </div>
                      ) : (
                        notifications.map((notif, i) => (
                          <div key={i} className={cn("p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors", notif.type === 'danger' ? 'bg-red-50/30' : '')}>
                            <div className="flex gap-3">
                              <div className={cn("mt-1 w-2 h-2 rounded-full shrink-0", notif.type === 'danger' ? 'bg-red-500' : 'bg-amber-500')} />
                              <div>
                                <h4 className={cn("text-xs font-bold mb-1", notif.type === 'danger' ? 'text-red-700' : 'text-amber-700')}>{notif.title}</h4>
                                <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">{formatDateString(notif.date)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={exportPDF} className="p-2 text-gray-500 hover:text-indigo-600 transition-colors" title="Exportar PDF">
              <Download size={20} />
            </button>
            <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Sair">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
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
                      
                      // Parse YYYY-MM-DD manually to ensure local time midnight
                      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
                      const deadline = new Date(year, month - 1, day);
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
                          { label: 'Atividade Virtual 1', date: item.act1_deadline, start: item.act1_start },
                          { label: 'Atividade Virtual 2', date: item.act2_deadline, start: item.act2_start },
                          { label: 'Data da Prova', date: item.exam_date, start: item.exam_start }
                        ].map((d, i) => {
                          const countdown = getCountdown(d.date);
                          return (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{d.label}</p>
                              <span className={cn("px-3 py-1 rounded-full text-xs font-bold", countdown.color)}>
                                {countdown.text}
                              </span>
                              <div className="mt-3 space-y-1">
                                {d.start && (
                                  <p className="text-[10px] text-gray-500">
                                    <span className="font-semibold">Início:</span> {formatDateString(d.start)}
                                  </p>
                                )}
                                {d.date && (
                                  <p className="text-[10px] text-gray-500">
                                    <span className="font-semibold">Fim:</span> {formatDateString(d.date)}
                                  </p>
                                )}
                              </div>
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
                                
                                // Parse YYYY-MM-DD manually to ensure local time midnight
                                const [year, month, day] = d.date.split('-').map(Number);
                                const deadline = new Date(year, month - 1, day);
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
                            <p className="text-xs font-semibold text-gray-600">{formatDateString(item.act1_deadline) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ativ. 2</p>
                            <p className="text-xs font-semibold text-gray-600">{formatDateString(item.act2_deadline) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prova</p>
                            <p className="text-xs font-semibold text-gray-600">{formatDateString(item.exam_date) || '-'}</p>
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
                        fetchWithAuth(`/api/activities/${id}`).then(res => res.json()).then(data => {
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
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card title="Usuários Cadastrados" icon={Shield}>
                {usersList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum usuário encontrado ou chave de serviço não configurada.</p>
                    <p className="text-xs mt-2">Verifique a variável SUPABASE_SERVICE_ROLE_KEY no servidor.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-xl">Email</th>
                          <th className="px-4 py-3">Criado em</th>
                          <th className="px-4 py-3 rounded-tr-xl">Último Acesso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {usersList.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Nunca'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* --- Financial Module Tabs --- */}
          {activeModule === 'financial' && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-indigo-600" />
                <h2 className="font-bold text-gray-800 text-sm md:text-base">Filtro Mensal</h2>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs md:text-sm font-medium"
                  value={finFilter.month}
                  onChange={(e) => setFinFilter({ ...finFilter, month: Number(e.target.value) })}
                >
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select 
                  className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs md:text-sm font-medium"
                  value={finFilter.year}
                  onChange={(e) => setFinFilter({ ...finFilter, year: Number(e.target.value) })}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'fin_dashboard' && (
            <motion.div key="fin_dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Wallet className="text-indigo-600 md:w-6 md:h-6" size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo (Mês)</span>
                  </div>
                  <h3 className={cn("text-xl md:text-2xl font-bold", ((finDashboard?.month_income || 0) - (finDashboard?.month_expense || 0)) < 0 ? "text-red-600" : "text-gray-900")}>
                    R$ {((finDashboard?.month_income || 0) - (finDashboard?.month_expense || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[9px] text-gray-400 mt-1">Receita - Despesa</p>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <TrendingUp className="text-emerald-600 md:w-6 md:h-6" size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Receitas (Mês)</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-emerald-600">
                    R$ {(finDashboard?.month_income || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <TrendingDown className="text-red-600 md:w-6 md:h-6" size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Despesas (Mês)</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-red-600">
                    R$ {(finDashboard?.month_expense || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>

              {/* Alerts */}
              {(finDashboard?.month_expense > finDashboard?.month_income) && (
                <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-800 text-sm font-medium">
                  <AlertTriangle size={20} />
                  Atenção: Suas despesas superam as receitas deste mês!
                </div>
              )}
              
              {/* Accounts Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Responsabilidade (Mês)" icon={Users}>
                  <div className="space-y-4">
                    {finDashboard?.responsibility_summary && Object.entries(finDashboard.responsibility_summary).length > 0 ? (
                      Object.entries(finDashboard.responsibility_summary).map(([name, amount]: [string, any]) => (
                        <div key={name} className="flex justify-between items-center p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-gray-700">{name}</span>
                          </div>
                          <span className="font-bold text-indigo-600">
                            R$ {Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Users size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Nenhuma divisão definida para este mês.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}



          {activeTab === 'fin_credit' && (
            <motion.div key="fin_credit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card title="Gestão de Crédito" icon={CreditCard}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Cartão</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={selectedCreditCardId}
                    onChange={(e) => setSelectedCreditCardId(e.target.value)}
                  >
                    <option value="">Selecione um cartão ou conta...</option>
                    {finAccounts.filter(a => a.type === 'credito' || a.type === 'corrente').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.type === 'credito' ? 'Crédito' : 'Corrente'})</option>
                    ))}
                  </select>
                </div>

                {selectedCreditCardId && (
                  <>
                    {(() => {
                      const card = finAccounts.find(a => a.id === Number(selectedCreditCardId));
                      const isCreditCard = card?.type === 'credito';
                      
                      const currentMonth = finFilter.month;
                      const currentYear = finFilter.year;
                      
                      let invoiceStart: Date;
                      let invoiceEnd: Date;
                      let dueDayDisplay: string | number = '--';

                      if (isCreditCard) {
                        const closingDay = card?.closing_day || 1;
                        const dueDay = card?.due_day || 10;
                        dueDayDisplay = dueDay;
                        
                        // Invoice logic:
                        // "a fatura fechou em 09 fevereiro e vai até 09 de março. a fatura vence dia 16/03 e é referente a fevereiro."
                        // This means the invoice for March (due in March) covers Feb 10 to Mar 09.
                        // So if currentMonth is March (2), the period is Feb 10 to Mar 09.
                        
                        // End Date: Closing Day of the CURRENT selected month
                        invoiceEnd = new Date(currentYear, currentMonth, closingDay);
                        
                        // Start Date: Closing Day of PREVIOUS month + 1 day
                        // Note: currentMonth is 0-indexed (0=Jan, 1=Feb, 2=Mar)
                        // new Date(year, month - 1, ...) handles year rollover automatically
                        invoiceStart = new Date(currentYear, currentMonth - 1, closingDay + 1);
                        
                      } else {
                        // Checking Account: Calendar Month
                        invoiceStart = new Date(currentYear, currentMonth, 1);
                        invoiceEnd = new Date(currentYear, currentMonth + 1, 0); // Last day of month
                        dueDayDisplay = 'N/A';
                      }

                      // Extract unique people from transactions for the filter
                      const peopleMap = new Map<string, string>();
                      finTransactions.forEach(t => {
                        if (Array.isArray(t.splits)) {
                          t.splits.forEach((s: any) => {
                            if (s.name && s.name.trim()) {
                              const trimmedName = s.name.trim();
                              if (!peopleMap.has(trimmedName.toLowerCase())) {
                                peopleMap.set(trimmedName.toLowerCase(), trimmedName);
                              }
                            }
                          });
                        }
                      });
                      const availablePeople = Array.from(peopleMap.values()).sort();

                      const invoiceItems = finTransactions.filter(t => {
                        if (t.account_id !== Number(selectedCreditCardId)) return false;
                        
                        // Only show installments in this view
                        if (!t.is_installment) return false;

                        // Parse YYYY-MM-DD
                        const [y, m, d] = t.date.split('-').map(Number);
                        const tDate = new Date(y, m - 1, d);
                        
                        // Compare dates
                        // Period: Day AFTER previous closing -> Current closing
                        const isInPeriod = tDate >= invoiceStart && tDate <= invoiceEnd;
                        if (!isInPeriod) return false;

                        // Filter by person
                        if (selectedPersonFilter !== 'all') {
                           // Check if the person is in the splits
                           const hasPerson = t.splits?.some(s => s.name.toLowerCase() === selectedPersonFilter.toLowerCase());
                           if (!hasPerson) return false;
                        }
                        
                        return true;
                      });

                      const totalInvoice = invoiceItems.reduce((sum, t) => sum + Number(t.amount), 0);
                      const totalPaid = invoiceItems.filter(t => t.status === 'pago').reduce((sum, t) => sum + Number(t.amount), 0);
                      const totalPending = totalInvoice - totalPaid;

                      return (
                        <div className="space-y-6">
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex flex-col gap-1">
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Período da Fatura</p>
                                <p className="text-base md:text-lg font-bold text-indigo-900">
                                  {invoiceStart.toLocaleDateString()} até {invoiceEnd.toLocaleDateString()}
                                </p>
                                <p className="text-[10px] text-indigo-500 font-medium">
                                  Vencimento: {new Date(currentYear, currentMonth, Number(dueDayDisplay)).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                <button
                                  onClick={() => {
                                    const doc = new jsPDF();
                                    doc.text(`Relatório de Parcelas - ${card?.name}`, 14, 15);
                                    doc.setFontSize(10);
                                    doc.text(`Período: ${invoiceStart.toLocaleDateString()} a ${invoiceEnd.toLocaleDateString()}`, 14, 22);
                                    doc.text(`Vencimento: ${new Date(currentYear, currentMonth, Number(dueDayDisplay)).toLocaleDateString()}`, 14, 28);
                                    
                                    let currentY = 40;

                                    // Helper to add a table for a set of items with a title
                                    const addTable = (title: string, items: any[]) => {
                                      if (items.length === 0) return;
                                      
                                      if (currentY > 250) {
                                        doc.addPage();
                                        currentY = 20;
                                      }

                                      doc.setFontSize(12);
                                      doc.text(title, 14, currentY);
                                      currentY += 5;

                                      autoTable(doc, {
                                        startY: currentY,
                                        head: [['Data', 'Descrição', 'Parcela', 'Valor', 'Vencimento', 'Status']],
                                        body: items.map(i => [
                                          new Date(i.date).toLocaleDateString(),
                                          i.description,
                                          i.installment,
                                          `R$ ${i.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                          `Dia ${i.dueDay}`,
                                          i.status === 'pago' ? 'Paga' : 'Pendente'
                                        ]),
                                        foot: [['', '', '', 'Total', `R$ ${items.reduce((acc: any, i: any) => acc + i.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']],
                                        styles: { fontSize: 8 },
                                        headStyles: { fillColor: [41, 128, 185] },
                                        footStyles: { fillColor: [41, 128, 185] },
                                        didDrawCell: (data) => {
                                          if (data.section === 'body' && items[data.row.index].status === 'pago') {
                                            const { x, y, width, height } = data.cell;
                                            const lineY = y + height / 2;
                                            doc.setDrawColor(150, 150, 150);
                                            doc.setLineWidth(0.1);
                                            doc.line(x, lineY, x + width, lineY);
                                          }
                                        }
                                      });
                                      
                                      currentY = (doc as any).lastAutoTable.finalY + 15;
                                    };

                                    const tablesData: Record<string, any[]> = {};
                                    const generalItems: any[] = [];

                                    invoiceItems.forEach(t => {
                                        const hasSplits = Array.isArray(t.splits) && t.splits.length > 0;
                                        
                                        if (hasSplits) {
                                            t.splits.forEach((s: any) => {
                                                if (s.name && s.name.trim()) {
                                                    const personName = s.name.trim();
                                                    // Find the display name from availablePeople to keep casing consistent
                                                    const displayName = availablePeople.find(p => p.toLowerCase() === personName.toLowerCase()) || personName;
                                                    
                                                    if (!tablesData[displayName]) tablesData[displayName] = [];
                                                    tablesData[displayName].push({
                                                        date: t.date,
                                                        description: t.description,
                                                        installment: `${t.installment_number}/${t.total_installments}`,
                                                        amount: Number(s.amount),
                                                        dueDay: dueDayDisplay,
                                                        status: t.status
                                                    });
                                                }
                                            });
                                        } else {
                                            generalItems.push({
                                                date: t.date,
                                                description: t.description,
                                                installment: `${t.installment_number}/${t.total_installments}`,
                                                amount: Number(t.amount),
                                                dueDay: dueDayDisplay,
                                                status: t.status
                                            });
                                        }
                                    });

                                    if (selectedPersonFilter === 'all') {
                                        // 1. Add tables for each person found in this invoice
                                        Object.keys(tablesData).sort().forEach(person => {
                                            addTable(person, tablesData[person]);
                                        });

                                        // 2. Add general table
                                        if (generalItems.length > 0) {
                                            addTable('Geral / Sem Divisão', generalItems);
                                        }

                                    } else {
                                        // Specific person filter
                                        const personItems = tablesData[availablePeople.find(p => p.toLowerCase() === selectedPersonFilter.toLowerCase()) || ''] || [];
                                        addTable(selectedPersonFilter, personItems);
                                    }
                                    
                                    doc.save(`fatura_${card?.name}_${finFilter.month + 1}_${finFilter.year}.pdf`);
                                  }}
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold text-[10px] uppercase transition-colors"
                                >
                                  <Download size={14} />
                                  PDF
                                </button>
                                
                                <select
                                  value={selectedPersonFilter}
                                  onChange={(e) => setSelectedPersonFilter(e.target.value)}
                                  className="flex-1 md:flex-none px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold text-[10px] uppercase transition-colors focus:outline-none"
                                >
                                  <option value="all">Todos</option>
                                  {availablePeople.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:gap-4 pt-4 border-t border-indigo-100">
                              <div className="text-center md:text-left">
                                <p className="text-[9px] md:text-xs text-gray-500 uppercase font-bold">Total</p>
                                <p className="text-sm md:text-xl font-bold text-gray-900 truncate">R$ {totalInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div className="text-center md:text-left">
                                <p className="text-[9px] md:text-xs text-emerald-600 uppercase font-bold">Pago</p>
                                <p className="text-sm md:text-xl font-bold text-emerald-600 truncate">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div className="text-center md:text-left">
                                <p className="text-[9px] md:text-xs text-red-600 uppercase font-bold">Pendente</p>
                                <p className="text-sm md:text-xl font-bold text-red-600 truncate">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {invoiceItems.length === 0 ? (
                              <p className="text-center text-gray-500 py-8">Nenhuma compra nesta fatura.</p>
                            ) : (
                              invoiceItems.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg", t.type === 'receita' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                                      {t.type === 'receita' ? <TrendingUp size={18} /> : <ShoppingCart size={18} />}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{t.description}</p>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{new Date(t.date).toLocaleDateString()}</span>
                                        {t.is_installment && (
                                          <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                            {t.installment_number}/{t.total_installments}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className={cn("font-bold", t.type === 'receita' ? "text-emerald-600" : "text-red-600")}>
                                      {t.type === 'despesa' ? '-' : '+'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <button
                                      onClick={async () => {
                                        const newStatus = t.status === 'pago' ? 'pendente' : 'pago';
                                        // Optimistic update
                                        const updatedTransactions = finTransactions.map(tr => tr.id === t.id ? { ...tr, status: newStatus } : tr);
                                        setFinTransactions(updatedTransactions);
                                        
                                        await fetchWithAuth(`/api/finance/transactions/${t.id}`, {
                                          method: 'PUT',
                                          body: JSON.stringify({ status: newStatus })
                                        });
                                        fetchFinancialData(); 
                                      }}
                                      className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-semibold transition-colors border",
                                        t.status === 'pago' 
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" 
                                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                                      )}
                                    >
                                      {t.status === 'pago' ? 'Pago' : 'Pendente'}
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteFinTransaction(t.id)}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Excluir lançamento"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === 'fin_transactions' && (
            <motion.div key="fin_transactions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card title="Novo Lançamento" icon={Plus}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Descrição" 
                    value={finTransactionForm.description} 
                    onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, description: e.target.value })} 
                  />
                  <Input 
                    label="Valor" 
                    type="number" 
                    value={finTransactionForm.amount} 
                    onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, amount: e.target.value })} 
                  />
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
                    <select
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={finTransactionForm.type}
                      onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, type: e.target.value })}
                    >
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Categoria</label>
                    <select
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={finTransactionForm.category_id}
                      onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, category_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {finCategories.filter(c => c.type === finTransactionForm.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Conta</label>
                    <select
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={finTransactionForm.account_id}
                      onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, account_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {finAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <Input 
                    label="Data" 
                    type="date" 
                    value={finTransactionForm.date} 
                    onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, date: e.target.value })} 
                  />
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                    <select
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={finTransactionForm.status}
                      onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, status: e.target.value })}
                    >
                      <option value="pago">Pago / Recebido</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>
                </div>

                {/* Installment Options */}
                <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <input 
                      type="checkbox" 
                      id="is_installment"
                      checked={finTransactionForm.is_installment}
                      onChange={(e) => setFinTransactionForm({ ...finTransactionForm, is_installment: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="is_installment" className="text-sm font-semibold text-gray-700">Compra Parcelada</label>
                  </div>
                  
                  {finTransactionForm.is_installment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        label="Número de Parcelas" 
                        type="number" 
                        min="2"
                        value={finTransactionForm.total_installments} 
                        onChange={(e: any) => setFinTransactionForm({ ...finTransactionForm, total_installments: e.target.value })} 
                      />
                      <p className="text-xs text-gray-500 mt-6 italic">
                        * Serão criados {finTransactionForm.total_installments} lançamentos mensais automáticos.
                      </p>
                    </div>
                  )}
                </div>

                {/* Split Responsibility */}
                <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-indigo-600" />
                      <h4 className="text-sm font-bold text-gray-800">Divisão de Responsabilidade</h4>
                    </div>
                    <button 
                      onClick={() => {
                        const newSplits = [...finTransactionForm.splits, { name: '', amount: 0 }];
                        setFinTransactionForm({ ...finTransactionForm, splits: newSplits });
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Plus size={14} /> Adicionar Pessoa
                    </button>
                  </div>

                  <div className="space-y-3">
                    {finTransactionForm.splits.map((split, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Responsável</label>
                          <select
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={split.name}
                            onChange={async (e) => {
                              if (e.target.value === 'ADD_NEW') {
                                const name = prompt('Nome do novo responsável:');
                                if (name && name.trim()) {
                                  try {
                                    const res = await fetchWithAuth('/api/finance/responsibles', {
                                      method: 'POST',
                                      body: JSON.stringify({ name: name.trim() })
                                    });
                                    if (res.ok) {
                                      await fetchResponsibles();
                                      const newSplits = [...finTransactionForm.splits];
                                      newSplits[index].name = name.trim();
                                      setFinTransactionForm({ ...finTransactionForm, splits: newSplits });
                                    } else {
                                      const err = await res.json();
                                      alert(err.message || 'Erro ao adicionar responsável');
                                    }
                                  } catch (error) {
                                    console.error('Error adding responsible:', error);
                                    alert('Erro de conexão ao adicionar responsável');
                                  }
                                }
                              } else {
                                const newSplits = [...finTransactionForm.splits];
                                newSplits[index].name = e.target.value;
                                setFinTransactionForm({ ...finTransactionForm, splits: newSplits });
                              }
                            }}
                          >
                            <option value="">Selecione...</option>
                            {finResponsibles.map(r => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                            <option value="ADD_NEW" className="font-bold text-indigo-600">+ Adicionar Novo...</option>
                          </select>
                        </div>
                        <div className="w-32">
                          <Input 
                            label="Valor" 
                            type="number"
                            value={split.amount}
                            onChange={(e: any) => {
                              const newSplits = [...finTransactionForm.splits];
                              newSplits[index].amount = Number(e.target.value);
                              setFinTransactionForm({ ...finTransactionForm, splits: newSplits });
                            }}
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newSplits = finTransactionForm.splits.filter((_, i) => i !== index);
                            setFinTransactionForm({ ...finTransactionForm, splits: newSplits });
                          }}
                          className="mb-4 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {finTransactionForm.splits.length > 0 && (
                      <div className="pt-2 border-t border-indigo-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Dividido:</span>
                        <span className={cn("font-bold", 
                          finTransactionForm.splits.reduce((sum, s) => sum + s.amount, 0) === Number(finTransactionForm.amount) 
                            ? "text-emerald-600" 
                            : "text-amber-600"
                        )}>
                          R$ {finTransactionForm.splits.reduce((sum, s) => sum + s.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleSaveFinTransaction}
                  disabled={!finTransactionForm.description || !finTransactionForm.amount || !finTransactionForm.category_id || !finTransactionForm.account_id}
                  className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingFinTransaction ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
                </button>
              </Card>

              <div className="space-y-4">
                {finTransactions
                  .filter(t => {
                    const [year, month] = t.date.split('-');
                    return Number(year) === finFilter.year && Number(month) - 1 === finFilter.month;
                  })
                  .map(t => {
                  const isExpanded = expandedTransactions.has(t.id);
                  const isLongDescription = t.description.length > 40;
                  const displayDescription = isExpanded || !isLongDescription ? t.description : `${t.description.substring(0, 40)}...`;

                  return (
                    <div key={t.id} className={cn("bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3 group transition-all", t.status === 'pendente' ? 'opacity-70' : '')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn("p-3 rounded-xl shrink-0", t.type === 'receita' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                            {t.type === 'receita' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 
                                className={cn("font-bold text-gray-800 cursor-pointer", isLongDescription ? "hover:text-indigo-600" : "")}
                                onClick={() => isLongDescription && toggleTransaction(t.id)}
                              >
                                {displayDescription}
                              </h4>
                              {isLongDescription && (
                                <button 
                                  onClick={() => toggleTransaction(t.id)}
                                  className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors"
                                >
                                  {isExpanded ? 'Ver menos' : 'Ver mais'}
                                </button>
                              )}
                              {t.is_installment && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                  Parcela {t.installment_number}/{t.total_installments}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDateString(t.date)} • {finCategories.find(c => c.id === t.category_id)?.name} • {finAccounts.find(a => a.id === t.account_id)?.name}
                            </p>
                            {t.splits && t.splits.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {t.splits.map((s, idx) => (
                                  <span key={idx} className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {s.name}: R$ {Number(s.amount).toFixed(2)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {t.status === 'pendente' && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1 inline-block">Pendente</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className={cn("font-bold", t.type === 'receita' ? "text-emerald-600" : "text-red-600")}>
                            {t.type === 'receita' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="flex gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { 
                                setEditingFinTransaction(t); 
                                setFinTransactionForm({ 
                                  description: t.description, 
                                  amount: t.amount.toString(), 
                                  type: t.type, 
                                  category_id: t.category_id.toString(), 
                                  account_id: t.account_id.toString(), 
                                  date: t.date, 
                                  status: t.status,
                                  is_installment: t.is_installment || false,
                                  total_installments: (t.total_installments || 1).toString(),
                                  splits: t.splits || []
                                }); 
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteFinTransaction(t.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'fin_clients' && (
            <motion.div key="fin_clients" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              
              {/* Clients Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Wallet className="text-indigo-600 w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">A Receber (Mês)</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    R$ {clientInstallments.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <TrendingUp className="text-emerald-600 w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recebido (Mês)</span>
                  </div>
                  <h3 className="text-xl font-bold text-emerald-600">
                    R$ {clientInstallments.filter(i => i.status === 'pago').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Clock className="text-amber-600 w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pendente (Mês)</span>
                  </div>
                  <h3 className="text-xl font-bold text-amber-600">
                    R$ {clientInstallments.filter(i => i.status === 'pendente').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Client Management & New Sale */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Add Client */}
                  <Card title="Novo Cliente" icon={UserPlus}>
                    <div className="space-y-4">
                      <Input 
                        label="Nome" 
                        value={clientForm.name} 
                        onChange={(e: any) => setClientForm({ ...clientForm, name: e.target.value })} 
                      />
                      <Input 
                        label="Telefone (Obrigatório)" 
                        value={clientForm.phone} 
                        onChange={(e: any) => setClientForm({ ...clientForm, phone: e.target.value })} 
                      />
                      <button 
                        onClick={async () => {
                          if (!clientForm.name || !clientForm.phone) {
                            alert('Nome e Telefone são obrigatórios.');
                            return;
                          }
                          try {
                            if (editingClient) {
                              await fetchWithAuth(`/api/clients/${editingClient.id}`, {
                                method: 'PUT',
                                body: JSON.stringify(clientForm)
                              });
                            } else {
                              await fetchWithAuth('/api/clients', {
                                method: 'POST',
                                body: JSON.stringify(clientForm)
                              });
                            }
                            setClientForm({ name: '', phone: '' });
                            setEditingClient(null);
                            fetchClients();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        {editingClient ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
                      </button>
                    </div>
                  </Card>

                  {/* Client List */}
                  <Card title="Meus Clientes" icon={Users}>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {clients.map(client => (
                        <div key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                          <div>
                            <span className="font-bold text-gray-800 block">{client.name}</span>
                            {client.phone && <span className="text-xs text-gray-500">{client.phone}</span>}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {
                              setEditingClient(client);
                              setClientForm({ name: client.name, phone: client.phone || '' });
                            }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                            <button onClick={async () => {
                              if (confirm('Excluir cliente?')) {
                                await fetchWithAuth(`/api/clients/${client.id}`, { method: 'DELETE' });
                                fetchClients();
                              }
                            }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* New Sale Form */}
                  <Card title="Nova Venda Parcelada" icon={ShoppingBag}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cliente</label>
                        <select
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          value={clientSaleForm.client_id}
                          onChange={(e: any) => setClientSaleForm({ ...clientSaleForm, client_id: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <Input 
                        label="Descrição da Compra" 
                        value={clientSaleForm.description} 
                        onChange={(e: any) => setClientSaleForm({ ...clientSaleForm, description: e.target.value })} 
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="Valor Total" 
                          type="number" 
                          value={clientSaleForm.total_amount} 
                          onChange={(e: any) => setClientSaleForm({ ...clientSaleForm, total_amount: e.target.value })} 
                        />
                        <Input 
                          label="Nº Parcelas" 
                          type="number" 
                          value={clientSaleForm.installment_count} 
                          onChange={(e: any) => setClientSaleForm({ ...clientSaleForm, installment_count: e.target.value })} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="Data da Compra" 
                          type="date" 
                          value={clientSaleForm.purchase_date} 
                          onChange={(e: any) => setClientSaleForm({ ...clientSaleForm, purchase_date: e.target.value })} 
                        />
                        <Input 
                          label="Dia Vencimento" 
                          type="number" 
                          value={clientSaleForm.due_day} 
                          onChange={(e: any) => setClientSaleForm({ ...clientSaleForm, due_day: e.target.value })} 
                        />
                      </div>
                      <button 
                        onClick={async () => {
                          if (!clientSaleForm.client_id || !clientSaleForm.total_amount) return;
                          try {
                            await fetchWithAuth('/api/client-sales', {
                              method: 'POST',
                              body: JSON.stringify(clientSaleForm)
                            });
                            setClientSaleForm({
                              client_id: '',
                              description: '',
                              total_amount: '',
                              installment_count: '1',
                              purchase_date: new Date().toISOString().split('T')[0],
                              due_day: '10'
                            });
                            fetchClientSales();
                            fetchClientInstallments();
                            alert('Venda registrada com sucesso!');
                          } catch (e) {
                            console.error(e);
                            alert('Erro ao registrar venda.');
                          }
                        }}
                        className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Registrar Venda
                      </button>
                    </div>
                  </Card>
                </div>

                {/* Right Column: Installments Dashboard */}
                <div className="lg:col-span-2 space-y-6">
                  <Card title={`Parcelas a Receber - ${new Date(finFilter.year, finFilter.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`} icon={Calendar}>
                    <div className="space-y-3">
                      {clientInstallments.length > 0 ? (
                        clientInstallments.map(inst => (
                          <div key={inst.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", inst.status === 'pago' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                                {inst.installment_number}x
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-800">{inst.client_sales?.clients?.name}</h4>
                                <p className="text-xs text-gray-500">{inst.client_sales?.description} • Venc: {formatDateString(inst.due_date)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block font-bold text-gray-900">R$ {Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <div className="flex justify-end gap-1 mt-1">
                                <button 
                                  onClick={async () => {
                                    const newStatus = inst.status === 'pendente' ? 'pago' : 'pendente';
                                    await fetchWithAuth(`/api/client-installments/${inst.id}`, {
                                      method: 'PUT',
                                      body: JSON.stringify({ 
                                        status: newStatus,
                                        payment_date: newStatus === 'pago' ? new Date().toISOString().split('T')[0] : null
                                      })
                                    });
                                    fetchClientInstallments();
                                  }}
                                  className={cn("text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer", inst.status === 'pago' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100")}
                                >
                                  {inst.status === 'pago' ? 'Recebido' : 'Marcar Recebido'}
                                </button>
                                {inst.status === 'pendente' && inst.client_sales?.clients?.phone && (
                                  <a
                                    href={`https://wa.me/${inst.client_sales.clients.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${inst.client_sales.clients.name}, lembrete de vencimento da parcela ${inst.installment_number} referente a ${inst.client_sales.description}. Valor: R$ ${Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Vencimento: ${formatDateString(inst.due_date)}.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-green-50 text-green-600 p-1 rounded-full hover:bg-green-100"
                                    title="Enviar lembrete no WhatsApp"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-gray-400">
                          <p>Nenhuma parcela para este mês.</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'fin_settings' && (
            <motion.div key="fin_settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-6 flex justify-end">
                <button 
                  onClick={async () => {
                    if (confirm('Deseja verificar e configurar as tabelas do banco de dados?')) {
                      try {
                        const res = await fetchWithAuth('/api/setup-finance', { method: 'POST' });
                        const data = await res.json();
                        alert(data.message);
                      } catch (e) {
                        alert('Erro ao conectar com o servidor.');
                      }
                    }
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Shield size={14} /> Verificar Banco de Dados
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categories */}
                <Card title="Categorias" icon={Layers}>
                  <div className="flex items-end gap-2 mb-6">
                    <div className="flex-1">
                      <Input 
                        label="Nome da Categoria" 
                        value={finCategoryForm.name} 
                        onChange={(e: any) => setFinCategoryForm({ ...finCategoryForm, name: e.target.value })} 
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
                      <select
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-[42px]"
                        value={finCategoryForm.type}
                        onChange={(e: any) => setFinCategoryForm({ ...finCategoryForm, type: e.target.value })}
                      >
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleSaveFinCategory}
                      disabled={!finCategoryForm.name}
                      className="h-[42px] mb-4 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {finCategories.map(c => (
                      <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", c.type === 'receita' ? "bg-emerald-500" : "bg-red-500")} />
                          <span className="font-medium text-gray-700">{c.name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingFinCategory(c); setFinCategoryForm({ name: c.name, type: c.type }); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteFinCategory(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Accounts */}
                <Card title="Contas" icon={CreditCard}>
                  <div className="grid grid-cols-1 gap-2 mb-6">
                    <Input 
                      label="Nome da Conta" 
                      value={finAccountForm.name} 
                      onChange={(e: any) => setFinAccountForm({ ...finAccountForm, name: e.target.value })} 
                    />
                    <Input 
                      label="Saldo Inicial" 
                      type="number" 
                      value={finAccountForm.initial_balance} 
                      onChange={(e: any) => setFinAccountForm({ ...finAccountForm, initial_balance: e.target.value })} 
                    />
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
                      <select
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        value={finAccountForm.type}
                        onChange={(e: any) => setFinAccountForm({ ...finAccountForm, type: e.target.value })}
                      >
                        <option value="corrente">Conta Corrente</option>
                        <option value="credito">Cartão de Crédito</option>
                        <option value="dinheiro">Dinheiro</option>
                      </select>
                    </div>

                    {finAccountForm.type === 'credito' && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <Input 
                          label="Dia Fechamento" 
                          type="number" 
                          value={finAccountForm.closing_day} 
                          onChange={(e: any) => setFinAccountForm({ ...finAccountForm, closing_day: e.target.value })} 
                        />
                        <Input 
                          label="Dia Vencimento" 
                          type="number" 
                          value={finAccountForm.due_day} 
                          onChange={(e: any) => setFinAccountForm({ ...finAccountForm, due_day: e.target.value })} 
                        />
                      </div>
                    )}

                    <button 
                      onClick={handleSaveFinAccount}
                      disabled={!finAccountForm.name}
                      className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {editingFinAccount ? 'Atualizar Conta' : 'Adicionar Conta'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {finAccounts.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                        <div>
                          <span className="font-bold text-gray-800 block">{a.name}</span>
                          <span className="text-xs text-gray-500 uppercase">{a.type} • Inicial: R$ {Number(a.initial_balance).toFixed(2)}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { 
                            setEditingFinAccount(a); 
                            setFinAccountForm({ 
                              name: a.name, 
                              initial_balance: a.initial_balance.toString(), 
                              type: a.type,
                              closing_day: a.closing_day?.toString() || '',
                              due_day: a.due_day?.toString() || ''
                            }); 
                          }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteFinAccount(a.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Responsible Manager */}
                <ResponsibleManager fetchWithAuth={fetchWithAuth} onUpdate={fetchResponsibles} />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe z-20">
        <div className="max-w-6xl mx-auto flex justify-between">
          {activeModule === 'academic' ? (
            <>
              <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dash" />
              <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={Users} label="Presença" />
              <TabButton active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={FileText} label="Notas" />
              <TabButton active={activeTab === 'web'} onClick={() => setActiveTab('web')} icon={MonitorPlay} label="Web" />
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Config" />
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Shield} label="Usuários" />
            </>
          ) : (
            <>
              <TabButton active={activeTab === 'fin_dashboard'} onClick={() => setActiveTab('fin_dashboard')} icon={LayoutDashboard} label="Dash" />
              <TabButton active={activeTab === 'fin_credit'} onClick={() => setActiveTab('fin_credit')} icon={CreditCard} label="Crédito" />
              <TabButton active={activeTab === 'fin_transactions'} onClick={() => setActiveTab('fin_transactions')} icon={ArrowRightLeft} label="Lançamentos" />
              <TabButton active={activeTab === 'fin_clients'} onClick={() => setActiveTab('fin_clients')} icon={Users} label="Clientes" />
              <TabButton active={activeTab === 'fin_settings'} onClick={() => setActiveTab('fin_settings')} icon={Settings} label="Config" />
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
