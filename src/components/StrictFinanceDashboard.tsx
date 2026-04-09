import React, { useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Building2, Droplets, Zap, Briefcase, Users, AlertCircle, Download, Activity, X, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Lancamento {
  id: string;
  data: string;
  mes_referencia: string;
  categoria: 'fundo_reserva' | 'agua' | 'energia' | 'prestador' | 'rateio' | 'despesa_geral';
  tipo: 'receita' | 'despesa';
  valor: number;
  status: 'pago' | 'pendente' | 'parcial';
  valor_pago: number;
  descricao: string;
}

interface StrictFinanceDashboardProps {
  lancamentos: Lancamento[];
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  onRefresh?: () => void;
}

export const StrictFinanceDashboard: React.FC<StrictFinanceDashboardProps> = ({ lancamentos, filterMonth, setFilterMonth, onRefresh }) => {
  const [selectedCategory, setSelectedCategory] = useState<{id: string, title: string} | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const getValorRecebido = (l: Lancamento) => {
    if (l.status === 'pago') return l.valor;
    if (l.status === 'parcial') return l.valor_pago;
    return 0;
  };

  const getValorPendente = (l: Lancamento) => {
    if (l.status === 'pendente') return l.valor;
    if (l.status === 'parcial') return l.valor - l.valor_pago;
    return 0;
  };

  const comparisonData = useMemo(() => {
    const usersMap = new Map<string, { 
      fundo: Lancamento | null, 
      agua: Lancamento | null, 
      energia: Lancamento | null, 
      prestador: Lancamento | null, 
      rateio: Lancamento | null 
    }>();
    
    const targetCategories = ['fundo_reserva', 'agua', 'energia', 'prestador', 'rateio'];
    
    lancamentos.filter(l => l.mes_referencia === filterMonth && targetCategories.includes(l.categoria)).forEach(l => {
      if (!usersMap.has(l.descricao)) {
        usersMap.set(l.descricao, { fundo: null, agua: null, energia: null, prestador: null, rateio: null });
      }
      const userObj = usersMap.get(l.descricao)!;
      if (l.categoria === 'fundo_reserva') userObj.fundo = l;
      if (l.categoria === 'agua') userObj.agua = l;
      if (l.categoria === 'energia') userObj.energia = l;
      if (l.categoria === 'prestador') userObj.prestador = l;
      if (l.categoria === 'rateio') userObj.rateio = l;
    });

    return Array.from(usersMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => a.name.localeCompare(b.name));
  }, [lancamentos, filterMonth]);

  const dashboardData = useMemo(() => {
    const filtered = lancamentos.filter(l => l.mes_referencia === filterMonth);
    
    let totalPrevisto = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    let totalDespesas = 0;

    const categorias = {
      fundo_reserva: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0 },
      agua: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0 },
      energia: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0 },
      prestador: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0 },
      rateio: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0 },
    };

    filtered.forEach(l => {
      const recebido = getValorRecebido(l);
      const pendente = getValorPendente(l);

      if (l.tipo === 'receita') {
        totalPrevisto += l.valor;
        totalRecebido += recebido;
        totalPendente += pendente;

        if (l.categoria in categorias) {
          const cat = categorias[l.categoria as keyof typeof categorias];
          cat.valor += l.valor;
          cat.recebido += recebido;
          cat.pendente += pendente;
          
          cat.totalUsuarios += 1;
          if (l.status === 'pago') {
            cat.pagosUsuarios += 1;
          }
        }
      } else if (l.tipo === 'despesa') {
        totalDespesas += l.valor;
      }
    });

    const saldoTotal = totalRecebido - totalDespesas;

    const meses = Array.from(new Set(lancamentos.map(l => l.mes_referencia))).sort();
    let runningSum = 0;
    const acumuladoPorMes = meses.map(mes => {
      const lancsMes = lancamentos.filter(l => l.mes_referencia === mes);
      const recMes = lancsMes.filter(l => l.tipo === 'receita').reduce((acc, l) => acc + getValorRecebido(l), 0);
      const despMes = lancsMes.filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0);
      runningSum += (recMes - despMes);
      return { mes, saldo: runningSum };
    });

    const saldoAcumuladoAtual = acumuladoPorMes.find(a => a.mes === filterMonth)?.saldo || 0;

    return {
      totalPrevisto,
      totalRecebido,
      totalPendente,
      totalDespesas,
      saldoTotal,
      categorias,
      acumuladoPorMes,
      saldoAcumuladoAtual
    };
  }, [lancamentos, filterMonth]);

  const handleDownloadComparisonPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`Comparativo Geral de Categorias - ${filterMonth}`, 14, 15);
    
    const tableColumn = ["Usuário", "Fundo de Reserva", "Água", "Energia", "Prestador", "Rateio", "Status"];
    const tableRows: any[] = [];
    const diffRows: number[] = [];

    comparisonData.forEach((row, index) => {
      const getStatusText = (item: Lancamento | null) => {
        if (!item) return 'Não cobrado';
        return `${item.status.toUpperCase()} (R$ ${item.valor.toFixed(2)})`;
      };

      const statuses = [
        row.fundo ? row.fundo.status : 'N/A',
        row.agua ? row.agua.status : 'N/A',
        row.energia ? row.energia.status : 'N/A',
        row.prestador ? row.prestador.status : 'N/A',
        row.rateio ? row.rateio.status : 'N/A'
      ];
      const hasDiff = !statuses.every(s => s === statuses[0]);

      if (hasDiff) {
        diffRows.push(index);
      }

      const rowData = [
        row.name,
        getStatusText(row.fundo),
        getStatusText(row.agua),
        getStatusText(row.energia),
        getStatusText(row.prestador),
        getStatusText(row.rateio),
        hasDiff ? 'Diferença' : 'OK'
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      didParseCell: function(data) {
        if (data.section === 'body') {
          if (diffRows.includes(data.row.index)) {
            data.cell.styles.fillColor = [254, 242, 242]; // red-50
          }

          const text = data.cell.raw;
          if (typeof text === 'string') {
            if (text.startsWith('PAGO')) {
              data.cell.styles.textColor = [5, 150, 105]; // emerald-600
              data.cell.styles.fontStyle = 'bold';
            } else if (text.startsWith('PENDENTE')) {
              data.cell.styles.textColor = [220, 38, 38]; // red-600
              data.cell.styles.fontStyle = 'bold';
            } else if (text.startsWith('PARCIAL')) {
              data.cell.styles.textColor = [217, 119, 6]; // amber-600
              data.cell.styles.fontStyle = 'bold';
            } else if (text === 'Não cobrado') {
              data.cell.styles.textColor = [156, 163, 175]; // gray-400
              data.cell.styles.fontStyle = 'italic';
            }

            if (data.column.index === 6) { // Status column
              if (text === 'Diferença') {
                data.cell.styles.textColor = [220, 38, 38]; // red-600
                data.cell.styles.fontStyle = 'bold';
              } else if (text === 'OK') {
                data.cell.styles.textColor = [5, 150, 105]; // emerald-600
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        }
      }
    });

    doc.save(`comparativo_categorias_${filterMonth.replace('/', '_')}.pdf`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Activity className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Visão Geral</h2>
            <p className="text-sm text-gray-500">Acompanhamento financeiro em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm font-bold border border-gray-200"
              title="Sincronizar com Histórico"
            >
              <TrendingUp size={18} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          )}
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 flex-1 md:flex-none">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mês:</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-base font-bold text-indigo-600 outline-none cursor-pointer w-full"
            />
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Receitas (Recebido)</p>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="text-emerald-500" size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">R$ {dashboardData.totalRecebido.toFixed(2)}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">de R$ {dashboardData.totalPrevisto.toFixed(2)} previsto</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Despesas Pagas</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const doc = new jsPDF();
                  const filteredExps = lancamentos.filter(l => l.tipo === 'despesa' && l.mes_referencia === filterMonth);
                  doc.setFontSize(18);
                  doc.text(`Relatório de Despesas - ${filterMonth}`, 14, 22);
                  const total = filteredExps.reduce((sum, e) => sum + Number(e.valor), 0);
                  doc.setFontSize(12);
                  doc.text(`Total: R$ ${total.toFixed(2)}`, 14, 32);
                  autoTable(doc, {
                    startY: 40,
                    head: [['Data', 'Descrição', 'Categoria', 'Valor (R$)']],
                    body: filteredExps.map(e => [
                      new Date(e.data).toLocaleDateString('pt-BR'),
                      e.descricao,
                      e.categoria === 'despesa_geral' ? 'Despesa Geral' : e.categoria,
                      Number(e.valor).toFixed(2)
                    ]),
                  });
                  doc.save(`despesas_${filterMonth}.pdf`);
                }}
                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                title="Exportar Despesas PDF"
              >
                <Download size={18} />
              </button>
              <div className="p-2 bg-red-50 rounded-xl">
                <TrendingDown className="text-red-500" size={18} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">R$ {dashboardData.totalDespesas.toFixed(2)}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">Saídas do mês</p>
          </div>
        </div>

        <div className="bg-gray-900 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={64} /></div>
          <div className="relative z-10 flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo em Caixa</p>
          </div>
          <div className="relative z-10">
            <p className={`text-2xl md:text-3xl font-black tracking-tight ${dashboardData.saldoTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              R$ {dashboardData.saldoTotal.toFixed(2)}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-1">
              Acumulado global: <span className={dashboardData.saldoAcumuladoAtual >= 0 ? 'text-emerald-400' : 'text-red-400'}>R$ {dashboardData.saldoAcumuladoAtual.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inadimplência</p>
            <div className="p-2 bg-amber-50 rounded-xl">
              <AlertCircle className="text-amber-500" size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">R$ {dashboardData.totalPendente.toFixed(2)}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">Aguardando pagamento</p>
          </div>
        </div>
      </div>

      {/* Detalhamento por Categoria (Combined View) */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Briefcase size={20} className="text-indigo-600" />
            Detalhamento por Categoria
          </h3>
          <button 
            onClick={() => setShowComparison(true)} 
            className="text-sm text-indigo-600 font-bold hover:text-indigo-700 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
          >
            Comparativo Geral
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { id: 'fundo_reserva', title: 'Fundo de Reserva', icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
            { id: 'agua', title: 'Água', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50', bar: 'bg-cyan-500' },
            { id: 'energia', title: 'Energia', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' },
            { id: 'prestador', title: 'Prestador', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
            { id: 'rateio', title: 'Rateio', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' },
          ].map(cat => {
            const data = dashboardData.categorias[cat.id as keyof typeof dashboardData.categorias];
            const Icon = cat.icon;
            const percentUsers = data.totalUsuarios > 0 ? (data.pagosUsuarios / data.totalUsuarios) * 100 : 0;
            const percentValue = data.valor > 0 ? (data.recebido / data.valor) * 100 : 0;
            
            return (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCategory({ id: cat.id, title: cat.title })}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-md transition-shadow cursor-pointer"
              >
                
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${cat.bg} ${cat.color}`}>
                      <Icon size={18} />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{cat.title}</h4>
                  </div>
                </div>

                {/* Main Value */}
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Previsto</p>
                  <p className="text-xl font-black text-gray-900 tracking-tight">R$ {data.valor.toFixed(2)}</p>
                </div>

                {/* Progress Bar (Financial) */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-emerald-600">R$ {data.recebido.toFixed(2)}</span>
                    <span className="text-amber-500">R$ {data.pendente.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden flex">
                    <div className={`h-full ${cat.bar}`} style={{ width: `${percentValue}%` }}></div>
                  </div>
                </div>

                {/* Users Summary */}
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Adesão</p>
                    <p className="text-sm font-bold text-gray-900">
                      {data.pagosUsuarios} <span className="text-gray-400 text-xs">/ {data.totalUsuarios}</span>
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-bold ${cat.bg} ${cat.color}`}>
                    {percentUsers.toFixed(0)}%
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhamento de Adesão */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCategory(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Detalhamento - {selectedCategory.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Adesão dos usuários para o mês selecionado</p>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-3">
                {lancamentos
                  .filter(l => l.mes_referencia === filterMonth && l.categoria === selectedCategory.id && l.tipo === 'receita')
                  .sort((a, b) => a.descricao.localeCompare(b.descricao))
                  .map(l => (
                    <div key={l.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-800">{l.descricao}</p>
                        <p className="text-xs text-gray-500">{new Date(l.data).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">R$ {l.valor.toFixed(2)}</p>
                        <div className="mt-1">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                            l.status === 'pago' ? 'bg-emerald-100 text-emerald-700' :
                            l.status === 'parcial' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {l.status}
                          </span>
                          {l.status === 'parcial' && (
                            <span className="text-xs text-amber-600 font-bold ml-2">
                              (Pago: R$ {l.valor_pago.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {lancamentos.filter(l => l.mes_referencia === filterMonth && l.categoria === selectedCategory.id && l.tipo === 'receita').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum registro encontrado para esta categoria no mês selecionado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comparativo */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowComparison(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Comparativo Geral de Categorias
                </h3>
                <p className="text-sm text-gray-500 mt-1">Mês de Referência: {filterMonth}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadComparisonPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
                >
                  <Download size={16} />
                  Baixar PDF
                </button>
                <button onClick={() => setShowComparison(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-3 px-4 font-bold text-gray-700 rounded-tl-xl text-sm">Usuário</th>
                      <th className="py-3 px-4 font-bold text-gray-700 text-sm">Fundo de Reserva</th>
                      <th className="py-3 px-4 font-bold text-gray-700 text-sm">Água</th>
                      <th className="py-3 px-4 font-bold text-gray-700 text-sm">Energia</th>
                      <th className="py-3 px-4 font-bold text-gray-700 text-sm">Prestador</th>
                      <th className="py-3 px-4 font-bold text-gray-700 text-sm">Rateio</th>
                      <th className="py-3 px-4 font-bold text-gray-700 rounded-tr-xl text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map(row => {
                      const statuses = [
                        row.fundo ? row.fundo.status : 'N/A',
                        row.agua ? row.agua.status : 'N/A',
                        row.energia ? row.energia.status : 'N/A',
                        row.prestador ? row.prestador.status : 'N/A',
                        row.rateio ? row.rateio.status : 'N/A'
                      ];
                      const hasDiff = !statuses.every(s => s === statuses[0]);

                      const renderCell = (item: Lancamento | null) => {
                        if (!item) return <span className="text-gray-400 text-xs font-medium italic">Não cobrado</span>;
                        return (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${item.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : item.status === 'parcial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status} (R$ {item.valor.toFixed(2)})
                          </span>
                        );
                      };

                      return (
                        <tr key={row.name} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${hasDiff ? 'bg-red-50/50 hover:bg-red-50' : ''}`}>
                          <td className="py-3 px-4 font-bold text-gray-800 text-sm">{row.name}</td>
                          <td className="py-3 px-4">{renderCell(row.fundo)}</td>
                          <td className="py-3 px-4">{renderCell(row.agua)}</td>
                          <td className="py-3 px-4">{renderCell(row.energia)}</td>
                          <td className="py-3 px-4">{renderCell(row.prestador)}</td>
                          <td className="py-3 px-4">{renderCell(row.rateio)}</td>
                          <td className="py-3 px-4">
                            {hasDiff ? (
                              <span className="text-red-600 font-bold text-xs flex items-center gap-1">
                                <AlertCircle size={14}/> Diferença
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                <CheckCircle2 size={14}/> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {comparisonData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Nenhum dado encontrado para o mês selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
