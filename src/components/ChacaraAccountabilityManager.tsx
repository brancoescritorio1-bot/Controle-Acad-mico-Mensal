import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, FileText, Download, Upload, Calendar, DollarSign, PieChart, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { ChacaraAccountability, ChacaraExpense, ChacaraBill } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SupabaseClient } from '@supabase/supabase-js';
import { useDialog } from './DialogContext';

interface ChacaraAccountabilityManagerProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  supabaseClient: SupabaseClient | null;
}

export const ChacaraAccountabilityManager: React.FC<ChacaraAccountabilityManagerProps> = ({ fetchWithAuth, supabaseClient }) => {
  const { confirm: dialogConfirm, alert: dialogAlert } = useDialog();
  const [monthReference, setMonthReference] = useState(new Date().toISOString().slice(0, 7));
  const [accountability, setAccountability] = useState<ChacaraAccountability | null>(null);
  const [expenses, setExpenses] = useState<ChacaraExpense[]>([]);
  const [bills, setBills] = useState<ChacaraBill[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    initial_reserve_fund: 0,
    initial_apportionment: 0,
    initial_services: 0,
    electricity_bill_value: 0,
    water_bill_value: 0
  });

  const totalServiceProviders = expenses.filter(exp => exp.category === 'Prestador').reduce((acc, exp) => acc + exp.amount, 0);
  const totalEnergyExpenses = expenses.filter(exp => exp.category === 'Energia').reduce((acc, exp) => acc + exp.amount, 0);
  const totalWaterExpenses = expenses.filter(exp => exp.category === 'Água').reduce((acc, exp) => acc + exp.amount, 0);
  const remainingEnergy = form.electricity_bill_value - totalEnergyExpenses;
  const remainingWater = form.water_bill_value - totalWaterExpenses;

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Manutenção',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    receipt_url: ''
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const categories = ['Energia', 'Água', 'Manutenção', 'Prestador', 'Outros'];

  useEffect(() => {
    fetchAccountability();
    fetchBills();
  }, [monthReference]);

  const accountabilityTotals = React.useMemo(() => {
    if (bills.length === 0 || !accountability) return null;
    const paidBills = bills.filter(b => b.status === 'paid');
    return {
      total_collected: paidBills.reduce((acc, b) => acc + (b.amount_paid || b.total), 0),
      collected_reserve_fund: paidBills.reduce((acc, b) => acc + (b.include_reserve_fund ? b.reserve_fund : 0), 0),
      collected_energy: paidBills.reduce((acc, b) => acc + b.kwh_value, 0),
      collected_water: paidBills.reduce((acc, b) => acc + (b.water_value + (b.water_service_fee || 0)), 0),
      collected_apportionment: paidBills.reduce((acc, b) => acc + (b.include_apportionment ? b.apportionment_value : 0), 0),
    };
  }, [bills, accountability]);

  const displayAccountability = accountabilityTotals ? { ...accountability, ...accountabilityTotals } : accountability;

  const fetchBills = async () => {
    try {
      const res = await fetchWithAuth(`/api/chacara/bills`);
      if (res.ok) {
        const data = await res.json();
        setBills(data.filter((b: ChacaraBill) => b.month_reference === monthReference));
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const fetchAccountability = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/chacara/accountability/${monthReference}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setAccountability(data);
          setForm({
            initial_reserve_fund: data.initial_reserve_fund || 0,
            initial_apportionment: data.initial_apportionment || 0,
            initial_services: data.initial_services || 0,
            electricity_bill_value: data.electricity_bill_value || 0,
            water_bill_value: data.water_bill_value || 0
          });
          fetchExpenses(data.id);
        } else {
          setAccountability(null);
          setExpenses([]);
          setForm({
            initial_reserve_fund: 0,
            initial_apportionment: 0,
            initial_services: 0,
            electricity_bill_value: 0,
            water_bill_value: 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching accountability:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/chacara/accountability/${id}/expenses`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleSaveAccountability = async () => {
    try {
      const res = await fetchWithAuth('/api/chacara/accountability', {
        method: 'POST',
        body: JSON.stringify({
          month_reference: monthReference,
          ...form
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAccountability(data);
        dialogAlert('Dados salvos com sucesso!');
      }
    } catch (error) {
      console.error('Error saving accountability:', error);
      dialogAlert('Erro ao salvar dados.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supabaseClient) {
      dialogAlert('Cliente Supabase não inicializado. Tente novamente em instantes.');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${monthReference}/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('chacara_receipts')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabaseClient.storage.from('chacara_receipts').getPublicUrl(filePath);
      
      setExpenseForm(prev => ({ ...prev, receipt_url: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading file:', error);
      dialogAlert('Erro ao fazer upload do arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!accountability) {
      dialogAlert('Salve os dados iniciais do mês antes de adicionar despesas.');
      return;
    }

    if (!expenseForm.description || expenseForm.amount <= 0) {
      dialogAlert('Preencha a descrição e um valor válido.');
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/chacara/accountability/${accountability.id}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expenseForm)
      });
      
      if (res.ok) {
        fetchExpenses(accountability.id);
        setShowExpenseModal(false);
        setExpenseForm({
          description: '',
          category: 'Manutenção',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          receipt_url: ''
        });
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      dialogAlert('Erro ao adicionar despesa.');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!accountability) return;
    if (!(await dialogConfirm('Deseja realmente excluir esta despesa?'))) return;

    try {
      const res = await fetchWithAuth(`/api/chacara/accountability/${accountability.id}/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchExpenses(accountability.id);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const exportToPDF = () => {
    if (!accountability) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Prestação de Contas - Chácara', 14, 20);
    
    // Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Mês de Referência: ${monthReference}`, 14, 40);
    
    // Financial Summary
    doc.setFontSize(14);
    doc.text('Resumo Financeiro', 14, 55);
    doc.setDrawColor(79, 70, 229);
    doc.line(14, 57, 196, 57);
    
    doc.setFontSize(10);
    doc.text(`Saldo Inicial Fundo Reserva: R$ ${form.initial_reserve_fund.toFixed(2)}`, 14, 65);
    doc.text(`Saldo Inicial Rateio: R$ ${form.initial_apportionment.toFixed(2)}`, 14, 71);
    doc.text(`Saldo Inicial Prestadores: R$ ${form.initial_services.toFixed(2)}`, 14, 77);
    doc.text(`Total Arrecadado no Mês: R$ ${accountabilityTotals?.total_collected?.toFixed(2) || '0.00'}`, 14, 83);
    doc.text(`Total de Despesas: R$ ${totalExpenses.toFixed(2)}`, 14, 89);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Saldo Final: R$ ${finalBalance.toFixed(2)}`, 14, 101);
    doc.setFont('helvetica', 'normal');

    // Expenses Table
    if (expenses.length > 0) {
      autoTable(doc, {
        startY: 110,
        head: [['Data', 'Descrição', 'Categoria', 'Valor']],
        body: expenses.map(exp => [
          new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR'),
          exp.description,
          exp.category,
          `R$ ${exp.amount.toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
      });
    }

    // Receipts List
    const receipts = expenses.filter(exp => exp.receipt_url);
    if (receipts.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Comprovantes Anexados', 14, finalY);
      doc.setFontSize(10);
      receipts.forEach((exp, index) => {
        doc.text(`${index + 1}. ${exp.description}: ${exp.receipt_url}`, 14, finalY + 10 + (index * 6));
      });
    }

    doc.save(`prestacao-contas-${monthReference}.pdf`);
  };

  useEffect(() => {
    const handleGlobalExport = () => {
      exportToPDF();
    };
    window.addEventListener('export-chacara-accountability', handleGlobalExport);
    return () => window.removeEventListener('export-chacara-accountability', handleGlobalExport);
  }, [exportToPDF]);

  const totalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const finalBalance = (Number(form.initial_reserve_fund) + Number(form.initial_apportionment) + Number(form.initial_services) + (accountabilityTotals?.total_collected || 0)) - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Prestação de Contas</h2>
          <p className="text-gray-500">Gerencie as finanças e gere relatórios mensais</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <input 
            type="month" 
            value={monthReference}
            onChange={e => setMonthReference(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-gray-700 w-full sm:w-auto"
          />
          <button 
            onClick={exportToPDF}
            disabled={!accountability}
            className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 font-bold disabled:opacity-50 w-full sm:w-auto"
          >
            <Download size={18} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              Saldos e Arrecadação
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Total Arrecadado no Mês</label>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-xl font-black text-emerald-600">R$ {accountability?.total_collected?.toFixed(2) || '0.00'}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Saldo Inicial Fundo Reserva</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={form.initial_reserve_fund}
                    onChange={e => setForm({...form, initial_reserve_fund: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Saldo Inicial Rateio</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={form.initial_apportionment}
                    onChange={e => setForm({...form, initial_apportionment: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Conta Luz (Valor)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={form.electricity_bill_value}
                    onChange={e => setForm({...form, electricity_bill_value: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Conta Água (Valor)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={form.water_bill_value}
                    onChange={e => setForm({...form, water_bill_value: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Saldo Inicial Prestadores</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={form.initial_services}
                    onChange={e => setForm({...form, initial_services: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveAccountability}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Salvar Dados do Mês
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Cards & Expenses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <TrendingUp size={14} className="text-emerald-500" /> Arrecadado
              </span>
              <span className="text-2xl font-black text-emerald-600">R$ {(accountabilityTotals?.total_collected || 0).toFixed(2)}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <TrendingDown size={14} className="text-rose-500" /> Despesas
              </span>
              <span className="text-2xl font-black text-rose-600">R$ {totalExpenses.toFixed(2)}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign size={14} className="text-indigo-500" /> Saldo Final
              </span>
              <span className={`text-2xl font-black ${finalBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                R$ {finalBalance.toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Fundo Reserva</span>
              <span className="text-lg font-black text-gray-900">R$ {(accountabilityTotals?.collected_reserve_fund || 0).toFixed(2)}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Rateio</span>
              <span className="text-lg font-black text-gray-900">R$ {(accountabilityTotals?.collected_apportionment || 0).toFixed(2)}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Prestador</span>
              <span className="text-lg font-black text-gray-900">R$ {totalServiceProviders.toFixed(2)}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Falta Luz</span>
              <span className="text-lg font-black text-rose-600">R$ {remainingEnergy.toFixed(2)}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Falta Água</span>
              <span className="text-lg font-black text-rose-600">R$ {remainingWater.toFixed(2)}</span>
            </div>
          </div>

          {/* Expenses List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" />
                Despesas do Mês
              </h3>
              <button 
                onClick={() => setShowExpenseModal(true)}
                disabled={!accountability}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
              >
                <Plus size={16} />
                Nova Despesa
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Descrição</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Valor</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Comprovante</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma despesa registrada neste mês.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{exp.description}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600">
                          R$ {exp.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {exp.receipt_url ? (
                            <a 
                              href={exp.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline text-sm font-medium"
                            >
                              Ver Anexo
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bills List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" />
                Histórico de Contas (Bills)
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Usuário</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Vencimento</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma conta registrada neste mês.
                      </td>
                    </tr>
                  ) : (
                    bills.map(bill => (
                      <tr key={bill.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {bill.chacara_user_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          R$ {bill.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                            bill.status === 'paid' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : (bill.status === 'partial' || (bill.amount_paid || 0) > 0)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {bill.status === 'paid' ? 'Pago' : (bill.status === 'partial' || (bill.amount_paid || 0) > 0) ? 'Parcial' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
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
              <h3 className="text-xl font-black text-gray-900 mb-6">Nova Despesa</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Descrição</label>
                  <input 
                    type="text" 
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
                    placeholder="Ex: Conta de Luz"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Data</label>
                    <input 
                      type="date" 
                      value={expenseForm.date}
                      onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Categoria</label>
                  <select 
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Comprovante (Opcional)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="receipt-upload"
                      accept="image/*,.pdf"
                    />
                    <label 
                      htmlFor="receipt-upload"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-all text-gray-600 font-medium"
                    >
                      {isUploading ? (
                        <span className="animate-pulse">Enviando...</span>
                      ) : expenseForm.receipt_url ? (
                        <span className="text-emerald-600 flex items-center gap-2"><CheckCircle size={18} /> Arquivo Anexado</span>
                      ) : (
                        <><Upload size={18} /> Escolher Arquivo</>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowExpenseModal(false)}
                  className="w-full sm:flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddExpense}
                  disabled={isUploading}
                  className="w-full sm:flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
