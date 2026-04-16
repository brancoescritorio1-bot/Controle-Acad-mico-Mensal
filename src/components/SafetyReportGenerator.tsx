import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FileText, MessageSquare, Download, Copy, CheckCircle2, Image as ImageIcon, X, History, Edit2, Check, Clock, AlertTriangle, Shield, User, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import { cn } from '../lib/utils';

interface NonConformity {
  id?: string;
  description: string;
  suggestion: string;
  normativeItems: string;
  classification: 'LEVE' | 'MÉDIA' | 'GRAVE' | 'GRAVÍSSIMA';
  dueDate: string;
  images: string[];
}

interface SafetyReport {
  id?: string;
  report_number: string;
  location: string;
  supervisor: string;
  status: 'pending' | 'completed';
  completed_at?: string;
  created_at?: string;
  logo_1?: string;
  logo_2?: string;
  nonConformities: NonConformity[];
}

interface SafetyReportGeneratorProps {
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export function SafetyReportGenerator({ fetchWithAuth }: SafetyReportGeneratorProps) {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [currentReport, setCurrentReport] = useState<SafetyReport>({
    report_number: '',
    location: '',
    supervisor: '',
    status: 'pending',
    logo_1: '',
    logo_2: '',
    nonConformities: []
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Logos - Using the files provided by the user
  const LOGO_1 = "/input_file_0.png"; // Click Segurança
  const LOGO_2 = "/input_file_1.png"; // Copasa

  useEffect(() => {
    if (fetchWithAuth) {
      loadReports();
    }
  }, [fetchWithAuth]);

  const loadReports = async () => {
    if (!fetchWithAuth) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/safety/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetails = async (report: SafetyReport) => {
    if (!fetchWithAuth || !report.id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/safety/reports/${report.id}/non-conformities`);
      if (res.ok) {
        const ncs = await res.json();
        setCurrentReport({
          ...report,
          nonConformities: ncs.map((nc: any) => ({
            id: nc.id,
            description: nc.description,
            suggestion: nc.suggestion,
            normativeItems: nc.normative_items,
            classification: nc.classification,
            dueDate: nc.due_date,
            images: nc.images || (nc.image_data ? [nc.image_data] : [])
          }))
        });
        setView('editor');
      }
    } catch (error) {
      console.error("Error loading report details:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!fetchWithAuth) return;
    setLoading(true);
    try {
      const method = currentReport.id ? 'PUT' : 'POST';
      const url = currentReport.id ? `/api/safety/reports/${currentReport.id}` : '/api/safety/reports';
      
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          report_number: currentReport.report_number,
          location: currentReport.location,
          supervisor: currentReport.supervisor,
          status: currentReport.status,
          completed_at: currentReport.completed_at,
          logo_1: currentReport.logo_1,
          logo_2: currentReport.logo_2,
          non_conformities: currentReport.nonConformities
        })
      });

      if (res.ok) {
        await loadReports();
        setView('list');
      }
    } catch (error) {
      console.error("Error saving report:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!fetchWithAuth || !window.confirm('Tem certeza que deseja excluir este relatório?')) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/safety/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadReports();
      }
    } catch (error) {
      console.error("Error deleting report:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (report: SafetyReport) => {
    if (!fetchWithAuth || !report.id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/safety/reports/${report.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...report,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
      });
      if (res.ok) {
        await loadReports();
        if (view === 'editor') setView('list');
      }
    } catch (error) {
      console.error("Error completing report:", error);
    } finally {
      setLoading(false);
    }
  };

  const addNonConformity = () => {
    const newNC: NonConformity = {
      description: '',
      suggestion: '',
      normativeItems: '',
      classification: 'GRAVE',
      dueDate: '',
      images: []
    };
    setCurrentReport(prev => ({
      ...prev,
      nonConformities: [...prev.nonConformities, newNC]
    }));
  };

  const removeNonConformity = (index: number) => {
    setCurrentReport(prev => ({
      ...prev,
      nonConformities: prev.nonConformities.filter((_, i) => i !== index)
    }));
  };

  const updateNonConformity = (index: number, field: keyof NonConformity, value: any) => {
    setCurrentReport(prev => ({
      ...prev,
      nonConformities: prev.nonConformities.map((nc, i) => 
        i === index ? { ...nc, [field]: value } : nc
      )
    }));
  };

  const handleLogoUpload = (logoNum: 1 | 2, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentReport(prev => ({
        ...prev,
        [`logo_${logoNum}`]: reader.result as string
      }));
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const currentImages = currentReport.nonConformities[index].images || [];
      updateNonConformity(index, 'images', [...currentImages, reader.result as string]);
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (ncIndex: number, imgIndex: number) => {
    const currentImages = currentReport.nonConformities[ncIndex].images || [];
    updateNonConformity(ncIndex, 'images', currentImages.filter((_, i) => i !== imgIndex));
  };

  const generateMessage = () => {
    let msg = `Prezados, boa tarde!\n\nInformo sobre o click segurança com inconformidades de:\n\n`;
    msg += `Número da Inconformidade: ${currentReport.report_number}\n`;
    msg += `Local: ${currentReport.location}\n`;
    msg += `Supervisor Responsável: ${currentReport.supervisor}\n\n`;

    currentReport.nonConformities.forEach((nc, index) => {
      msg += `Descrição NC ${index + 1}: ${nc.description}\n`;
      msg += `Itens Normativos:\n${nc.normativeItems}\n`;
      msg += `Classificação: ${nc.classification}\n`;
      if (nc.dueDate) {
        const [year, month, day] = nc.dueDate.split('-');
        msg += `Data de Vencimento: ${day}/${month}/${year}\n`;
      }
      msg += `\n`;
    });

    return msg;
  };

  const copyToClipboard = () => {
    const msg = generateMessage();
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'LEVE': return 'text-sky-400';
      case 'MÉDIA': return 'text-yellow-500';
      case 'GRAVE': return 'text-orange-500';
      case 'GRAVÍSSIMA': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const margin = 14;
    let y = 20;

    // Add Logos
    try {
      if (currentReport.logo_1) {
        doc.addImage(currentReport.logo_1, 'JPEG', margin, y, 40, 20);
      }
      if (currentReport.logo_2) {
        doc.addImage(currentReport.logo_2, 'JPEG', doc.internal.pageSize.getWidth() - margin - 40, y, 40, 20);
      }
      y += 30;
    } catch (e) {
      console.error("Error adding logos to PDF", e);
      y += 10;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Inconformidades - Click Segurança', margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Número da Inconformidade: ${currentReport.report_number}`, margin, y);
    y += 7;
    doc.text(`Local: ${currentReport.location}`, margin, y);
    y += 7;
    doc.text(`Supervisor Responsável: ${currentReport.supervisor}`, margin, y);
    y += 7;
    doc.text(`Data de Geração: ${new Date(currentReport.created_at || new Date()).toLocaleDateString('pt-BR')}`, margin, y);
    y += 10;

    currentReport.nonConformities.forEach((nc, index) => {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Inconformidade ${index + 1}`, margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      
      const addWrappedText = (label: string, text: string, isBoldLabel = false) => {
        if (isBoldLabel) doc.setFont('helvetica', 'bold');
        const lines = doc.splitTextToSize(`${label}: ${text}`, 180);
        if (y + (lines.length * 7) > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, margin, y);
        doc.setFont('helvetica', 'normal');
        y += lines.length * 7;
      };

      addWrappedText('Descrição', nc.description);
      
      const normLines = doc.splitTextToSize(`Itens Normativos:\n${nc.normativeItems}`, 180);
      if (y + (normLines.length * 7) > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(normLines, margin, y);
      y += normLines.length * 7;

      // Classification with colors and bold
      doc.setFont('helvetica', 'bold');
      doc.text('Classificação: ', margin, y);
      const labelWidth = doc.getTextWidth('Classificação: ');
      
      let color: [number, number, number] = [0, 0, 0];
      switch (nc.classification) {
        case 'LEVE': color = [173, 216, 230]; break; // Light Blue
        case 'MÉDIA': color = [255, 255, 0]; break; // Yellow
        case 'GRAVE': color = [255, 165, 0]; break; // Orange
        case 'GRAVÍSSIMA': color = [255, 0, 0]; break; // Red
      }
      
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(nc.classification, margin + labelWidth, y);
      doc.setTextColor(0, 0, 0); // Reset to black
      doc.setFont('helvetica', 'normal');
      y += 7;

      if (nc.dueDate) {
        const [year, month, day] = nc.dueDate.split('-');
        doc.setFont('helvetica', 'bold');
        doc.text(`Data de Vencimento: ${day}/${month}/${year}`, margin, y);
        doc.setFont('helvetica', 'normal');
        y += 7;
      }
      
      if (nc.images && nc.images.length > 0) {
        nc.images.forEach((img, imgIdx) => {
          try {
            const imgProps = doc.getImageProperties(img);
            const pdfWidth = doc.internal.pageSize.getWidth() - (margin * 2);
            const ratio = Math.min(pdfWidth / imgProps.width, 100 / imgProps.height);
            const finalWidth = imgProps.width * ratio;
            const finalHeight = imgProps.height * ratio;

            if (y + finalHeight > 270) {
              doc.addPage();
              y = 20;
            }

            doc.addImage(img, imgProps.fileType || 'JPEG', margin, y, finalWidth, finalHeight);
            y += finalHeight + 10;
          } catch (e) {
            console.error(`Error adding image ${imgIdx} to PDF`, e);
          }
        });
      } else {
        y += 5;
      }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footerText = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
      doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Inconformidade_${currentReport.report_number || 'Relatorio'}.pdf`);
  };

  if (view === 'list') {
    const filteredReports = reports.filter(r => filter === 'all' || r.status === filter);
    const stats = {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      completed: reports.filter(r => r.status === 'completed').length
    };

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Total de Relatórios</p>
            <p className="text-2xl font-black text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-amber-500 uppercase">Pendentes</p>
            <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-emerald-500 uppercase">Concluídos</p>
            <p className="text-2xl font-black text-emerald-600">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="text-indigo-600" />
                Histórico de Segurança
              </h2>
              <p className="text-sm text-gray-500 mt-1">Visualize, edite ou conclua os relatórios lançados.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'pending', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                      filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Concluídos'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setCurrentReport({
                    report_number: '',
                    location: '',
                    supervisor: '',
                    status: 'pending',
                    nonConformities: []
                  });
                  setView('editor');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm whitespace-nowrap"
              >
                <Plus size={18} />
                Novo
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando relatórios...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <History size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum relatório encontrado para este filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredReports.map((r) => (
                  <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">#{r.report_number}</span>
                        {r.status === 'completed' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-1">
                            <Check size={10} /> CONCLUÍDO {r.completed_at && `em ${new Date(r.completed_at).toLocaleDateString('pt-BR')}`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full flex items-center gap-1">
                            <Clock size={10} /> PENDENTE
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800">{r.location}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <User size={12} /> {r.supervisor}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} /> {new Date(r.created_at!).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => markAsCompleted(r)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-bold border border-emerald-100"
                          title="Marcar como concluído"
                        >
                          <CheckCircle2 size={16} />
                          Concluir
                        </button>
                      )}
                      <button
                        onClick={() => loadReportDetails(r)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-xs font-bold border border-indigo-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => deleteReport(r.id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                {currentReport.id ? 'Editar Relatório' : 'Novo Relatório'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Preencha os dados e as inconformidades.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={copyToClipboard}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              {copied ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={generatePDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors font-medium text-sm"
            >
              <Download size={16} />
              PDF
            </button>
            {currentReport.id && currentReport.status === 'pending' && (
              <button
                onClick={() => markAsCompleted(currentReport)}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Concluir'}
              </button>
            )}
            <button
              onClick={saveReport}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Logo Esquerda (Click Segurança)</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all text-gray-600 font-medium">
                  <ImageIcon size={20} />
                  {currentReport.logo_1 ? 'Trocar Logo 1' : 'Upload Logo 1'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(1, e.target.files[0])} />
                </label>
                {currentReport.logo_1 && (
                  <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-white p-1">
                    <img src={currentReport.logo_1} alt="Logo 1" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Logo Direita (Copasa)</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all text-gray-600 font-medium">
                  <ImageIcon size={20} />
                  {currentReport.logo_2 ? 'Trocar Logo 2' : 'Upload Logo 2'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(2, e.target.files[0])} />
                </label>
                {currentReport.logo_2 && (
                  <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-white p-1">
                    <img src={currentReport.logo_2} alt="Logo 2" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Número da Inconformidade</label>
              <input
                type="text"
                value={currentReport.report_number}
                onChange={(e) => setCurrentReport({ ...currentReport, report_number: e.target.value })}
                placeholder="Ex: 5481"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Local</label>
              <input
                type="text"
                value={currentReport.location}
                onChange={(e) => setCurrentReport({ ...currentReport, location: e.target.value })}
                placeholder="Ex: ETA Tarumirim - Rua da Copasa, 155"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Supervisor Responsável</label>
              <input
                type="text"
                value={currentReport.supervisor}
                onChange={(e) => setCurrentReport({ ...currentReport, supervisor: e.target.value })}
                placeholder="Nome do supervisor"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={currentReport.status}
                onChange={(e) => setCurrentReport({ ...currentReport, status: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                <option value="pending">Pendente</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Inconformidades</h3>
              <button
                onClick={addNonConformity}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                Adicionar NC
              </button>
            </div>

            {currentReport.nonConformities.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">Nenhuma inconformidade adicionada.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {currentReport.nonConformities.map((nc, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                    <button
                      onClick={() => removeNonConformity(index)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    
                    <h4 className="font-bold text-gray-700 mb-4">NC {index + 1}</h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
                        <textarea
                          value={nc.description}
                          onChange={(e) => updateNonConformity(index, 'description', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Itens Normativos</label>
                        <textarea
                          value={nc.normativeItems}
                          onChange={(e) => updateNonConformity(index, 'normativeItems', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Classificação</label>
                          <select
                            value={nc.classification}
                            onChange={(e) => updateNonConformity(index, 'classification', e.target.value as any)}
                            className={cn(
                              "w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold",
                              getClassificationColor(nc.classification)
                            )}
                          >
                            <option value="LEVE" className="text-sky-400">LEVE</option>
                            <option value="MÉDIA" className="text-yellow-500">MÉDIA</option>
                            <option value="GRAVE" className="text-orange-500">GRAVE</option>
                            <option value="GRAVÍSSIMA" className="text-red-600">GRAVÍSSIMA</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Vencimento</label>
                          <input
                            type="date"
                            value={nc.dueDate}
                            onChange={(e) => updateNonConformity(index, 'dueDate', e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Imagens</label>
                        <div className="flex flex-wrap gap-4">
                          {nc.images && nc.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                              <img src={img} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeImage(index, imgIdx)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <label className="flex flex-col items-center justify-center w-20 h-20 bg-white border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all text-gray-400 hover:text-indigo-600">
                            <Plus size={20} />
                            <span className="text-[10px] font-bold mt-1">Add</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageUpload(index, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
