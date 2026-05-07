import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  PlusCircle,
  Trash2, 
  Edit2, 
  Save, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
  History,
  FileText,
  Search,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FixedAccount {
  id: number;
  category: string;
  sub_category: string | null;
  amount: number;
  due_date: string;
  month_reference: string;
  status: 'pago' | 'pendente' | 'retida';
  notes: string | null;
}

interface FixedAccountsManagerProps {
  supabase: SupabaseClient;
  session: any;
}

export const FixedAccountsManager: React.FC<FixedAccountsManagerProps> = ({ supabase, session }) => {
  const [fixedAccounts, setFixedAccounts] = useState<FixedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FixedAccount | null>(null);
  
  const getPreviousMonth = (dateStr: string) => {
    const [year, month] = dateStr.split('-').map(Number);
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
  };

  const [form, setForm] = useState({
    category: '',
    sub_category: '',
    amount: '',
    due_date: new Date().toISOString().slice(0, 10),
    month_reference: getPreviousMonth(new Date().toISOString().slice(0, 10)),
    status: 'pendente' as FixedAccount['status'],
    notes: ''
  });

  const fetchFixedAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fixed_accounts')
        .select('*')
        .eq('month_reference', filterMonth)
        .order('category', { ascending: true });

      if (error) throw error;
      setFixedAccounts(data || []);
    } catch (error) {
      console.error('Error fetching fixed accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFixedAccounts();
  }, [filterMonth]);

  const PREDEFINED_CATEGORIES = [
    'CEMIG',
    'COPASA',
    'PLIM',
    'VIVO',
    'OI',
    'CONTA CHÁCARA',
    'PARCELA CHÁCARA',
    'INTERNET',
    'ALUGUEL',
    'OUTROS'
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        user_id: session.user.id,
        category: form.category,
        sub_category: form.sub_category || null,
        amount: parseFloat(form.amount.toString().replace(',', '.')),
        due_date: form.due_date,
        month_reference: form.month_reference,
        status: form.status,
        notes: form.notes || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('fixed_accounts')
          .update(payload)
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fixed_accounts')
          .insert([payload]);
        if (error) throw error;
      }

      setShowForm(false);
      setEditingAccount(null);
      resetForm();
      fetchFixedAccounts();
    } catch (error) {
      console.error('Error saving fixed account:', error);
      alert('Erro ao salvar conta fixa');
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      category: '',
      sub_category: '',
      amount: '',
      due_date: today,
      month_reference: getPreviousMonth(today),
      status: 'pendente',
      notes: ''
    });
  };

  const handleEdit = (account: FixedAccount) => {
    setEditingAccount(account);
    setForm({
      category: account.category,
      sub_category: account.sub_category || '',
      amount: account.amount.toString(),
      due_date: account.due_date,
      month_reference: account.month_reference,
      status: account.status,
      notes: account.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta conta?')) return;
    try {
      const { error } = await supabase
        .from('fixed_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchFixedAccounts();
    } catch (error) {
      console.error('Error deleting fixed account:', error);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const [year, month] = filterMonth.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = months[parseInt(month) - 1];

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text(`RELAÇÃO CONTAS ${monthName.toUpperCase()} ${year}`, 14, 20);

    const grouped: { [key: string]: FixedAccount[] } = {};
    fixedAccounts.forEach(acc => {
      if (!grouped[acc.category]) grouped[acc.category] = [];
      grouped[acc.category].push(acc);
    });

    let currentY = 30;
    let total = 0;

    Object.entries(grouped).forEach(([category, accounts]) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`*- ${category.toUpperCase()}:*`, 14, currentY);
      currentY += 7;

      accounts.forEach(acc => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const subCatStr = acc.sub_category ? `${acc.sub_category}: ` : '';
        const retidaStr = acc.status === 'retida' ? ' - RETIDA' : '';
        doc.text(`${subCatStr}R$ ${acc.amount.toFixed(2)}${retidaStr}`, 16, currentY);
        currentY += 5;
        
        const [refYear, refMonth] = acc.month_reference.split('-');
        const [dueY, dueM, dueD] = acc.due_date.split('-');
        doc.text(`Ref: ${refMonth}/${refYear} Venc: ${dueD}/${dueM}/${dueY.slice(2)}`, 16, currentY);
        currentY += 10;
        total += acc.amount;
        
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      });
      currentY += 5;
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`*TOTAL R$ ${total.toFixed(2)}*`, 14, currentY + 10);

    doc.save(`relatorio_contas_${filterMonth}.pdf`);
  };

  const total = fixedAccounts.reduce((sum, acc) => sum + acc.amount, 0);

  const handleCopyLastMonth = async () => {
    const [year, month] = filterMonth.split('-').map(Number);
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthStr = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

    if (!confirm(`Deseja copiar todos os lançamentos de ${prevMonthStr} para ${filterMonth}?`)) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fixed_accounts')
        .select('*')
        .eq('month_reference', prevMonthStr);

      if (error) throw error;
      if (!data || data.length === 0) {
        alert('Nenhum dado encontrado no mês anterior.');
        return;
      }

      const newAccounts = data.map(acc => ({
        user_id: session.user.id,
        category: acc.category,
        sub_category: acc.sub_category,
        amount: acc.amount,
        due_date: `${filterMonth}-${acc.due_date.split('-')[2]}`, // Manter o mesmo dia
        month_reference: filterMonth,
        status: 'pendente',
        notes: acc.notes
      }));

      const { error: insertError } = await supabase
        .from('fixed_accounts')
        .insert(newAccounts);

      if (insertError) throw insertError;
      fetchFixedAccounts();
    } catch (error) {
      console.error('Error copying last month:', error);
      alert('Erro ao copiar dados do mês anterior.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-4 bg-indigo-50 rounded-2xl">
            <History className="text-indigo-600" size={28} />
          </div>
          <div>
            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-2">Contas Fixas</p>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Gestão Mensal</h2>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-indigo-400" size={14} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mês de Referência</p>
          </div>
          <div className="relative group">
            <input 
              type="month" 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="text-lg font-black text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-xl border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer w-full"
            />
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-3xl shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} /></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest relative z-10">Total do Mês</p>
          <p className="text-3xl font-black text-emerald-400 tracking-tighter relative z-10">R$ {total.toFixed(2)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button 
          onClick={() => { setShowForm(true); setEditingAccount(null); resetForm(); }}
          className="bg-indigo-600 text-white px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Novo Lançamento
        </button>
        <button 
          onClick={handleCopyLastMonth}
          className="bg-white text-indigo-600 border-2 border-indigo-50 px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-95"
        >
          <History size={18} strokeWidth={2.5} />
          Copiar Anterior
        </button>
        <button 
          onClick={generatePDF}
          disabled={fixedAccounts.length === 0}
          className="bg-white text-gray-700 border-2 border-gray-100 px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <FileText size={18} strokeWidth={2.5} />
          Gerar Relatório
        </button>
      </div>

      {/* Form Overlay */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <PlusCircle size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{editingAccount ? 'Editar Conta' : 'Nova Conta Fixa'}</h3>
                    <p className="text-xs font-medium text-gray-400">Preencha os dados abaixo</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                    <div className="relative group">
                      <input 
                        required 
                        list="fixed-categories"
                        value={form.category} 
                        onChange={e => setForm({...form, category: e.target.value.toUpperCase()})}
                        placeholder="Selecione ou digite..."
                        className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                      />
                      <datalist id="fixed-categories">
                        {PREDEFINED_CATEGORIES.map(cat => <option key={cat} value={cat} />)}
                      </datalist>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                       {PREDEFINED_CATEGORIES.slice(0, 7).map(cat => (
                         <button 
                           key={cat}
                           type="button"
                           onClick={() => setForm({...form, category: cat})}
                           className={cn(
                             "text-[9px] font-black px-2 py-1 rounded-lg border transition-all",
                             form.category === cat ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-indigo-200"
                           )}
                         >
                           {cat}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Identificador (Ex: 101, 102)</label>
                    <input 
                      value={form.sub_category} 
                      onChange={e => setForm({...form, sub_category: e.target.value})}
                      placeholder="Opcional"
                      className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Valor (R$)</label>
                    <input 
                      required type="number" step="0.01" 
                      value={form.amount} 
                      onChange={e => setForm({...form, amount: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Status</label>
                    <select 
                      value={form.status} 
                      onChange={e => setForm({...form, status: e.target.value as any})}
                      className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    >
                      <option value="pendente">PENDENTE</option>
                      <option value="pago">PAGO</option>
                      <option value="retida">RETIDA</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Vencimento</label>
                    <input 
                      required type="date" 
                      value={form.due_date} 
                      onChange={e => {
                        const newDueDate = e.target.value;
                        setForm({
                          ...form, 
                          due_date: newDueDate,
                          month_reference: getPreviousMonth(newDueDate)
                        });
                      }}
                      className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Mês Ref.</label>
                    <input 
                      required type="month" 
                      value={form.month_reference} 
                      onChange={e => setForm({...form, month_reference: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 border-2 border-gray-100 hover:bg-gray-50 transition-all">Cancelar</button>
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Save size={18} />
                    {editingAccount ? 'Atualizar Dados' : 'Salvar Registro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Layers size={20} className="text-indigo-600" />
            Lançamentos de {filterMonth}
          </h3>
          <span className="bg-white px-4 py-1 rounded-full text-xs font-black text-gray-400 border border-gray-100">
            {fixedAccounts.length} Registros
          </span>
        </div>

        {loading ? (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando dados...</p>
          </div>
        ) : fixedAccounts.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center">
              <Search size={32} className="text-gray-200" />
            </div>
            <div className="space-y-1">
              <p className="text-gray-900 font-black text-lg tracking-tight">Nenhum lançamento encontrado</p>
              <p className="text-gray-400 text-sm font-medium">Não há contas fixas registradas para este mês.</p>
            </div>
            <button 
              onClick={() => { setShowForm(true); setEditingAccount(null); resetForm(); }}
              className="text-indigo-600 font-black text-xs uppercase tracking-widest bg-indigo-50 px-6 py-3 rounded-2xl hover:bg-indigo-100 transition-all"
            >
              Criar Primeiro Registro
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {fixedAccounts.map(account => (
              <div key={account.id} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50/50 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-110",
                    account.status === 'pago' ? "bg-emerald-50 text-emerald-600" : 
                    account.status === 'retida' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                  )}>
                    {account.status === 'pago' ? <CheckCircle2 size={24} /> : 
                     account.status === 'retida' ? <AlertCircle size={24} /> : <FileText size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-gray-900 tracking-tight">{account.category}</h4>
                      {account.sub_category && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-black text-gray-500 uppercase">{account.sub_category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                      <span className="flex items-center gap-1"><Calendar size={12} /> Ref: {account.month_reference}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> Venc: {new Date(account.due_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8">
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900 tracking-tighter mb-1">R$ {account.amount.toFixed(2)}</p>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                      account.status === 'pago' ? "bg-emerald-100 text-emerald-700" : 
                      account.status === 'retida' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {account.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(account)} className="p-3 text-indigo-600 bg-white border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all shadow-sm">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(account.id)} className="p-3 text-red-600 bg-white border border-red-100 rounded-xl hover:bg-red-50 transition-all shadow-sm">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
