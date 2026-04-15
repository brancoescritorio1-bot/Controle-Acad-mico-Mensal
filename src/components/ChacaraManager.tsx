import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Zap, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  MessageCircle, 
  Calendar,
  DollarSign,
  ArrowRight,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Search,
  History,
  PlusCircle,
  Shield,
  Briefcase,
  Layers,
  PieChart,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChacaraUser, ChacaraBill, ChacaraSettings } from '../types';
import { ChacaraFinanceDashboard } from './ChacaraFinanceDashboard';
import { useDialog } from './DialogContext';
import { StrictFinanceDashboard, Lancamento } from './StrictFinanceDashboard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChacaraManagerProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  activeTab: string;
  onDataUpdate?: () => void;
  setActiveTab?: (tab: string) => void;
}

export const ChacaraManager: React.FC<ChacaraManagerProps> = ({ fetchWithAuth, activeTab, onDataUpdate, setActiveTab }) => {
  const { confirm: dialogConfirm, alert: dialogAlert } = useDialog();
  const [users, setUsers] = useState<ChacaraUser[]>([]);
  const [bills, setBills] = useState<ChacaraBill[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settings, setSettings] = useState<ChacaraSettings>({
    id: 1,
    default_kwh: 0.95,
    default_water_value: 5.00,
    default_water_service_fee: 0,
    default_apportionment_value: 20.00,
    default_due_day: 10,
    default_reading_day: 5,
    reserve_fund_value: 50.00,
    default_month_reference: ''
  });

  // Form States
  const [userForm, setUserForm] = useState({ 
    name: '', 
    phone: '', 
    has_energy: true, 
    has_water: true, 
    energy_meters_count: 1, 
    water_meters_count: 1,
    energy_active: true,
    water_active: true
  });
  const [editingUser, setEditingUser] = useState<ChacaraUser | null>(null);
  
  const [billForm, setBillForm] = useState({
    user_id: '',
    month_reference: new Date().toISOString().slice(0, 7), // YYYY-MM
    reading_date: '',
    due_date: '',
    // Energy
    prev_reading: 0,
    curr_reading: 0,
    prev_reading_2: 0,
    curr_reading_2: 0,
    kwh_value: 0,
    // Water
    water_prev_reading: 0,
    water_curr_reading: 0,
    water_prev_reading_2: 0,
    water_curr_reading_2: 0,
    water_value: 0,
    water_service_fee: 0,
    // Apportionment
    apportionment_value: 0,
    include_apportionment: true,
    
    include_reserve_fund: true,
    status: 'pending' as 'pending' | 'paid',
    payment_date: '',
    energy_readings: [] as { prev: number; curr: number }[],
    water_readings: [] as { prev: number; curr: number }[]
  });
  const [editingBill, setEditingBill] = useState<ChacaraBill | null>(null);
  
  const [expenseForm, setExpenseForm] = useState({
    month_reference: new Date().toISOString().slice(0, 7),
    description: '',
    category: 'manutencao',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    receipt_url: ''
  });
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchBill, setSearchBill] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'partial'>('all');
  const [paymentDateModal, setPaymentDateModal] = useState<{isOpen: boolean, bill: ChacaraBill | null, date: string, amountPaid: number, paidCategories: Record<string, boolean>}>({isOpen: false, bill: null, date: '', amountPaid: 0, paidCategories: {}});

  const calculateBillCategories = (bill: ChacaraBill) => {
    const energyConsumption = bill.energy_readings && bill.energy_readings.length > 0
      ? bill.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.curr_reading || 0) - (bill.prev_reading || 0) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
    const energyTotal = energyConsumption * bill.kwh_value;
    
    const waterConsumption = bill.water_readings && bill.water_readings.length > 0
      ? bill.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
    const waterValueTotal = waterConsumption * (bill.water_value || 0);
    
    const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
    const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
    const serviceFee = bill.water_service_fee || 0;

    return {
      energy_total: energyTotal,
      water_total: waterValueTotal,
      apportionment: apportionment,
      reserve_fund: reserveFund,
      water_service_fee: serviceFee
    };
  };

  const [settingsForm, setSettingsForm] = useState<ChacaraSettings>(settings);

  const selectedUserForBill = users.find(u => u.id === Number(billForm.user_id));
  const showEnergy = selectedUserForBill ? (selectedUserForBill.has_energy !== false && selectedUserForBill.energy_active !== false) : true;
  const showWater = selectedUserForBill ? (selectedUserForBill.has_water !== false && selectedUserForBill.water_active !== false) : true;

  const filteredBills = bills.filter(bill => {
    if (filterMonth && bill.month_reference !== filterMonth) return false;
    
    if (statusFilter !== 'all' && bill.status !== statusFilter) return false;
    
    if (searchBill) {
      const user = users.find(u => u.id === bill.chacara_user_id);
      if (!user) return false;
      const searchLower = searchBill.toLowerCase();
      return user.name.toLowerCase().includes(searchLower) || user.phone.includes(searchLower);
    }
    return true;
  });

  const totalToPay = filteredBills.reduce((acc, bill) => acc + bill.total, 0);
  const totalPaid = filteredBills.reduce((acc, bill) => acc + (bill.status === 'paid' ? bill.total : (bill.amount_paid || 0)), 0);
  const totalPending = totalToPay - totalPaid;

  const statsBills = bills.filter(bill => !filterMonth || bill.month_reference === filterMonth);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, billsRes, settingsRes, expensesRes] = await Promise.all([
        fetchWithAuth('/api/chacara/users'),
        fetchWithAuth('/api/chacara/bills'),
        fetchWithAuth('/api/chacara/settings'),
        fetchWithAuth('/api/chacara/expenses')
      ]);

      const processRes = async (res: Response, name: string) => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error(`Error parsing JSON for ${name}. Status: ${res.status}. Text:`, text.substring(0, 100));
          throw e;
        }
      };

      const users = await processRes(usersRes, 'users');
      if (users) setUsers(users);

      const bills = await processRes(billsRes, 'bills');
      if (bills) setBills(bills);

      const exps = await processRes(expensesRes, 'expenses');
      if (exps) setExpenses(exps);

      const s = await processRes(settingsRes, 'settings');
      if (s) {
        setSettings(s);
        setSettingsForm(s);
        
        // Apply default month reference if set and not editing
        if (s.default_month_reference && !editingBill && !billForm.user_id) {
           setBillForm(prev => ({ ...prev, month_reference: s.default_month_reference }));
           setFilterMonth(s.default_month_reference);
        }
      }
    } catch (error) {
      console.error('Error fetching chacara data:', error);
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.phone) {
      dialogAlert('Nome e telefone são obrigatórios.');
      return;
    }

    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `/api/chacara/users/${editingUser.id}` : '/api/chacara/users';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(userForm)
      });

      if (res.ok) {
        setUserForm({ 
          name: '', 
          phone: '', 
          has_energy: true, 
          has_water: true, 
          energy_meters_count: 1, 
          water_meters_count: 1,
          energy_active: true,
          water_active: true
        });
        setEditingUser(null);
        await fetchData();
        if (onDataUpdate) onDataUpdate();
        dialogAlert(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
      } else {
        const errorData = await res.json();
        dialogAlert(`Erro ao salvar usuário: ${errorData.message || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      dialogAlert('Erro ao salvar usuário. Verifique o console para mais detalhes.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!(await dialogConfirm('Deseja realmente excluir este usuário?'))) return;
    try {
      await fetchWithAuth(`/api/chacara/users/${id}`, { method: 'DELETE' });
      fetchData();
      if (onDataUpdate) onDataUpdate();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleUserSelectForBill = (userId: string) => {
    const user = users.find(u => u.id === Number(userId));
    if (user) {
      const now = new Date();
      const readingDate = new Date(now.getFullYear(), now.getMonth() - 1, settings.default_reading_day);
      const dueDate = new Date(now.getFullYear(), now.getMonth(), settings.default_due_day);
      const currentMonthRef = billForm.month_reference;

      // Initialize energy readings
      const energyReadings = [];
      const energyCount = user.energy_meters_count || 1;
      for (let i = 0; i < energyCount; i++) {
        let prev = 0;
        if (user.energy_readings && user.energy_readings[i]) {
          prev = user.energy_readings[i].curr;
        } else if (i === 0) {
          prev = user.last_reading || 0;
        } else if (i === 1) {
          prev = user.last_reading_2 || 0;
        }
        energyReadings.push({ prev, curr: 0 });
      }

      // Initialize water readings
      const waterReadings = [];
      const waterCount = user.water_meters_count || 1;
      for (let i = 0; i < waterCount; i++) {
        let prev = 0;
        if (user.water_readings && user.water_readings[i]) {
          prev = user.water_readings[i].curr;
        } else if (i === 0) {
          prev = user.last_water_reading || 0;
        } else if (i === 1) {
          prev = user.last_water_reading_2 || 0;
        }
        waterReadings.push({ prev, curr: 0 });
      }

      setBillForm({
        ...billForm,
        user_id: userId,
        prev_reading: user.last_reading || 0,
        prev_reading_2: user.last_reading_2 || 0,
        curr_reading: 0,
        curr_reading_2: 0,
        kwh_value: settings.default_kwh,
        water_prev_reading: user.last_water_reading || 0,
        water_prev_reading_2: user.last_water_reading_2 || 0,
        water_curr_reading: 0,
        water_curr_reading_2: 0,
        water_value: settings.default_water_value,
        water_service_fee: settings.default_water_service_fee || 0,
        apportionment_value: settings.default_apportionment_value,
        include_apportionment: true,
        reading_date: readingDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        month_reference: currentMonthRef,
        energy_readings: energyReadings,
        water_readings: waterReadings
      });
    } else {
      dialogAlert('Usuário não encontrado.');
    }
  };

  const handleClearBillForm = () => {
    setBillForm({
      user_id: '',
      month_reference: settings.default_month_reference || new Date().toISOString().slice(0, 7),
      reading_date: '',
      due_date: '',
      prev_reading: 0,
      curr_reading: 0,
      prev_reading_2: 0,
      curr_reading_2: 0,
      kwh_value: settings.default_kwh,
      water_prev_reading: 0,
      water_curr_reading: 0,
      water_prev_reading_2: 0,
      water_curr_reading_2: 0,
      water_value: settings.default_water_value,
      water_service_fee: settings.default_water_service_fee || 0,
      apportionment_value: settings.default_apportionment_value,
      include_apportionment: true,
      include_reserve_fund: true,
      status: 'pending',
      payment_date: '',
      energy_readings: [],
      water_readings: []
    });
    setEditingBill(null);
  };

  const handleSaveBill = async (sendWhatsAppAfterSave: boolean = false) => {
    console.log('DEBUG: handleSaveBill - users:', users);
    console.log('DEBUG: handleSaveBill - billForm.user_id:', billForm.user_id);
    const user = users.find(u => u.id === Number(billForm.user_id));
    console.log('DEBUG: handleSaveBill - found user:', user);
    const hasEnergy = user ? (user.has_energy !== false && user.energy_active !== false) : true;
    const hasWater = user ? (user.has_water !== false && user.water_active !== false) : true;

    if (!billForm.user_id) {
      dialogAlert('Selecione um usuário.');
      return;
    }

    if (hasEnergy && (!billForm.energy_readings || billForm.energy_readings.length === 0 || billForm.energy_readings[0].curr === undefined || billForm.energy_readings[0].curr === null)) {
      dialogAlert('Leitura atual de energia é obrigatória.');
      return;
    }

    if (hasWater && (!billForm.water_readings || billForm.water_readings.length === 0 || billForm.water_readings[0].curr === undefined || billForm.water_readings[0].curr === null)) {
      dialogAlert('Leitura atual de água é obrigatória.');
      return;
    }

    const consumption = billForm.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0);
    const waterConsumption = billForm.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0);

    // Validation
    for (let i = 0; i < billForm.energy_readings.length; i++) {
      if (hasEnergy && billForm.energy_readings[i].curr < billForm.energy_readings[i].prev) {
        dialogAlert(`A leitura atual de energia (Padrão ${i + 1}) não pode ser menor que a anterior.`);
        return;
      }
    }
    for (let i = 0; i < billForm.water_readings.length; i++) {
      if (hasWater && billForm.water_readings[i].curr < billForm.water_readings[i].prev) {
        dialogAlert(`A leitura atual de água (Hidrômetro ${i + 1}) não pode ser menor que a anterior.`);
        return;
      }
    }

    const energyTotal = hasEnergy ? (consumption * billForm.kwh_value) : 0;
    const waterTotal = hasWater ? (waterConsumption * billForm.water_value) : 0;
    const apportionment = billForm.include_apportionment ? billForm.apportionment_value : 0;
    const reserveFund = billForm.include_reserve_fund ? settings.reserve_fund_value : 0;
    const waterServiceFee = hasWater ? (billForm.water_service_fee || 0) : 0;
    
    const total = energyTotal + waterTotal + apportionment + reserveFund + waterServiceFee;

    const payload = {
      ...billForm,
      chacara_user_id: Number(billForm.user_id),
      reserve_fund: reserveFund,
      water_service_fee: waterServiceFee,
      total: total,
      // Fallback for old columns
      prev_reading: billForm.energy_readings[0]?.prev || 0,
      curr_reading: billForm.energy_readings[0]?.curr || 0,
      prev_reading_2: billForm.energy_readings[1]?.prev || 0,
      curr_reading_2: billForm.energy_readings[1]?.curr || 0,
      water_prev_reading: billForm.water_readings[0]?.prev || 0,
      water_curr_reading: billForm.water_readings[0]?.curr || 0,
      water_prev_reading_2: billForm.water_readings[1]?.prev || 0,
      water_curr_reading_2: billForm.water_readings[1]?.curr || 0
    };

    try {
      const method = editingBill ? 'PUT' : 'POST';
      const url = editingBill ? `/api/chacara/bills/${editingBill.id}` : '/api/chacara/bills';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedBill = await res.json();
        const wasEditing = !!editingBill;
        handleClearBillForm();
        // Update filter to show the month of the newly saved bill
        setFilterMonth(payload.month_reference);
        fetchData();
        if (onDataUpdate) onDataUpdate();
        
        if (sendWhatsAppAfterSave) {
          sendWhatsApp(savedBill);
        } else {
          dialogAlert(wasEditing ? 'Conta atualizada com sucesso!' : 'Conta lançada com sucesso!');
        }
        
        if (wasEditing && setActiveTab) {
          setActiveTab('chacara_history');
        }
      } else {
        const errorData = await res.json();
        dialogAlert(`Erro ao salvar conta: ${errorData.message || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      dialogAlert('Erro ao salvar conta. Verifique o console para mais detalhes.');
    }
  };

  const handleDeleteBill = async (id: number) => {
    if (!(await dialogConfirm('Deseja realmente excluir este lançamento?'))) return;
    try {
      await fetchWithAuth(`/api/chacara/bills/${id}`, { method: 'DELETE' });
      fetchData();
      if (onDataUpdate) onDataUpdate();
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      dialogAlert('Preencha a descrição e o valor da despesa.');
      return;
    }

    try {
      const url = editingExpense ? `/api/chacara/expenses/${editingExpense.id}` : '/api/chacara/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      
      if (res.ok) {
        setExpenseForm({
          month_reference: new Date().toISOString().slice(0, 7),
          description: '',
          category: 'manutencao',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          receipt_url: ''
        });
        setEditingExpense(null);
        fetchData();
        if (onDataUpdate) onDataUpdate();
      }
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!(await dialogConfirm('Tem certeza que deseja excluir esta despesa?'))) return;
    try {
      const res = await fetchWithAuth(`/api/chacara/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        if (onDataUpdate) onDataUpdate();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseForm({
      month_reference: expense.month_reference || new Date().toISOString().slice(0, 7),
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      receipt_url: expense.receipt_url || ''
    });
    if (setActiveTab) {
      setActiveTab('chacara_expenses');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      dialogAlert('O arquivo deve ter no máximo 50MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setExpenseForm(prev => ({ ...prev, receipt_url: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditBill = (bill: ChacaraBill) => {
    setEditingBill(bill);
    
    const user = users.find(u => u.id === bill.chacara_user_id);
    const energyCount = user?.energy_meters_count || 1;
    const waterCount = user?.water_meters_count || 1;

    let energyReadings = [];
    try {
      energyReadings = typeof bill.energy_readings === 'string' ? JSON.parse(bill.energy_readings) : (bill.energy_readings || []);
    } catch (e) {
      energyReadings = [];
    }
    
    if (!Array.isArray(energyReadings) || energyReadings.length === 0) {
      energyReadings = [{ prev: bill.prev_reading || 0, curr: bill.curr_reading || 0 }];
      if (bill.curr_reading_2 || bill.prev_reading_2) {
        energyReadings.push({ prev: bill.prev_reading_2 || 0, curr: bill.curr_reading_2 || 0 });
      }
    }

    while (energyReadings.length < energyCount) {
      energyReadings.push({ prev: 0, curr: 0 });
    }

    let waterReadings = [];
    try {
      waterReadings = typeof bill.water_readings === 'string' ? JSON.parse(bill.water_readings) : (bill.water_readings || []);
    } catch (e) {
      waterReadings = [];
    }
    
    if (!Array.isArray(waterReadings) || waterReadings.length === 0) {
      waterReadings = [{ prev: bill.water_prev_reading || 0, curr: bill.water_curr_reading || 0 }];
      if (bill.water_curr_reading_2 || bill.water_prev_reading_2) {
        waterReadings.push({ prev: bill.water_prev_reading_2 || 0, curr: bill.water_curr_reading_2 || 0 });
      }
    }

    while (waterReadings.length < waterCount) {
      waterReadings.push({ prev: 0, curr: 0 });
    }

    setBillForm({
      user_id: String(bill.chacara_user_id),
      month_reference: bill.month_reference || '',
      reading_date: bill.reading_date ? String(bill.reading_date).split('T')[0].split(' ')[0] : '',
      due_date: bill.due_date ? String(bill.due_date).split('T')[0].split(' ')[0] : '',
      prev_reading: bill.prev_reading || 0,
      curr_reading: bill.curr_reading || 0,
      prev_reading_2: bill.prev_reading_2 || 0,
      curr_reading_2: bill.curr_reading_2 || 0,
      kwh_value: bill.kwh_value || 0,
      water_prev_reading: bill.water_prev_reading || 0,
      water_curr_reading: bill.water_curr_reading || 0,
      water_prev_reading_2: bill.water_prev_reading_2 || 0,
      water_curr_reading_2: bill.water_curr_reading_2 || 0,
      water_value: bill.water_value || 0,
      water_service_fee: bill.water_service_fee || 0,
      apportionment_value: bill.apportionment_value || 0,
      include_apportionment: bill.include_apportionment ?? true,
      include_reserve_fund: bill.include_reserve_fund ?? true,
      status: bill.status || 'pending',
      payment_date: bill.payment_date ? String(bill.payment_date).split('T')[0].split(' ')[0] : '',
      energy_readings: energyReadings,
      water_readings: waterReadings
    });
    // Change tab to main to show the form
    if (setActiveTab) {
      setActiveTab('chacara_main');
    }
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatusClick = (bill: ChacaraBill) => {
    const defaultCategories = {
      reserve_fund: true,
      water_service_fee: true,
      water_total: true,
      energy_total: true,
      apportionment: true
    };
    
    const initialCategories = bill.paid_categories && Object.keys(bill.paid_categories).length > 0 
      ? bill.paid_categories 
      : defaultCategories;

    const cats = calculateBillCategories(bill);
    const items = [
      { key: 'reserve_fund', value: cats.reserve_fund },
      { key: 'water_service_fee', value: cats.water_service_fee },
      { key: 'water_total', value: cats.water_total },
      { key: 'energy_total', value: cats.energy_total },
      { key: 'apportionment', value: cats.apportionment }
    ];
    
    const initialAmount = items.reduce((sum, item) => sum + (initialCategories[item.key] ? item.value : 0), 0);

    setPaymentDateModal({ 
      isOpen: true, 
      bill, 
      date: bill.payment_date ? String(bill.payment_date).split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0],
      amountPaid: initialAmount,
      paidCategories: initialCategories
    });
  };

  const handleConfirmToggleStatus = async (bill: ChacaraBill, newStatus: 'pending' | 'paid' | 'partial', paymentDate: string | null, amountPaid: number = 0, paidCategories: Record<string, boolean> = {}) => {
    try {
      const finalStatus = amountPaid === 0 ? 'pending' : (amountPaid >= bill.total - 0.01 ? 'paid' : 'partial');
      const res = await fetchWithAuth(`/api/chacara/bills/${bill.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...bill,
          status: finalStatus,
          payment_date: paymentDate,
          amount_paid: amountPaid,
          paid_categories: paidCategories
        })
      });
      if (res.ok) {
        fetchData();
        if (onDataUpdate) onDataUpdate();
        setPaymentDateModal({ isOpen: false, bill: null, date: '', amountPaid: 0, paidCategories: {} });
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', errorData);
        dialogAlert(`Erro ao salvar o pagamento. Se você ainda não executou o comando SQL no Supabase, por favor execute:\n\nALTER TABLE chacara_bills ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;\n\nDetalhes do erro: ${errorData.message || errorData.details || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      dialogAlert('Erro de conexão ao tentar salvar o pagamento.');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Energia - Chácara Vivendas da Serra', 14, 20);
    doc.setFontSize(12);
    doc.text(`Mês de Referência: ${filterMonth}`, 14, 30);

    const tableData = filteredBills.map(bill => {
      const user = users.find(u => u.id === bill.chacara_user_id);
      const energyReadings = bill.energy_readings || [];
      const waterReadings = bill.water_readings || [];

      const consumption = energyReadings.length > 0
        ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
      const energyTotal = consumption * bill.kwh_value;
      
      const waterConsumption = waterReadings.length > 0
        ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
      const waterValueTotal = waterConsumption * (bill.water_value || 0);
      const waterServiceFee = bill.water_service_fee || 0;
      
      const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
      const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
      
      const isPaid = bill.status === 'paid';
      const isPartial = bill.status === 'partial' || (!isPaid && (bill.amount_paid || 0) > 0);
      const amountPaid = isPaid ? bill.total : (bill.amount_paid || 0);
      const pendingAmount = isPaid ? 0 : (bill.total - amountPaid);
      
      return [
        user?.name || 'N/I',
        `R$ ${energyTotal.toFixed(2)}`,
        `R$ ${waterValueTotal.toFixed(2)}`,
        `R$ ${apportionment.toFixed(2)}`,
        `R$ ${reserveFund.toFixed(2)}`,
        `R$ ${waterServiceFee.toFixed(2)}`,
        `R$ ${bill.total.toFixed(2)}`,
        `R$ ${amountPaid.toFixed(2)}`,
        `R$ ${pendingAmount.toFixed(2)}`,
        isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'PENDENTE',
        bill.payment_date ? new Date(bill.payment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Usuário', 'Energia', 'Água', 'Rateio', 'Fundo Res.', 'Taxas', 'Total', 'Pago', 'Pendente', 'Status', 'Data Pag.']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 7 },
      didParseCell: (data) => {
        if (data.row.section === 'body' && data.row.raw[9] === 'PAGO') {
          data.cell.styles.textColor = [150, 150, 150];
        }
      },
      didDrawCell: (data) => {
        if (data.row.section === 'body' && data.row.raw[9] === 'PAGO') {
          const { x, y, width, height } = data.cell;
          const midY = y + height / 2;
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.1);
          doc.line(x + 1, midY, x + width - 1, midY);
        }
      }
    });

    const totalMonth = filteredBills.reduce((acc, curr) => acc + curr.total, 0);
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(12);
    doc.text(`Total Geral do Mês: R$ ${totalMonth.toFixed(2)}`, 14, finalY + 10);

    doc.save(`relatorio-energia-${filterMonth}.pdf`);
  };

  useEffect(() => {
    const handleExport = () => {
      if (activeTab === 'chacara_history') {
        exportToPDF();
      }
    };
    window.addEventListener('export-chacara-history', handleExport);
    return () => window.removeEventListener('export-chacara-history', handleExport);
  }, [activeTab, exportToPDF]);

  const handleSaveSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/chacara/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm)
      });

      if (res.ok) {
        setSettings(settingsForm);
        dialogAlert('Configurações salvas!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const sendWhatsApp = (bill: ChacaraBill) => {
    console.log('DEBUG: sendWhatsApp - bill:', bill);
    console.log('DEBUG: sendWhatsApp - users:', users);
    const user = users.find(u => u.id === Number(bill.chacara_user_id));
    console.log('DEBUG: sendWhatsApp - found user:', user);
    if (!user) {
      dialogAlert(`Usuário não encontrado para este lançamento. ID procurado: ${bill.chacara_user_id}`);
      return;
    }

    const hasEnergy = user.has_energy !== false && user.energy_active !== false;
    const hasWater = user.has_water !== false && user.water_active !== false;

    const energyReadings = bill.energy_readings || [];
    const waterReadings = bill.water_readings || [];

    const consumption = energyReadings.length > 0 
      ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
    const energyTotal = consumption * bill.kwh_value;
    
    const waterConsumption = waterReadings.length > 0
      ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
    const waterServiceFee = bill.water_service_fee || 0;
    const waterTotal = (waterConsumption * (bill.water_value || 0)) + waterServiceFee;
    const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
    const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;

    const [year, month] = bill.month_reference.split('-');
    const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    let message = `Olá ${user.name}, tudo bem?
Segue a conta referente à Associação Comunitária Vivendas da Serra do mês ${capitalizedMonth}/${year}.`;

    if (hasEnergy) {
      message += `\n\nEnergia\n\nData da leitura: ${new Date(bill.reading_date + 'T12:00:00').toLocaleDateString('pt-BR')}\n`;
      if (energyReadings.length > 1) {
        energyReadings.forEach((r, idx) => {
          message += `Padrão ${idx + 1}:
Leitura anterior: ${r.prev}
Leitura atual: ${r.curr}
Consumo: ${(r.curr - r.prev).toFixed(2).replace('.', ',')} kWh\n\n`;
        });
        message += `Consumo Total: ${consumption.toFixed(2).replace('.', ',')} kWh\n`;
      } else if (energyReadings.length === 1) {
        message += `Leitura anterior: ${energyReadings[0].prev}
Leitura atual: ${energyReadings[0].curr}
Consumo: ${consumption.toFixed(2).replace('.', ',')} kWh\n`;
      } else {
        // Fallback for old bills
        const c1 = bill.curr_reading - bill.prev_reading;
        const c2 = (bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0);
        if (c2 > 0) {
          message += `Padrão 1: ${c1.toFixed(2).replace('.', ',')} kWh
Padrão 2: ${c2.toFixed(2).replace('.', ',')} kWh
Consumo Total: ${consumption.toFixed(2).replace('.', ',')} kWh\n`;
        } else {
          message += `Leitura anterior: ${bill.prev_reading}
Leitura atual: ${bill.curr_reading}
Consumo: ${consumption.toFixed(2).replace('.', ',')} kWh\n`;
        }
      }
      message += `Valor do kWh: R$ ${bill.kwh_value.toFixed(2).replace('.', ',')}
Valor da energia: R$ ${energyTotal.toFixed(2).replace('.', ',')}`;
    }

    if (hasWater) {
      message += `\n\n\nÁgua\n\n`;
      if (waterReadings.length > 1) {
        waterReadings.forEach((r, idx) => {
          message += `Hidrômetro ${idx + 1}:
Leitura anterior: ${r.prev}
Leitura atual: ${r.curr}
Consumo: ${(r.curr - r.prev).toFixed(2).replace('.', ',')} m³\n\n`;
        });
        message += `Consumo Total: ${waterConsumption.toFixed(2).replace('.', ',')} m³\n`;
      } else if (waterReadings.length === 1) {
        message += `Leitura anterior: ${waterReadings[0].prev}
Leitura atual: ${waterReadings[0].curr}
Consumo: ${waterConsumption.toFixed(2).replace('.', ',')} m³\n`;
      } else {
        // Fallback
        const wc1 = (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0);
        const wc2 = (bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0);
        if (wc2 > 0) {
          message += `Hidrômetro 1: ${wc1.toFixed(2).replace('.', ',')} m³
Hidrômetro 2: ${wc2.toFixed(2).replace('.', ',')} m³
Consumo Total Água: ${waterConsumption.toFixed(2).replace('.', ',')} m³\n`;
        } else {
          message += `Leitura anterior: ${bill.water_prev_reading || 0}
Leitura atual: ${bill.water_curr_reading || 0}
Consumo: ${waterConsumption.toFixed(2).replace('.', ',')} m³\n`;
        }
      }
      message += `Valor do m³: R$ ${(bill.water_value || 0).toFixed(2).replace('.', ',')}
Valor da água: R$ ${(waterConsumption * (bill.water_value || 0)).toFixed(2).replace('.', ',')}
Prestador de serviço: R$ ${waterServiceFee.toFixed(2).replace('.', ',')}
Subtotal: R$ ${waterTotal.toFixed(2).replace('.', ',')}`;
    }

    if (apportionment > 0 || reserveFund > 0) {
      message += `\n\n`;
      const extras = [];
      if (apportionment > 0) extras.push(`Rateio: R$ ${apportionment.toFixed(2).replace('.', ',')}`);
      if (reserveFund > 0) extras.push(`Fundo de Reserva: R$ ${reserveFund.toFixed(2).replace('.', ',')}`);
      message += extras.join('\n');
    }

    message += `\n\nData de vencimento: ${new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    message += `\n\nTotal a pagar: R$ ${bill.total.toFixed(2).replace('.', ',')}`;

    if (settings.whatsapp_observation) {
      message += `\n\n${settings.whatsapp_observation}`;
    }

    const encodedMessage = encodeURIComponent(message);
    const phone = user.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  const generateLancamentos = (): Lancamento[] => {
    const lancamentos: Lancamento[] = [];

    bills.forEach(bill => {
      const isPaid = bill.status === 'paid';
      const isPartial = bill.status === 'partial';

      const fundoReserva = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
      const rateio = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
      const prestador = bill.water_service_fee || 0;

      const energyConsumption = bill.energy_readings && bill.energy_readings.length > 0
        ? bill.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.curr_reading || 0) - (bill.prev_reading || 0) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
      const energia = energyConsumption * (bill.kwh_value || 0);

      const waterConsumption = bill.water_readings && bill.water_readings.length > 0
        ? bill.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
      const agua = waterConsumption * (bill.water_value || 0);

      const calculatedTotal = fundoReserva + rateio + prestador + agua + energia;

      const cats = [
        { cat: 'fundo_reserva', val: fundoReserva },
        { cat: 'rateio', val: rateio },
        { cat: 'prestador', val: prestador },
        { cat: 'agua', val: agua },
        { cat: 'energia', val: energia },
      ];

      const amountPaid = bill.amount_paid || 0;
      const hasPaidCategories = bill.paid_categories && Object.keys(bill.paid_categories).length > 0;

      cats.forEach(c => {
        let valorPagoCat = 0;
        let statusCat: 'pago' | 'pendente' | 'parcial' = 'pendente';

        if (c.val <= 0) {
          valorPagoCat = 0;
          statusCat = 'pago';
        } else if (isPaid) {
          valorPagoCat = c.val;
          statusCat = 'pago';
        } else if (isPartial && hasPaidCategories) {
          const keyMap: Record<string, string> = {
            'fundo_reserva': 'reserve_fund',
            'rateio': 'apportionment',
            'prestador': 'water_service_fee',
            'agua': 'water_total',
            'energia': 'energy_total'
          };
          const isCatPaid = bill.paid_categories![keyMap[c.cat]];
          valorPagoCat = isCatPaid ? c.val : 0;
          statusCat = isCatPaid ? 'pago' : 'pendente';
        } else if (isPartial && !hasPaidCategories) {
          const ratio = calculatedTotal > 0 ? amountPaid / calculatedTotal : 0;
          valorPagoCat = c.val * ratio;
          statusCat = 'parcial';
        } else {
          valorPagoCat = 0;
          statusCat = 'pendente';
        }

        const user = users.find(u => u.id === bill.chacara_user_id);
        const userName = user ? user.name : 'Desconhecido';

        lancamentos.push({
          id: `${bill.id}-${c.cat}`,
          data: bill.due_date,
          mes_referencia: bill.month_reference,
          categoria: c.cat as any,
          tipo: 'receita',
          valor: c.val,
          status: statusCat,
          valor_pago: valorPagoCat,
          descricao: userName
        });
      });
    });

    expenses.forEach(exp => {
      lancamentos.push({
        id: exp.id,
        data: exp.date,
        mes_referencia: exp.month_reference,
        categoria: 'despesa_geral',
        tipo: 'despesa',
        valor: Number(exp.amount),
        status: 'pago',
        valor_pago: Number(exp.amount),
        descricao: exp.description
      });
    });

    return lancamentos;
  };

  const lancamentos = generateLancamentos();

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeTab === 'chacara_dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <StrictFinanceDashboard 
              lancamentos={lancamentos} 
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
              onRefresh={fetchData}
            />
          </motion.div>
        )}
        {activeTab === 'chacara_users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users size={20} className="text-indigo-600" />
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome</label>
                    <input 
                      type="text"
                      value={userForm.name}
                      onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      placeholder="Nome do morador"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Telefone (WhatsApp)</label>
                    <input 
                      type="text"
                      value={userForm.phone}
                      onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={userForm.has_energy}
                            onChange={e => setUserForm({ ...userForm, has_energy: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">Possui Energia?</span>
                        </label>
                        {userForm.has_energy && (
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold text-gray-500 uppercase">Padrões:</label>
                              <input
                                type="number"
                                min={1}
                                value={userForm.energy_meters_count || 1}
                                onChange={e => setUserForm({ ...userForm, energy_meters_count: Number(e.target.value) })}
                                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={userForm.energy_active}
                                onChange={e => setUserForm({ ...userForm, energy_active: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm text-gray-700">{userForm.energy_active ? 'Ligado' : 'Desligado'}</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={userForm.has_water}
                            onChange={e => setUserForm({ ...userForm, has_water: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">Possui Água?</span>
                        </label>
                        {userForm.has_water && (
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold text-gray-500 uppercase">Hidrômetros:</label>
                              <input
                                type="number"
                                min={1}
                                value={userForm.water_meters_count || 1}
                                onChange={e => setUserForm({ ...userForm, water_meters_count: Number(e.target.value) })}
                                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={userForm.water_active}
                                onChange={e => setUserForm({ ...userForm, water_active: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm text-gray-700">{userForm.water_active ? 'Ligado' : 'Desligado'}</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveUser}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                  >
                    <Save size={18} />
                    Salvar Usuário
                  </button>
                  {editingUser && (
                    <button 
                      onClick={() => { setEditingUser(null); setUserForm({ name: '', phone: '', has_energy: true, has_water: true, energy_meters_count: 1, water_meters_count: 1, energy_active: true, water_active: true }); }}
                      className="w-full py-2 text-gray-500 font-semibold hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Telefone</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Serviços</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Última Leitura</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                        <td className="px-6 py-4 font-semibold text-gray-800">{user.name}</td>
                        <td className="px-6 py-4 text-gray-600">{user.phone}</td>
                        <td className="px-6 py-4 text-gray-600 text-xs flex flex-wrap gap-1">
                          {user.has_energy !== false && (
                            <span className={`${user.energy_active !== false ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'} px-2 py-1 rounded-full`}>
                              Energia {user.energy_meters_count && user.energy_meters_count > 1 ? `(${user.energy_meters_count} padrões)` : ''} {user.energy_active === false ? '(Desligado)' : ''}
                            </span>
                          )}
                          {user.has_water !== false && (
                            <span className={`${user.water_active !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'} px-2 py-1 rounded-full`}>
                              Água {user.water_meters_count && user.water_meters_count > 1 ? `(${user.water_meters_count} hidrômetros)` : ''} {user.water_active === false ? '(Desligado)' : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{user.last_reading || 0} kWh</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => { 
                              setEditingUser(user); 
                              setUserForm({ 
                                name: user.name, 
                                phone: user.phone,
                                has_energy: user.has_energy !== undefined ? user.has_energy : true,
                                has_water: user.has_water !== undefined ? user.has_water : true,
                                energy_meters_count: user.energy_meters_count || 1,
                                water_meters_count: user.water_meters_count || 1,
                                energy_active: user.energy_active !== undefined ? user.energy_active : true,
                                water_active: user.water_active !== undefined ? user.water_active : true
                              }); 
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}

        {activeTab === 'chacara_expenses' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Lançamento de Despesas</h2>
                <p className="text-gray-500">Gerencie as despesas e comprovantes</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <Filter size={18} className="text-gray-400" />
                <input 
                  type="month" 
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 outline-none"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PlusCircle size={20} className="text-indigo-600" />
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mês de Referência</label>
                  <input 
                    type="month"
                    value={expenseForm.month_reference}
                    onChange={e => setExpenseForm({ ...expenseForm, month_reference: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Data</label>
                  <input 
                    type="date"
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={expenseForm.amount || ''}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descrição</label>
                  <input 
                    type="text"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="Ex: Manutenção da bomba d'água"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Categoria</label>
                  <select 
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="manutencao">Manutenção</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="energia">Energia</option>
                    <option value="agua">Água</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Comprovante (Imagem ou PDF até 50MB)</label>
                  <input 
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {expenseForm.receipt_url && (
                    <div className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={16} /> Arquivo anexado com sucesso
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button 
                  onClick={handleSaveExpense}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  <Save size={18} />
                  {editingExpense ? 'Atualizar Despesa' : 'Salvar Despesa'}
                </button>
                {editingExpense && (
                  <button 
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseForm({
                        month_reference: new Date().toISOString().slice(0, 7),
                        description: '',
                        category: 'manutencao',
                        amount: 0,
                        date: new Date().toISOString().split('T')[0],
                        receipt_url: ''
                      });
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Despesas do Mês</h3>
                <button
                  onClick={() => {
                    const doc = new jsPDF();
                    const filteredExps = expenses.filter(e => e.month_reference === filterMonth);
                    
                    doc.setFontSize(18);
                    doc.text(`Relatório de Despesas - ${filterMonth}`, 14, 22);
                    
                    const total = filteredExps.reduce((sum, e) => sum + Number(e.amount), 0);
                    doc.setFontSize(12);
                    doc.text(`Total: R$ ${total.toFixed(2)}`, 14, 32);

                    autoTable(doc, {
                      startY: 40,
                      head: [['Data', 'Descrição', 'Categoria', 'Valor (R$)']],
                      body: filteredExps.map(e => [
                        new Date(e.date).toLocaleDateString('pt-BR'),
                        e.description,
                        e.category,
                        Number(e.amount).toFixed(2)
                      ]),
                    });
                    
                    doc.save(`despesas_${filterMonth}.pdf`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
                >
                  <Download size={16} />
                  Exportar PDF
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Descrição</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Valor</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(e => e.month_reference === filterMonth).map(expense => (
                      <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                        <td className="px-6 py-4 text-gray-600">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{expense.description}</td>
                        <td className="px-6 py-4 text-gray-600 capitalize">{expense.category}</td>
                        <td className="px-6 py-4 font-bold text-red-600">R$ {Number(expense.amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {expense.receipt_url && (
                            <button 
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  if (expense.receipt_url.startsWith('data:application/pdf')) {
                                    win.document.write(`<iframe src="${expense.receipt_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  } else {
                                    win.document.write(`<img src="${expense.receipt_url}" style="max-width: 100%; height: auto;" />`);
                                  }
                                }
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Ver Comprovante"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleEditExpense(expense)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenses.filter(e => e.month_reference === filterMonth).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Nenhuma despesa registrada para este mês.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'chacara_main' && (
          <motion.div
            key="bills"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PlusCircle size={20} className="text-indigo-600" />
                {editingBill ? 'Editar Conta' : 'Lançar Nova Conta'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Usuário</label>
                  <select 
                    value={billForm.user_id}
                    onChange={e => handleUserSelectForBill(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="">Selecione um usuário...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mês de Referência</label>
                  <input 
                    type="month"
                    value={billForm.month_reference}
                    onChange={e => setBillForm({ ...billForm, month_reference: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Data da Leitura</label>
                  <input 
                    type="date"
                    value={billForm.reading_date}
                    onChange={e => setBillForm({ ...billForm, reading_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Data de Vencimento</label>
                  <input 
                    type="date"
                    value={billForm.due_date}
                    onChange={e => setBillForm({ ...billForm, due_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                {showEnergy && (
                  <>
                    <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                      <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-500" />
                        Consumo de Energia
                      </h4>
                    </div>
                    {billForm.energy_readings.map((reading, index) => (
                      <React.Fragment key={`energy-${index}`}>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Leitura Anterior (Padrão {index + 1})</label>
                          <input 
                            type="number"
                            value={reading.prev}
                            onChange={e => {
                              const newReadings = [...billForm.energy_readings];
                              newReadings[index].prev = Number(e.target.value);
                              setBillForm({ ...billForm, energy_readings: newReadings });
                            }}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Leitura Atual (Padrão {index + 1})</label>
                          <input 
                            type="number"
                            value={reading.curr}
                            onChange={e => {
                              const newReadings = [...billForm.energy_readings];
                              newReadings[index].curr = Number(e.target.value);
                              setBillForm({ ...billForm, energy_readings: newReadings });
                            }}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </React.Fragment>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor do kWh (R$)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={billForm.kwh_value}
                        onChange={e => setBillForm({ ...billForm, kwh_value: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Reserve Fund Section - Separated */}
                <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-green-500" />
                    Fundo de Reserva
                  </h4>
                </div>
                <div className="col-span-full">
                   <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox"
                        checked={billForm.include_reserve_fund}
                        onChange={e => setBillForm({ ...billForm, include_reserve_fund: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-all ${billForm.include_reserve_fund ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${billForm.include_reserve_fund ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600 transition-all">
                      Incluir Fundo de Reserva (R$ {settings.reserve_fund_value.toFixed(2)})?
                    </span>
                  </label>
                </div>

                {/* Water Section */}
                {showWater && (
                  <>
                    <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                      <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-blue-500" />
                        Consumo de Água
                      </h4>
                    </div>
                    {billForm.water_readings.map((reading, index) => (
                      <React.Fragment key={`water-${index}`}>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Leitura Anterior Água (Hidrômetro {index + 1})</label>
                          <input 
                            type="number"
                            value={reading.prev}
                            onChange={e => {
                              const newReadings = [...billForm.water_readings];
                              newReadings[index].prev = Number(e.target.value);
                              setBillForm({ ...billForm, water_readings: newReadings });
                            }}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Leitura Atual Água (Hidrômetro {index + 1})</label>
                          <input 
                            type="number"
                            value={reading.curr}
                            onChange={e => {
                              const newReadings = [...billForm.water_readings];
                              newReadings[index].curr = Number(e.target.value);
                              setBillForm({ ...billForm, water_readings: newReadings });
                            }}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </React.Fragment>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor da Água (R$/m³)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={billForm.water_value}
                        onChange={e => setBillForm({ ...billForm, water_value: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Taxa de Serviço (Água)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={billForm.water_service_fee}
                        onChange={e => setBillForm({ ...billForm, water_service_fee: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Apportionment Section */}
                <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-amber-500" />
                    Rateio e Outros
                  </h4>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor do Rateio (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={billForm.apportionment_value}
                    onChange={e => setBillForm({ ...billForm, apportionment_value: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox"
                        checked={billForm.include_apportionment}
                        onChange={e => setBillForm({ ...billForm, include_apportionment: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-all ${billForm.include_apportionment ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${billForm.include_apportionment ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600 transition-all">Incluir Rateio?</span>
                  </label>
                </div>
              </div>

              <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="text-center md:text-left">
                    <span className="block text-xs font-bold text-indigo-400 uppercase">Consumo Energia</span>
                    <span className="text-2xl font-black text-indigo-900">
                      {(billForm.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)).toFixed(2)} kWh
                    </span>
                  </div>
                  <div className="h-10 w-px bg-indigo-200 hidden md:block"></div>
                  <div className="text-center md:text-left">
                    <span className="block text-xs font-bold text-indigo-400 uppercase">Consumo Água</span>
                    <span className="text-2xl font-black text-indigo-900">
                      {(billForm.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)).toFixed(2)} m³
                    </span>
                  </div>
                  <div className="h-10 w-px bg-indigo-200 hidden md:block"></div>
                  <div className="text-center md:text-left">
                    <span className="block text-xs font-bold text-indigo-400 uppercase">Total Estimado</span>
                    <span className="text-2xl font-black text-indigo-900">
                      R$ {(
                        (showEnergy ? (billForm.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0) * billForm.kwh_value) : 0) + 
                        (showWater ? ((billForm.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0) * billForm.water_value) + (billForm.water_service_fee || 0)) : 0) +
                        (billForm.include_apportionment ? billForm.apportionment_value : 0) +
                        (billForm.include_reserve_fund ? settings.reserve_fund_value : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => handleClearBillForm()}
                    className="p-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-sm flex items-center justify-center"
                    title="Limpar Formulário"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleSaveBill(false)}
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    {editingBill ? <Save size={20} /> : <Plus size={20} />}
                    {editingBill ? 'Atualizar Conta' : 'Lançar Conta'}
                  </button>
                  <button 
                    onClick={() => handleSaveBill(true)}
                    className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                  >
                    <MessageCircle size={20} />
                    Salvar e Enviar
                  </button>
                </div>
              </div>
              {editingBill && (
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={() => {
                      handleClearBillForm();
                      if (setActiveTab) setActiveTab('chacara_history');
                    }}
                    className="text-gray-500 font-semibold hover:text-gray-700"
                  >
                    Cancelar Edição
                  </button>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {activeTab === 'chacara_history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-gray-500 text-[10px] md:text-sm font-semibold mb-1 uppercase tracking-wider">Total a Pagar</span>
                <span className="text-2xl md:text-3xl font-black text-gray-800">R$ {totalToPay.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-gray-500 text-[10px] md:text-sm font-semibold mb-1 uppercase tracking-wider">Total Pago</span>
                <span className="text-2xl md:text-3xl font-black text-emerald-600">R$ {totalPaid.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-gray-500 text-[10px] md:text-sm font-semibold mb-1 uppercase tracking-wider">Total Pendente</span>
                <span className="text-2xl md:text-3xl font-black text-rose-600">R$ {totalPending.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <History size={20} className="text-indigo-600" />
                  Histórico de Lançamentos
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full sm:w-auto">
                    <Search size={18} className="text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar morador ou telefone..."
                      value={searchBill}
                      onChange={(e) => setSearchBill(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 w-full sm:w-48"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full sm:w-auto">
                    <Filter size={18} className="text-gray-400" />
                    <input 
                      type="month" 
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full sm:w-auto">
                    <CheckCircle size={18} className="text-gray-400" />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 w-full outline-none"
                    >
                      <option value="all">Todos Status</option>
                      <option value="pending">Pendente</option>
                      <option value="partial">Parcial</option>
                      <option value="paid">Pago</option>
                    </select>
                  </div>
                  <button 
                    onClick={exportToPDF}
                    className="w-full sm:w-auto p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 px-4 font-bold text-sm"
                  >
                    <Download size={18} />
                    Exportar PDF
                  </button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Usuário</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Total Energia</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Total Água</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Rateio</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Fundo de Reserva</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Taxas de Serviço</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Total</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(bill => {
                        const user = users.find(u => u.id === bill.chacara_user_id);
                        const isPaid = bill.status === 'paid';
                        const isPartial = bill.status === 'partial' || (!isPaid && (bill.amount_paid || 0) > 0);
                        
                        const energyReadings = bill.energy_readings || [];
                        const waterReadings = bill.water_readings || [];

                        const energyConsumption = energyReadings.length > 0
                          ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                          : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
                        const energyTotal = energyConsumption * bill.kwh_value;
                        
                        const waterConsumption = waterReadings.length > 0
                          ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                          : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
                        const waterValueTotal = waterConsumption * (bill.water_value || 0);
                        
                        const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
                        const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
                        const serviceFee = bill.water_service_fee || 0;

                        return (
                          <tr key={bill.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-all ${isPaid ? 'opacity-75' : ''}`}>
                            <td className={`px-6 py-4 ${isPaid ? 'line-through text-gray-400' : ''}`}>
                              <span className="font-semibold text-gray-800 block">{user?.name || 'Não Identificado'}</span>
                              <span className="text-xs text-gray-500">{user?.phone}</span>
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {energyTotal.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {waterValueTotal.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {apportionment.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {reserveFund.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {serviceFee.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center font-bold text-indigo-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {bill.total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => handleToggleStatusClick(bill)}
                                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mx-auto transition-all ${
                                  isPaid 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : isPartial
                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                              >
                                {isPaid ? <CheckCircle size={14} /> : isPartial ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {isPaid ? 'PAGA' : isPartial ? 'PARCIAL' : 'PENDENTE'}
                              </button>
                              {(isPaid || isPartial) && bill.payment_date && (
                                <div className="text-[10px] text-gray-500 mt-1 font-medium">
                                  Pago em: {new Date(bill.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </div>
                              )}
                              {isPartial && (
                                <div className="text-[10px] font-bold text-blue-600 mt-1">
                                  R$ {(bill.amount_paid || 0).toFixed(2)} / R$ {bill.total.toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1">
                              <button 
                                onClick={() => sendWhatsApp(bill)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle size={18} />
                              </button>
                              <button 
                                onClick={() => handleEditBill(bill)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Editar Lançamento"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteBill(bill.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir Lançamento"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredBills.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <History size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhum lançamento encontrado.</p>
                  </div>
                ) : (
                  filteredBills.map(bill => {
                    const user = users.find(u => u.id === bill.chacara_user_id);
                    const isPaid = bill.status === 'paid';
                    const isPartial = bill.status === 'partial' || (!isPaid && (bill.amount_paid || 0) > 0);
                    
                    const energyReadings = bill.energy_readings || [];
                    const waterReadings = bill.water_readings || [];

                    const energyConsumption = energyReadings.length > 0
                      ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                      : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
                    const energyTotal = energyConsumption * bill.kwh_value;
                    
                    const waterConsumption = waterReadings.length > 0
                      ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                      : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
                    const waterValueTotal = waterConsumption * (bill.water_value || 0);
                    
                    const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
                    const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
                    const serviceFee = bill.water_service_fee || 0;
                    
                    return (
                      <div key={bill.id} className={`p-4 space-y-3 ${isPaid ? 'bg-gray-50/50' : 'bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-gray-900 truncate ${isPaid ? 'line-through text-gray-400' : ''}`}>
                              {user?.name || 'Não Identificado'}
                            </h4>
                            <p className="text-xs text-gray-500">{user?.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-black text-indigo-600 ${isPaid ? 'line-through text-gray-400' : ''}`}>
                              R$ {bill.total.toFixed(2).replace('.', ',')}
                            </p>
                            {isPartial && (
                              <p className="text-[10px] font-bold text-blue-600">
                                Pago: R$ {(bill.amount_paid || 0).toFixed(2).replace('.', ',')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                          {energyTotal > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Energia: R$ {energyTotal.toFixed(2)}</span>}
                          {waterValueTotal > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Água: R$ {waterValueTotal.toFixed(2)}</span>}
                          {apportionment > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Rateio: R$ {apportionment.toFixed(2)}</span>}
                          {reserveFund > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Fundo: R$ {reserveFund.toFixed(2)}</span>}
                          {serviceFee > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Taxa: R$ {serviceFee.toFixed(2)}</span>}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <button 
                            onClick={() => handleToggleStatusClick(bill)}
                            className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
                              isPaid 
                                ? 'bg-green-100 text-green-700' 
                                : isPartial
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-indigo-600 text-white'
                            }`}
                          >
                            {isPaid ? <CheckCircle size={18} /> : isPartial ? <CheckCircle size={18} /> : <CheckCircle size={18} />}
                            {isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'RECEBER'}
                          </button>
                          
                          <button 
                            onClick={() => sendWhatsApp(bill)}
                            className="w-full sm:w-auto p-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center transition-all active:bg-emerald-100"
                            title="WhatsApp"
                          >
                            <MessageCircle size={20} className="sm:hidden mr-2" />
                            <span className="sm:hidden font-bold">WhatsApp</span>
                            <MessageCircle size={20} className="hidden sm:block" />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditBill(bill)}
                              className="p-2 bg-gray-50 text-gray-600 rounded-lg active:bg-gray-100"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBill(bill.id)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg active:bg-red-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {bill.payment_date && (
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              Pago em: {new Date(bill.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'chacara_settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 md:mb-8 flex items-center gap-2">
                <SettingsIcon size={24} className="text-indigo-600" />
                Configurações Padrão
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor do kWh Padrão (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_kwh}
                      onChange={e => setSettingsForm({ ...settingsForm, default_kwh: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor da Água Padrão (R$/m³)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_water_value}
                      onChange={e => setSettingsForm({ ...settingsForm, default_water_value: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Taxa de Serviço Água Padrão (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_water_service_fee || 0}
                      onChange={e => setSettingsForm({ ...settingsForm, default_water_service_fee: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor do Rateio Padrão (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_apportionment_value}
                      onChange={e => setSettingsForm({ ...settingsForm, default_apportionment_value: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor Fundo de Reserva (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.reserve_fund_value}
                      onChange={e => setSettingsForm({ ...settingsForm, reserve_fund_value: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Dia Padrão da Leitura</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={settingsForm.default_reading_day}
                      onChange={e => setSettingsForm({ ...settingsForm, default_reading_day: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Dia Padrão de Vencimento</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={settingsForm.default_due_day}
                      onChange={e => setSettingsForm({ ...settingsForm, default_due_day: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mês de Referência Padrão (YYYY-MM)</label>
                    <input 
                      type="month"
                      value={settingsForm.default_month_reference || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, default_month_reference: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observação Padrão (WhatsApp)</label>
                    <textarea 
                      value={settingsForm.whatsapp_observation || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, whatsapp_observation: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium min-h-[100px]"
                      placeholder="Mensagem adicional que será enviada no final do WhatsApp..."
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveSettings}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all mt-4"
                >
                  <Save size={20} />
                  Salvar Configurações
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Date Modal */}
      <AnimatePresence>
        {paymentDateModal.isOpen && paymentDateModal.bill && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-black text-gray-900 mb-4">Confirmar Pagamento</h3>
              <p className="text-gray-600 mb-6">
                Selecione os itens que foram pagos.
              </p>
              
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Data de Pagamento</label>
                  <input 
                    type="date" 
                    value={paymentDateModal.date}
                    onChange={e => setPaymentDateModal({ ...paymentDateModal, date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  />
                </div>
                
                <div className="space-y-2 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Itens da Conta</label>
                  {paymentDateModal.bill && (() => {
                    const cats = calculateBillCategories(paymentDateModal.bill);
                    const items = [
                      { key: 'reserve_fund', label: 'Fundo de reserva', value: cats.reserve_fund },
                      { key: 'water_service_fee', label: 'Prestador de serviço', value: cats.water_service_fee },
                      { key: 'water_total', label: 'Conta de água', value: cats.water_total },
                      { key: 'energy_total', label: 'Conta de energia', value: cats.energy_total },
                      { key: 'apportionment', label: 'Rateio', value: cats.apportionment }
                    ].filter(item => item.value > 0);

                    return items.map(item => (
                      <label key={item.key} className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!paymentDateModal.paidCategories[item.key]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const newCategories = { ...paymentDateModal.paidCategories, [item.key]: checked };
                              const newAmount = items.reduce((sum, i) => sum + (newCategories[i.key] ? i.value : 0), 0);
                              setPaymentDateModal({ 
                                ...paymentDateModal, 
                                paidCategories: newCategories,
                                amountPaid: newAmount
                              });
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">R$ {item.value.toFixed(2)}</span>
                      </label>
                    ));
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Valor Total Pago (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={paymentDateModal.amountPaid}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 outline-none font-bold cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total da conta: R$ {paymentDateModal.bill?.total?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPaymentDateModal({ isOpen: false, bill: null, date: '', amountPaid: 0, paidCategories: {} })}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={() => handleConfirmToggleStatus(paymentDateModal.bill!, 'paid', paymentDateModal.date, paymentDateModal.amountPaid, paymentDateModal.paidCategories)}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                  >
                    Confirmar
                  </button>
                </div>
                {paymentDateModal.bill?.status !== 'pending' && (
                  <button 
                    onClick={() => handleConfirmToggleStatus(paymentDateModal.bill!, 'pending', null, 0, {})}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
                  >
                    Cancelar Pagamento
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
