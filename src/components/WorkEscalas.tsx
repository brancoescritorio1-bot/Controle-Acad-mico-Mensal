import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Mail, 
  Copy, 
  Check, 
  Edit2, 
  X, 
  Search, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  Settings, 
  Users, 
  Clock, 
  ArrowRight, 
  Eye, 
  Info, 
  Calendar,
  RefreshCw 
} from 'lucide-react';
import { Escala, EscalaEmail, EmailTemplate } from '../types';
import { cn } from '../lib/utils';
import { useDialog } from './DialogContext';

interface WorkEscalasProps {
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
  finFilter: { month: number, year: number };
}

export const WorkEscalas: React.FC<WorkEscalasProps> = ({ fetchWithAuth, finFilter }) => {
  const dialog = useDialog();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null);
  const [emails, setEmails] = useState<EscalaEmail[]>([]);
  const [escalaEmailsMap, setEscalaEmailsMap] = useState<Record<number, EscalaEmail[]>>({});
  
  // Search & Filtering States
  const [searchEscala, setSearchEscala] = useState('');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [searchEmailList, setSearchEmailList] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState<'message' | 'emails'>('message');

  const [newEscalaName, setNewEscalaName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [copiedStatus, setCopiedStatus] = useState<Record<string, boolean>>({});
  const [isEscalaModalOpen, setIsEscalaModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isEditEscalaModalOpen, setIsEditEscalaModalOpen] = useState(false);
  const [editingEscalaId, setEditingEscalaId] = useState<number | null>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingEscalaName, setEditingEscalaName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  
  const [editingSubject, setEditingSubject] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
  const [editingEmailVal, setEditingEmailVal] = useState('');
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);

  useEffect(() => {
    fetchEscalas();
    fetchTemplates();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStatus(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStatus(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const CopyFeedback = ({ label }: { label: string }) => (
    copiedStatus[label] ? (
      <span className="text-xs text-emerald-600 font-bold ml-1 animate-fade-in flex items-center gap-0.5">
        <Check size={12} className="inline" /> Copiado!
      </span>
    ) : null
  );

  const fetchTemplates = async () => {
    const res = await fetchWithAuth('/api/work/email_templates');
    if (res.ok) setTemplates(await res.json());
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName) return;
    try {
      const res = await fetchWithAuth('/api/work/email_templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTemplateName, subject_template: newTemplateSubject, body_template: newTemplateBody })
      });
      if (res.ok) {
        setNewTemplateName('');
        setNewTemplateSubject('');
        setNewTemplateBody('');
        fetchTemplates();
        dialog.alert('Modelo de e-mail criado com sucesso!', 'Sucesso');
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Não foi possível criar o modelo: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };
    
  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !newTemplateName) return;
    try {
      const res = await fetchWithAuth(`/api/work/email_templates/${editingTemplateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTemplateName, subject_template: newTemplateSubject, body_template: newTemplateBody })
      });
      if (res.ok) {
        const templateId = editingTemplateId;
        const templateName = newTemplateName;
        setNewTemplateName('');
        setNewTemplateSubject('');
        setNewTemplateBody('');
        setEditingTemplateId(null);
        fetchTemplates();
        
        const shouldSync = await dialog.confirm(
          `Deseja atualizar automaticamente todas as escalas de trabalho associadas ao modelo "${templateName}" com o novo texto das mensagens?`,
          {
            title: "Sincronizar Escalas?",
            confirmText: "Sim, Sincronizar",
            cancelText: "Não, apenas salvar",
            type: "info"
          }
        );
        
        if (shouldSync) {
          try {
            const syncRes = await fetchWithAuth(`/api/work/email_templates/${templateId}/sync`, {
              method: 'POST'
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              fetchEscalas();
              dialog.alert(
                `Modelo de e-mail atualizado e ${syncData.updated_count} escala(s) sincronizada(s) com sucesso!`,
                'Sucesso'
              );
            } else {
              dialog.alert('Modelo salvo, mas ocorreu um erro ao sincronizar as escalas.', 'Aviso');
            }
          } catch (syncErr) {
            console.error("Erro ao sincronizar:", syncErr);
            dialog.alert('Modelo salvo, mas erro de conexão ao sincronizar as escalas.', 'Aviso');
          }
        } else {
          dialog.alert('Modelo de e-mail atualizado com sucesso!', 'Sucesso');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Não foi possível atualizar o modelo: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const handleSyncTemplate = async (templateId: number, templateName: string) => {
    const confirmed = await dialog.confirm(
      `Deseja realmente atualizar todas as escalas de trabalho associadas ao modelo "${templateName}" com as mensagens padrão dele?`,
      {
        title: "Sincronizar com Escalas?",
        confirmText: "Sim, Sincronizar",
        cancelText: "Cancelar",
        type: "info"
      }
    );
    if (!confirmed) return;
    
    try {
      const res = await fetchWithAuth(`/api/work/email_templates/${templateId}/sync`, {
        method: 'POST'
      });
      if (res.ok) {
        const syncData = await res.json();
        fetchEscalas();
        dialog.alert(
          `Sincronização concluída! ${syncData.updated_count} escala(s) foram atualizadas com as mensagens de "${templateName}".`,
          'Sucesso'
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Erro ao sincronizar: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const fetchEscalas = async () => {
    try {
      const res = await fetchWithAuth('/api/work/escalas');
      if (res.ok) {
        const data: Escala[] = await res.json();
        setEscalas(data);
        
        // Fetch emails for all scales in parallel to build our count/lookup map
        const emailPromises = data.map(async (escala) => {
          const emailRes = await fetchWithAuth(`/api/work/escala_emails/${escala.id}`);
          if (emailRes.ok) {
            const emailData = await emailRes.json();
            return { escalaId: escala.id, emails: emailData };
          }
          return { escalaId: escala.id, emails: [] };
        });
        
        const results = await Promise.all(emailPromises);
        const map: Record<number, EscalaEmail[]> = {};
        results.forEach(item => {
          map[item.escalaId] = item.emails;
        });
        setEscalaEmailsMap(map);
      }
    } catch (err) {
      console.error("Erro ao carregar escalas:", err);
    }
  };

  const fetchEmails = async (escalaId: number) => {
    try {
      const res = await fetchWithAuth(`/api/work/escala_emails/${escalaId}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        setEscalaEmailsMap(prev => ({ ...prev, [escalaId]: data }));
      }
    } catch (err) {
      console.error("Erro ao carregar e-mails:", err);
    }
  };

  const handleCreateEscala = async () => {
    if (!newEscalaName) return;
    try {
      const res = await fetchWithAuth('/api/work/escalas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newEscalaName, 
          template_id: selectedTemplateId, 
          email_subject_template: subjectTemplate, 
          email_body_template: bodyTemplate 
        })
      });
      if (res.ok) {
        setNewEscalaName('');
        setSubjectTemplate('');
        setBodyTemplate('');
        setSelectedTemplateId(null);
        fetchEscalas();
        dialog.alert('Escala criada com sucesso!', 'Sucesso');
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Não foi possível criar a escala: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const handleEditEscala = async (id: number) => {
    if (!editingEscalaName) return;
    try {
      const res = await fetchWithAuth(`/api/work/escalas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editingEscalaName,
          template_id: selectedTemplateId,
          email_subject_template: editingSubject,
          email_body_template: editingBody
        })
      });
      if (res.ok) {
        setEditingEscalaId(null);
        setIsEditEscalaModalOpen(false);
        fetchEscalas();
        if (selectedEscala && selectedEscala.id === id) {
          setSelectedEscala(prev => prev ? {
            ...prev,
            name: editingEscalaName,
            template_id: selectedTemplateId || undefined,
            email_subject_template: editingSubject,
            email_body_template: editingBody
          } : null);
        }
        dialog.alert('Escala de trabalho atualizada com sucesso!', 'Sucesso');
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Não foi possível atualizar a escala: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const handleDeleteEscala = async (id: number) => {
    const confirmed = await dialog.confirm("Tem certeza que deseja excluir esta escala de trabalho e todos os seus integrantes cadastrados?", {
      title: "Excluir Escala?",
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      type: "danger"
    });
    if (!confirmed) return;
    try {
      const res = await fetchWithAuth(`/api/work/escalas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedEscala?.id === id) setSelectedEscala(null);
        fetchEscalas();
        dialog.alert('Escala de trabalho excluída com sucesso!', 'Sucesso');
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Erro ao excluir escala: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const handleAddEmail = async () => {
    if (!selectedEscala || !newEmail) return;
    // Basic email pattern check
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      dialog.alert("Por favor, digite um e-mail válido para o integrante.", "E-mail Inválido");
      return;
    }
    try {
      const res = await fetchWithAuth('/api/work/escala_emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escala_id: selectedEscala.id, email: newEmail })
      });
      if (res.ok) {
        setNewEmail('');
        fetchEmails(selectedEscala.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Não foi possível adicionar o e-mail: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const handleEditEmail = async (id: number) => {
    if (!editingEmailVal || !selectedEscala) return;
    try {
      const res = await fetchWithAuth(`/api/work/escala_emails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editingEmailVal })
      });
      if (res.ok) {
        setEditingEmailId(null);
        fetchEmails(selectedEscala.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Não foi possível atualizar o e-mail: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const handleDeleteEmail = async (id: number) => {
    const confirmed = await dialog.confirm("Deseja realmente remover este integrante (e-mail) da escala?", {
      title: "Remover Integrante?",
      confirmText: "Sim, Remover",
      cancelText: "Cancelar",
      type: "danger"
    });
    if (!confirmed) return;
    try {
      const res = await fetchWithAuth(`/api/work/escala_emails/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEmails(selectedEscala.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        dialog.alert(`Não foi possível remover o e-mail: ${errData.error || 'Erro desconhecido'}`, 'Erro no Banco de Dados');
      }
    } catch (err: any) {
      dialog.alert(`Erro de conexão: ${err.message}`, 'Erro de Conexão');
    }
  };

  const getPortugueseMonthName = (monthIdx: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIdx] || '';
  };

  const generateMessage = (isSubject = false, customSubject?: string, customBody?: string) => {
    if (!selectedEscala) return '';
    const monthName = getPortugueseMonthName(finFilter.month);
    const year = finFilter.year.toString();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    
    let template = isSubject 
      ? (customSubject !== undefined ? customSubject : editingSubject) 
      : (customBody !== undefined ? customBody : editingBody);
    
    if (!template) return '';
    
    // Case-insensitive replacements
    return template
      .replace(/{MES}/gi, monthName)
      .replace(/{mês}/gi, monthName)
      .replace(/{ANO}/gi, year)
      .replace(/{ano}/gi, year)
      .replace(/{NOME DA ESCALA}/gi, selectedEscala.name)
      .replace(/{nome da escala}/gi, selectedEscala.name)
      .replace(/{SAUDAÇÃO}/gi, greeting)
      .replace(/{saudação}/gi, greeting);
  };

  // Helper to count total unique emails
  const totalUniqueEmails = React.useMemo(() => {
    const allEmails = new Set<string>();
    Object.values(escalaEmailsMap).forEach((list: any) => {
      if (Array.isArray(list)) {
        list.forEach((e: any) => {
          if (e && e.email) {
            allEmails.add(e.email.trim().toLowerCase());
          }
        });
      }
    });
    return allEmails.size;
  }, [escalaEmailsMap]);

  // Filtered lists
  const filteredEscalas = escalas.filter(e => {
    const nameMatch = e.name.toLowerCase().includes(searchEscala.toLowerCase());
    const emailsInEscala = escalaEmailsMap[e.id] || [];
    const emailsMatch = emailsInEscala.some(em => em.email.toLowerCase().includes(searchEscala.toLowerCase()));
    return nameMatch || emailsMatch;
  });

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    (t.subject_template || '').toLowerCase().includes(searchTemplate.toLowerCase())
  );

  const filteredEmails = emails.filter(em =>
    em.email.toLowerCase().includes(searchEmailList.toLowerCase())
  );

  const insertPlaceholder = (placeholder: string, targetField: 'subject' | 'body') => {
    if (targetField === 'subject') {
      setEditingSubject(prev => prev + placeholder);
    } else {
      setEditingBody(prev => prev + placeholder);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      
      {/* 1. Header & Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/80 p-4 rounded-2xl flex items-center gap-4 shadow-sm transition hover:shadow-md">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-indigo-200 shadow-md">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">Total de Escalas</p>
            <h4 className="text-2xl font-bold text-slate-800">{escalas.length}</h4>
          </div>
        </div>
        
        {/* Metric 2 */}
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100/80 p-4 rounded-2xl flex items-center gap-4 shadow-sm transition hover:shadow-md">
          <div className="p-3 bg-purple-600 text-white rounded-xl shadow-purple-200 shadow-md">
            <Mail size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-900/60 uppercase tracking-wider">E-mails Cadastrados</p>
            <h4 className="text-2xl font-bold text-slate-800">{totalUniqueEmails} <span className="text-xs font-medium text-slate-400">únicos</span></h4>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/80 p-4 rounded-2xl flex items-center gap-4 shadow-sm transition hover:shadow-md">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-emerald-200 shadow-md">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-900/60 uppercase tracking-wider">Modelos Disponíveis</p>
            <h4 className="text-2xl font-bold text-slate-800">{templates.length}</h4>
          </div>
        </div>
      </div>

      {/* 2. Primary Buttons bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-500 animate-pulse" size={18} />
          <span className="text-xs md:text-sm text-slate-500 font-medium">
            Gerencie escalas de trabalho e envie mensagens prontas rapidamente.
          </span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button 
            onClick={() => {
              setNewEscalaName('');
              setSubjectTemplate('');
              setBodyTemplate('');
              setSelectedTemplateId(null);
              setIsEscalaModalOpen(true);
            }} 
            className="flex-1 sm:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 transition active:scale-95"
          >
            <Plus size={16} /> Cadastrar Escala
          </button>
          <button 
            onClick={() => {
              setNewTemplateName('');
              setNewTemplateSubject('');
              setNewTemplateBody('');
              setEditingTemplateId(null);
              setIsTemplateModalOpen(true);
            }} 
            className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-100 transition active:scale-95"
          >
            <Plus size={16} /> Cadastrar Modelo
          </button>
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Scales List & Templates List (col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Suas Escalas */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[520px]">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-indigo-600" size={18} />
                <h3 className="font-bold text-slate-800 text-base">Suas Escalas</h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {filteredEscalas.length}
              </span>
            </div>
            
            {/* Escalas Search */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/20">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar escala por nome ou e-mail..." 
                  value={searchEscala}
                  onChange={(e) => setSearchEscala(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
                {searchEscala && (
                  <button 
                    onClick={() => setSearchEscala('')} 
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Escalas List Container */}
            <div className="p-3 overflow-y-auto divide-y divide-slate-50 flex-1 space-y-1">
              {filteredEscalas.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-400 font-medium">Nenhuma escala encontrada.</p>
                </div>
              ) : (
                filteredEscalas.map(e => {
                  const scaleEmails = escalaEmailsMap[e.id] || [];
                  const isSelected = selectedEscala?.id === e.id;
                  const templateName = templates.find(t => t.id === e.template_id)?.name || "Nenhum modelo";
                  
                  return (
                    <div 
                      key={e.id}
                      onClick={() => {
                        setSelectedEscala(e);
                        fetchEmails(e.id);
                        setEditingSubject(e.email_subject_template || '');
                        setEditingBody(e.email_body_template || '');
                        setWorkspaceTab('message'); // Default view
                        setIsEditSectionOpen(false); // Default to super clean preview
                      }}
                      className={cn(
                        "group p-3 rounded-xl cursor-pointer transition-all duration-200 border text-left flex flex-col gap-2 relative",
                        isSelected 
                          ? "bg-indigo-50/70 border-indigo-200 shadow-sm ring-1 ring-indigo-200" 
                          : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between pr-14">
                        <span className={cn("font-bold text-sm transition-colors", isSelected ? "text-indigo-800" : "text-slate-700")}>
                          {e.name}
                        </span>
                        
                        {/* Quick Action buttons (visible on hover) */}
                        <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-80 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingEscalaId(e.id);
                              setEditingEscalaName(e.name);
                              setSelectedTemplateId(e.template_id || null);
                              setEditingSubject(e.email_subject_template || '');
                              setEditingBody(e.email_body_template || '');
                              setIsEditEscalaModalOpen(true);
                            }}
                            className="p-1 hover:bg-indigo-100 rounded text-slate-500 hover:text-indigo-600 transition"
                            title="Editar Escala"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteEscala(e.id);
                            }}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition"
                            title="Excluir Escala"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100/50 text-indigo-700">
                          <Mail size={10} />
                          {scaleEmails.length} {scaleEmails.length === 1 ? 'e-mail' : 'e-mails'}
                        </span>
                        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 max-w-[150px] truncate">
                          {templateName}
                        </span>
                        
                        {/* Quick Copy emails button */}
                        {scaleEmails.length > 0 && (
                          <button 
                            onClick={(event) => {
                              event.stopPropagation();
                              const text = scaleEmails.map(em => em.email).join('; ');
                              copyToClipboard(text, `quick_${e.id}`);
                            }}
                            className={cn(
                              "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md transition flex items-center gap-1 bg-slate-50 text-slate-600 hover:bg-slate-200 border border-slate-200/50 hover:text-indigo-700",
                              copiedStatus[`quick_${e.id}`] && "bg-emerald-50 border-emerald-200 text-emerald-700"
                            )}
                          >
                            <Copy size={10} />
                            {copiedStatus[`quick_${e.id}`] ? 'Copiado!' : 'Copiar E-mails'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card: Modelos de E-mail */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[300px]">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-600" size={18} />
                <h3 className="font-bold text-slate-800 text-base">Modelos de E-mail</h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                {filteredTemplates.length}
              </span>
            </div>

            {/* Modelos Search */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/20">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar modelo de e-mail..." 
                  value={searchTemplate}
                  onChange={(e) => setSearchTemplate(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
                {searchTemplate && (
                  <button 
                    onClick={() => setSearchTemplate('')} 
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Modelos List */}
            <div className="p-3 overflow-y-auto divide-y divide-slate-50 flex-1 space-y-1">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400 font-medium">Nenhum modelo encontrado.</p>
                </div>
              ) : (
                filteredTemplates.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition group border border-transparent hover:border-slate-200/50 text-left">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-slate-700 text-xs truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.subject_template || "Sem assunto padrão"}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => handleSyncTemplate(t.id, t.name)}
                        className="p-1.5 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition"
                        title="Sincronizar este modelo com todas as escalas vinculadas"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingTemplateId(t.id);
                          setNewTemplateName(t.name);
                          setNewTemplateSubject(t.subject_template || '');
                          setNewTemplateBody(t.body_template || '');
                          setIsTemplateModalOpen(true);
                        }} 
                        className="p-1.5 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-600 transition"
                        title="Editar Modelo"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Selected Scale Details Workspace (col-span-7) */}
        <div className="lg:col-span-7">
          
          {!selectedEscala ? (
            /* Empty state placeholder */
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[500px] h-full shadow-sm">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-6 animate-pulse text-indigo-500">
                <Sparkles size={28} />
              </div>
              <h3 className="text-slate-700 font-bold text-lg mb-2">Painel de Trabalho Ativo</h3>
              <p className="text-slate-500 text-xs md:text-sm max-w-sm mx-auto leading-relaxed mb-6">
                Selecione uma escala na lista de <strong>Suas Escalas</strong> ao lado para carregar os e-mails dos integrantes, visualizar e editar as mensagens de e-mail em tempo real.
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full animate-bounce">
                <ArrowRight size={14} /> Escolha uma escala para começar
              </div>
            </div>
          ) : (
            /* Selected scale detail workspace */
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-md overflow-hidden flex flex-col h-full min-h-[500px]">
              
              {/* Workspace Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-indigo-600 text-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Escala Ativa
                    </span>
                    <span className="text-xs text-slate-400">
                      ID #{selectedEscala.id}
                    </span>
                  </div>
                  <h3 className="font-black text-xl text-white mt-1">
                    {selectedEscala.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Modelo: <span className="font-semibold text-indigo-300">{templates.find(t => t.id === selectedEscala.template_id)?.name || "Nenhum modelo associado"}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setIsEditSectionOpen(!isEditSectionOpen)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shrink-0",
                      isEditSectionOpen 
                        ? "bg-white/10 border-white/20 text-white hover:bg-white/20" 
                        : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
                    )}
                  >
                    <Settings size={14} />
                    {isEditSectionOpen ? "Visualização Limpa" : "Ajustar Modelo / Integrantes"}
                  </button>
                  
                  <button 
                    onClick={() => setSelectedEscala(null)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                    title="Fechar Painel"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Workspace Contents */}
              <div className="p-4 md:p-6 flex-1 bg-slate-50/10 flex flex-col gap-6 overflow-y-auto">
                
                {/* 1. MENSAGEM COMO VAI FICAR (Always visible, clean, prominent) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Eye size={15} className="text-indigo-600" />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Como vai ficar a mensagem</span>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <Clock size={11} /> Mês: {getPortugueseMonthName(finFilter.month)} {finFilter.year}
                    </span>
                  </div>

                  {/* Mockup Window */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                    {/* Title Bar with Mac OSX buttons */}
                    <div className="bg-slate-50/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-150">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                        <span className="text-[10px] text-slate-400 font-bold ml-2 select-none uppercase tracking-wider">
                          Visualização da Mensagem
                        </span>
                      </div>
                    </div>

                    {/* Email Headers */}
                    <div className="p-4 bg-slate-50/30 border-b border-slate-100 space-y-3 text-xs">
                      {/* Recipients (Emails) Field */}
                      <div className="flex items-start md:items-center justify-between pb-2 border-b border-slate-100/60 gap-4">
                        <div className="flex items-center min-w-0 flex-1">
                          <span className="font-bold text-slate-400 w-12 shrink-0 text-right pr-2">Para:</span>
                          <span className="text-slate-600 font-mono font-medium truncate select-all">
                            {emails.length === 0 ? (
                              <span className="text-red-500 italic font-sans text-[11px]">Nenhum integrante cadastrado nesta escala. Clique em "Ajustar Modelo / Integrantes" para adicionar!</span>
                            ) : (
                              emails.map(e => e.email).join('; ')
                            )}
                          </span>
                        </div>
                        {emails.length > 0 && (
                          <button
                            onClick={() => copyToClipboard(emails.map(e => e.email).join('; '), 'all_emails')}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition flex items-center gap-1 shrink-0 active:scale-95 shadow-sm",
                              copiedStatus['all_emails']
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <Copy size={11} />
                            {copiedStatus['all_emails'] ? 'Copiado!' : 'Copiar E-mails'}
                          </button>
                        )}
                      </div>
                      
                      {/* Subject (Título) Field */}
                      <div className="flex items-start md:items-center justify-between gap-4">
                        <div className="flex items-center min-w-0 flex-1">
                          <span className="font-bold text-slate-400 w-12 shrink-0 text-right pr-2">Assunto:</span>
                          <span className="text-slate-800 font-extrabold truncate">
                            {generateMessage(true) || <span className="text-slate-300 italic font-normal">Sem assunto configurado</span>}
                          </span>
                        </div>
                        {generateMessage(true) && (
                          <button
                            onClick={() => copyToClipboard(generateMessage(true), 'subject')}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition flex items-center gap-1 shrink-0 active:scale-95 shadow-sm",
                              copiedStatus['subject']
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <Copy size={11} />
                            {copiedStatus['subject'] ? 'Copiado!' : 'Copiar Assunto'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Email Body Content */}
                    <div className="p-5 min-h-[160px] max-h-[300px] overflow-y-auto text-slate-700 text-xs font-mono whitespace-pre-wrap leading-relaxed bg-white select-all">
                      {generateMessage(false) || (
                        <span className="text-slate-300 italic font-sans">
                          Nenhum texto de mensagem configurado. Clique em "Ajustar Modelo / Integrantes" para definir o corpo do e-mail.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unified Copy Action Buttons under Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                    <button 
                      onClick={() => copyToClipboard(generateMessage(false), 'body')}
                      className={cn(
                        "bg-white border border-slate-200 hover:border-indigo-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95",
                        copiedStatus['body'] && "border-emerald-300 bg-emerald-50 text-emerald-800"
                      )}
                    >
                      <Copy size={13} /> 
                      {copiedStatus['body'] ? 'Corpo Copiado!' : 'Copiar Corpo'}
                    </button>

                    <button 
                      onClick={() => copyToClipboard(`Assunto: ${generateMessage(true)}\n\n${generateMessage(false)}`, 'full')}
                      className={cn(
                        "bg-white border border-slate-200 hover:border-indigo-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95",
                        copiedStatus['full'] && "border-emerald-300 bg-emerald-50 text-emerald-800"
                      )}
                    >
                      <Copy size={13} /> 
                      {copiedStatus['full'] ? 'Mensagem Copiada!' : 'Copiar Assunto + Corpo'}
                    </button>

                    <button 
                      onClick={() => {
                        const emailsStr = emails.map(e => e.email).join('; ');
                        copyToClipboard(`Destinatários: ${emailsStr}\nAssunto: ${generateMessage(true)}\n\n${generateMessage(false)}`, 'full_details');
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                    >
                      <Copy size={14} /> 
                      {copiedStatus['full_details'] ? 'Tudo Copiado!' : 'Copiar Tudo'}
                    </button>
                  </div>
                </div>

                {/* 2. SETTINGS SECTION (COLLAPSIBLE / ACCORDION) */}
                {isEditSectionOpen && (
                  <div className="border-t border-slate-150 pt-6 space-y-6 animate-in fade-in duration-200">
                    
                    <div className="bg-slate-100/60 p-1.5 rounded-xl flex gap-1 border border-slate-200/50">
                      <button 
                        onClick={() => setWorkspaceTab('message')}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                          workspaceTab === 'message' 
                            ? 'text-indigo-700 bg-white shadow-sm ring-1 ring-black/5' 
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        <FileText size={14} /> Configurar Textos e Tags
                      </button>
                      <button 
                        onClick={() => setWorkspaceTab('emails')}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                          workspaceTab === 'emails' 
                            ? 'text-indigo-700 bg-white shadow-sm ring-1 ring-black/5' 
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        <Users size={14} /> Gerenciar Integrantes ({emails.length})
                      </button>
                    </div>

                    {/* Inner Edit Tabs content */}
                    {workspaceTab === 'message' ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Assunto Input */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Assunto do E-mail</label>
                              <span className="text-[10px] text-slate-400">Suporta tags</span>
                            </div>
                            <input 
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                              value={editingSubject}
                              onChange={(e) => setEditingSubject(e.target.value)}
                              placeholder="Digite o assunto com tags, ex: {MES}"
                            />
                          </div>

                          {/* Corpo Textarea */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Corpo da Mensagem</label>
                              <span className="text-[10px] text-slate-400">Suporta tags</span>
                            </div>
                            <textarea 
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                              rows={3}
                              value={editingBody}
                              onChange={(e) => setEditingBody(e.target.value)}
                              placeholder="Digite a mensagem padrão aqui..."
                            />
                          </div>
                        </div>

                        {/* Interactive Tags Guide */}
                        <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Info size={14} className="text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-950">Tags Inteligentes (Placeholder System)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Clique em qualquer tag abaixo para inseri-la nos campos. No momento de visualizar ou copiar, as tags serão substituídas dinamicamente com as informações do mês e ano selecionados.
                          </p>
                          
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <button 
                              onClick={() => insertPlaceholder('{SAUDAÇÃO}', 'body')}
                              className="text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md transition"
                            >
                              + {'{SAUDAÇÃO}'}
                            </button>
                            <button 
                              onClick={() => insertPlaceholder('{MES}', 'body')}
                              className="text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md transition"
                            >
                              + {'{MES}'}
                            </button>
                            <button 
                              onClick={() => insertPlaceholder('{ANO}', 'body')}
                              className="text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md transition"
                            >
                              + {'{ANO}'}
                            </button>
                            <button 
                              onClick={() => insertPlaceholder('{NOME DA ESCALA}', 'body')}
                              className="text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md transition"
                            >
                              + {'{NOME DA ESCALA}'}
                            </button>
                          </div>
                        </div>

                        {/* Save scale template customization inline */}
                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          <button 
                            onClick={() => {
                              setEditingEscalaName(selectedEscala.name);
                              setSelectedTemplateId(selectedEscala.template_id || null);
                              handleEditEscala(selectedEscala.id);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
                          >
                            Salvar Alterações de Texto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Add Email Form */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                            Adicionar Novo Integrante (E-mail)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                              <input 
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                                placeholder="exemplo@empresa.com.br"
                              />
                            </div>
                            <button 
                              onClick={handleAddEmail} 
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-1 font-bold text-sm transition"
                            >
                              <Plus size={16} /> Adicionar
                            </button>
                          </div>
                        </div>

                        {/* Emails Filter Row */}
                        {emails.length > 0 && (
                          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 border border-slate-150 p-3 rounded-xl gap-3">
                            <div className="relative w-full sm:w-auto flex-1 max-w-xs">
                              <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                              <input 
                                type="text" 
                                placeholder="Filtrar e-mails nesta lista..." 
                                value={searchEmailList}
                                onChange={(e) => setSearchEmailList(e.target.value)}
                                className="w-full pl-8 pr-3 py-1 border border-slate-200 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>
                        )}

                        {/* Email Items List */}
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                          <div className="px-4 py-2.5 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100 flex justify-between">
                            <span>E-mail</span>
                            <span>Ações</span>
                          </div>
                          
                          <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
                            {filteredEmails.length === 0 ? (
                              <div className="text-center py-10 text-slate-400 text-xs">
                                {emails.length === 0 
                                  ? "Nenhum integrante cadastrado nesta escala. Adicione acima!" 
                                  : "Nenhum integrante atende à busca."}
                              </div>
                            ) : (
                              filteredEmails.map(em => (
                                <div key={em.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition group">
                                  {editingEmailId === em.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input 
                                        className="px-3 py-1 border border-slate-300 rounded-lg text-xs bg-white flex-1 max-w-sm" 
                                        value={editingEmailVal} 
                                        onChange={(e) => setEditingEmailVal(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleEditEmail(em.id)}
                                      />
                                      <button onClick={() => handleEditEmail(em.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition"><Check size={16} /></button>
                                      <button onClick={() => setEditingEmailId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded transition"><X size={16} /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs font-mono text-slate-600 font-medium select-all">{em.email}</span>
                                      <div className="flex gap-2 opacity-80 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => { setEditingEmailId(em.id); setEditingEmailVal(em.email); }} 
                                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition"
                                          title="Editar Integrante"
                                        >
                                          <Edit2 size={13} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteEmail(em.id)} 
                                          className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition"
                                          title="Excluir Integrante"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ================= MODAL: CADASTRAR ESCALA ================= */}
      {isEscalaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-50 pb-3">
              <h3 className="font-extrabold text-slate-800 text-lg">Nova Escala de Trabalho</h3>
              <button onClick={() => setIsEscalaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pb-4 pr-1">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Nome da Escala</label>
                <input 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={newEscalaName} 
                  onChange={(e) => setNewEscalaName(e.target.value)} 
                  placeholder="Ex: Engenheiros GMNL, Teófilo Otoni" 
                />
              </div>

              {/* Modelo Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Modelo de E-mail (Opcional)</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={selectedTemplateId || ''} 
                  onChange={(e) => {
                    const t = templates.find(t => t.id === parseInt(e.target.value));
                    setSelectedTemplateId(t?.id || null);
                    setSubjectTemplate(t?.subject_template || '');
                    setBodyTemplate(t?.body_template || '');
                  }}
                >
                  <option value="">Selecionar Modelo...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Assunto Customizado */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Assunto Customizado</label>
                <input 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={subjectTemplate} 
                  onChange={(e) => setSubjectTemplate(e.target.value)} 
                  placeholder="Ex: Escala de Sobreaviso {MES}/{ANO}" 
                />
              </div>

              {/* Corpo Customizado */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Corpo da Mensagem</label>
                <textarea 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={bodyTemplate} 
                  onChange={(e) => setBodyTemplate(e.target.value)} 
                  placeholder="Digite o texto padrão..." 
                  rows={4} 
                />
              </div>
            </div>

            <div className="flex gap-2 shrink-0 border-t border-slate-100 pt-4 mt-2">
              <button 
                onClick={() => { handleCreateEscala(); setIsEscalaModalOpen(false); }} 
                disabled={!newEscalaName}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Salvar Escala
              </button>
              <button 
                onClick={() => setIsEscalaModalOpen(false)} 
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CADASTRAR/EDITAR MODELO ================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-50 pb-3">
              <h3 className="font-extrabold text-slate-800 text-lg">
                {editingTemplateId ? "Editar Modelo de E-mail" : "Novo Modelo de E-mail"}
              </h3>
              <button onClick={() => { setIsTemplateModalOpen(false); setEditingTemplateId(null); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pb-4 pr-1">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Nome do Modelo</label>
                <input 
                  value={newTemplateName} 
                  onChange={(e) => setNewTemplateName(e.target.value)} 
                  placeholder="Ex: SOBREAVISO, REVEZAMENTO" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-emerald-500" 
                />
              </div>

              {/* Assunto */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Assunto Padrão</label>
                <input 
                  value={newTemplateSubject} 
                  onChange={(e) => setNewTemplateSubject(e.target.value)} 
                  placeholder="Ex: Sobreaviso - Engenharia {MES}/{ANO}" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-emerald-500" 
                />
              </div>

              {/* Corpo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Corpo da Mensagem Padrão</label>
                <textarea 
                  value={newTemplateBody} 
                  onChange={(e) => setNewTemplateBody(e.target.value)} 
                  placeholder="Ex: {SAUDAÇÃO}, segue a escala de {NOME DA ESCALA} do mês de {MES}." 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-emerald-500" 
                  rows={6} 
                />
              </div>
            </div>

            <div className="flex gap-2 shrink-0 border-t border-slate-100 pt-4 mt-2">
              <button 
                onClick={() => { 
                    if (editingTemplateId) handleUpdateTemplate();
                    else handleCreateTemplate();
                    setIsTemplateModalOpen(false); 
                }} 
                disabled={!newTemplateName}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {editingTemplateId ? "Salvar Alterações" : "Criar Modelo"}
              </button>
              <button 
                onClick={() => { setIsTemplateModalOpen(false); setEditingTemplateId(null); }} 
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR ESCALA ================= */}
      {isEditEscalaModalOpen && editingEscalaId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-50 pb-3">
              <h3 className="font-extrabold text-slate-800 text-lg">Editar Escala de Trabalho</h3>
              <button onClick={() => { setIsEditEscalaModalOpen(false); setEditingEscalaId(null); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pb-4 pr-1">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Nome da Escala</label>
                <input 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={editingEscalaName} 
                  onChange={(e) => setEditingEscalaName(e.target.value)} 
                  placeholder="Nome da escala" 
                />
              </div>

              {/* Modelo Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Modelo de E-mail</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={selectedTemplateId || ''} 
                  onChange={(e) => {
                    const t = templates.find(t => t.id === parseInt(e.target.value));
                    setSelectedTemplateId(t?.id || null);
                    if (t) {
                       setEditingSubject(t.subject_template || '');
                       setEditingBody(t.body_template || '');
                    }
                  }}
                >
                  <option value="">Selecionar Modelo...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Assunto */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Assunto Customizado</label>
                <input 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={editingSubject} 
                  onChange={(e) => setEditingSubject(e.target.value)} 
                  placeholder="Assunto" 
                />
              </div>

              {/* Corpo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Corpo da Mensagem</label>
                <textarea 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={editingBody} 
                  onChange={(e) => setEditingBody(e.target.value)} 
                  placeholder="Corpo" 
                  rows={4} 
                />
              </div>
            </div>

            <div className="flex gap-2 shrink-0 border-t border-slate-100 pt-4 mt-2">
              <button 
                onClick={() => handleEditEscala(editingEscalaId)} 
                disabled={!editingEscalaName}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Salvar Alterações
              </button>
              <button 
                onClick={() => { setIsEditEscalaModalOpen(false); setEditingEscalaId(null); }} 
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
