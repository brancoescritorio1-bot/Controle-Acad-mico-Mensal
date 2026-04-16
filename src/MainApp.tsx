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
  ShoppingBag,
  Zap,
  Briefcase,
  History,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Trees,
  PlusCircle,
  Check,
  Phone,
  MessageSquare,
  User,
  ListTodo,
  LayoutGrid,
  AlertCircle,
  X,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { Subject, Attendance, Activities, WebContent, DashboardData, Period, FinancialCategory, FinancialAccount, FinancialTransaction, Client, ClientSale, ClientInstallment, PersonalTask } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie } from 'recharts';

// --- Components ---

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "relative flex flex-col items-center justify-center py-3 px-1 transition-colors duration-200 flex-1 min-w-0",
      active ? "text-indigo-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
    )}
  >
    {active && (
      <motion.div
        layoutId="activeTabIndicator"
        className="absolute inset-0 bg-indigo-50/50 border-b-2 border-indigo-600"
        initial={false}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    )}
    <div className="relative z-10 flex flex-col items-center w-full">
      <motion.div
        animate={{ scale: active ? 1.1 : 1, y: active ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Icon size={18} className="mb-1" />
      </motion.div>
      <span className={cn(
        "text-[9px] md:text-[11px] font-bold uppercase tracking-tighter truncate w-full text-center transition-colors duration-200", 
        active ? "text-indigo-600" : "text-gray-400"
      )}>
        {label}
      </span>
    </div>
  </motion.button>
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

import { ChacaraManager } from './components/ChacaraManager';
import { ChacaraFinanceDashboard } from './components/ChacaraFinanceDashboard';
import { SafetyReportGenerator } from './components/SafetyReportGenerator';
import { useDialog } from './components/DialogContext';

export default function MainApp({ onLogout, session, supabaseClient }: { onLogout: () => void, session: Session | null, supabaseClient: SupabaseClient | null }) {
  const { confirm: dialogConfirm, alert: dialogAlert } = useDialog();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('all');
  const [selectedSubjectDashboardFilter, setSelectedSubjectDashboardFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);

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
  const [chacaraBills, setChacaraBills] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [settingsSubjectId, setSettingsSubjectId] = useState<string>('');

  const [settingsForm, setSettingsForm] = useState<Partial<Activities>>({});

  // Financial Module State
  const [activeModule, setActiveModule] = useState<'academic' | 'financial' | 'chacara' | 'work' | 'personal'>('academic');
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
  const [clientSearch, setClientSearch] = useState('');
  const [clientSales, setClientSales] = useState<ClientSale[]>([]);
  const [clientInstallments, setClientInstallments] = useState<ClientInstallment[]>([]);
  const [clientForm, setClientForm] = useState({ name: '', phone: '' });
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState('Olá {nome}, tudo bem?');
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  
  // Personal Tasks State
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [personalTaskForm, setPersonalTaskForm] = useState<Partial<PersonalTask>>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    status: 'pending',
    eisenhower_quadrant: 'not_urgent_not_important'
  });
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
    splits: [] as { name: string; amount: number; status?: 'pago' | 'pendente' }[]
  });
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('');
  
  const [editingFinCategory, setEditingFinCategory] = useState<FinancialCategory | null>(null);
  const [editingFinAccount, setEditingFinAccount] = useState<FinancialAccount | null>(null);
  const [editingFinTransaction, setEditingFinTransaction] = useState<FinancialTransaction | null>(null);
  const [editingClientInstallment, setEditingClientInstallment] = useState<ClientInstallment | null>(null);
  const [clientInstallmentForm, setClientInstallmentForm] = useState({
    amount: '',
    due_date: '',
    status: 'pendente' as 'pendente' | 'pago'
  });
  const [expandedTransactions, setExpandedTransactions] = useState<Set<number>>(new Set());
  const [finExtractFilter, setFinExtractFilter] = useState({
    type: 'all',
    category_id: 'all',
    account_id: 'all',
    status: 'all',
    responsible: 'all',
    search: '',
    showAllMonths: false,
    sortBy: 'id'
  });
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<any>(null);

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
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (e) {
      dialogAlert("Erro de conexão ao salvar.");
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetchWithAuth('/api/periods');
      if (res.ok) {
        const data = await res.json();
        setPeriods(Array.isArray(data) ? data : []);
      } else {
        console.error("Error in fetchPeriods:", res.status, await res.text().catch(()=>''));
        setPeriods([]);
      }
    } catch (e) {
      console.error("Error fetching in fetchPeriods:", e);
      setPeriods([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetchWithAuth('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      } else {
        console.error("Error in fetchSubjects:", res.status, await res.text().catch(()=>''));
        setSubjects([]);
      }
    } catch (e) {
      console.error("Error fetching in fetchSubjects:", e);
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
      if (res.ok) {
        const data = await res.json();
        const dashboardArray = Array.isArray(data) ? data : [];
        setDashboardData(dashboardArray);
      } else {
        console.error("Error in fetchDashboard:", res.status, await res.text().catch(()=>''));
        setDashboardData([]);
      }
    } catch (e) {
      console.error("Error fetching dashboard:", e);
      setDashboardData([]);
    }
  };

  const fetchChacaraBills = async () => {
    try {
      const res = await fetchWithAuth('/api/chacara/bills');
      if (res.ok) {
        const data = await res.json();
        setChacaraBills(Array.isArray(data) ? data : []);
      } else {
        console.error("Error in fetchChacaraBills:", res.status, await res.text().catch(()=>''));
        setChacaraBills([]);
      }
    } catch (e) {
      console.error("Error fetching in fetchChacaraBills:", e);
      setChacaraBills([]);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersError(null);
      const res = await fetchWithAuth('/api/users');
      if (res.status === 501) {
        // Service role key missing
        const errorData = await res.json().catch(() => ({}));
        setUsersError(errorData.error || "Service role key not configured on server.");
        setUsersList([]);
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setUsersError(errorData.error || `Error ${res.status}: Failed to fetch users`);
        setUsersList([]);
        return;
      }
      const data = await res.json();
      setUsersList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Error fetching users:", e);
      setUsersError(e.message || "Network error fetching users");
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
      
      let cats = [], accs = [], trans = [], dash = null;

      if (catRes.ok) cats = await catRes.json();
      if (accRes.ok) accs = await accRes.json();
      if (transRes.ok) trans = await transRes.json();
      if (dashRes.ok) dash = await dashRes.json();

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

  const fetchPersonalTasks = async () => {
    try {
      const res = await fetchWithAuth('/api/personal/tasks');
      if (res.ok) {
        const data = await res.json();
        setPersonalTasks(Array.isArray(data) ? data : []);
      } else {
        console.error("Error in fetchPersonalTasks:", res.status, await res.text().catch(()=>''));
        setPersonalTasks([]);
      }
    } catch (e) {
      console.error("Error fetching personal tasks:", e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetchWithAuth('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      } else {
        console.error("Error in fetchClients:", res.status, await res.text().catch(()=>''));
        setClients([]);
      }
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  };

  const fetchClientSales = async () => {
    try {
      const res = await fetchWithAuth('/api/client-sales');
      if (res.ok) {
        const data = await res.json();
        setClientSales(Array.isArray(data) ? data : []);
      } else {
        console.error("Error in fetchClientSales:", res.status, await res.text().catch(()=>''));
        setClientSales([]);
      }
    } catch (e) {
      console.error("Error fetching client sales:", e);
    }
  };

  const fetchClientInstallments = async () => {
    try {
      const query = `?month=${finFilter.month}&year=${finFilter.year}`;
      const res = await fetchWithAuth(`/api/client-installments${query}`);
      if (res.ok) {
        const data = await res.json();
        setClientInstallments(Array.isArray(data) ? data : []);
      } else {
        console.error("Error in fetchClientInstallments:", res.status, await res.text().catch(()=>''));
        setClientInstallments([]);
      }
    } catch (e) {
      console.error("Error fetching client installments:", e);
    }
  };

  useEffect(() => {
    if (activeModule === 'financial' || activeModule === 'work') {
      if (activeModule === 'financial') {
        fetchFinancialData();
        fetchResponsibles();
      }
      fetchClients();
      fetchClientSales();
      fetchClientInstallments();
    } else if (activeModule === 'personal') {
      fetchPersonalTasks();
    }
  }, [activeModule, activeTab, fetchFinancialData, finFilter]);

  const handleSavePersonalTask = async () => {
    try {
      if (personalTaskForm.id) {
        await fetchWithAuth(`/api/personal/tasks/${personalTaskForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(personalTaskForm)
        });
      } else {
        await fetchWithAuth('/api/personal/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(personalTaskForm)
        });
      }
      setPersonalTaskForm({ title: '', description: '', due_date: '', priority: 'medium', status: 'pending', eisenhower_quadrant: 'not_urgent_not_important' });
      fetchPersonalTasks();
    } catch (e) {
      console.error("Error saving personal task:", e);
    }
  };

  const handleDeletePersonalTask = async (id: number) => {
    try {
      await fetchWithAuth(`/api/personal/tasks/${id}`, { method: 'DELETE' });
      fetchPersonalTasks();
    } catch (e) {
      console.error("Error deleting personal task:", e);
    }
  };

  const handleTogglePersonalTask = async (task: PersonalTask) => {
    try {
      await fetchWithAuth(`/api/personal/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: task.status === 'pending' ? 'completed' : 'pending' })
      });
      fetchPersonalTasks();
    } catch (e) {
      console.error("Error toggling personal task:", e);
    }
  };

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
    if (!(await dialogConfirm('Tem certeza?'))) return;
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
    if (!(await dialogConfirm('Tem certeza?'))) return;
    await fetchWithAuth(`/api/finance/accounts/${id}`, { method: 'DELETE' });
    fetchFinancialData();
  };

  const handleSaveFinTransaction = async () => {
    try {
      let res;
      if (editingFinTransaction) {
        res = await fetchWithAuth(`/api/finance/transactions/${editingFinTransaction.id}`, {
          method: 'PUT',
          body: JSON.stringify(finTransactionForm)
        });
      } else {
        res = await fetchWithAuth('/api/finance/transactions', {
          method: 'POST',
          body: JSON.stringify(finTransactionForm)
        });
      }
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar lançamento: ${err.message || err.error || JSON.stringify(err)}`);
        return;
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
      dialogAlert("Erro de conexão ao salvar lançamento.");
    }
  };

  const handleSaveClientInstallment = async () => {
    if (!editingClientInstallment) return;
    try {
      await fetchWithAuth(`/api/client-installments/${editingClientInstallment.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: Number(clientInstallmentForm.amount),
          due_date: clientInstallmentForm.due_date,
          status: clientInstallmentForm.status,
          payment_date: clientInstallmentForm.status === 'pago' ? new Date().toISOString().split('T')[0] : null
        })
      });
      setEditingClientInstallment(null);
      fetchClientInstallments();
    } catch (e) {
      console.error("Error saving installment:", e);
    }
  };

  const handleDeleteClientInstallment = async (id: number) => {
    if (!(await dialogConfirm('Tem certeza que deseja apagar esta parcela?'))) return;
    try {
      await fetchWithAuth(`/api/client-installments/${id}`, { method: 'DELETE' });
      fetchClientInstallments();
    } catch (e) {
      console.error("Error deleting installment:", e);
    }
  };

  const handleDeleteFinTransaction = async (id: number) => {
    if (!(await dialogConfirm('Tem certeza?'))) return;
    await fetchWithAuth(`/api/finance/transactions/${id}`, { method: 'DELETE' });
    fetchFinancialData();
  };

  const handleToggleSplitStatus = async (transaction: FinancialTransaction, splitIndex: number) => {
    try {
      const newSplits = [...(transaction.splits || [])];
      const currentStatus = newSplits[splitIndex].status || 'pendente';
      newSplits[splitIndex].status = currentStatus === 'pago' ? 'pendente' : 'pago';
      
      // If all splits are paid, mark the transaction as paid
      const allPaid = newSplits.every(s => s.status === 'pago');
      const newStatus = allPaid ? 'pago' : 'pendente';

      const res = await fetchWithAuth(`/api/finance/transactions/${transaction.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          splits: newSplits,
          status: newStatus
        })
      });

      if (res.ok) {
        fetchFinancialData();
      }
    } catch (error) {
      console.error("Error toggling split status:", error);
    }
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
    fetchChacaraBills();
    fetchFinancialData();
    fetchClientInstallments();
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      const loadData = async () => {
        const [attRes, actRes, webRes] = await Promise.all([
          fetchWithAuth(`/api/attendance/${selectedSubjectId}`),
          fetchWithAuth(`/api/activities/${selectedSubjectId}`),
          fetchWithAuth(`/api/web_contents/${selectedSubjectId}`)
        ]);
        
        let attData: any = {}, actData: any = {}, webData: any = [];
        if (attRes.ok) attData = await attRes.json();
        if (actRes.ok) actData = await actRes.json();
        if (webRes.ok) webData = await webRes.json();
        
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
      dialogAlert('Por favor, selecione um período.');
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
      dialogAlert("Já existe uma matéria cadastrada para este mês e período.");
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
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar matéria: ${err.error || err.message || 'Erro desconhecido'}`);
      }
    } catch (e) {
      dialogAlert("Erro de conexão ao salvar matéria.");
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
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar período: ${err.error || err.message || 'Erro desconhecido'}`);
      }
    } catch (e) {
      dialogAlert("Erro de conexão ao salvar período.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePeriod = async (id: number) => {
    if (await dialogConfirm('Deseja realmente excluir este período? Isso pode afetar matérias vinculadas.')) {
      try {
        const res = await fetchWithAuth(`/api/periods/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          dialogAlert(`Erro ao excluir: ${err.message || 'Erro desconhecido'}`);
        } else {
          fetchPeriods();
          fetchSubjects();
          fetchDashboard();
        }
      } catch (e) {
        dialogAlert("Erro de conexão ao excluir.");
      }
    }
  };

  const handleDeleteSubject = async (id: number) => {
    const hasData = dashboardData.find(d => d.id === id && (d.aula1_present || d.act1_grade || d.c1_watched));
    const msg = hasData 
      ? 'Esta matéria já possui lançamentos. Deseja realmente excluir?' 
      : 'Deseja realmente excluir este mês/matéria?';
    
    if (await dialogConfirm(msg)) {
      try {
        const res = await fetchWithAuth(`/api/subjects/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          dialogAlert(`Erro ao excluir: ${err.message || 'Erro desconhecido'}`);
        } else {
          fetchSubjects();
          fetchDashboard();
        }
      } catch (e) {
        dialogAlert("Erro de conexão ao excluir.");
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
        const err = await res.json().catch(() => ({ message: res.statusText }));
        console.error("Error auto-saving:", err);
        dialogAlert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
      } else {
        fetchDashboard();
      }
    } catch (e) {
      console.error("Network error auto-saving:", e);
      dialogAlert("Erro de conexão ao salvar.");
    }
  }, [selectedSubjectId]);

  const exportAcademicPDF = () => {
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

  const handleGlobalExport = () => {
    if (activeModule === 'academic' && activeTab === 'dashboard') {
      exportAcademicPDF();
    } else if (activeModule === 'work' && activeTab === 'work_clients') {
      exportClientReport();
    } else if (activeModule === 'chacara' && activeTab === 'chacara_history') {
      window.dispatchEvent(new CustomEvent('export-chacara-history'));
    } else if (activeModule === 'chacara' && activeTab === 'chacara_dashboard') {
      window.dispatchEvent(new CustomEvent('export-chacara-dashboard'));
    } else if (activeModule === 'chacara' && activeTab === 'chacara_accountability') {
      window.dispatchEvent(new CustomEvent('export-chacara-accountability'));
    } else if (activeModule === 'financial' && activeTab === 'fin_dashboard') {
      exportFinancialDashboardPDF();
    } else if (activeModule === 'financial' && activeTab === 'fin_credit') {
      const btn = document.getElementById('btn-export-fin-credit');
      if (btn) btn.click();
      else dialogAlert('Não há relatório em PDF disponível para exportar nesta aba.');
    } else {
      dialogAlert('Não há relatório em PDF disponível para exportar nesta aba.');
    }
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

  const exportClientReport = () => {
    const doc = new jsPDF();
    const monthYear = new Date(finFilter.year, finFilter.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    doc.text(`Relatório de Clientes - ${monthYear}`, 14, 15);

    const tableData = clientInstallments.map(item => {
      return [
        item.client_sales?.clients?.name || 'N/A',
        item.client_sales?.description || 'N/A',
        `${String(item.installment_number).padStart(2, '0')}/${String(item.client_sales?.installment_count || 1).padStart(2, '0')}`,
        formatDateString(item.due_date),
        `R$ ${Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        item.status === 'pago' ? 'Pago' : 'Pendente'
      ];
    });

    autoTable(doc, {
      head: [['Cliente', 'Descrição', 'Parcela', 'Vencimento', 'Valor', 'Status']],
      body: tableData,
      startY: 25,
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.row.raw[5] === 'Pago') {
          const { x, y, width, height } = data.cell;
          data.doc.setLineWidth(0.3);
          data.doc.setDrawColor(100, 100, 100);
          const lineY = y + (height / 2);
          data.doc.line(x + 2, lineY, x + width - 2, lineY);
        }
      }
    });
    doc.save(`relatorio_clientes_${finFilter.year}_${finFilter.month + 1}.pdf`);
  };

  const exportFinancialDashboardPDF = async () => {
    const doc = new jsPDF();
    const monthName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][finFilter.month];
    const title = `Relatório Financeiro - ${monthName} ${finFilter.year}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    // Summary Cards
    doc.setFontSize(12);
    doc.text('Resumo do Mês', 14, 30);
    
    const summaryData = [
      ['Receitas', `R$ ${(finDashboard?.month_income || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Despesas', `R$ ${(finDashboard?.month_expense || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Saldo Final', `R$ ${((finDashboard?.previous_balance || 0) + (finDashboard?.month_income || 0) - (finDashboard?.month_expense || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
    ];

    autoTable(doc, {
      body: summaryData,
      startY: 35,
      theme: 'plain',
      styles: { fontSize: 11 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { halign: 'right' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Accounts Summary
    if (finDashboard?.accounts_summary && finDashboard.accounts_summary.length > 0) {
      doc.setFontSize(12);
      doc.text('Saldos das Contas', 14, currentY);
      
      const accountsData = finDashboard.accounts_summary.map((acc: any) => [
        acc.name,
        acc.type.toUpperCase(),
        `R$ ${Number(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        head: [['Conta', 'Tipo', 'Saldo']],
        body: accountsData,
        startY: currentY + 5,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        styles: { fontSize: 10 },
        columnStyles: {
          2: { halign: 'right' }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Responsibility Summary
    if (finDashboard?.responsibility_summary && Object.keys(finDashboard.responsibility_summary).length > 0) {
      doc.setFontSize(12);
      doc.text('Responsabilidade (Despesas do Mês)', 14, currentY);
      
      const respData = Object.entries(finDashboard.responsibility_summary).map(([name, amount]: [string, any]) => [
        name,
        `R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        head: [['Responsável', 'Valor']],
        body: respData,
        startY: currentY + 5,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10 },
        columnStyles: {
          1: { halign: 'right' }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Capture Pie Chart
    const chartContainer = document.getElementById('expenses-pie-chart-container');
    if (chartContainer) {
      try {
        const canvas = await html2canvas(chartContainer, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate dimensions to fit page width
        const pdfWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const maxImgWidth = pdfWidth - (margin * 2);
        const imgProps = doc.getImageProperties(imgData);
        const imgHeight = (imgProps.height * maxImgWidth) / imgProps.width;

        if (currentY + imgHeight > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          currentY = 20;
        }

        doc.addImage(imgData, 'PNG', margin, currentY, maxImgWidth, imgHeight);
        currentY += imgHeight + 10;
      } catch (error) {
        console.error('Error capturing chart:', error);
      }
    }

    // Expense Details for the selected month
    if (finDashboard?.transactions && finDashboard.transactions.length > 0) {
      const expenses = finDashboard.transactions.filter((t: any) => {
        if (t.type !== 'despesa') return false;
        if (t.is_installment) return false; 
        
        const account = finDashboard.accounts?.find((a: any) => String(a.id) === String(t.account_id));
        const accType = account?.type;
        
        if (accType === 'credito') {
          const closingDay = account?.closing_day || 1;
          const [y, m, d] = t.date.split('-').map(Number);
          const tDate = new Date(y, m - 1, d);
          
          const invoiceEnd = new Date(finFilter.year, finFilter.month, closingDay);
          const invoiceStart = new Date(finFilter.year, finFilter.month - 1, closingDay + 1);
          
          return tDate >= invoiceStart && tDate <= invoiceEnd;
        } else {
          const [tYear, tMonth] = t.date.split('-').map(Number);
          return tYear === finFilter.year && tMonth - 1 === finFilter.month;
        }
      });

      if (expenses.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.text('Detalhamento de Despesas', 14, currentY);

        const expensesData = expenses.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((t: any) => [
          formatDateString(t.date),
          t.description,
          finCategories.find(c => String(c.id) === String(t.category_id))?.name || 'Sem Categoria',
          `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
          head: [['Data', 'Descrição', 'Categoria', 'Valor']],
          body: expensesData,
          startY: currentY + 5,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38] }, // Red 600
          styles: { fontSize: 9 },
          columnStyles: {
            3: { halign: 'right' }
          }
        });
      }
    }

    doc.save(`dashboard_financeiro_${monthName}_${finFilter.year}.pdf`);
  };

  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto px-2 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={cn("p-1.5 md:p-2 rounded-xl text-white transition-colors shadow-sm", 
                activeModule === 'academic' ? "bg-indigo-600" : 
                activeModule === 'financial' ? "bg-emerald-600" : 
                activeModule === 'chacara' ? "bg-amber-600" :
                activeModule === 'personal' ? "bg-purple-600" : "bg-blue-600")}>
                <BrainCircuit size={18} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="font-bold text-base md:text-xl leading-tight text-gray-900 tracking-tight">
                  OrganizaAI
                </h1>
                <p className="text-[9px] md:text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  {activeModule === 'academic' ? 'Acadêmico' : 
                   activeModule === 'financial' ? 'Financeiro' : 
                   activeModule === 'chacara' ? 'Gestão' : 
                   activeModule === 'personal' ? 'Pessoal' : 'Trabalho'}
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
              <button 
                onClick={() => { setActiveModule('chacara'); setActiveTab('chacara_main'); }}
                className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeModule === 'chacara' ? "bg-white text-amber-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700")}
              >
                Chácara
              </button>
              <button 
                onClick={() => { setActiveModule('work'); setActiveTab('work_clients'); }}
                className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeModule === 'work' ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700")}
              >
                Trabalho
              </button>
              <button 
                onClick={() => { setActiveModule('personal'); setActiveTab('personal_tasks'); }}
                className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeModule === 'personal' ? "bg-white text-purple-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700")}
              >
                Pessoal
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
              <button 
                onClick={() => { setActiveModule('chacara'); setActiveTab('chacara_main'); }}
                className={cn("p-2 rounded-md transition-all", activeModule === 'chacara' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500")}
              >
                <Trees size={18} />
              </button>
              <button 
                onClick={() => { setActiveModule('work'); setActiveTab('work_clients'); }}
                className={cn("p-2 rounded-md transition-all", activeModule === 'work' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}
              >
                <Briefcase size={18} />
              </button>
              <button 
                onClick={() => { setActiveModule('personal'); setActiveTab('personal_tasks'); }}
                className={cn("p-2 rounded-md transition-all", activeModule === 'personal' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500")}
              >
                <User size={18} />
              </button>
            </div>

            <button onClick={handleGlobalExport} className="p-2 text-gray-500 hover:text-indigo-600 transition-colors" title="Exportar PDF">
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
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
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
                        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-2 pt-4 border-t border-gray-50">
                          {!saved ? (
                            <>
                              <button 
                                onClick={() => {
                                  const newData = { ...attendanceForm, [`data_aula_${num}`]: '', [`aula_${num}`]: false };
                                  setAttendanceForm(newData);
                                  handleAutoSave('attendance', newData);
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                              <button 
                                onClick={() => {
                                  handleAutoSave('attendance', attendanceForm);
                                  toggleEdit(key);
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
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
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <select 
                    className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
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
                    className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                    value={selectedSubjectDashboardFilter}
                    onChange={(e) => setSelectedSubjectDashboardFilter(e.target.value)}
                  >
                    <option value="all">Todas as Matérias</option>
                    {subjects
                      .filter(s => selectedPeriodFilter === 'all' || s.period_id.toString() === selectedPeriodFilter)
                      .map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)
                    }
                  </select>

                  <button onClick={exportExcel} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors">
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

                    const getCountdown = (dateStr?: string, status?: string) => {
                      if (status === 'Concluída') return { text: "Concluída", color: "text-emerald-600 bg-emerald-50" };
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
                          { label: 'Atividade Virtual 1', date: item.act1_deadline, start: item.act1_start, grade: item.act1_grade, status: item.act1_status },
                          { label: 'Atividade Virtual 2', date: item.act2_deadline, start: item.act2_start, grade: item.act2_grade, status: item.act2_status },
                          { label: 'Data da Prova', date: item.exam_date, start: item.exam_start, grade: item.exam_grade, status: undefined }
                        ].map((d, i) => {
                          const countdown = getCountdown(d.date, d.status);
                          return (
                            <div key={i} className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 md:mb-2">{d.label}</p>
                              <div className="flex flex-col gap-1 md:gap-2 items-center">
                                <span className={cn("px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-bold", countdown.color)}>
                                  {countdown.text}
                                </span>
                                {d.grade !== null && d.grade !== undefined && (
                                  <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-bold text-emerald-600 bg-emerald-50">
                                    Nota: {d.grade}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 md:mt-3 space-y-0.5 md:space-y-1">
                                {d.start && (
                                  <p className="text-[11px] md:text-xs text-gray-500">
                                    <span className="font-semibold">Início:</span> {formatDateString(d.start)}
                                  </p>
                                )}
                                {d.date && (
                                  <p className="text-[11px] md:text-xs text-gray-500">
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
                      <div className="p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                          <div>
                            <p className="text-[10px] md:text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">
                              {item.month_year} • {periods.find(p => p.id === item.period_id)?.name}
                            </p>
                            <h3 className="text-base md:text-lg font-bold text-gray-800 leading-tight">{item.subject_name}</h3>
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-start">
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", statusColor)}>
                              {status}
                            </span>
                            {/* Deadline Alerts */}
                            <div className="flex flex-col gap-1 items-end">
                              {[
                                { label: 'Ativ. 1', date: item.act1_deadline, grade: item.act1_grade, status: item.act1_status },
                                { label: 'Ativ. 2', date: item.act2_deadline, grade: item.act2_grade, status: item.act2_status },
                                { label: 'Prova', date: item.exam_date, grade: item.exam_grade, status: null }
                              ].map((d, idx) => {
                                if (!d.date || (d.grade !== null && d.grade !== undefined) || d.status === 'Concluída') return null;
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                
                                // Parse YYYY-MM-DD manually to ensure local time midnight
                                const [year, month, day] = d.date.split('T')[0].split('-').map(Number);
                                const deadline = new Date(year, month - 1, day);
                                deadline.setHours(0,0,0,0);
                                
                                const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                
                                let alertText = '';
                                let alertColor = '';
                                
                                if (diffDays < 0) {
                                  alertText = 'Expirado';
                                  alertColor = 'text-red-600 bg-red-50';
                                } else if (diffDays === 0) {
                                  alertText = 'Hoje';
                                  alertColor = 'text-orange-600 bg-orange-50';
                                } else if (diffDays <= 7) {
                                  alertText = `${diffDays}d`;
                                  alertColor = 'text-amber-600 bg-amber-50';
                                } else {
                                  alertText = `${diffDays}d`;
                                  alertColor = 'text-indigo-600 bg-indigo-50';
                                }

                                if (!alertText) return null;

                                return (
                                  <span key={idx} className={cn("px-2 py-0.5 rounded text-[11px] font-bold uppercase whitespace-nowrap", alertColor)}>
                                    {d.label}: {alertText}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          <div className="text-center p-2 bg-gray-50/50 rounded-xl">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Presença</p>
                            <p className={cn("text-lg md:text-xl font-bold", presencePct < 75 ? "text-red-500" : "text-gray-800")}>{presencePct}%</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50/50 rounded-xl">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Final</p>
                            <p className={cn("text-lg md:text-xl font-bold", finalScore < (maxPossible * 0.6) ? "text-red-500" : "text-gray-800")}>
                              {finalScore.toLocaleString()} <span className="text-xs text-gray-400">/ {maxPossible.toLocaleString()}</span>
                            </p>
                          </div>
                          <div className="text-center p-2 bg-gray-50/50 rounded-xl">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Web</p>
                            <p className="text-lg md:text-xl font-bold text-gray-800">{webPct}%</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50/50 rounded-xl">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Atividades</p>
                            <p className="text-lg md:text-xl font-bold text-gray-800">{avPct}%</p>
                          </div>
                        </div>
                        
                        {/* Deadlines Display */}
                        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Ativ. 1</p>
                            <p className="text-xs font-semibold text-gray-600">{formatDateString(item.act1_deadline) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Ativ. 2</p>
                            <p className="text-xs font-semibold text-gray-600">{formatDateString(item.act2_deadline) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Prova</p>
                            <p className="text-xs font-semibold text-gray-600">{formatDateString(item.exam_date) || '-'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 md:px-6 py-2 md:py-3 flex justify-between items-center">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <div key={n} className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", (item as any)[`aula${n}_present`] ? "bg-emerald-500" : "bg-gray-200")} />
                          ))}
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aulas do Mês</p>
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
                      <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                        <div>
                          <h4 className="font-bold text-gray-800">{p.name}</h4>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
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
                      <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                        <div>
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{s.month_year} • {periods.find(p => p.id === s.period_id)?.name}</p>
                          <h4 className="font-bold text-gray-800">{s.subject_name}</h4>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
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
                        fetchWithAuth(`/api/activities/${id}`).then(res => {
                          if (res.ok) return res.json();
                          throw new Error('Failed to fetch activity');
                        }).then(data => {
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
                {usersError ? (
                  <div className="text-center py-8 text-red-500">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p className="font-semibold">Erro ao carregar usuários</p>
                    <p className="text-sm mt-1">{usersError}</p>
                    <p className="text-xs mt-2 text-gray-500">Verifique a variável SUPABASE_SERVICE_ROLE_KEY no servidor.</p>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum usuário encontrado.</p>
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
                {activeTab === 'fin_dashboard' && (
                  <button
                    onClick={exportFinancialDashboardPDF}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors text-xs md:text-sm font-bold"
                    title="Exportar PDF"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Exportar</span>
                  </button>
                )}
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
            <motion.div key="fin_dashboard" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <TrendingUp className="text-emerald-600 md:w-6 md:h-6" size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receitas (Mês)</span>
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
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Despesas (Mês)</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-red-600">
                    R$ {(finDashboard?.month_expense || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Wallet className="text-indigo-600 md:w-6 md:h-6" size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo Final</span>
                  </div>
                  <h3 className={cn("text-xl md:text-2xl font-bold", ((finDashboard?.previous_balance || 0) + (finDashboard?.month_income || 0) - (finDashboard?.month_expense || 0)) < 0 ? "text-red-600" : "text-gray-900")}>
                    R$ {((finDashboard?.previous_balance || 0) + (finDashboard?.month_income || 0) - (finDashboard?.month_expense || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Saldo Anterior + Receita - Despesa</p>
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
                <Card title="Saldos das Contas" icon={CreditCard}>
                  <div className="space-y-4">
                    {finDashboard?.accounts_summary && finDashboard.accounts_summary.length > 0 ? (
                      finDashboard.accounts_summary.map((acc: any, index: number) => (
                        <div 
                          key={index} 
                          onClick={() => setSelectedAccountForDetails(acc)}
                          className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500">
                              {acc.type === 'dinheiro' ? <Banknote size={16} /> : <CreditCard size={16} />}
                            </div>
                            <div>
                              <span className="font-bold text-gray-700 block">{acc.name}</span>
                              <span className="text-xs text-gray-500 uppercase">{acc.type}</span>
                            </div>
                          </div>
                          <span className={cn("font-bold", acc.balance < 0 ? "text-red-600" : "text-emerald-600")}>
                            R$ {Number(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <CreditCard size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Nenhuma conta cadastrada.</p>
                      </div>
                    )}
                  </div>
                </Card>

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

              {/* Modal for Account Details */}
              {selectedAccountForDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAccountForDetails(null)}>
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {selectedAccountForDetails.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Adesão / Responsabilidade no Mês</p>
                      </div>
                      <button onClick={() => setSelectedAccountForDetails(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} />
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                      {selectedAccountForDetails.responsibles && Object.keys(selectedAccountForDetails.responsibles).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(selectedAccountForDetails.responsibles).map(([name, amount]: [string, any]) => (
                            <div key={name} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
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
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Nenhuma responsabilidade registrada para esta conta neste mês.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}



          {activeTab === 'fin_extract' && (
            <motion.div key="fin_extract" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center gap-2 mb-6">
                  <Filter size={20} className="text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-800">Filtros Avançados</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={finExtractFilter.type}
                      onChange={(e) => setFinExtractFilter({ ...finExtractFilter, type: e.target.value })}
                    >
                      <option value="all">Todos os Tipos</option>
                      <option value="receita">Receita</option>
                      <option value="despesa">Despesa</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Categoria</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={finExtractFilter.category_id}
                      onChange={(e) => setFinExtractFilter({ ...finExtractFilter, category_id: e.target.value })}
                    >
                      <option value="all">Todas as Categorias</option>
                      {finCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Conta</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={finExtractFilter.account_id}
                      onChange={(e) => setFinExtractFilter({ ...finExtractFilter, account_id: e.target.value })}
                    >
                      <option value="all">Todas as Contas</option>
                      {finAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={finExtractFilter.status}
                      onChange={(e) => setFinExtractFilter({ ...finExtractFilter, status: e.target.value })}
                    >
                      <option value="all">Todos os Status</option>
                      <option value="pago">Pago / Recebido</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Responsável</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={finExtractFilter.responsible}
                      onChange={(e) => setFinExtractFilter({ ...finExtractFilter, responsible: e.target.value })}
                    >
                      <option value="all">Todos os Responsáveis</option>
                      {finResponsibles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Busca</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Descrição..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={finExtractFilter.search}
                        onChange={(e) => setFinExtractFilter({ ...finExtractFilter, search: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ordenar Por</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={finExtractFilter.sortBy}
                      onChange={(e) => setFinExtractFilter({ ...finExtractFilter, sortBy: e.target.value })}
                    >
                      <option value="date">Data (Mais Recente)</option>
                      <option value="id">Ordem de Lançamento</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox" 
                      id="showAllMonths"
                      checked={finExtractFilter.showAllMonths}
                      onChange={(e) => setFinExtractFilter({ ...finExtractFilter, showAllMonths: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="showAllMonths" className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer">Ver Todos os Meses</label>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => setFinExtractFilter({
                      type: 'all',
                      category_id: 'all',
                      account_id: 'all',
                      status: 'all',
                      responsible: 'all',
                      search: '',
                      showAllMonths: false,
                      sortBy: 'id'
                    })}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Chart Section */}
              {(() => {
                const filteredTransactions = finTransactions.filter(t => {
                  if (!finExtractFilter.showAllMonths) {
                    const [year, month] = t.date.split('-');
                    if (Number(year) !== finFilter.year || Number(month) - 1 !== finFilter.month) return false;
                  }
                  if (finExtractFilter.type !== 'all' && t.type !== finExtractFilter.type) return false;
                  if (finExtractFilter.category_id !== 'all' && t.category_id?.toString() !== finExtractFilter.category_id) return false;
                  if (finExtractFilter.account_id !== 'all' && t.account_id?.toString() !== finExtractFilter.account_id) return false;
                  if (finExtractFilter.status !== 'all' && t.status !== finExtractFilter.status) return false;
                  if (finExtractFilter.responsible !== 'all') {
                    const hasResponsible = t.splits?.some(s => s.name === finExtractFilter.responsible);
                    if (!hasResponsible) return false;
                  }
                  if (finExtractFilter.search && !t.description.toLowerCase().includes(finExtractFilter.search.toLowerCase())) return false;
                  
                  return true;
                });

                const expensesByCategory = filteredTransactions
                  .filter(t => t.type === 'despesa')
                  .reduce((acc, t) => {
                    const categoryName = finCategories.find(c => c.id === t.category_id)?.name || 'Sem Categoria';
                    acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
                    return acc;
                  }, {} as Record<string, number>);

                const chartData = Object.entries(expensesByCategory)
                  .map(([name, value]) => ({ name, value: Number(value) }))
                  .sort((a, b) => b.value - a.value);

                const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ef4444', '#14b8a6'];

                if (chartData.length === 0) return null;

                return (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6" id="expenses-pie-chart-container">
                    <div className="flex items-center gap-2 mb-6">
                      <PieChart size={20} className="text-indigo-600" />
                      <h3 className="text-lg font-bold text-gray-800">Despesas por Categoria</h3>
                    </div>
                    <div className="h-64 flex flex-col md:flex-row items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 md:mt-0 md:ml-8 flex flex-col gap-2 w-full md:w-1/3 overflow-y-auto max-h-full">
                        {chartData.map((entry, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-gray-600 truncate max-w-[100px] md:max-w-[150px]">{entry.name}</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                {finTransactions
                  .filter(t => {
                    // Month/Year filter
                    if (!finExtractFilter.showAllMonths) {
                      const [year, month] = t.date.split('-');
                      if (Number(year) !== finFilter.year || Number(month) - 1 !== finFilter.month) return false;
                    }
                    
                    // Advanced filters
                    if (finExtractFilter.type !== 'all' && t.type !== finExtractFilter.type) return false;
                    if (finExtractFilter.category_id !== 'all' && t.category_id?.toString() !== finExtractFilter.category_id) return false;
                    if (finExtractFilter.account_id !== 'all' && t.account_id?.toString() !== finExtractFilter.account_id) return false;
                    if (finExtractFilter.status !== 'all' && t.status !== finExtractFilter.status) return false;
                    if (finExtractFilter.responsible !== 'all') {
                      const hasResponsible = t.splits?.some(s => s.name === finExtractFilter.responsible);
                      if (!hasResponsible) return false;
                    }
                    if (finExtractFilter.search && !t.description.toLowerCase().includes(finExtractFilter.search.toLowerCase())) return false;
                    
                    return true;
                  })
                  .sort((a, b) => {
                    if (finExtractFilter.sortBy === 'id') {
                      return b.id - a.id;
                    } else {
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                    }
                  })
                  .map(t => {
                    const isExpanded = expandedTransactions.has(t.id);
                    const isLongDescription = t.description.length > 40;
                    const displayDescription = isExpanded || !isLongDescription ? t.description : `${t.description.substring(0, 40)}...`;
                    const category = finCategories.find(c => c.id === t.category_id);
                    const account = finAccounts.find(a => a.id === t.account_id);
                    
                    return (
                      <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 sm:mt-0",
                              t.type === 'receita' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {t.type === 'receita' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-gray-800 truncate max-w-full">{displayDescription}</h4>
                                {isLongDescription && (
                                  <button onClick={() => toggleTransaction(t.id)} className="text-indigo-600 hover:text-indigo-800 shrink-0">
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1 sm:mt-0 truncate">
                                {category?.name || 'Sem Categoria'} • {account?.name || 'Sem Conta'} • {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 border-gray-50 pt-3 sm:pt-0">
                            <p className={cn("font-black text-lg", t.type === 'receita' ? "text-emerald-600" : "text-red-600")}>
                              {t.type === 'receita' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center justify-end gap-2 sm:mt-1">
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                t.status === 'pago' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {t.status === 'pago' ? 'Pago' : 'Pendente'}
                              </span>
                              <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => {
                                  setEditingFinTransaction(t);
                                  setFinTransactionForm({
                                    description: t.description,
                                    amount: t.amount.toString(),
                                    type: t.type,
                                    category_id: t.category_id?.toString() || '',
                                    account_id: t.account_id?.toString() || '',
                                    date: t.date,
                                    status: t.status,
                                    is_installment: t.is_installment || false,
                                    total_installments: t.total_installments?.toString() || '1',
                                    splits: t.splits || []
                                  });
                                  setActiveTab('fin_transactions');
                                }} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 md:bg-transparent rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteFinTransaction(t.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 md:bg-transparent rounded-lg"><Trash2 size={16} /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {t.splits && t.splits.length > 0 && (
                          <div className="px-4 pb-4 pt-2 bg-gray-50/50 border-t border-gray-50 flex flex-wrap gap-2">
                            {t.splits.map((s, i) => (
                              <button 
                                key={i} 
                                onClick={() => handleToggleSplitStatus(t, i)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm transition-all",
                                  s.status === 'pago' ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-100"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                                  s.status === 'pago' ? "bg-emerald-200 text-emerald-700" : "bg-indigo-100 text-indigo-600"
                                )}>
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <span className={cn("text-[10px] font-bold", s.status === 'pago' ? "text-emerald-700 line-through" : "text-gray-600")}>{s.name}:</span>
                                <span className={cn("text-[10px] font-black", s.status === 'pago' ? "text-emerald-700" : "text-indigo-600")}>R$ {Number(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                {s.status === 'pago' && <Check size={10} className="text-emerald-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {activeTab === 'fin_credit' && (
            <motion.div key="fin_credit" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <Card title="Gestão de Crédito" icon={CreditCard}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Cartão</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={selectedCreditCardId}
                    onChange={(e) => setSelectedCreditCardId(e.target.value)}
                  >
                    <option value="">Selecione um cartão ou conta...</option>
                    <option value="all">Todos os Cartões</option>
                    {finAccounts.filter(a => a.type === 'credito' || a.type === 'corrente').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.type === 'credito' ? 'Crédito' : 'Corrente'})</option>
                    ))}
                  </select>
                </div>

                {selectedCreditCardId && (
                  <>
                    {(() => {
                      const currentMonth = finFilter.month;
                      const currentYear = finFilter.year;

                      let invoiceItems: any[] = [];
                      let invoiceStart: Date | null = null;
                      let invoiceEnd: Date | null = null;
                      let dueDayDisplay: string | number = '--';
                      let cardName = 'Todos os Cartões';

                      if (selectedCreditCardId === 'all') {
                        invoiceStart = new Date(currentYear, currentMonth, 1);
                        invoiceEnd = new Date(currentYear, currentMonth + 1, 0);
                        dueDayDisplay = 'Vários';
                        
                        invoiceItems = finTransactions.filter(t => {
                          const account = finAccounts.find(a => a.id === t.account_id);
                          if (!account || account.type !== 'credito') return false;

                          const closingDay = account.closing_day || 1;
                          
                          const cardInvoiceEnd = new Date(currentYear, currentMonth, closingDay);
                          const cardInvoiceStart = new Date(currentYear, currentMonth - 1, closingDay + 1);

                          const [y, m, d] = t.date.split('T')[0].split('-').map(Number);
                          const tDate = new Date(y, m - 1, d);
                          
                          return tDate >= cardInvoiceStart && tDate <= cardInvoiceEnd;
                        });
                      } else {
                        const card = finAccounts.find(a => a.id === Number(selectedCreditCardId));
                        cardName = card?.name || '';
                        const isCreditCard = card?.type === 'credito';
                        
                        if (isCreditCard) {
                          const closingDay = card?.closing_day || 1;
                          const dueDay = card?.due_day || 10;
                          dueDayDisplay = dueDay;
                          
                          invoiceEnd = new Date(currentYear, currentMonth, closingDay);
                          invoiceStart = new Date(currentYear, currentMonth - 1, closingDay + 1);
                        } else {
                          invoiceStart = new Date(currentYear, currentMonth, 1);
                          invoiceEnd = new Date(currentYear, currentMonth + 1, 0);
                          dueDayDisplay = 'N/A';
                        }

                        invoiceItems = finTransactions.filter(t => {
                          if (t.account_id !== Number(selectedCreditCardId)) return false;

                          const [y, m, d] = t.date.split('T')[0].split('-').map(Number);
                          const tDate = new Date(y, m - 1, d);
                          
                          return tDate >= invoiceStart! && tDate <= invoiceEnd!;
                        });
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

                      // Apply person filter to invoiceItems
                      if (selectedPersonFilter !== 'all') {
                        invoiceItems = invoiceItems.filter(t => {
                          return t.splits?.some((s: any) => s.name.toLowerCase() === selectedPersonFilter.toLowerCase());
                        });
                      }

                      const totalInvoice = invoiceItems.reduce((sum, t) => {
                        if (selectedPersonFilter !== 'all') {
                          const personSplit = t.splits?.find((s: any) => s.name.toLowerCase() === selectedPersonFilter.toLowerCase());
                          return sum + Number(personSplit?.amount || 0);
                        }
                        return sum + Number(t.amount);
                      }, 0);
                      
                      const totalPaid = invoiceItems.reduce((sum, t) => {
                        if (selectedPersonFilter !== 'all') {
                          const personSplit = t.splits?.find((s: any) => s.name.toLowerCase() === selectedPersonFilter.toLowerCase());
                          return sum + (personSplit?.status === 'pago' ? Number(personSplit.amount) : 0);
                        }
                        // If no filter, sum all paid splits or the whole amount if no splits
                        if (t.splits && t.splits.length > 0) {
                          const paidSplitsSum = t.splits.reduce((sSum: number, s: any) => sSum + (s.status === 'pago' ? Number(s.amount) : 0), 0);
                          return sum + paidSplitsSum;
                        }
                        return sum + (t.status === 'pago' ? Number(t.amount) : 0);
                      }, 0);
                      
                      const totalPending = totalInvoice - totalPaid;

                      return (
                        <div className="space-y-6">
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex flex-col gap-1">
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Período da Fatura</p>
                                <p className="text-base md:text-lg font-bold text-indigo-900">
                                  {invoiceStart?.toLocaleDateString()} até {invoiceEnd?.toLocaleDateString()}
                                </p>
                                <p className="text-xs text-indigo-500 font-medium">
                                  Vencimento: {selectedCreditCardId === 'all' ? 'Vários' : new Date(currentYear, currentMonth, Number(dueDayDisplay)).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                <button
                                  id="btn-export-fin-credit"
                                  onClick={() => {
                                    const doc = new jsPDF();
                                    doc.text(`Relatório de Parcelas - ${cardName}`, 14, 15);
                                    doc.setFontSize(10);
                                    doc.text(`Período: ${invoiceStart?.toLocaleDateString()} a ${invoiceEnd?.toLocaleDateString()}`, 14, 22);
                                    const vencimentoStr = selectedCreditCardId === 'all' ? 'Vários' : new Date(currentYear, currentMonth, Number(dueDayDisplay)).toLocaleDateString();
                                    doc.text(`Vencimento: ${vencimentoStr}`, 14, 28);
                                    
                                    // Draw summary cards
                                    const cardWidth = 55;
                                    const cardHeight = 20;
                                    const startX = 14;
                                    const gap = 5;
                                    
                                    // Total Card
                                    doc.setDrawColor(200, 200, 200);
                                    doc.setFillColor(249, 250, 251); // gray-50
                                    doc.roundedRect(startX, 35, cardWidth, cardHeight, 2, 2, 'FD');
                                    doc.setFontSize(8);
                                    doc.setTextColor(107, 114, 128); // gray-500
                                    doc.text("TOTAL", startX + 5, 42);
                                    doc.setFontSize(12);
                                    doc.setTextColor(17, 24, 39); // gray-900
                                    doc.text(`R$ ${totalInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + 5, 50);

                                    // Paid Card
                                    doc.setDrawColor(167, 243, 208); // emerald-200
                                    doc.setFillColor(236, 253, 245); // emerald-50
                                    doc.roundedRect(startX + cardWidth + gap, 35, cardWidth, cardHeight, 2, 2, 'FD');
                                    doc.setFontSize(8);
                                    doc.setTextColor(5, 150, 105); // emerald-600
                                    doc.text("PAGO", startX + cardWidth + gap + 5, 42);
                                    doc.setFontSize(12);
                                    doc.setTextColor(5, 150, 105); // emerald-600
                                    doc.text(`R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + cardWidth + gap + 5, 50);

                                    // Pending Card
                                    doc.setDrawColor(254, 202, 202); // red-200
                                    doc.setFillColor(254, 242, 242); // red-50
                                    doc.roundedRect(startX + (cardWidth + gap) * 2, 35, cardWidth, cardHeight, 2, 2, 'FD');
                                    doc.setFontSize(8);
                                    doc.setTextColor(220, 38, 38); // red-600
                                    doc.text("PENDENTE", startX + (cardWidth + gap) * 2 + 5, 42);
                                    doc.setFontSize(12);
                                    doc.setTextColor(220, 38, 38); // red-600
                                    doc.text(`R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + (cardWidth + gap) * 2 + 5, 50);

                                    // Reset text color for the rest of the document
                                    doc.setTextColor(0, 0, 0);

                                    let currentY = 65;

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

                                      const headers = selectedCreditCardId === 'all' 
                                        ? [['Data', 'Cartão', 'Descrição', 'Parcela', 'Valor', 'Status']]
                                        : [['Data', 'Descrição', 'Parcela', 'Valor', 'Vencimento', 'Status']];

                                      autoTable(doc, {
                                        startY: currentY,
                                        head: headers,
                                        body: items.map(i => {
                                          if (selectedCreditCardId === 'all') {
                                            return [
                                              new Date(i.date).toLocaleDateString(),
                                              i.cardName,
                                              i.description,
                                              i.installment,
                                              `R$ ${i.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                              i.status === 'pago' ? 'Paga' : 'Pendente'
                                            ];
                                          }
                                          return [
                                            new Date(i.date).toLocaleDateString(),
                                            i.description,
                                            i.installment,
                                            `R$ ${i.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                            `Dia ${i.dueDay}`,
                                            i.status === 'pago' ? 'Paga' : 'Pendente'
                                          ];
                                        }),
                                        foot: [[
                                          '', 
                                          selectedCreditCardId === 'all' ? '' : '', 
                                          '', 
                                          'Total', 
                                          `R$ ${items.reduce((acc: any, i: any) => acc + i.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                                          ''
                                        ]],
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
                                        const tCard = finAccounts.find(a => a.id === t.account_id);
                                        const tCardName = tCard?.name || 'N/A';
                                        const tDueDay = tCard?.due_day || '--';
                                        
                                        if (hasSplits) {
                                            t.splits.forEach((s: any) => {
                                                if (s.name && s.name.trim()) {
                                                    const personName = s.name.trim();
                                                    const displayName = availablePeople.find(p => p.toLowerCase() === personName.toLowerCase()) || personName;
                                                    
                                                    if (!tablesData[displayName]) tablesData[displayName] = [];
                                                    tablesData[displayName].push({
                                                        date: t.date,
                                                        cardName: tCardName,
                                                        description: t.description,
                                                        installment: t.is_installment ? `${t.installment_number}/${t.total_installments}` : '-',
                                                        amount: Number(s.amount),
                                                        dueDay: tDueDay,
                                                        status: t.status
                                                    });
                                                }
                                            });
                                        } else {
                                            generalItems.push({
                                                date: t.date,
                                                cardName: tCardName,
                                                description: t.description,
                                                installment: t.is_installment ? `${t.installment_number}/${t.total_installments}` : '-',
                                                amount: Number(t.amount),
                                                dueDay: tDueDay,
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
                                    
                                    doc.save(`fatura_${cardName}_${finFilter.month + 1}_${finFilter.year}.pdf`);
                                  }}
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold text-xs uppercase transition-colors"
                                >
                                  <Download size={14} />
                                  PDF
                                </button>
                                
                                <select
                                  value={selectedPersonFilter}
                                  onChange={(e) => setSelectedPersonFilter(e.target.value)}
                                  className="flex-1 md:flex-none px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold text-xs uppercase transition-colors focus:outline-none"
                                >
                                  <option value="all">Todos</option>
                                  {availablePeople.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 pt-4 border-t border-indigo-100">
                              <div className="text-left">
                                <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                                <p className="text-lg md:text-xl font-bold text-gray-900 truncate">R$ {totalInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div className="text-left">
                                <p className="text-xs text-emerald-600 uppercase font-bold">Pago</p>
                                <p className="text-lg md:text-xl font-bold text-emerald-600 truncate">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div className="text-left">
                                <p className="text-xs text-red-600 uppercase font-bold">Pendente</p>
                                <p className="text-lg md:text-xl font-bold text-red-600 truncate">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {invoiceItems.length === 0 ? (
                              <p className="text-center text-gray-500 py-8">Nenhuma compra nesta fatura.</p>
                            ) : (
                              invoiceItems.map(t => (
                                  <div key={t.id} className="bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow overflow-hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3">
                                      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                        <div className={cn("p-2 rounded-lg shrink-0 mt-1 sm:mt-0", t.type === 'receita' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                                          {t.type === 'receita' ? <TrendingUp size={18} /> : <ShoppingCart size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-gray-900 truncate">{t.description}</p>
                                          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-1 sm:mt-0">
                                            <span>{new Date(t.date).toLocaleDateString()}</span>
                                            {t.is_installment && (
                                              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0">
                                                {t.installment_number}/{t.total_installments}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0 border-t sm:border-t-0 border-gray-50 pt-2 sm:pt-0">
                                        {(() => {
                                          const personSplit = selectedPersonFilter !== 'all' 
                                            ? t.splits?.find((s: any) => s.name.toLowerCase() === selectedPersonFilter.toLowerCase())
                                            : null;
                                          
                                          const displayAmount = personSplit ? personSplit.amount : t.amount;
                                          const displayStatus = personSplit ? (personSplit.status || 'pendente') : t.status;

                                          return (
                                            <>
                                              <span className={cn("font-bold text-sm sm:text-base whitespace-nowrap", t.type === 'receita' ? "text-emerald-600" : "text-red-600")}>
                                                {t.type === 'despesa' ? '-' : '+'} R$ {Number(displayAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                              </span>
                                              <button
                                                onClick={async () => {
                                                  if (personSplit) {
                                                    const splitIndex = t.splits.findIndex((s: any) => s.name.toLowerCase() === selectedPersonFilter.toLowerCase());
                                                    handleToggleSplitStatus(t, splitIndex);
                                                  } else {
                                                    const newStatus = t.status === 'pago' ? 'pendente' : 'pago';
                                                    // Update all splits too to match the transaction status
                                                    const newSplits = t.splits?.map((s: any) => ({ ...s, status: newStatus })) || [];
                                                    
                                                    // Optimistic update
                                                    const updatedTransactions = finTransactions.map(tr => tr.id === t.id ? { ...tr, status: newStatus, splits: newSplits } : tr);
                                                    setFinTransactions(updatedTransactions);
                                                    
                                                    await fetchWithAuth(`/api/finance/transactions/${t.id}`, {
                                                      method: 'PUT',
                                                      body: JSON.stringify({ 
                                                        status: newStatus,
                                                        splits: newSplits
                                                      })
                                                    });
                                                    fetchFinancialData(); 
                                                  }
                                                }}
                                                className={cn(
                                                  "px-3 py-1 rounded-lg text-xs font-semibold transition-colors border",
                                                  displayStatus === 'pago' 
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" 
                                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                                                )}
                                              >
                                                {displayStatus === 'pago' ? 'Pago' : 'Pendente'}
                                              </button>
                                            </>
                                          );
                                        })()}
                                        <button 
                                          onClick={() => handleDeleteFinTransaction(t.id)}
                                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                          title="Excluir lançamento"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                    {t.splits && t.splits.length > 0 && (
                                      <div className="px-3 pb-3 pt-1 bg-gray-50/30 border-t border-gray-50 flex flex-wrap gap-1.5">
                                        {t.splits.map((s: any, i: number) => (
                                          <button 
                                            key={i} 
                                            onClick={() => handleToggleSplitStatus(t, i)}
                                            className={cn(
                                              "flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold transition-all",
                                              s.status === 'pago' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-white border-gray-100 text-gray-500"
                                            )}
                                          >
                                            <div className={cn(
                                              "w-3 h-3 rounded-full flex items-center justify-center text-[7px]",
                                              s.status === 'pago' ? "bg-emerald-200" : "bg-indigo-100 text-indigo-600"
                                            )}>
                                              {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={s.status === 'pago' ? "line-through" : ""}>{s.name}</span>
                                            {s.status === 'pago' && <Check size={8} />}
                                          </button>
                                        ))}
                                      </div>
                                    )}
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
            <motion.div key="fin_transactions" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}>
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

                  <div className="space-y-4 sm:space-y-3">
                    {finTransactionForm.splits.map((split, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-3 sm:items-end bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-indigo-100 shadow-sm sm:shadow-none">
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
                                      const err = await res.json().catch(() => ({ message: res.statusText }));
                                      dialogAlert(err.message || 'Erro ao adicionar responsável');
                                    }
                                  } catch (error) {
                                    console.error('Error adding responsible:', error);
                                    dialogAlert('Erro de conexão ao adicionar responsável');
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
                        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-2">
                          <div className="sm:w-32">
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
                          <div className="sm:w-32">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                            <select
                              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                              value={split.status || 'pendente'}
                              onChange={(e: any) => {
                                const newSplits = [...finTransactionForm.splits];
                                newSplits[index].status = e.target.value;
                                setFinTransactionForm({ ...finTransactionForm, splits: newSplits });
                              }}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="pago">Pago</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => {
                              const newSplits = finTransactionForm.splits.filter((_, i) => i !== index);
                              setFinTransactionForm({ ...finTransactionForm, splits: newSplits });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2 text-xs font-bold sm:mb-4"
                          >
                            <Trash2 size={16} />
                            <span className="sm:hidden">Remover</span>
                          </button>
                        </div>
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                          <div className={cn("p-3 rounded-xl shrink-0 mt-1 sm:mt-0", t.type === 'receita' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                            {t.type === 'receita' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 
                                className={cn("font-bold text-gray-800 cursor-pointer truncate max-w-full", isLongDescription ? "hover:text-indigo-600" : "")}
                                onClick={() => isLongDescription && toggleTransaction(t.id)}
                              >
                                {displayDescription}
                              </h4>
                              {isLongDescription && (
                                <button 
                                  onClick={() => toggleTransaction(t.id)}
                                  className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors shrink-0"
                                >
                                  {isExpanded ? 'Ver menos' : 'Ver mais'}
                                </button>
                              )}
                              {t.is_installment && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                                  Parcela {t.installment_number}/{t.total_installments}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
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
                          <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-4 shrink-0 border-t sm:border-t-0 border-gray-50 pt-3 sm:pt-0">
                            <span className={cn("font-bold text-sm md:text-base", t.type === 'receita' ? "text-emerald-600" : "text-red-600")}>
                              {t.type === 'receita' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                                className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 md:bg-transparent rounded-lg transition-all"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteFinTransaction(t.id)}
                                className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 md:bg-transparent rounded-lg transition-all"
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

          {activeTab === 'fin_settings' && (
            <motion.div key="fin_settings" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <div className="mb-6 flex justify-end">
                <button 
                  onClick={async () => {
                    if (await dialogConfirm('Deseja verificar e configurar as tabelas do banco de dados?')) {
                      try {
                        const res = await fetchWithAuth('/api/setup-finance', { method: 'POST' });
                        if (res.ok) {
                          const data = await res.json();
                          dialogAlert(data.message);
                        } else {
                          const err = await res.json().catch(() => ({ message: res.statusText }));
                          dialogAlert(`Erro: ${err.message || 'Falha na configuração'}`);
                        }
                      } catch (e) {
                        dialogAlert('Erro ao conectar com o servidor.');
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
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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

          {activeModule === 'chacara' && (
            <motion.div key="chacara" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ChacaraManager fetchWithAuth={fetchWithAuth} activeTab={activeTab} onDataUpdate={fetchChacaraBills} setActiveTab={setActiveTab} />
            </motion.div>
          )}

          {activeModule === 'personal' && (
            <motion.div key="personal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {activeTab === 'personal_tasks' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Add Task */}
                  <div className="lg:col-span-1 space-y-6">
                    <Card title="Nova Tarefa" icon={PlusCircle}>
                      <div className="space-y-4">
                        <Input 
                          label="Título" 
                          value={personalTaskForm.title || ''} 
                          onChange={(e: any) => setPersonalTaskForm({ ...personalTaskForm, title: e.target.value })} 
                        />
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">Descrição</label>
                          <textarea
                            value={personalTaskForm.description || ''}
                            onChange={(e) => setPersonalTaskForm({ ...personalTaskForm, description: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-y min-h-[80px]"
                            placeholder="Opcional"
                          />
                        </div>
                        <Input 
                          label="Data de Vencimento" 
                          type="date"
                          value={personalTaskForm.due_date || ''} 
                          onChange={(e: any) => setPersonalTaskForm({ ...personalTaskForm, due_date: e.target.value })} 
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Prioridade</label>
                            <select
                              value={personalTaskForm.priority || 'medium'}
                              onChange={(e: any) => setPersonalTaskForm({ ...personalTaskForm, priority: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            >
                              <option value="low">Baixa</option>
                              <option value="medium">Média</option>
                              <option value="high">Alta</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Status</label>
                            <select
                              value={personalTaskForm.status || 'pending'}
                              onChange={(e: any) => setPersonalTaskForm({ ...personalTaskForm, status: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            >
                              <option value="pending">Pendente</option>
                              <option value="completed">Concluída</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">Matriz de Eisenhower</label>
                          <select
                            value={personalTaskForm.eisenhower_quadrant || 'not_urgent_not_important'}
                            onChange={(e: any) => setPersonalTaskForm({ ...personalTaskForm, eisenhower_quadrant: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                          >
                            <option value="urgent_important">Urgente e Importante (Fazer agora)</option>
                            <option value="not_urgent_important">Não Urgente, mas Importante (Agendar)</option>
                            <option value="urgent_not_important">Urgente, mas Não Importante (Delegar)</option>
                            <option value="not_urgent_not_important">Não Urgente e Não Importante (Eliminar)</option>
                          </select>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          {personalTaskForm.id && (
                            <button 
                              onClick={() => setPersonalTaskForm({ title: '', description: '', due_date: '', priority: 'medium', status: 'pending', eisenhower_quadrant: 'not_urgent_not_important' })}
                              className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                              Cancelar
                            </button>
                          )}
                          <button 
                            onClick={async () => {
                              if (!personalTaskForm.title) {
                                dialogAlert('Preencha o título da tarefa.');
                                return;
                              }
                              await handleSavePersonalTask();
                            }}
                            className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
                          >
                            {personalTaskForm.id ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Task List */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card title="Minhas Tarefas" icon={ListTodo}>
                      <div className="space-y-3">
                        {personalTasks.length > 0 ? (
                          personalTasks.map(task => (
                            <div key={task.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4 transition-all", task.status === 'completed' ? "bg-gray-50 border-gray-200 opacity-75" : "bg-white border-gray-100 shadow-sm")}>
                              <div className="flex items-start gap-3">
                                <button 
                                  onClick={() => handleTogglePersonalTask(task)}
                                  className={cn(
                                    "mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all", 
                                    task.status === 'completed' 
                                      ? "bg-purple-600 border-purple-600 text-white" 
                                      : "border-gray-300 bg-white text-transparent hover:border-purple-500"
                                  )}
                                >
                                  <Check size={14} strokeWidth={3} />
                                </button>
                                <div>
                                  <h5 className={cn("font-bold text-gray-800", task.status === 'completed' && "line-through text-gray-500")}>{task.title}</h5>
                                  {task.description && (
                                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {task.due_date && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                                        <Calendar size={12} />
                                        {new Date(task.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                    <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", 
                                      task.priority === 'high' ? "bg-red-100 text-red-700" : 
                                      task.priority === 'medium' ? "bg-amber-100 text-amber-700" : 
                                      "bg-blue-100 text-blue-700"
                                    )}>
                                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'} Prioridade
                                    </span>
                                    {task.eisenhower_quadrant && (
                                      <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", 
                                        task.eisenhower_quadrant === 'urgent_important' ? "bg-red-50 text-red-600 border border-red-100" : 
                                        task.eisenhower_quadrant === 'not_urgent_important' ? "bg-blue-50 text-blue-600 border border-blue-100" : 
                                        task.eisenhower_quadrant === 'urgent_not_important' ? "bg-amber-50 text-amber-600 border border-amber-100" : 
                                        "bg-gray-50 text-gray-600 border border-gray-100"
                                      )}>
                                        {task.eisenhower_quadrant === 'urgent_important' ? 'Fazer Agora' : 
                                         task.eisenhower_quadrant === 'not_urgent_important' ? 'Agendar' : 
                                         task.eisenhower_quadrant === 'urgent_not_important' ? 'Delegar' : 'Eliminar'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:self-center self-end">
                                <button onClick={() => setPersonalTaskForm(task)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-white rounded-lg border border-gray-100 shadow-sm">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeletePersonalTask(task.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-lg border border-gray-100 shadow-sm">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-gray-400">
                            <ListTodo size={48} className="mx-auto mb-3 opacity-20" />
                            <p>Nenhuma tarefa cadastrada.</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'personal_eisenhower' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Quadrant 1: Urgent & Important */}
                    <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                      <div className="bg-red-500 px-4 py-3 flex items-center justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2">
                          <AlertCircle size={18} />
                          Fazer Agora (Urgente e Importante)
                        </h3>
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {personalTasks.filter(t => t.eisenhower_quadrant === 'urgent_important' && t.status === 'pending').length}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {personalTasks.filter(t => t.eisenhower_quadrant === 'urgent_important' && t.status === 'pending').length > 0 ? (
                          personalTasks.filter(t => t.eisenhower_quadrant === 'urgent_important' && t.status === 'pending').map(task => (
                            <div key={task.id} className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-center justify-between group">
                              <span className="text-sm font-semibold text-gray-800">{task.title}</span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleTogglePersonalTask(task)} 
                                  className="p-1.5 text-red-400 hover:text-green-600 transition-colors border border-red-100 rounded bg-white hover:bg-green-50"
                                  title="Concluir"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePersonalTask(task.id)} 
                                  className="p-1.5 text-red-400 hover:text-red-600 transition-colors border border-red-100 rounded bg-white hover:bg-red-50"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-4 text-gray-400 text-sm">Nada para agora.</p>
                        )}
                      </div>
                    </div>

                    {/* Quadrant 2: Not Urgent & Important */}
                    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
                      <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2">
                          <Calendar size={18} />
                          Agendar (Importante, não Urgente)
                        </h3>
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {personalTasks.filter(t => t.eisenhower_quadrant === 'not_urgent_important' && t.status === 'pending').length}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {personalTasks.filter(t => t.eisenhower_quadrant === 'not_urgent_important' && t.status === 'pending').length > 0 ? (
                          personalTasks.filter(t => t.eisenhower_quadrant === 'not_urgent_important' && t.status === 'pending').map(task => (
                            <div key={task.id} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between group">
                              <span className="text-sm font-semibold text-gray-800">{task.title}</span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleTogglePersonalTask(task)} 
                                  className="p-1.5 text-blue-400 hover:text-green-600 transition-colors border border-blue-100 rounded bg-white hover:bg-green-50"
                                  title="Concluir"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePersonalTask(task.id)} 
                                  className="p-1.5 text-blue-400 hover:text-red-600 transition-colors border border-blue-100 rounded bg-white hover:bg-red-50"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-4 text-gray-400 text-sm">Nada agendado.</p>
                        )}
                      </div>
                    </div>

                    {/* Quadrant 3: Urgent & Not Important */}
                    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                      <div className="bg-amber-500 px-4 py-3 flex items-center justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2">
                          <Users size={18} />
                          Delegar (Urgente, não Importante)
                        </h3>
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {personalTasks.filter(t => t.eisenhower_quadrant === 'urgent_not_important' && t.status === 'pending').length}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {personalTasks.filter(t => t.eisenhower_quadrant === 'urgent_not_important' && t.status === 'pending').length > 0 ? (
                          personalTasks.filter(t => t.eisenhower_quadrant === 'urgent_not_important' && t.status === 'pending').map(task => (
                            <div key={task.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between group">
                              <span className="text-sm font-semibold text-gray-800">{task.title}</span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleTogglePersonalTask(task)} 
                                  className="p-1.5 text-amber-400 hover:text-green-600 transition-colors border border-amber-100 rounded bg-white hover:bg-green-50"
                                  title="Concluir"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePersonalTask(task.id)} 
                                  className="p-1.5 text-amber-400 hover:text-red-600 transition-colors border border-amber-100 rounded bg-white hover:bg-red-50"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-4 text-gray-400 text-sm">Nada para delegar.</p>
                        )}
                      </div>
                    </div>

                    {/* Quadrant 4: Not Urgent & Not Important */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="bg-gray-500 px-4 py-3 flex items-center justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2">
                          <Trash2 size={18} />
                          Eliminar (Não Urgente, não Importante)
                        </h3>
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {personalTasks.filter(t => t.eisenhower_quadrant === 'not_urgent_not_important' && t.status === 'pending').length}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {personalTasks.filter(t => t.eisenhower_quadrant === 'not_urgent_not_important' && t.status === 'pending').length > 0 ? (
                          personalTasks.filter(t => t.eisenhower_quadrant === 'not_urgent_not_important' && t.status === 'pending').map(task => (
                            <div key={task.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group">
                              <span className="text-sm font-semibold text-gray-800">{task.title}</span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleTogglePersonalTask(task)} 
                                  className="p-1.5 text-gray-400 hover:text-green-600 transition-colors border border-gray-200 rounded bg-white hover:bg-green-50"
                                  title="Concluir"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePersonalTask(task.id)} 
                                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors border border-gray-200 rounded bg-white hover:bg-red-50"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-4 text-gray-400 text-sm">Nada para eliminar.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeModule === 'work' && (
            <motion.div key="work" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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

              {activeTab === 'work_clients' && (
                <>
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
                                dialogAlert('Nome e Telefone são obrigatórios.');
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
                        <div className="mb-4 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                          />
                        </div>
                        <div className="max-h-[400px] overflow-y-auto space-y-2">
                          {clients
                            .filter(client => 
                              client.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                              (client.phone && client.phone.includes(clientSearch))
                            )
                            .map(client => {
                              const lastPurchaseDate = client.last_purchase ? new Date(client.last_purchase) : null;
                            const isInactive = lastPurchaseDate && (new Date().getTime() - lastPurchaseDate.getTime()) > (60 * 24 * 60 * 60 * 1000);
                            
                            return (
                              <div key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800">{client.name}</span>
                                    {isInactive && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">Inativo</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                    {client.phone && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Phone size={10} /> {client.phone}
                                      </span>
                                    )}
                                    <span className={cn(
                                      "text-[10px] flex items-center gap-1 font-medium",
                                      client.last_purchase ? "text-indigo-600" : "text-gray-400"
                                    )}>
                                      <ShoppingBag size={10} /> 
                                      {client.last_purchase 
                                        ? `Última compra: ${new Date(client.last_purchase).toLocaleDateString('pt-BR')}`
                                        : 'Nenhuma compra'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => {
                                    setEditingClient(client);
                                    setClientForm({ name: client.name, phone: client.phone || '' });
                                  }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                                  <button onClick={async () => {
                                    if (await dialogConfirm('Excluir cliente?')) {
                                      await fetchWithAuth(`/api/clients/${client.id}`, { method: 'DELETE' });
                                      fetchClients();
                                    }
                                  }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>

                    {/* Right Column: Installments Dashboard */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* New Sale Form */}
                      <Card title="Nova Venda Parcelada" icon={ShoppingBag}>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cliente</label>
                              <select
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-[42px]"
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
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                                dialogAlert('Venda registrada com sucesso!');
                              } catch (e) {
                                console.error(e);
                                dialogAlert('Erro ao registrar venda.');
                              }
                            }}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                          >
                            Registrar Venda
                          </button>
                        </div>
                      </Card>

                      <Card title={`Parcelas a Receber - ${new Date(finFilter.year, finFilter.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`} icon={Calendar}>
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={exportClientReport}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            <Download size={14} /> Exportar PDF
                          </button>
                        </div>
                        <div className="space-y-3">
                          {clientInstallments.length > 0 ? (
                            clientInstallments.map(inst => (
                              <div key={inst.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[10px] md:text-xs", inst.status === 'pago' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                                    {String(inst.installment_number).padStart(2, '0')}/{String(inst.client_sales?.installment_count || 1).padStart(2, '0')}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm md:text-base truncate">{inst.client_sales?.clients?.name}</h4>
                                    <p className="text-[10px] md:text-xs text-gray-500 truncate">{inst.client_sales?.description}</p>
                                    <p className="text-[10px] md:text-xs font-semibold text-indigo-600">Venc: {formatDateString(inst.due_date)}</p>
                                  </div>
                                  <div className="text-right sm:hidden flex-shrink-0">
                                    <span className="block font-bold text-gray-900 text-sm">R$ {Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 flex-shrink-0">
                                  <div className="hidden sm:block text-right">
                                    <span className="block font-bold text-gray-900">R$ {Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                      onClick={() => {
                                        setEditingClientInstallment(inst);
                                        setClientInstallmentForm({
                                          amount: inst.amount.toString(),
                                          due_date: inst.due_date,
                                          status: inst.status
                                        });
                                      }}
                                      className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg"
                                      title="Editar"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteClientInstallment(inst.id)}
                                      className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"
                                      title="Apagar"
                                    >
                                      <Trash2 size={16} />
                                    </button>
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
                                      className={cn("text-[10px] font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors", inst.status === 'pago' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}
                                    >
                                      {inst.status === 'pago' ? 'Recebido' : 'Receber'}
                                    </button>
                                    {inst.status === 'pendente' && inst.client_sales?.clients?.phone && (
                                      <a
                                        href={`https://wa.me/${inst.client_sales.clients.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${inst.client_sales.clients.name}, lembrete de vencimento da parcela ${String(inst.installment_number).padStart(2, '0')}/${String(inst.client_sales.installment_count || 1).padStart(2, '0')} referente a ${inst.client_sales.description}. Valor: R$ ${Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Vencimento: ${formatDateString(inst.due_date)}.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200"
                                        title="WhatsApp"
                                      >
                                        <Phone size={16} />
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
                </>
              )}

              {activeTab === 'work_messages' && (
                <div className="space-y-6">
                  <Card title="Mensagem em Massa (WhatsApp)" icon={MessageSquare}>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Crie uma mensagem padrão para enviar aos seus clientes. Use <span className="font-bold text-indigo-600">{'{nome}'}</span> para inserir o nome do cliente automaticamente.
                      </p>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Mensagem</label>
                        <textarea
                          value={whatsappMessageTemplate}
                          onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-y min-h-[120px]"
                          placeholder="Olá {nome}, tudo bem?"
                        />
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-gray-800">Selecione os clientes para enviar:</h4>
                          {sentMessages.length > 0 && (
                            <button
                              onClick={() => setSentMessages([])}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              Reiniciar Envios
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {clients.length > 0 ? (
                            clients.map(client => {
                              const message = whatsappMessageTemplate.replace(/{nome}/g, client.name);
                              const whatsappLink = client.phone ? `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` : '#';
                              const hasSent = sentMessages.includes(client.id);
                              
                              return (
                                <div key={client.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 gap-4">
                                  <div>
                                    <h5 className="font-bold text-gray-800">{client.name}</h5>
                                    <p className="text-xs text-gray-500">{client.phone || 'Sem telefone'}</p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <a
                                      href={whatsappLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => {
                                        if (client.phone && !hasSent) {
                                          setSentMessages(prev => [...prev, client.id]);
                                        }
                                      }}
                                      className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors",
                                        !client.phone 
                                          ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                                          : hasSent
                                            ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                            : "bg-green-100 text-green-700 hover:bg-green-200"
                                      )}
                                    >
                                      {hasSent ? <CheckCircle2 size={16} /> : <MessageSquare size={16} />}
                                      {hasSent ? 'Enviado' : 'Enviar Mensagem'}
                                    </a>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-gray-400">
                              <p>Nenhum cliente cadastrado.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'work_safety' && (
                <SafetyReportGenerator fetchWithAuth={fetchWithAuth} />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {editingClientInstallment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 md:p-6">
            <h3 className="text-lg font-bold mb-4">Editar Parcela</h3>
            <div className="space-y-4">
              <Input 
                label="Valor" 
                type="number" 
                value={clientInstallmentForm.amount} 
                onChange={(e: any) => setClientInstallmentForm({...clientInstallmentForm, amount: e.target.value})} 
              />
              <Input 
                label="Vencimento" 
                type="date" 
                value={clientInstallmentForm.due_date} 
                onChange={(e: any) => setClientInstallmentForm({...clientInstallmentForm, due_date: e.target.value})} 
              />
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={clientInstallmentForm.status}
                  onChange={(e: any) => setClientInstallmentForm({...clientInstallmentForm, status: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button 
                onClick={() => setEditingClientInstallment(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveClientInstallment}
                className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-1 pb-safe z-20 print:hidden">
        <div className="max-w-6xl mx-auto flex justify-between w-full">
          {activeModule === 'academic' ? (
            <>
              <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dash" />
              <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={Users} label="Presença" />
              <TabButton active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={FileText} label="Notas" />
              <TabButton active={activeTab === 'web'} onClick={() => setActiveTab('web')} icon={MonitorPlay} label="Web" />
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Config" />
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Shield} label="Usuários" />
            </>
          ) : activeModule === 'financial' ? (
            <>
              <TabButton active={activeTab === 'fin_dashboard'} onClick={() => setActiveTab('fin_dashboard')} icon={LayoutDashboard} label="Dash" />
              <TabButton active={activeTab === 'fin_extract'} onClick={() => setActiveTab('fin_extract')} icon={Search} label="Extrato" />
              <TabButton active={activeTab === 'fin_credit'} onClick={() => setActiveTab('fin_credit')} icon={CreditCard} label="Crédito" />
              <TabButton active={activeTab === 'fin_transactions'} onClick={() => setActiveTab('fin_transactions')} icon={ArrowRightLeft} label="Lançamentos" />
              <TabButton active={activeTab === 'fin_settings'} onClick={() => setActiveTab('fin_settings')} icon={Settings} label="Config" />
            </>
          ) : activeModule === 'chacara' ? (
            <>
              <TabButton active={activeTab === 'chacara_dashboard'} onClick={() => setActiveTab('chacara_dashboard')} icon={LayoutDashboard} label="Dashboard" />
              <TabButton active={activeTab === 'chacara_expenses'} onClick={() => setActiveTab('chacara_expenses')} icon={Banknote} label="Despesas" />
              <TabButton active={activeTab === 'chacara_main'} onClick={() => setActiveTab('chacara_main')} icon={PlusCircle} label="Lançar Conta" />
              <TabButton active={activeTab === 'chacara_history'} onClick={() => setActiveTab('chacara_history')} icon={History} label="Histórico" />
              <TabButton active={activeTab === 'chacara_users'} onClick={() => setActiveTab('chacara_users')} icon={Users} label="Usuários" />
              <TabButton active={activeTab === 'chacara_settings'} onClick={() => setActiveTab('chacara_settings')} icon={Settings} label="Config" />
            </>
          ) : activeModule === 'personal' ? (
            <>
              <TabButton active={activeTab === 'personal_tasks'} onClick={() => setActiveTab('personal_tasks')} icon={ListTodo} label="Tarefas" />
              <TabButton active={activeTab === 'personal_eisenhower'} onClick={() => setActiveTab('personal_eisenhower')} icon={LayoutGrid} label="Matriz" />
            </>
          ) : (
            <>
              <TabButton active={activeTab === 'work_clients'} onClick={() => setActiveTab('work_clients')} icon={Users} label="Clientes" />
              <TabButton active={activeTab === 'work_messages'} onClick={() => setActiveTab('work_messages')} icon={MessageSquare} label="Mensagens" />
              <TabButton active={activeTab === 'work_safety'} onClick={() => setActiveTab('work_safety')} icon={AlertTriangle} label="Segurança" />
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
