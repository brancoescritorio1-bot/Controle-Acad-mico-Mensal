import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Wallet, TrendingUp, Droplets, Zap, Building2, Briefcase, Users, Download, Plus, Trash2, FileText, Image as ImageIcon, X, Eye } from 'lucide-react';
import { ChacaraBill } from '../types';
import { toPng } from 'html-to-image';

interface ChacaraFinanceDashboardProps {
  bills: ChacaraBill[];
  expenses?: any[];
  onUpdate?: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
}

export const ChacaraFinanceDashboard: React.FC<ChacaraFinanceDashboardProps> = ({ bills, expenses = [], onUpdate, fetchWithAuth, filterMonth, setFilterMonth }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'geral',
    amount: '' as string | number,
    date: new Date().toISOString().slice(0, 10),
    receipt_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const data = useMemo(() => {
    const expected = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const received = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const prevReceived = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const currentExpenses = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const prevExpenses = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };

    bills.forEach(bill => {
      const isPaid = bill.status === 'paid';
      const isPartial = bill.status === 'partial';

      const fundoReserva = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
      const rateio = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
      const prestador = bill.water_service_fee || 0;

      const energyReadings = bill.energy_readings || [];
      const waterReadings = bill.water_readings || [];

      const energyConsumption = energyReadings.length > 0
        ? energyReadings.reduce((acc: number, r: any) => acc + (r.curr - r.prev), 0)
        : (bill.curr_reading || 0) - (bill.prev_reading || 0) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
      const energia = energyConsumption * (bill.kwh_value || 0);
      
      const waterConsumption = waterReadings.length > 0
        ? waterReadings.reduce((acc: number, r: any) => acc + (r.curr - r.prev), 0)
        : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
      const agua = waterConsumption * (bill.water_value || 0);

      const calculatedTotal = fundoReserva + rateio + prestador + agua + energia;
      const finalTotal = bill.total || calculatedTotal;
      const adjustmentRatio = (calculatedTotal > 0 && Math.abs(finalTotal - calculatedTotal) > 0.01) ? finalTotal / calculatedTotal : 1;

      const adjFundoReserva = fundoReserva * adjustmentRatio;
      const adjRateio = rateio * adjustmentRatio;
      const adjPrestador = prestador * adjustmentRatio;
      const adjAgua = agua * adjustmentRatio;
      const adjEnergia = energia * adjustmentRatio;

      const amountPaid = isPaid ? finalTotal : (bill.amount_paid || 0);
      const ratio = finalTotal > 0 ? amountPaid / finalTotal : 0;

      const hasPaidCategories = bill.paid_categories && Object.keys(bill.paid_categories).length > 0;
      
      const getReceived = (value: number, key: string) => {
        if (isPaid) return value;
        if (hasPaidCategories) {
          return bill.paid_categories![key] ? value : 0;
        }
        return value * ratio;
      };

      if (bill.month_reference === filterMonth) {
        // Add to expected
        expected.fundoReserva += adjFundoReserva;
        expected.rateio += adjRateio;
        expected.prestador += adjPrestador;
        expected.agua += adjAgua;
        expected.energia += adjEnergia;
        expected.geral += finalTotal;

        // Add to received
        received.fundoReserva += getReceived(adjFundoReserva, 'reserve_fund');
        received.rateio += getReceived(adjRateio, 'apportionment');
        received.prestador += getReceived(adjPrestador, 'water_service_fee');
        received.agua += getReceived(adjAgua, 'water_total');
        received.energia += getReceived(adjEnergia, 'energy_total');
        received.geral += amountPaid;
      } else if (bill.month_reference < filterMonth) {
        prevReceived.fundoReserva += getReceived(adjFundoReserva, 'reserve_fund');
        prevReceived.rateio += getReceived(adjRateio, 'apportionment');
        prevReceived.prestador += getReceived(adjPrestador, 'water_service_fee');
        prevReceived.agua += getReceived(adjAgua, 'water_total');
        prevReceived.energia += getReceived(adjEnergia, 'energy_total');
        prevReceived.geral += amountPaid;
      }
    });

    expenses.forEach(exp => {
      const cat = exp.category || 'geral';
      const amount = Number(exp.amount) || 0;
      if (exp.month_reference === filterMonth) {
        if (cat in currentExpenses) (currentExpenses as any)[cat] += amount;
        currentExpenses.geral += amount;
      } else if (exp.month_reference < filterMonth) {
        if (cat in prevExpenses) (prevExpenses as any)[cat] += amount;
        prevExpenses.geral += amount;
      }
    });

    return { expected, received, prevReceived, currentExpenses, prevExpenses };
  }, [bills, expenses, filterMonth]);

  const formatMonthYear = (dateString: string) => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    const monthName = date.toLocaleString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${year}`;
  };

  const handleExport = async () => {
    if (!dashboardRef.current) return;
    
    try {
      window.print();
    } catch (error: any) {
      console.error('Erro ao imprimir o dashboard:', error);
      alert(`Ocorreu um erro ao tentar imprimir o dashboard: ${error.message || error}. Tente novamente.`);
    }
  };

  useEffect(() => {
    const handleGlobalExport = () => {
      handleExport();
    };
    window.addEventListener('export-chacara-dashboard', handleGlobalExport);
    return () => window.removeEventListener('export-chacara-dashboard', handleGlobalExport);
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/chacara/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...expenseForm,
          month_reference: filterMonth
        })
      });

      if (res.ok) {
        setIsExpenseModalOpen(false);
        setExpenseForm({ description: '', category: 'geral', amount: '', date: new Date().toISOString().slice(0, 10), receipt_url: '' });
        if (onUpdate) onUpdate();
      } else {
        const err = await res.json();
        let errorMessage = err.message || err.error || JSON.stringify(err);
        if (errorMessage.includes('relation "chacara_expenses" does not exist') || errorMessage.includes("A tabela 'chacara_expenses' não existe")) {
          errorMessage = 'A tabela "chacara_expenses" não existe no banco de dados. Por favor, crie-a no Supabase com as colunas: id, accountability_id, description, category, amount, date, receipt_url.';
        } else if (errorMessage.includes('relation "chacara_accountability" does not exist') || errorMessage.includes("A tabela 'chacara_accountability' não existe")) {
          errorMessage = 'A tabela "chacara_accountability" não existe no banco de dados. Por favor, crie-a no Supabase com as colunas: id, user_id, month_reference.';
        }
        alert(`Erro ao adicionar despesa:\n\n${errorMessage}`);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Erro de conexão ao adicionar despesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;
    try {
      const res = await fetchWithAuth(`/api/chacara/expenses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo é muito grande. O tamanho máximo permitido é 5MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setExpenseForm(prev => ({ ...prev, receipt_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const overallExpected = data.expected.geral;
  const overallReceived = data.received.geral;
  const overallPrevReceived = data.prevReceived.geral;
  const overallPrevExpenses = data.prevExpenses.geral;
  const overallCurrentExpenses = data.currentExpenses.geral;

  const categories = [
    { 
      key: 'geral', 
      title: 'Resumo Geral', 
      expected: overallExpected, 
      received: overallReceived, 
      prevReceived: overallPrevReceived,
      prevExpenses: overallPrevExpenses,
      currentExpenses: overallCurrentExpenses,
      icon: Wallet, 
      color: 'text-indigo-600' 
    },
    { 
      key: 'fundoReserva', 
      title: 'Fundo de Reserva', 
      expected: data.expected.fundoReserva, 
      received: data.received.fundoReserva, 
      prevReceived: data.prevReceived.fundoReserva,
      prevExpenses: data.prevExpenses.fundoReserva,
      currentExpenses: data.currentExpenses.fundoReserva,
      icon: Building2, 
      color: 'text-emerald-600' 
    },
    { 
      key: 'rateio', 
      title: 'Rateio', 
      expected: data.expected.rateio, 
      received: data.received.rateio, 
      prevReceived: data.prevReceived.rateio,
      prevExpenses: data.prevExpenses.rateio,
      currentExpenses: data.currentExpenses.rateio,
      icon: Users, 
      color: 'text-purple-600' 
    },
    { 
      key: 'prestador', 
      title: 'Prestador de Serviço', 
      expected: data.expected.prestador, 
      received: data.received.prestador, 
      prevReceived: data.prevReceived.prestador,
      prevExpenses: data.prevExpenses.prestador,
      currentExpenses: data.currentExpenses.prestador,
      icon: Briefcase, 
      color: 'text-blue-600' 
    },
    { 
      key: 'agua', 
      title: 'Conta de Água', 
      expected: data.expected.agua, 
      received: data.received.agua, 
      prevReceived: data.prevReceived.agua,
      prevExpenses: data.prevExpenses.agua,
      currentExpenses: data.currentExpenses.agua,
      icon: Droplets, 
      color: 'text-cyan-600' 
    },
    { 
      key: 'energia', 
      title: 'Conta de Energia', 
      expected: data.expected.energia, 
      received: data.received.energia, 
      prevReceived: data.prevReceived.energia,
      prevExpenses: data.prevExpenses.energia,
      currentExpenses: data.currentExpenses.energia,
      icon: Zap, 
      color: 'text-amber-600' 
    },
  ];

  const currentMonthExpenses = expenses.filter(e => e.month_reference === filterMonth);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Financeiro da Chácara</h2>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 w-full sm:w-auto">
            <label className="text-sm font-semibold text-gray-500 uppercase hidden sm:block">Mês de Referência:</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-800 outline-none cursor-pointer w-full"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-700 transition-colors font-medium print:hidden w-full sm:w-auto"
          >
            <Download size={18} />
            <span>Exportar</span>
          </button>
        </div>
      </div>
      
      <div ref={dashboardRef} className="p-6 bg-gray-50 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const pending = cat.expected - cat.received;
            const prevBalance = cat.prevReceived - cat.prevExpenses;
            const finalBalance = prevBalance + cat.received - cat.currentExpenses;
            
            return (
              <div key={cat.key} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-500">{cat.title}</h3>
                  <cat.icon className={cat.color} size={24} />
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Saldo Final</p>
                      <p className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        R$ {finalBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Saldo Anterior</p>
                      <p className="text-sm font-bold text-gray-600">R$ {prevBalance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">A Receber</p>
                      <p className="text-sm font-bold text-amber-500">R$ {Math.max(0, pending).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Recebido (Mês)</p>
                      <p className="text-sm font-bold text-emerald-600">R$ {cat.received.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Despesas (Mês)</p>
                      <p className="text-sm font-bold text-red-500">R$ {cat.currentExpenses.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-red-500" size={20} />
              Despesas do Mês
            </h3>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="no-export w-full sm:w-auto flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm print:hidden"
            >
              <Plus size={16} />
              Nova Despesa
            </button>
          </div>

          {currentMonthExpenses.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma despesa lançada neste mês.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Data</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Comprovante</th>
                    <th className="px-4 py-3 rounded-r-lg no-export print:hidden">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMonthExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">{exp.description}</td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">
                          {categories.find(c => c.key === exp.category)?.title || 'Geral'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600">
                        R$ {Number(exp.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {exp.receipt_url ? (
                          <div className="flex items-center gap-2">
                            {exp.receipt_url.startsWith('data:image') && (
                              <img 
                                src={exp.receipt_url} 
                                alt="Thumbnail" 
                                className="w-8 h-8 rounded object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setPreviewUrl(exp.receipt_url)}
                              />
                            )}
                            <button 
                              onClick={() => setPreviewUrl(exp.receipt_url)}
                              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium"
                            >
                              <Eye size={14} />
                              Visualizar
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 no-export print:hidden">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Print only: Receipts Gallery */}
        <div className="hidden print:block mt-12 break-before-page">
          <h3 className="text-xl font-bold mb-6 border-b pb-2 text-gray-800">Galeria de Comprovantes</h3>
          <div className="grid grid-cols-2 gap-8">
            {currentMonthExpenses.filter(e => e.receipt_url).map(exp => (
              <div key={exp.id} className="border border-gray-200 p-4 rounded-xl">
                <div className="mb-3">
                  <p className="text-sm font-bold text-gray-800">{exp.description}</p>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <span className="font-bold text-red-600">R$ {Number(exp.amount).toFixed(2)}</span>
                  </div>
                </div>
                {exp.receipt_url.startsWith('data:image') ? (
                  <img src={exp.receipt_url} className="w-full h-auto rounded-lg border border-gray-100" alt="Comprovante" />
                ) : (
                  <div className="bg-gray-50 p-12 text-center rounded-lg border border-dashed border-gray-300">
                    <FileText className="mx-auto mb-2 text-gray-300" size={48} />
                    <p className="text-sm text-gray-400 font-medium">Documento PDF / Arquivo</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 md:p-8">
          <div className="bg-white w-full max-w-4xl max-h-full rounded-2xl overflow-hidden flex flex-col relative shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
              <h3 className="font-bold text-gray-800">Visualização do Comprovante</h3>
              <button 
                onClick={() => setPreviewUrl(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50 flex items-center justify-center min-h-[300px]">
              {previewUrl.startsWith('data:image') ? (
                <img src={previewUrl} className="max-w-full h-auto shadow-lg rounded-lg" alt="Preview" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg shadow-inner" title="PDF Preview" />
                  <a 
                    href={previewUrl} 
                    download="comprovante" 
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Baixar Arquivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 md:p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Nova Despesa</h3>
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Assunto</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Ex: Compra de material"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {categories.map(c => (
                    <option key={c.key} value={c.key}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante (Imagem/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {expenseForm.receipt_url && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Arquivo anexado</p>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
