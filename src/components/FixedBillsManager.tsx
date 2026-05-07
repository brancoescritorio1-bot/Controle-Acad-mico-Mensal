import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Trash2, 
  Edit2, 
  Plus, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  ChevronRight, 
  Smartphone, 
  Zap, 
  Droplets, 
  Home, 
  MessageSquare,
  ArrowRight,
  TrendingUp,
  CreditCard,
  X,
  FileText,
  DollarSign,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { WhatsAppIcon } from '../MainApp';
import { useDialog } from './DialogContext';

interface FixedBill {
  id: string;
  name: string;
  property: string;
  category: string;
  due_day: number;
  default_amount: number;
}

interface BillPayment {
  id: string;
  bill_id: string;
  reference_month: string; // MM/YYYY
  due_date: string; // YYYY-MM-DD
  amount: number;
  status: 'Pendente' | 'Pago' | 'Retida' | 'Vencida';
  notes: string;
  bill?: FixedBill;
}

const CATEGORIES = ['Energia', 'Água', 'Telefonia', 'Outros'];
const STATUSES = ['Pendente', 'Pago', 'Retida', 'Vencida'];

const WHATSAPP_NUMBER = '38999000331';

export function FixedBillsManager({ supabase }: { supabase: any }) {
  const { confirm, alert: dialogAlert } = useDialog();
  const [bills, setBills] = useState<FixedBill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [historyPayments, setHistoryPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'month' | 'year'>('month');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [view, setView] = useState<'dashboard' | 'register' | 'history'>('dashboard');
  
  // States for forms
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const [billForm, setBillForm] = useState<Partial<FixedBill>>({
    name: '',
    property: '',
    category: 'Energia',
    due_day: 1,
    default_amount: 0
  });

  const [paymentForm, setPaymentForm] = useState<{
    id?: string;
    bill_id: string;
    amount: number;
    status: BillPayment['status'];
    notes: string;
    due_date?: string;
    reference_month?: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
    if (view === 'history') {
      fetchHistory();
    }
  }, [filterMode, filterMonth, filterYear, filterCategory, filterProperty, filterStatus, view]);

  const fetchData = async () => {
    setLoading(true);
    setPayments([]); // Limpa visíveis durante o loading
    try {
      // 1. Fetch Master Bills
      const { data: billsData, error: billsError } = await supabase
        .from('fixed_bills')
        .select('*')
        .order('name');
      
      if (billsError) throw billsError;
      
      let currentBills = billsData || [];

      // Deduplicate in UI immediately
      const uniqueBillsMap = new Map();
      const duplicatesToDelete: string[] = [];

      currentBills.forEach(bill => {
        const key = `${bill.name.toLowerCase()}-${bill.property.toLowerCase()}`;
        if (uniqueBillsMap.has(key)) {
          duplicatesToDelete.push(bill.id);
        } else {
          uniqueBillsMap.set(key, bill);
        }
      });

      if (duplicatesToDelete.length > 0) {
        await supabase.from('fixed_bills').delete().in('id', duplicatesToDelete);
        currentBills = Array.from(uniqueBillsMap.values());
      }
      
      // If no bills exist, seed with defaults - but double check to prevent racing
      if (currentBills.length === 0) {
        const { data: doubleCheck } = await supabase.from('fixed_bills').select('id').limit(1);
        if (!doubleCheck || doubleCheck.length === 0) {
          await seedDefaultBills();
          const { data: recoData } = await supabase.from('fixed_bills').select('*').order('name');
          const finalMap = new Map();
          (recoData || []).forEach(b => finalMap.set(`${b.name.toLowerCase()}-${b.property.toLowerCase()}`, b));
          currentBills = Array.from(finalMap.values());
        } else {
          const { data: retryData } = await supabase.from('fixed_bills').select('*').order('name');
          const finalMap = new Map();
          (retryData || []).forEach(b => finalMap.set(`${b.name.toLowerCase()}-${b.property.toLowerCase()}`, b));
          currentBills = Array.from(finalMap.values());
        }
      }
      setBills(currentBills);

      const filteredBills = currentBills.filter((b: FixedBill) => {
         if (filterCategory !== 'all' && b.category !== filterCategory) return false;
         if (filterProperty !== 'all' && b.property !== filterProperty) return false;
         return true;
      });

      if (filteredBills.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const allowedBillIds = filteredBills.map((b: FixedBill) => b.id);

      // 2. Fetch Payments for selected Date Range & Filters
      let paymentsQuery = supabase
        .from('fixed_bill_payments')
        .select('*, bill:fixed_bills(*)')
        .order('due_date');

      if (filterMode === 'month') {
        const [year, month] = filterMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];
        paymentsQuery = paymentsQuery.gte('due_date', startDate).lte('due_date', endDate);
      } else {
        const year = Number(filterYear);
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        paymentsQuery = paymentsQuery.gte('due_date', startDate).lte('due_date', endDate);
      }

      paymentsQuery = paymentsQuery.in('bill_id', allowedBillIds);

      if (filterStatus !== 'all') {
        paymentsQuery = paymentsQuery.eq('status', filterStatus);
      }

      const { data: paymentsData, error: paymentsError } = await paymentsQuery;

      if (paymentsError) throw paymentsError;
      
      const rawPayments = paymentsData || [];
      
      // 3. AUTO-STATUS: Mark as "Vencida" if overdue
      const today = new Date().toISOString().split('T')[0];
      const overdueToUpdate = rawPayments.filter(p => p.status === 'Pendente' && p.due_date < today);
      
      if (overdueToUpdate.length > 0) {
        await supabase
          .from('fixed_bill_payments')
          .update({ status: 'Vencida' })
          .in('id', overdueToUpdate.map(p => p.id));
        
        // Refresh local data
        overdueToUpdate.forEach(p => p.status = 'Vencida');
      }

      setPayments(rawPayments);

    } catch (error) {
      console.error('Error fetching fixed bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const year = filterMode === 'year' ? filterYear : filterMonth.split('-')[0];
      const { data, error } = await supabase
        .from('fixed_bill_payments')
        .select('*, bill:fixed_bills(*)')
        .gte('due_date', `${year}-01-01`)
        .lte('due_date', `${year}-12-31`)
        .order('due_date');
      
      if (error) throw error;
      setHistoryPayments(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const historyByMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: 0,
      paid: 0,
      overdue: 0,
      name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i]
    }));

    historyPayments.forEach(p => {
      const m = new Date(p.due_date).getMonth();
      months[m].total += Number(p.amount);
      if (p.status === 'Pago') months[m].paid += Number(p.amount);
      if (p.status === 'Vencida') months[m].overdue += Number(p.amount);
    });

    return months;
  }, [historyPayments]);

  const seedDefaultBills = async () => {
    const defaults = [
      { name: 'CEMIG', property: 'apto 101', category: 'Energia', due_day: 6, default_amount: 0 },
      { name: 'CEMIG', property: 'apto 102', category: 'Energia', due_day: 6, default_amount: 0 },
      { name: 'COPASA', property: 'apto 101', category: 'Água', due_day: 10, default_amount: 0 },
      { name: 'COPASA', property: 'apto 102', category: 'Água', due_day: 10, default_amount: 0 },
      { name: 'VIVO 0331', property: 'Telefonia', category: 'Telefonia', due_day: 17, default_amount: 0 },
      { name: 'VIVO 0449', property: 'Telefonia', category: 'Telefonia', due_day: 17, default_amount: 0 },
      { name: 'VIVO 9993', property: 'Telefonia', category: 'Telefonia', due_day: 17, default_amount: 0 },
      { name: 'OI', property: 'Telefonia', category: 'Telefonia', due_day: 11, default_amount: 0 },
      { name: 'CHÁCARA', property: 'CHÁCARA', category: 'Outros', due_day: 10, default_amount: 0 },
      { name: 'PARCELA CHÁCARA', property: 'CHÁCARA', category: 'Outros', due_day: 10, default_amount: 0 },
    ];

    for (const bill of defaults) {
      const { data: existing } = await supabase
        .from('fixed_bills')
        .select('id')
        .eq('name', bill.name)
        .eq('property', bill.property)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('fixed_bills').insert([bill]);
      }
    }
  };

  const handleSaveBill = async () => {
    if (!billForm.name || !billForm.category) return;
    try {
      // Check for manual duplicate
      const isDuplicate = bills.some(b => 
        b.id !== editingBill?.id && 
        b.name.toLowerCase() === billForm.name?.toLowerCase() && 
        b.property.toLowerCase() === billForm.property?.toLowerCase()
      );

      if (isDuplicate) {
        await dialogAlert('Esta conta já existe para este local.', 'Aviso');
        return;
      }

      if (editingBill) {
        await supabase.from('fixed_bills').update(billForm).eq('id', editingBill.id);
      } else {
        await supabase.from('fixed_bills').insert([billForm]);
      }
      setBillForm({ name: '', property: '', category: 'Energia', due_day: 1, default_amount: 0 });
      setEditingBill(null);
      setShowForm(false);
      await fetchData();
      await dialogAlert(editingBill ? 'Conta atualizada com sucesso!' : 'Conta cadastrada com sucesso!', 'Sucesso');
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (await confirm('Deseja realmente excluir esta conta fixa?', { type: 'danger' })) {
      await supabase.from('fixed_bills').delete().eq('id', id);
      fetchData();
    }
  };

  const handleLaunchPayment = async (bill: FixedBill) => {
    // Determine reference month based on rule (Reference = Due - 1 month)
    const [year, month] = (filterMode === 'month' ? filterMonth : new Date().toISOString().slice(0, 7)).split('-').map(Number);
    let refMonthRaw = month - 1;
    let refYearRaw = year;
    if (refMonthRaw === 0) {
      refMonthRaw = 12;
      refYearRaw -= 1;
    }
    const reference_month = `${String(refMonthRaw).padStart(2, '0')}/${refYearRaw}`;
    const due_date = `${year}-${String(month).padStart(2, '0')}-${String(bill.due_day).padStart(2, '0')}`;

    setPaymentForm({
      bill_id: bill.id,
      amount: bill.default_amount || 0,
      status: 'Pendente',
      notes: '',
      due_date,
      reference_month
    });
  };

  const handleSavePayment = async () => {
    if (!paymentForm) return;

    // Use values from form or calculate from current Context if new
    let due_date = paymentForm.due_date;
    let reference_month = paymentForm.reference_month;

    if (!due_date || !reference_month) {
      const bill = bills.find(b => b.id === paymentForm.bill_id);
      if (!bill) return;

      const [year, month] = (filterMode === 'month' ? filterMonth : new Date().toISOString().slice(0, 7)).split('-').map(Number);
      due_date = `${year}-${String(month).padStart(2, '0')}-${String(bill.due_day).padStart(2, '0')}`;
      
      let refMonthRaw = month - 1;
      let refYearRaw = year;
      if (refMonthRaw === 0) {
        refMonthRaw = 12;
        refYearRaw -= 1;
      }
      reference_month = `${String(refMonthRaw).padStart(2, '0')}/${refYearRaw}`;
    }

    try {
      const payload: any = {
        bill_id: paymentForm.bill_id,
        reference_month,
        due_date,
        amount: paymentForm.amount,
        status: paymentForm.status,
        notes: paymentForm.notes
      };

      if (paymentForm.id) payload.id = paymentForm.id;

      const { error } = await supabase.from('fixed_bill_payments').upsert(payload, { onConflict: 'bill_id,due_date' });

      if (error) throw error;
      setPaymentForm(null);
      await fetchData();
      await dialogAlert('Pagamento salvo com sucesso!', 'Sucesso');
    } catch (error) {
      console.error('Error saving payment:', error);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (await confirm('Deseja realmente excluir este lançamento do mês?', { type: 'danger' })) {
      try {
        const { error } = await supabase.from('fixed_bill_payments').delete().eq('id', id);
        if (error) throw error;
        fetchData();
        await dialogAlert('Lançamento excluído!', 'Sucesso');
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: BillPayment['status']) => {
    await supabase.from('fixed_bill_payments').update({ status: newStatus }).eq('id', paymentId);
    fetchData();
  };

  const totals = useMemo(() => {
    return {
      total: payments.reduce((acc, p) => acc + Number(p.amount), 0),
      paid: payments.filter(p => p.status === 'Pago').reduce((acc, p) => acc + Number(p.amount), 0),
      pending: payments.filter(p => p.status === 'Pendente').reduce((acc, p) => acc + Number(p.amount), 0),
      overdue: payments.filter(p => p.status === 'Vencida').reduce((acc, p) => acc + Number(p.amount), 0),
      retained: payments.filter(p => p.status === 'Retida').reduce((acc, p) => acc + Number(p.amount), 0),
    };
  }, [payments]);

  const generateWhatsAppMessage = () => {
    const [year, month] = (filterMode === 'month' ? filterMonth : new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const monthNames = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    const periodLabel = filterMode === 'month' ? monthNames[month - 1] : `ANO ${filterYear}`;

    // Build the specific format required
    let message = `RELAÇÃO CONTAS ${periodLabel}\n\n`;

    // Grouping by Bill Name (for specific formatting)
    const grouped = payments.reduce((acc: any, p) => {
      const name = p.bill?.name || '';
      if (!acc[name]) acc[name] = [];
      acc[name].push(p);
      return acc;
    }, {});

    // CEMIG
    if (grouped['CEMIG']) {
      message += `- CEMIG:\n`;
      grouped['CEMIG'].sort((a: any, b: any) => a.bill.property.localeCompare(b.bill.property)).forEach((p: any) => {
        const propNum = p.bill.property.includes('101') ? '101' : '102';
        message += `${propNum}: R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    }

    // COPASA
    if (grouped['COPASA']) {
      message += `- COPASA:\n`;
      grouped['COPASA'].sort((a: any, b: any) => a.bill.property.localeCompare(b.bill.property)).forEach((p: any) => {
        const propNum = p.bill.property.includes('101') ? '101' : '102';
        message += `${propNum}: R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    }

    // VIVO
    const vivoPay = payments.filter(p => p.bill?.name.startsWith('VIVO'));
    if (vivoPay.length > 0) {
      message += `- VIVO:\n`;
      vivoPay.forEach(p => {
        const final = p.bill?.name.split(' ')[1] || '';
        message += `${final}: R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    }

    // OI
    const oiPay = payments.find(p => p.bill?.name === 'OI');
    if (oiPay) {
      message += `- OI:\nR$ ${Number(oiPay.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    }

    // CHÁCARA
    const chacPay = payments.find(p => p.bill?.name === 'CHÁCARA');
    if (chacPay) {
      message += `- CHÁCARA:\nR$ ${Number(chacPay.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    }

    // PARCELA CHÁCARA
    const parcPay = payments.find(p => p.bill?.name === 'PARCELA CHÁCARA');
    if (parcPay) {
      message += `- Parcela chácara:\nR$ ${Number(parcPay.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    }

    // Other bills not in the specific list
    const specificKeys = ['CEMIG', 'COPASA', 'VIVO 0331', 'VIVO 0449', 'VIVO 9993', 'OI', 'CHÁCARA', 'PARCELA CHÁCARA'];
    const others = payments.filter(p => !specificKeys.includes(p.bill?.name || ''));
    if (others.length > 0) {
      others.forEach(p => {
        message += `- ${p.bill?.name}: R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    }

    message += `\nTOTAL R$ ${totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Vencida': return 'bg-red-100 text-red-700 border-red-200';
      case 'Retida': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Energia': return <Zap size={20} className="text-amber-500" />;
      case 'Água': return <Droplets size={20} className="text-blue-500" />;
      case 'Telefonia': return <Smartphone size={20} className="text-indigo-500" />;
      default: return <Home size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-full overflow-hidden">
      {/* Header with Navigation - Optimized for Mobile */}
      <div className="bg-white p-4 md:p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-indigo-50 rounded-2xl shrink-0">
            <DollarSign className="text-indigo-600" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight truncate">Cestas Fixas</h2>
            <p className="text-[10px] md:text-xs text-gray-500 font-medium whitespace-nowrap truncate tracking-tight">Gestão Inteligente de Contas</p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setView('dashboard')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", view === 'dashboard' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Dash
            </button>
            <button 
              onClick={() => setView('history')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", view === 'history' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Histórico
            </button>
            <button 
              onClick={() => setView('register')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", view === 'register' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Contas
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {view === 'dashboard' && (
        <div className="bg-white p-3 md:p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
            
            <div className="flex items-center bg-gray-50 p-1 rounded-xl shrink-0">
              <button 
                onClick={() => setFilterMode('month')}
                className={cn("px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider", filterMode === 'month' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Mês
              </button>
              <button 
                onClick={() => setFilterMode('year')}
                className={cn("px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider", filterMode === 'year' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Ano
              </button>
            </div>

            {filterMode === 'month' ? (
              <input 
                type="month" 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="shrink-0 px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-black focus:outline-none focus:ring-2 ring-indigo-500/20"
              />
            ) : (
              <select 
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="shrink-0 px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-black focus:outline-none focus:ring-2 ring-indigo-500/20"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            )}

            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="shrink-0 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-500/20"
            >
              <option value="all">Todas as Categorias</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="shrink-0 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-500/20"
            >
              <option value="all">Todos os Imóveis</option>
              {Array.from(new Set(bills.map(b => b.property))).sort().map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="shrink-0 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-500/20"
            >
              <option value="all">Todos os Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button 
             onClick={generateWhatsAppMessage}
             className="shrink-0 flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
          >
             <WhatsAppIcon size={14} />
             <span>Compartilhar</span>
          </button>
        </div>
      )}

      {view === 'dashboard' && (
        <div className={cn("space-y-4 md:space-y-6 transition-opacity duration-300", loading ? "opacity-40 pointer-events-none" : "opacity-100")}>
          {/* Dashboard Summary - Optimized Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
            {[
              { label: 'Total', value: totals.total, color: 'text-gray-900', bg: 'bg-white', icon: DollarSign },
              { label: 'Pago', value: totals.paid, color: 'text-emerald-600', bg: 'bg-emerald-50/30', icon: CheckCircle2 },
              { label: 'Pendente', value: totals.pending, color: 'text-amber-600', bg: 'bg-amber-50/30', icon: Clock },
              { label: 'Vencido', value: totals.overdue, color: 'text-red-600', bg: 'bg-red-50/30', icon: AlertCircle },
              { label: 'Retido', value: totals.retained, color: 'text-indigo-600', bg: 'bg-indigo-50/30', icon: Filter },
            ].map((card, idx) => (
              <div key={idx} className={cn("p-3 md:p-4 rounded-3xl border border-gray-100 shadow-sm", card.bg, idx === 4 ? "col-span-2 md:col-span-1" : "")}>
                <div className="flex items-center justify-between mb-1">
                  <card.icon size={14} className={card.color} />
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{card.label}</span>
                </div>
                <div className={cn("text-base md:text-lg font-black truncate", card.color)}>
                  R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>



          {/* Payments Multi-View List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/50 px-3 py-1 rounded-full border border-gray-100/50 mb-3">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">A Lançar</h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {bills.filter(b => {
                    if (filterCategory !== 'all' && b.category !== filterCategory) return false;
                    if (filterProperty !== 'all' && b.property !== filterProperty) return false;
                    return !payments.find(p => p.bill_id === b.id);
                  }).length}
                </span>
              </div>
              <div className="grid gap-2">
                {bills.filter(b => {
                  if (filterCategory !== 'all' && b.category !== filterCategory) return false;
                  if (filterProperty !== 'all' && b.property !== filterProperty) return false;
                  // If in year mode, "A Lançar" relies on the current month to show missing bills.
                  // Since year mode encompasses 12 months, showing missing bills is complicated.
                  // For now, we compare against ALL payments shown. A bill is "A Lançar" if NO payments exist for it in the period.
                  return !payments.find(p => p.bill_id === b.id);
                }).map(bill => (
                  <div key={bill.id} className="bg-white p-3 md:p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group active:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-gray-50 rounded-xl shrink-0">
                        {getCategoryIcon(bill.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs md:text-sm font-black text-gray-800 truncate">{bill.name}</h4>
                        <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">
                          <span className="text-indigo-500">{bill.property}</span>
                          <span className="opacity-30">•</span>
                          <span>Dia {bill.due_day}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleLaunchPayment(bill)}
                      className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
                {bills.filter(b => {
                  if (filterCategory !== 'all' && b.category !== filterCategory) return false;
                  if (filterProperty !== 'all' && b.property !== filterProperty) return false;
                  return !payments.find(p => p.bill_id === b.id);
                }).length === 0 && (
                  <div className="bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Concluído</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/50 px-3 py-1 rounded-full border border-gray-100/50">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lançados</h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {payments.length}
                </span>
              </div>
              <div className="grid gap-2">
                {payments.map(payment => (
                  <div key={payment.id} className="bg-white p-3 md:p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-gray-50 rounded-xl shrink-0">
                          {getCategoryIcon(payment.bill?.category || '')}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs md:text-sm font-black text-gray-800 truncate">{payment.bill?.name}</h4>
                          <p className="text-[9px] text-gray-400 font-bold uppercase truncate">{payment.bill?.property}</p>
                        </div>
                      </div>
                      <div className={cn("shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", getStatusColor(payment.status))}>
                        {payment.status}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-50">
                      <div>
                        <div className="text-base font-black text-gray-900 leading-none">
                          R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[8px] text-gray-400 font-black uppercase mt-1">
                          Venc: {new Date(payment.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            setPaymentForm({
                              id: payment.id,
                              bill_id: payment.bill_id,
                              amount: Number(payment.amount),
                              status: payment.status,
                              notes: payment.notes || '',
                              due_date: payment.due_date,
                              reference_month: payment.reference_month
                            });
                          }}
                          className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeletePayment(payment.id)}
                          className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white active:scale-95 transition-all"
                          title="Excluir lançamento"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleUpdatePaymentStatus(payment.id, payment.status === 'Pago' ? 'Pendente' : 'Pago')}
                          className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95", payment.status === 'Pago' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-600 text-white shadow-md shadow-emerald-100")}
                        >
                          {payment.status === 'Pago' ? 'Aberto' : 'Pago'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <History size={20} className="text-indigo-600" />
              Histórico Anual {filterMode === 'year' ? filterYear : filterMonth.split('-')[0]}
            </h3>
            
            {/* Simple Bar Chart */}
            <div className="flex items-end justify-between h-48 gap-1 md:gap-2 px-2 border-b border-gray-50 mb-8">
              {historyByMonth.map((m, idx) => {
                const max = Math.max(...historyByMonth.map(x => x.total)) || 1;
                const height = (m.total / max) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none z-10 whitespace-nowrap">
                      R$ {m.total.toLocaleString('pt-BR')}
                    </div>
                    <div 
                      className="w-full bg-indigo-50 rounded-t-lg transition-all hover:bg-indigo-200 cursor-pointer relative overflow-hidden" 
                      style={{ height: `${height}%`, minHeight: m.total > 0 ? '4px' : '0px' }}
                    >
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-emerald-400 transition-all"
                        style={{ height: m.total > 0 ? `${(m.paid / m.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase">{m.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {historyByMonth.filter(m => m.total > 0).map((m, idx) => (
                 <div key={idx} className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{m.name}</span>
                      <span className="text-xs font-black text-indigo-600">R$ {m.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white rounded-full overflow-hidden flex">
                       <div className="h-full bg-emerald-500" style={{ width: `${(m.paid / m.total) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-bold uppercase text-gray-400">
                      <span>Pago: R$ {m.paid.toLocaleString('pt-BR')}</span>
                      <span>Total: {((m.paid/m.total)*100).toFixed(0)}%</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Conta</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mês</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historyPayments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-gray-800">{p.bill?.name}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{p.bill?.property}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-gray-500">
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][new Date(p.due_date).getMonth()]}
                    </td>
                    <td className="px-6 py-4 text-right text-[11px] font-black text-gray-900">
                      R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", getStatusColor(p.status))}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'register' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-gray-900">Configuração de Contas</h3>
            <button 
              onClick={() => {
                setBillForm({ name: '', property: '', category: 'Energia', due_day: 1, default_amount: 0 });
                setEditingBill(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <Plus size={18} />
              <span>Nova Conta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bills.map(bill => (
              <div key={bill.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4 group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-50 rounded-2xl">
                      {getCategoryIcon(bill.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{bill.name}</h4>
                      <p className="text-xs text-gray-500 font-medium">{bill.property}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingBill(bill);
                        setBillForm(bill);
                        setShowForm(true);
                      }}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteBill(bill.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 mt-auto">
                  <div className="bg-gray-50/50 p-2 rounded-xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimento</p>
                    <p className="text-xs font-bold text-indigo-600">Dia {bill.due_day}</p>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor Padrão</p>
                    <p className="text-xs font-bold text-indigo-600">R$ {Number(bill.default_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bill Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-900 tracking-tight">{editingBill ? 'Editar Conta' : 'Nova Conta Fixa'}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Conta</label>
                  <input 
                    type="text" 
                    value={billForm.name} 
                    onChange={(e) => setBillForm({...billForm, name: e.target.value})}
                    placeholder="Ex: CEMIG, VIVO, COPASA..."
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Imóvel / Local</label>
                  <input 
                    type="text" 
                    value={billForm.property} 
                    onChange={(e) => setBillForm({...billForm, property: e.target.value})}
                    placeholder="Ex: Apto 101, Chácara..."
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
                    <select 
                      value={billForm.category} 
                      onChange={(e) => setBillForm({...billForm, category: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-800"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Dia Vencimento</label>
                    <input 
                      type="number" 
                      min="1" max="31"
                      value={billForm.due_day} 
                      onChange={(e) => setBillForm({...billForm, due_day: Number(e.target.value)})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valor Padrão (Opcional)</label>
                  <input 
                    type="number" 
                    value={billForm.default_amount} 
                    onChange={(e) => setBillForm({...billForm, default_amount: Number(e.target.value)})}
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-800"
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 px-6 py-3 bg-white border border-gray-200 rounded-2xl font-black text-[11px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
                <button onClick={handleSaveBill} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Savar Conta</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Entry Modal */}
      <AnimatePresence>
        {paymentForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div className="flex flex-col">
                  <h3 className="font-black text-gray-900 tracking-tight">{paymentForm.id ? 'Editar Lançamento' : 'Lançar Pagamento'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                      {bills.find(b => b.id === paymentForm.bill_id)?.name}
                    </span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {bills.find(b => b.id === paymentForm.bill_id)?.property}
                    </span>
                  </div>
                </div>
                <button onClick={() => setPaymentForm(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>

              {/* Date Information Row */}
              <div className="grid grid-cols-2 gap-px bg-gray-100 border-b border-gray-100">
                <div className="bg-white p-4">
                  <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimento</span>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-500" />
                    <span className="text-xs font-black text-gray-800">
                      {paymentForm.due_date ? new Date(paymentForm.due_date).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-4">
                  <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ref. Mensal</span>
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-amber-500" />
                    <span className="text-xs font-black text-gray-800">
                      {paymentForm.reference_month}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valor do Mês</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      autoFocus
                      value={paymentForm.amount} 
                      onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                      className="w-full pl-12 pr-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-lg text-indigo-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUSES.map(st => (
                      <button
                        key={st}
                        onClick={() => setPaymentForm({...paymentForm, status: st as any})}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all",
                          paymentForm.status === st 
                            ? getStatusColor(st) + " ring-2 ring-indigo-500/20 shadow-sm" 
                            : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Observação</label>
                  <textarea 
                    value={paymentForm.notes} 
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Alguma nota importante?"
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm text-gray-800 resize-none h-24"
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button onClick={() => setPaymentForm(null)} className="flex-1 px-6 py-3 bg-white border border-gray-200 rounded-2xl font-black text-[11px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
                <button onClick={handleSavePayment} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Salvar Pagamento</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
