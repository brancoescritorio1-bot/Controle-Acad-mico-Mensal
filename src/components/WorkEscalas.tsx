import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Mail, Copy, Check, Edit2, X } from 'lucide-react';
import { Escala, EscalaEmail, EmailTemplate } from '../types';
import { cn } from '../lib/utils';

interface WorkEscalasProps {
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
  finFilter: { month: number, year: number };
}

export const WorkEscalas: React.FC<WorkEscalasProps> = ({ fetchWithAuth, finFilter }) => {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null);
  const [emails, setEmails] = useState<EscalaEmail[]>([]);
  const [newEscalaName, setNewEscalaName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [copiedStatus, setCopiedStatus] = useState<Record<string, boolean>>({});
  const [isEscalaModalOpen, setIsEscalaModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isEditEscalaModalOpen, setIsEditEscalaModalOpen] = useState(false);
  const [editingEscalaId, setEditingEscalaId] = useState<number | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStatus(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStatus(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const CopyFeedback = ({ label }: { label: string }) => (
    <span className="text-xs text-emerald-600 font-bold ml-2">
      {copiedStatus[label] ? 'Copiado!' : ''}
    </span>
  );
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

  useEffect(() => {
    fetchEscalas();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const res = await fetchWithAuth('/api/work/email_templates');
    if (res.ok) setTemplates(await res.json());
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName) return;
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
    }
  };
    
  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !newTemplateName) return;
    const res = await fetchWithAuth(`/api/work/email_templates/${editingTemplateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTemplateName, subject_template: newTemplateSubject, body_template: newTemplateBody })
    });
    if (res.ok) {
      setNewTemplateName('');
      setNewTemplateSubject('');
      setNewTemplateBody('');
      setEditingTemplateId(null);
      fetchTemplates();
    }
  };

  const fetchEscalas = async () => {
    const res = await fetchWithAuth('/api/work/escalas');
    if (res.ok) setEscalas(await res.json());
  };

  const fetchEmails = async (escalaId: number) => {
    const res = await fetchWithAuth(`/api/work/escala_emails/${escalaId}`);
    if (res.ok) setEmails(await res.json());
  };

  const handleCreateEscala = async () => {
    if (!newEscalaName) return;
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
    }
  };

  const handleEditEscala = async (id: number) => {
    if (!editingEscalaName) return;
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
    }
  };

  const handleDeleteEscala = async (id: number) => {
    await fetchWithAuth(`/api/work/escalas/${id}`, { method: 'DELETE' });
    if (selectedEscala?.id === id) setSelectedEscala(null);
    fetchEscalas();
  };

  const handleAddEmail = async () => {
    if (!selectedEscala || !newEmail) return;
    const res = await fetchWithAuth('/api/work/escala_emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escala_id: selectedEscala.id, email: newEmail })
    });
    if (res.ok) {
      setNewEmail('');
      fetchEmails(selectedEscala.id);
    }
  };

  const handleEditEmail = async (id: number) => {
    if (!editingEmailVal || !selectedEscala) return;
    const res = await fetchWithAuth(`/api/work/escala_emails/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: editingEmailVal })
    });
    if (res.ok) {
      setEditingEmailId(null);
      fetchEmails(selectedEscala.id);
    }
  };

  const handleDeleteEmail = async (id: number) => {
    await fetchWithAuth(`/api/work/escala_emails/${id}`, { method: 'DELETE' });
    if (selectedEscala) fetchEmails(selectedEscala.id);
  };

  const generateMessage = (isSubject = false) => {
    if (!selectedEscala) return '';
    const date = new Date(finFilter.year, finFilter.month);
    const monthName = date.toLocaleString('pt-BR', { month: 'long' });
    const year = finFilter.year.toString();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    
    let template = isSubject ? editingSubject : editingBody;
    
    // Placeholder substitution (case-insensitive)
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

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="flex justify-center gap-4">
        <button onClick={() => setIsEscalaModalOpen(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition">Cadastrar Escala</button>
        <button onClick={() => setIsTemplateModalOpen(true)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition">Cadastrar Modelo</button>
      </div>

      {isEscalaModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm flex flex-col max-h-[85vh] shadow-xl">
            <h3 className="font-bold text-xl mb-4 shrink-0">Nova Escala</h3>
            <div className="space-y-3 overflow-y-auto flex-1 pb-4">
              <input className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={newEscalaName} onChange={(e) => setNewEscalaName(e.target.value)} placeholder="Nome da escala" />
              <select className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={selectedTemplateId || ''} onChange={(e) => {
                const t = templates.find(t => t.id === parseInt(e.target.value));
                setSelectedTemplateId(t?.id || null);
                setSubjectTemplate(t?.subject_template || '');
                setBodyTemplate(t?.body_template || '');
              }}>
                <option value="">Selecionar Modelo...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={subjectTemplate} onChange={(e) => setSubjectTemplate(e.target.value)} placeholder="Assunto" />
              <textarea className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} placeholder="Corpo" rows={4} />
            </div>
            <div className="flex gap-2 shrink-0 border-t border-gray-100 pt-4 mt-2">
              <button onClick={() => { handleCreateEscala(); setIsEscalaModalOpen(false); }} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700">Salvar Escala</button>
              <button onClick={() => setIsEscalaModalOpen(false)} className="flex-1 bg-gray-200 py-2.5 rounded-xl font-bold hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm flex flex-col max-h-[85vh] shadow-xl">
            <h3 className="font-bold text-xl mb-4 shrink-0">Novo Modelo</h3>
            <div className="space-y-3 overflow-y-auto flex-1 pb-4">
              <input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Nome" className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" />
              <input value={newTemplateSubject} onChange={(e) => setNewTemplateSubject(e.target.value)} placeholder="Assunto" className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" />
              <textarea value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} placeholder="Corpo" className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" rows={4} />
            </div>
            <div className="flex gap-2 shrink-0 border-t border-gray-100 pt-4 mt-2">
              <button 
                onClick={() => { 
                    if (editingTemplateId) handleUpdateTemplate();
                    else handleCreateTemplate();
                    setIsTemplateModalOpen(false); 
                }} 
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700">
                    {editingTemplateId ? "Salvar Alterações" : "Cadastrar Modelo"}
              </button>
              <button onClick={() => { setIsTemplateModalOpen(false); setEditingTemplateId(null); }} className="flex-1 bg-gray-200 py-2.5 rounded-xl font-bold hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isEditEscalaModalOpen && editingEscalaId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm flex flex-col max-h-[85vh] shadow-xl">
            <h3 className="font-bold text-xl mb-4 shrink-0">Editar Escala</h3>
            <div className="space-y-3 overflow-y-auto flex-1 pb-4">
              <input className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={editingEscalaName} onChange={(e) => setEditingEscalaName(e.target.value)} placeholder="Nome da escala" />
              <select className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={selectedTemplateId || ''} onChange={(e) => {
                const t = templates.find(t => t.id === parseInt(e.target.value));
                setSelectedTemplateId(t?.id || null);
                if (t) {
                   setEditingSubject(t.subject_template || '');
                   setEditingBody(t.body_template || '');
                }
              }}>
                <option value="">Selecionar Modelo...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={editingSubject} onChange={(e) => setEditingSubject(e.target.value)} placeholder="Assunto" />
              <textarea className="w-full px-4 py-2.5 border rounded-xl bg-gray-50" value={editingBody} onChange={(e) => setEditingBody(e.target.value)} placeholder="Corpo" rows={4} />
            </div>
            <div className="flex gap-2 shrink-0 border-t border-gray-100 pt-4 mt-2">
              <button onClick={() => handleEditEscala(editingEscalaId)} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700">Salvar Alterações</button>
              <button onClick={() => { setIsEditEscalaModalOpen(false); setEditingEscalaId(null); }} className="flex-1 bg-gray-200 py-2.5 rounded-xl font-bold hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Suas Escalas</h3>
          <div className="space-y-4">
            {escalas.map(e => (
              <div key={e.id} className={cn("flex items-center justify-between p-2 rounded-lg", selectedEscala?.id === e.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50")}>
                {editingEscalaId === e.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold flex-1">{e.name}</span>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { 
                      setSelectedEscala(e); 
                      fetchEmails(e.id); 
                      setEditingSubject(e.email_subject_template || ''); 
                      setEditingBody(e.email_body_template || ''); 
                    }} className="text-left flex-1 font-bold">
                      {e.name}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => { 
                        setEditingEscalaId(e.id); 
                        setEditingEscalaName(e.name);
                        setSelectedTemplateId(e.template_id || null);
                        setEditingSubject(e.email_subject_template || '');
                        setEditingBody(e.email_body_template || '');
                        setIsEditEscalaModalOpen(true); 
                      }} className="text-slate-500"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteEscala(e.id)} className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Templates List */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Modelos de E-mail</h3>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                <span className="font-medium text-sm">{t.name}</span>
                <button onClick={() => {
                  setEditingTemplateId(t.id);
                  setNewTemplateName(t.name);
                  setNewTemplateSubject(t.subject_template || '');
                  setNewTemplateBody(t.body_template || '');
                  setIsTemplateModalOpen(true);
                }} className="text-slate-500 hover:text-indigo-600"><Edit2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedEscala && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative">
          <button 
            onClick={() => setSelectedEscala(null)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          ><X size={20} /></button>
          <h3 className="font-bold text-lg mb-4">Emails - {selectedEscala.name}</h3>
          
          <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => copyToClipboard(emails.map(e => e.email).join('; '), 'emails')}
                  className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1"
                >
                  <Copy size={12} /> Copiar Todos E-mails <CopyFeedback label="emails" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm">Assunto</span>
                    <button onClick={() => copyToClipboard(generateMessage(true), 'subject')} className="text-gray-500 hover:text-indigo-600"><Copy size={14} /></button>
                    <CopyFeedback label="subject" />
                  </div>
                  <input 
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    value={editingSubject}
                    onChange={(e) => setEditingSubject(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm">Corpo</span>
                    <button onClick={() => copyToClipboard(generateMessage(false), 'body')} className="text-gray-500 hover:text-indigo-600"><Copy size={14} /></button>
                    <CopyFeedback label="body" />
                  </div>
                  <textarea 
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    rows={4}
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    onClick={() => copyToClipboard(`Assunto: ${generateMessage(true)}\n\n${generateMessage(false)}`, 'full')}
                    className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2"
                  >
                    <Copy size={16} /> {copiedStatus.full ? 'Mensagem Copiada!' : 'Copiar Mensagem Pronta'}
                  </button>
                </div>
              </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              className="flex-1 px-3 py-2 border rounded-lg"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
            <button onClick={handleAddEmail} className="bg-emerald-600 text-white px-3 py-2 rounded-lg">
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-1 mb-6">
            {emails.map(em => (
              <div key={em.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                {editingEmailId === em.id ? (
                  <div className="flex items-center gap-2">
                    <input className="px-2 py-1 rounded" value={editingEmailVal} onChange={(e) => setEditingEmailVal(e.target.value)} />
                    <button onClick={() => handleEditEmail(em.id)} className="text-emerald-500"><Check size={16} /></button>
                    <button onClick={() => setEditingEmailId(null)} className="text-gray-500"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <span>{em.email}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingEmailId(em.id); setEditingEmailVal(em.email); }} className="text-slate-500"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteEmail(em.id)} className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
