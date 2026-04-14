import React, { useState, useRef } from 'react';
import { Plus, Trash2, FileText, MessageSquare, Download, Copy, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import jsPDF from 'jspdf';
import { cn } from '../lib/utils';

interface NonConformity {
  id: string;
  description: string;
  suggestion: string;
  normativeItems: string;
  classification: 'LEVE' | 'MÉDIO' | 'GRAVE' | 'GRAVÍSSIMO';
  dueDate: string;
  image?: string;
}

interface SafetyReport {
  reportNumber: string;
  location: string;
  nonConformities: NonConformity[];
}

export function SafetyReportGenerator() {
  const [report, setReport] = useState<SafetyReport>({
    reportNumber: '',
    location: '',
    nonConformities: []
  });
  const [copied, setCopied] = useState(false);

  const addNonConformity = () => {
    const newNC: NonConformity = {
      id: Date.now().toString(),
      description: '',
      suggestion: '',
      normativeItems: '',
      classification: 'GRAVE',
      dueDate: ''
    };
    setReport(prev => ({
      ...prev,
      nonConformities: [...prev.nonConformities, newNC]
    }));
  };

  const removeNonConformity = (id: string) => {
    setReport(prev => ({
      ...prev,
      nonConformities: prev.nonConformities.filter(nc => nc.id !== id)
    }));
  };

  const updateNonConformity = (id: string, field: keyof NonConformity, value: string) => {
    setReport(prev => ({
      ...prev,
      nonConformities: prev.nonConformities.map(nc => 
        nc.id === id ? { ...nc, [field]: value } : nc
      )
    }));
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateNonConformity(id, 'image', reader.result as string);
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const generateMessage = () => {
    let msg = `Prezados, boa tarde!\n\nInformo sobre o click segurança com inconformidades de:\n\n`;
    msg += `Número da Inconformidade: ${report.reportNumber}\n`;
    msg += `Local: ${report.location}\n\n`;

    report.nonConformities.forEach((nc, index) => {
      msg += `Descrição NC ${index + 1}: ${nc.description}\n`;
      msg += `Sugestão: ${nc.suggestion}\n`;
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

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 14;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Inconformidades - Click Segurança', margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Número da Inconformidade: ${report.reportNumber}`, margin, y);
    y += 7;
    doc.text(`Local: ${report.location}`, margin, y);
    y += 10;

    report.nonConformities.forEach((nc, index) => {
      // Check page break
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Inconformidade ${index + 1}`, margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      
      const addWrappedText = (label: string, text: string) => {
        const lines = doc.splitTextToSize(`${label}: ${text}`, 180);
        doc.text(lines, margin, y);
        y += lines.length * 7;
      };

      addWrappedText('Descrição', nc.description);
      addWrappedText('Sugestão', nc.suggestion);
      
      const normLines = doc.splitTextToSize(`Itens Normativos:\n${nc.normativeItems}`, 180);
      doc.text(normLines, margin, y);
      y += normLines.length * 7;

      doc.text(`Classificação: ${nc.classification}`, margin, y);
      y += 7;

      if (nc.dueDate) {
        const [year, month, day] = nc.dueDate.split('-');
        doc.text(`Data de Vencimento: ${day}/${month}/${year}`, margin, y);
        y += 7;
      }
      
      if (nc.image) {
        try {
          const imgProps = doc.getImageProperties(nc.image);
          const pdfWidth = doc.internal.pageSize.getWidth() - (margin * 2);
          const ratio = Math.min(pdfWidth / imgProps.width, 100 / imgProps.height); // Max height 100mm
          const finalWidth = imgProps.width * ratio;
          const finalHeight = imgProps.height * ratio;

          if (y + finalHeight > 270) {
            doc.addPage();
            y = 20;
          }

          doc.addImage(nc.image, imgProps.fileType || 'JPEG', margin, y, finalWidth, finalHeight);
          y += finalHeight + 10;
        } catch (e) {
          console.error("Erro ao adicionar imagem ao PDF", e);
        }
      } else {
        y += 5; // Extra spacing between NCs if no image
      }
    });

    doc.save(`Inconformidade_${report.reportNumber || 'Relatorio'}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-indigo-600" />
              Gerador de Inconformidades
            </h2>
            <p className="text-sm text-gray-500 mt-1">Crie relatórios de segurança e gere PDF ou mensagens padrão.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={copyToClipboard}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              {copied ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>
            <button
              onClick={generatePDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              <Download size={16} />
              Gerar PDF
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Número da Inconformidade</label>
              <input
                type="text"
                value={report.reportNumber}
                onChange={(e) => setReport({ ...report, reportNumber: e.target.value })}
                placeholder="Ex: 5481"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Local</label>
              <input
                type="text"
                value={report.location}
                onChange={(e) => setReport({ ...report, location: e.target.value })}
                placeholder="Ex: ETA Tarumirim - Rua da Copasa, 155"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
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

            {report.nonConformities.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">Nenhuma inconformidade adicionada.</p>
                <button
                  onClick={addNonConformity}
                  className="mt-2 text-indigo-600 font-medium text-sm hover:underline"
                >
                  Adicionar a primeira
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {report.nonConformities.map((nc, index) => (
                  <div key={nc.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                    <button
                      onClick={() => removeNonConformity(nc.id)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={18} />
                    </button>
                    
                    <h4 className="font-bold text-gray-700 mb-4">NC {index + 1}</h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
                        <textarea
                          value={nc.description}
                          onChange={(e) => updateNonConformity(nc.id, 'description', e.target.value)}
                          placeholder="Ex: QCM e cabos com emendas expostos a intempéries."
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sugestão</label>
                        <textarea
                          value={nc.suggestion}
                          onChange={(e) => updateNonConformity(nc.id, 'suggestion', e.target.value)}
                          placeholder="Ex: Instalar QCM em local abrigado..."
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Itens Normativos</label>
                        <textarea
                          value={nc.normativeItems}
                          onChange={(e) => updateNonConformity(nc.id, 'normativeItems', e.target.value)}
                          placeholder="Ex: NR 10 - Segurança em instalações..."
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Classificação</label>
                          <select
                            value={nc.classification}
                            onChange={(e) => updateNonConformity(nc.id, 'classification', e.target.value as any)}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          >
                            <option value="LEVE">LEVE</option>
                            <option value="MÉDIO">MÉDIO</option>
                            <option value="GRAVE">GRAVE</option>
                            <option value="GRAVÍSSIMO">GRAVÍSSIMO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Vencimento</label>
                          <input
                            type="date"
                            value={nc.dueDate}
                            onChange={(e) => updateNonConformity(nc.id, 'dueDate', e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Anexar Imagem (Opcional)</label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                            <ImageIcon size={16} />
                            {nc.image ? 'Trocar Imagem' : 'Selecionar Imagem'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageUpload(nc.id, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                          {nc.image && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                              <img src={nc.image} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => updateNonConformity(nc.id, 'image', '')}
                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
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
