import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from './DialogContext';
import { 
  Calendar as CalendarIcon, 
  Users, 
  DollarSign, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  Link as LinkIcon, 
  Instagram, 
  Facebook, 
  Youtube, 
  Video,
  FileText,
  MessageSquare,
  ChevronLeft, 
  ChevronRight, 
  Search, 
  CheckCircle, 
  XCircle, 
  Megaphone,
  TrendingUp,
  AlertCircle,
  Upload,
  FileUp,
  Printer,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface MarketingManagerProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

interface MarketingClient {
  id: string;
  name: string;
  company: string;
  phone: string;
  plan_name: string;
  plan_value: number;
  status: 'mensalista' | 'semanal' | 'anúncio' | 'encerrado' | 'ativo' | 'prospect' | 'inativo';
  publication_days?: string; // comma separated days, e.g. "Seg,Qua,Sexta"
}

interface MarketingPayment {
  id: string;
  client_id: string;
  month_reference: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'pendente' | 'pago' | 'atrasado';
  marketing_clients?: {
    name: string;
    company: string;
    phone?: string;
  };
}

interface MarketingPost {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  social_network: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'other';
  status: 'rascunho' | 'programado' | 'feito' | 'aprovado' | 'publicado';
  caption: string;
  attachment_url: string;
  client_id?: string; // nullable client association
}

export const MarketingManager: React.FC<MarketingManagerProps> = ({ fetchWithAuth }) => {
  const { alert: dialogAlert, confirm: dialogConfirm } = useDialog();
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'clients' | 'payments' | 'reports'>('calendar');
  const [marketingViewMode, setMarketingViewMode] = useState<'calendar' | 'kanban'>('calendar');
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  // Data states
  const [clients, setClients] = useState<MarketingClient[]>([]);
  const [payments, setPayments] = useState<MarketingPayment[]>([]);
  const [posts, setPosts] = useState<MarketingPost[]>([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // File Upload states (Supports up to 50MB)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<MarketingClient | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    company: '',
    phone: '',
    plan_name: '',
    plan_value: '',
    status: 'mensalista' as 'mensalista' | 'semanal' | 'anúncio' | 'encerrado' | 'ativo' | 'prospect' | 'inativo',
    publication_days: [] as string[]
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<MarketingPayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    client_id: '',
    month_reference: '',
    amount: '',
    due_date: '',
    payment_date: '',
    status: 'pendente' as 'pendente' | 'pago' | 'atrasado'
  });

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isHolidayForm, setIsHolidayForm] = useState(false);
  const [editingPost, setEditingPost] = useState<MarketingPost | null>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    scheduled_date: '',
    scheduled_time: '',
    social_network: 'instagram' as 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'other',
    status: 'rascunho' as 'rascunho' | 'programado' | 'feito' | 'aprovado' | 'publicado',
    caption: '',
    attachment_url: '',
    client_id: ''
  });

  // Weekly Planner Report states
  const [reportClient, setReportClient] = useState<string>('');
  const [isSavingWeekly, setIsSavingWeekly] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split('T')[0];
  });
  
  // Weekly structure map (Day of week -> Post choice or custom text)
  const [weeklyPlannerItems, setWeeklyPlannerItems] = useState<Record<number, { isCustom: boolean; customTheme: string; postId: string; social_network: string; caption: string }>>({
    1: { isCustom: true, customTheme: '', postId: '', social_network: 'instagram', caption: '' }, // Monday
    2: { isCustom: true, customTheme: '', postId: '', social_network: 'instagram', caption: '' }, // Tuesday
    3: { isCustom: true, customTheme: '', postId: '', social_network: 'instagram', caption: '' }, // Wednesday
    4: { isCustom: true, customTheme: '', postId: '', social_network: 'instagram', caption: '' }, // Thursday
    5: { isCustom: true, customTheme: '', postId: '', social_network: 'instagram', caption: '' }, // Friday
    6: { isCustom: true, customTheme: '', postId: '', social_network: 'instagram', caption: '' }, // Saturday
    7: { isCustom: true, customTheme: '', postId: '', social_network: 'instagram', caption: '' }  // Sunday
  });

  // Monthly Report states
  const [monthlyReportClient, setMonthlyReportClient] = useState<string>('');
  const [monthlyReportMonth, setMonthlyReportMonth] = useState<number>(new Date().getMonth());
  const [monthlyReportYear, setMonthlyReportYear] = useState<number>(new Date().getFullYear());

  // Weekly Status Report States
  const [weeklyStatusReportStartDate, setWeeklyStatusReportStartDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split('T')[0];
  });

  const daysOfWeekLabels = [
    { num: 1, name: 'Segunda-feira' },
    { num: 2, name: 'Terça-feira' },
    { num: 3, name: 'Quarta-feira' },
    { num: 4, name: 'Quinta-feira' },
    { num: 5, name: 'Sexta-feira' },
    { num: 6, name: 'Sábado' },
    { num: 7, name: 'Domingo' }
  ];

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const [clientsRes, paymentsRes, postsRes] = await Promise.all([
        fetchWithAuth('/api/marketing/clients'),
        fetchWithAuth('/api/marketing/payments'),
        fetchWithAuth('/api/marketing/posts')
      ]);

      if (clientsRes.ok && paymentsRes.ok && postsRes.ok) {
        const clientsData = await clientsRes.json();
        const paymentsData = await paymentsRes.json();
        const postsData = await postsRes.json();
        
        setClients(clientsData);
        setPayments(paymentsData);
        setPosts(postsData);

        // Pre-select clients if available
        if (clientsData.length > 0) {
          if (!reportClient) setReportClient(clientsData[0].id.toString());
          if (!monthlyReportClient) setMonthlyReportClient(clientsData[0].id.toString());
        }
      } else {
        setErrorInfo("Erro ao carregar dados de marketing. Se as tabelas ainda não foram criadas no Supabase, por favor execute o script SQL de migração.");
      }
    } catch (err: any) {
      console.error("Error fetching marketing data:", err);
      setErrorInfo("Erro de conexão ao carregar dados. Verifique a migração do Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchWithAuth]);

  // Ref to prevent parallel trigger of automatic updates
  const isPublishingRef = useRef(false);

  // Automation to publish posts whose scheduled date/time is reached
  useEffect(() => {
    if (posts.length === 0 || isPublishingRef.current) return;

    const checkAndPublishPosts = async () => {
      const now = new Date();
      const postsToPublish = posts.filter(post => {
        if (post.status !== 'programado') return false;
        
        // Parse the scheduled date & time safely in local time
        const datePart = post.scheduled_date.split('T')[0];
        const timePart = post.scheduled_time || '00:00';
        
        const dateParts = datePart.split('-');
        const timeParts = timePart.split(':');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // 0-based
        const day = parseInt(dateParts[2], 10);
        const hours = parseInt(timeParts[0], 10) || 0;
        const minutes = parseInt(timeParts[1], 10) || 0;
        
        const scheduledDateTime = new Date(year, month, day, hours, minutes);
        return scheduledDateTime <= now;
      });

      if (postsToPublish.length === 0) return;

      isPublishingRef.current = true;
      try {
        console.log(`[Auto-Publish] Encontrados ${postsToPublish.length} posts programados com data atingida. Publicando...`);
        
        const promises = postsToPublish.map(post => {
          const updated = { ...post, status: 'publicado' as const };
          return fetchWithAuth(`/api/marketing/posts/${post.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          });
        });

        const responses = await Promise.all(promises);
        const successCount = responses.filter(r => r.ok).length;
        console.log(`[Auto-Publish] Sucesso ao publicar ${successCount} de ${postsToPublish.length} posts.`);

        if (successCount > 0) {
          // Re-fetch posts so the UI is immediately updated with 'publicado' status
          await fetchData();
        }
      } catch (err) {
        console.error("Erro na publicação automática de posts agendados:", err);
      } finally {
        isPublishingRef.current = false;
      }
    };

    // Run immediately on load or when posts update
    checkAndPublishPosts();

    // Also set up a periodic check every 30 seconds
    const interval = setInterval(() => {
      checkAndPublishPosts();
    }, 30000);

    return () => clearInterval(interval);
  }, [posts, fetchWithAuth]);

  // Handle Drag & Drop & Upload to 50MB Backend
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // 50MB limit validation
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError("O arquivo excede o limite máximo permitido de 50MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(`Lendo arquivo (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

    try {
      // Read file as Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          setUploadProgress("Enviando para o servidor (aguarde)...");

          const res = await fetchWithAuth('/api/marketing/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileData: base64Data
            })
          });

          if (res.ok) {
            const data = await res.json();
            setPostForm(prev => ({ ...prev, attachment_url: data.url }));
            setUploadProgress(null);
          } else {
            const err = await res.json();
            setUploadError(err.error || "Falha ao enviar arquivo.");
          }
        } catch (e: any) {
          setUploadError(e.message || "Erro no envio.");
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setUploadError("Erro ao ler o arquivo localmente.");
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || "Falha no upload.");
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Client CRUD
  const handleOpenClientModal = (client?: MarketingClient) => {
    if (client) {
      setEditingClient(client);
      setClientForm({
        name: client.name,
        company: client.company || '',
        phone: client.phone || '',
        plan_name: client.plan_name || '',
        plan_value: client.plan_value.toString(),
        status: client.status,
        publication_days: client.publication_days ? client.publication_days.split(',') : []
      });
    } else {
      setEditingClient(null);
      setClientForm({
        name: '',
        company: '',
        phone: '',
        plan_name: '',
        plan_value: '',
        status: 'ativo',
        publication_days: []
      });
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) return;

    try {
      const payload = {
        name: clientForm.name,
        company: clientForm.company,
        phone: clientForm.phone,
        plan_name: clientForm.plan_name,
        plan_value: parseFloat(clientForm.plan_value) || 0,
        status: clientForm.status,
        publication_days: clientForm.publication_days.join(',')
      };

      const url = editingClient 
        ? `/api/marketing/clients/${editingClient.id}` 
        : '/api/marketing/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsClientModalOpen(false);
        fetchData();
        await dialogAlert('Cliente salvo com sucesso!', 'Sucesso');
      } else {
        const errData = await res.json();
        await dialogAlert(`Erro: ${errData.message || 'Falha ao salvar cliente.'}`);
      }
    } catch (err) {
      console.error(err);
      await dialogAlert('Erro ao salvar cliente no Supabase.');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!(await dialogConfirm('Deseja realmente excluir este cliente de marketing? Isso também excluirá seus pagamentos vinculados.'))) return;

    try {
      const res = await fetchWithAuth(`/api/marketing/clients/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchData();
        await dialogAlert('Cliente excluído com sucesso!', 'Sucesso');
      } else {
        await dialogAlert('Falha ao excluir cliente.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Publication Day in form
  const handleTogglePublicationDay = (dayName: string) => {
    setClientForm(prev => {
      const days = prev.publication_days.includes(dayName)
        ? prev.publication_days.filter(d => d !== dayName)
        : [...prev.publication_days, dayName];
      return { ...prev, publication_days: days };
    });
  };

  // Payment CRUD
  const handleOpenPaymentModal = (payment?: MarketingPayment) => {
    const today = new Date().toISOString().split('T')[0];
    if (payment) {
      setEditingPayment(payment);
      setPaymentForm({
        client_id: payment.client_id ? payment.client_id.toString() : '',
        month_reference: payment.month_reference,
        amount: payment.amount.toString(),
        due_date: payment.due_date,
        payment_date: payment.payment_date || '',
        status: payment.status
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({
        client_id: '',
        month_reference: `${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`,
        amount: '',
        due_date: today,
        payment_date: '',
        status: 'pendente'
      });
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentClientChange = (clientId: string) => {
    const client = clients.find(c => c.id.toString() === clientId);
    setPaymentForm(prev => ({
      ...prev,
      client_id: clientId,
      amount: client ? client.plan_value.toString() : ''
    }));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.month_reference || !paymentForm.amount || !paymentForm.due_date) return;

    try {
      const payload = {
        ...paymentForm,
        client_id: paymentForm.client_id ? paymentForm.client_id : null,
        amount: parseFloat(paymentForm.amount) || 0,
        payment_date: paymentForm.payment_date || null
      };

      const url = editingPayment 
        ? `/api/marketing/payments/${editingPayment.id}` 
        : '/api/marketing/payments';
      const method = editingPayment ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        fetchData();
      } else {
        alert('Falha ao salvar pagamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar pagamento.');
    }
  };

  const sendWhatsAppReminder = (payment: MarketingPayment) => {
    const name = payment.marketing_clients?.name || 'Cliente';
    const phone = payment.marketing_clients?.phone || '';
    if (!phone) {
      alert("Este cliente não possui um número de telefone cadastrado.");
      return;
    }
    const due = new Date(payment.due_date).toLocaleDateString('pt-BR');
    const msg = encodeURIComponent(`Olá, ${name}! Passando para lembrar que sua mensalidade de marketing tem vencimento em ${due}. Qualquer dúvida, estamos à disposição!`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento de pagamento?')) return;

    try {
      const res = await fetchWithAuth(`/api/marketing/payments/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchData();
      } else {
        await dialogAlert('Falha ao excluir pagamento.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post CRUD
  const handleOpenPostModal = (post?: MarketingPost, defaultDate?: string, isHoliday = false) => {
    const today = defaultDate || new Date().toISOString().split('T')[0];
    setUploadError(null);
    setUploadProgress(null);
    if (post) {
      setEditingPost(post);
      const isHolidayPost = post.caption === '[FERIADO]' || post.caption === '[DATA_COMEMORATIVA]';
      setIsHolidayForm(isHolidayPost);
      setPostForm({
        title: post.title,
        scheduled_date: post.scheduled_date,
        scheduled_time: post.scheduled_time || '',
        social_network: post.social_network,
        status: post.status,
        caption: post.caption || '',
        attachment_url: post.attachment_url || '',
        client_id: post.client_id || ''
      });
    } else {
      setEditingPost(null);
      setIsHolidayForm(isHoliday);
      setPostForm({
        title: '',
        scheduled_date: today,
        scheduled_time: isHoliday ? '' : '12:00',
        social_network: isHoliday ? 'other' : 'instagram',
        status: 'rascunho',
        caption: isHoliday ? '[FERIADO]' : '',
        attachment_url: '',
        client_id: isHoliday ? '' : (clients[0]?.id || '')
      });
    }
    setIsPostModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title || !postForm.scheduled_date) return;

    try {
      const payload = {
        ...postForm,
        client_id: postForm.client_id || null
      };

      const url = editingPost 
        ? `/api/marketing/posts/${editingPost.id}` 
        : '/api/marketing/posts';
      const method = editingPost ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsPostModalOpen(false);
        fetchData();
        await dialogAlert('Post salvo com sucesso!', 'Sucesso');
      } else {
        await dialogAlert('Falha ao salvar post.');
      }
    } catch (err) {
      console.error(err);
      await dialogAlert('Erro de conexão ao salvar post.');
    }
  };

  const handleQuickStatusChange = async (post: MarketingPost, newStatus: typeof post.status) => {
    try {
      const updated = { ...post, status: newStatus };
      const res = await fetchWithAuth(`/api/marketing/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        fetchData();
      } else {
        await dialogAlert('Erro ao atualizar status do post.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!(await dialogConfirm('Deseja realmente excluir este agendamento de post?'))) return;

    try {
      const res = await fetchWithAuth(`/api/marketing/posts/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchData();
        await dialogAlert('Post excluído com sucesso!', 'Sucesso');
      } else {
        await dialogAlert('Falha ao excluir post.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar Monthly navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const firstDayIndex = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedMonth, selectedYear]);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Social icons helper
  const getSocialIcon = (net: string, size = 16) => {
    switch (net) {
      case 'instagram':
        return <Instagram size={size} className="text-pink-600" />;
      case 'facebook':
        return <Facebook size={size} className="text-blue-600" />;
      case 'youtube':
        return <Youtube size={size} className="text-red-600" />;
      case 'tiktok':
        return <Video size={size} className="text-black" />;
      default:
        return <Megaphone size={size} className="text-indigo-600" />;
    }
  };

  // Workflow Status Badges & Colors
  const getWorkflowBadge = (status: string) => {
    switch (status) {
      case 'rascunho':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-700 uppercase tracking-wide border border-gray-200">Rascunho / Tema</span>;
      case 'programado':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wide border border-blue-100">Programado</span>;
      case 'feito':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 uppercase tracking-wide border border-amber-100">Post Feito</span>;
      case 'aprovado':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-100">Aprovado</span>;
      case 'publicado':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wide border border-emerald-100">Publicado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">Rascunho</span>;
    }
  };

  const getWorkflowColor = (status: string) => {
    switch (status) {
      case 'rascunho': return 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100';
      case 'programado': return 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100';
      case 'feito': return 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100';
      case 'aprovado': return 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100';
      case 'publicado': return 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-emerald-100';
      default: return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider flex items-center gap-1 min-w-fit w-fit"><CheckCircle size={12} /> Pago</span>;
      case 'atrasado':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wider flex items-center gap-1 min-w-fit w-fit"><XCircle size={12} /> Atrasado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider flex items-center gap-1 min-w-fit w-fit"><Clock size={12} /> Pendente</span>;
    }
  };

  // Map posts by Date
  const postsByDateMap = useMemo(() => {
    const map: Record<string, MarketingPost[]> = {};
    posts.forEach(post => {
      const dateStr = post.scheduled_date.split('T')[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(post);
    });
    return map;
  }, [posts]);

  // Separate real posts from holidays/commemorative dates
  const realPosts = useMemo(() => {
    return posts.filter(p => p.caption !== '[FERIADO]' && p.caption !== '[DATA_COMEMORATIVA]');
  }, [posts]);

  const holidays = useMemo(() => {
    return posts.filter(p => p.caption === '[FERIADO]' || p.caption === '[DATA_COMEMORATIVA]');
  }, [posts]);

  const holidayOnSelectedDate = useMemo(() => {
    if (!postForm.scheduled_date) return null;
    const dateStr = postForm.scheduled_date.split('T')[0];
    return holidays.find(h => h.scheduled_date.split('T')[0] === dateStr);
  }, [postForm.scheduled_date, holidays]);

  // General Filtered clients & metrics
  const activeClientsCount = clients.filter(c => c.status === 'ativo').length;
  const prospectClientsCount = clients.filter(c => c.status === 'prospect').length;
  const totalMonthlyFee = clients.filter(c => c.status === 'ativo').reduce((acc, curr) => acc + Number(curr.plan_value), 0);

  // Financial status summary
  const totalCollected = payments.filter(p => p.status === 'pago').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalPending = payments.filter(p => p.status === 'pendente').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalOverdue = payments.filter(p => p.status === 'atrasado').reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Filter payments for search
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const clientName = p.marketing_clients?.name.toLowerCase() || 'pagamento avulso à parte';
      const ref = p.month_reference.toLowerCase();
      const s = searchTerm.toLowerCase();
      return clientName.includes(s) || ref.includes(s);
    });
  }, [payments, searchTerm]);

  // Clients options inside Planner selector
  const selectedClientDetails = useMemo(() => {
    return clients.find(c => c.id.toString() === reportClient?.toString());
  }, [clients, reportClient]);

  // Drafts available to be chosen inside report builder
  const clientDraftPosts = useMemo(() => {
    if (!reportClient) return [];
    return posts.filter(p => p.client_id?.toString() === reportClient.toString() && p.status === 'rascunho');
  }, [posts, reportClient]);

  const handleWeeklyItemChange = (dayNum: number, field: string, value: any) => {
    setWeeklyPlannerItems(prev => {
      const updatedDay = { ...prev[dayNum], [field]: value };
      
      // If choosing a draft post, autopopulate other attributes
      if (field === 'postId' && value !== '') {
        const matchingDraft = clientDraftPosts.find(p => p.id.toString() === value.toString());
        if (matchingDraft) {
          updatedDay.customTheme = matchingDraft.title;
          updatedDay.social_network = matchingDraft.social_network;
          updatedDay.caption = matchingDraft.caption || '';
        }
      }
      
      return { ...prev, [dayNum]: updatedDay };
    });
  };

  const handleSaveWeeklyToKanban = async (silent: boolean = false) => {
    if (!reportClient) {
      alert("Por favor, selecione um cliente.");
      return false;
    }
    if (!reportStartDate) {
      alert("Por favor, selecione a data de início (Segunda-feira).");
      return false;
    }

    setIsSavingWeekly(true);
    try {
      const baseDate = new Date(reportStartDate + 'T12:00:00');
      
      const promises = daysOfWeekLabels.map(async (day) => {
        const item = weeklyPlannerItems[day.num];
        
        const targetDate = new Date(baseDate.getTime());
        targetDate.setDate(baseDate.getDate() + (day.num - 1));
        const targetDateStr = targetDate.toISOString().split('T')[0];

        if (item.isCustom) {
          if (!item.customTheme.trim()) return;

          const payload = {
            title: item.customTheme,
            scheduled_date: targetDateStr,
            scheduled_time: '12:00',
            social_network: item.social_network || 'instagram',
            status: 'programado',
            caption: item.caption || '',
            attachment_url: '',
            client_id: reportClient
          };

          await fetchWithAuth('/api/marketing/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          if (!item.postId) return;

          const matchingPost = clientDraftPosts.find(p => p.id.toString() === item.postId.toString());
          if (matchingPost) {
            const payload = {
              title: matchingPost.title,
              scheduled_date: targetDateStr,
              scheduled_time: matchingPost.scheduled_time || '12:00',
              social_network: matchingPost.social_network,
              status: 'programado',
              caption: item.caption || matchingPost.caption || '',
              attachment_url: matchingPost.attachment_url || '',
              client_id: reportClient
            };

            await fetchWithAuth(`/api/marketing/posts/${matchingPost.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
        }
      });

      await Promise.all(promises);
      await fetchData();
      if (!silent) {
        alert("Programação semanal salva no Kanban com sucesso!");
      }
      return true;
    } catch (err) {
      console.error('Error saving weekly planner:', err);
      alert('Erro ao salvar programação semanal.');
      return false;
    } finally {
      setIsSavingWeekly(false);
    }
  };

  const handlePrintWeeklyAndSave = async () => {
    if (!selectedClientDetails) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    const mondayDate = new Date(reportStartDate + 'T12:00:00');
    const fridayDate = new Date(mondayDate.getTime());
    fridayDate.setDate(mondayDate.getDate() + 4);
    const formattedPeriod = `${mondayDate.toLocaleDateString('pt-BR')} a ${fridayDate.toLocaleDateString('pt-BR')} (Segunda a Sexta)`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("O bloqueador de pop-ups bloqueou a impressão. Por favor, libere os pop-ups.");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Salvando e Gerando PDF...</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #fafafa; color: #4f46e5; }
            .spinner { border: 4px solid #f3f4f6; border-top: 4px solid #4f46e5; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 12px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .container { text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <div style="font-weight: bold; font-size: 16px;">Salvando programação no Kanban e gerando PDF...</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">Por favor, aguarde um instante.</div>
          </div>
        </body>
      </html>
    `);

    const success = await handleSaveWeeklyToKanban(true);
    if (!success) {
      printWindow.close();
      return;
    }

    const rowsHtml = daysOfWeekLabels.map(day => {
      const item = weeklyPlannerItems[day.num];
      const theme = item.isCustom ? item.customTheme : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.title || 'Sem post programado');
      const network = item.isCustom ? item.social_network : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.social_network || 'instagram');
      const caption = item.isCustom ? item.caption : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.caption || '');
      const time = item.isCustom ? '12:00' : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.scheduled_time || '12:00');

      const networkColors = {
        instagram: { bg: '#fdf2f8', text: '#db2777' },
        facebook: { bg: '#eff6ff', text: '#1d4ed8' },
        linkedin: { bg: '#f0f9ff', text: '#0369a1' },
        tiktok: { bg: '#f3f4f6', text: '#111827' },
        youtube: { bg: '#fef2f2', text: '#b91c1c' }
      }[network.toLowerCase()] || { bg: '#f3f4f6', text: '#4b5563' };

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #1e293b; width: 14%;">${day.name}</td>
          <td style="padding: 12px; width: 12%;">
            <span style="background-color: ${networkColors.bg}; color: ${networkColors.text}; font-size: 10px; font-weight: 900; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
              ${network}
            </span>
          </td>
          <td style="padding: 12px; width: 28%;">
            <div style="font-weight: 800; color: #1e1b4b; font-size: 13.5px;">${theme || 'Tema Livre / Não Informado'}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px; font-family: monospace;">Horário: ${time}</div>
          </td>
          <td style="padding: 12px; color: #475569; font-size: 11.5px; line-height: 1.4; width: 33%; white-space: pre-line;">${caption || '<span style="color: #cbd5e1; font-style: italic;">Nenhuma legenda inserida.</span>'}</td>
          <td style="padding: 12px; width: 13%; text-align: center;">
            <div style="font-size: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px; color: #64748b; background-color: #f8fafc; text-align: left;">
              <span style="display: block; font-weight: bold; font-size: 8.5px; text-transform: uppercase; margin-bottom: 2px;">Aprovação</span>
              <span style="color: #94a3b8; font-size: 10px; font-family: monospace;">[ ] OK  [ ] Adj.</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Programação Semanal - ${selectedClientDetails.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #4338ca;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #1e1b4b;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              color: #4f46e5;
              font-weight: bold;
              margin-top: 5px;
            }
            .meta-box {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
              background-color: #f8fafc;
              padding: 15px 20px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .meta-val {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #4338ca;
              color: white;
              font-weight: 800;
              text-align: left;
              padding: 12px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 11px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="background-color: #4338ca; color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(67, 56, 202, 0.25);">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div>
                <h1 class="title">Cronograma de Conteúdo Semanal</h1>
                <div class="subtitle" style="font-size: 12px; color: #4f46e5; font-weight: 700; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Gestão de Marketing & Presença de Marca</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: 800; color: #1e1b4b; font-size: 16px;">${selectedClientDetails.company || 'Geral / Não Informado'}</span>
              <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 4px;">Cliente: ${selectedClientDetails.name}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <span class="meta-label">Cliente</span>
              <span class="meta-val">${selectedClientDetails.name}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Semana de Referência</span>
              <span class="meta-val">${formattedPeriod}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Data de Geração</span>
              <span class="meta-val" style="color: #4338ca;">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 14%;">Dia da Semana</th>
                <th style="width: 12%;">Canal</th>
                <th style="width: 28%;">Tema Planejado</th>
                <th style="width: 33%;">Legenda sugerida</th>
                <th style="width: 13%; text-align: center;">Feedback</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <p>Programação de Marketing gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por MarketingManager. Todos os direitos reservados.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render weekly PDF print preview
  const handlePrintWeeklyReport = () => {
    if (!selectedClientDetails) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    const mondayDate = new Date(reportStartDate + 'T12:00:00');
    const fridayDate = new Date(mondayDate.getTime());
    fridayDate.setDate(mondayDate.getDate() + 4);
    const formattedPeriod = `${mondayDate.toLocaleDateString('pt-BR')} a ${fridayDate.toLocaleDateString('pt-BR')} (Segunda a Sexta)`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build lists of items
    const rowsHtml = daysOfWeekLabels.map(day => {
      const item = weeklyPlannerItems[day.num];
      const theme = item.isCustom ? item.customTheme : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.title || 'Sem post programado');
      const network = item.isCustom ? item.social_network : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.social_network || 'instagram');
      const caption = item.isCustom ? item.caption : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.caption || '');
      const time = item.isCustom ? '12:00' : (clientDraftPosts.find(p => p.id.toString() === item.postId)?.scheduled_time || '12:00');

      const networkColors = {
        instagram: { bg: '#fdf2f8', text: '#db2777' },
        facebook: { bg: '#eff6ff', text: '#1d4ed8' },
        linkedin: { bg: '#f0f9ff', text: '#0369a1' },
        tiktok: { bg: '#f3f4f6', text: '#111827' },
        youtube: { bg: '#fef2f2', text: '#b91c1c' }
      }[network.toLowerCase()] || { bg: '#f3f4f6', text: '#4b5563' };

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #1e293b; width: 14%;">${day.name}</td>
          <td style="padding: 12px; width: 12%;">
            <span style="background-color: ${networkColors.bg}; color: ${networkColors.text}; font-size: 10px; font-weight: 900; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
              ${network}
            </span>
          </td>
          <td style="padding: 12px; width: 28%;">
            <div style="font-weight: 800; color: #1e1b4b; font-size: 13.5px;">${theme || 'Tema Livre / Não Informado'}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px; font-family: monospace;">Horário: ${time}</div>
          </td>
          <td style="padding: 12px; color: #475569; font-size: 11.5px; line-height: 1.4; width: 33%; white-space: pre-line;">${caption || '<span style="color: #cbd5e1; font-style: italic;">Nenhuma legenda inserida.</span>'}</td>
          <td style="padding: 12px; width: 13%; text-align: center;">
            <div style="font-size: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px; color: #64748b; background-color: #f8fafc; text-align: left;">
              <span style="display: block; font-weight: bold; font-size: 8.5px; text-transform: uppercase; margin-bottom: 2px;">Aprovação</span>
              <span style="color: #94a3b8; font-size: 10px; font-family: monospace;">[ ] OK  [ ] Adj.</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Programação Semanal - ${selectedClientDetails.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #4338ca;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #1e1b4b;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              color: #4f46e5;
              font-weight: bold;
              margin-top: 5px;
            }
            .meta-box {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
              background-color: #f8fafc;
              padding: 15px 20px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .meta-val {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #4338ca;
              color: white;
              font-weight: 800;
              text-align: left;
              padding: 12px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 11px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background-color: #4338ca; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer;">Imprimir / Salvar PDF</button>
          </div>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="background-color: #4338ca; color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(67, 56, 202, 0.25);">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div>
                <h1 class="title">Cronograma de Conteúdo Semanal</h1>
                <div class="subtitle" style="font-size: 12px; color: #4f46e5; font-weight: 700; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Gestão de Marketing & Presença de Marca</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: 800; color: #1e1b4b; font-size: 16px;">${selectedClientDetails.company || 'Geral / Não Informado'}</span>
              <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 4px;">Cliente: ${selectedClientDetails.name}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <span class="meta-label">Cliente Atendido</span>
              <span class="meta-val">${selectedClientDetails.name}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Período de Veiculação</span>
              <span class="meta-val">${formattedPeriod}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Data de Geração</span>
              <span class="meta-val" style="color: #4338ca;">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 14%;">Dia da Semana</th>
                <th style="width: 12%;">Canal</th>
                <th style="width: 28%;">Tema do Post / Conteúdo</th>
                <th style="width: 33%;">Legenda / Direcionamento</th>
                <th style="width: 13%; text-align: center;">Feedback</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <p>Programação de Marketing gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por MarketingManager. Todos os direitos reservados.</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter client's monthly posts
  const monthlyClientPosts = useMemo(() => {
    if (!monthlyReportClient) return [];
    return posts.filter(post => {
      if (post.client_id?.toString() !== monthlyReportClient.toString()) return false;
      const postDate = new Date(post.scheduled_date);
      return postDate.getMonth() === Number(monthlyReportMonth) && postDate.getFullYear() === Number(monthlyReportYear);
    });
  }, [posts, monthlyReportClient, monthlyReportMonth, monthlyReportYear]);

  // Aggregate stats of monthly posts
  const monthlyMetrics = useMemo(() => {
    const total = monthlyClientPosts.length;
    const drafts = monthlyClientPosts.filter(p => p.status === 'rascunho').length;
    const scheduled = monthlyClientPosts.filter(p => p.status === 'programado').length;
    const inProd = monthlyClientPosts.filter(p => p.status === 'feito').length;
    const approved = monthlyClientPosts.filter(p => p.status === 'aprovado').length;
    const published = monthlyClientPosts.filter(p => p.status === 'publicado').length;
    return { total, drafts, scheduled, inProd, approved, published };
  }, [monthlyClientPosts]);

  const monthlyClientDetails = useMemo(() => {
    return clients.find(c => c.id.toString() === monthlyReportClient);
  }, [clients, monthlyReportClient]);

  // Trigger print view for monthly executive report
  const handlePrintMonthlyReport = () => {
    if (!monthlyClientDetails) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build highly detailed tables of posts
    const rowsHtml = monthlyClientPosts.map(post => {
      const statusLabel = {
        rascunho: 'Rascunho / Tema',
        programado: 'Programado',
        feito: 'Em Produção',
        aprovado: 'Aprovado',
        publicado: 'Publicado'
      }[post.status] || post.status;

      const statusColor = {
        rascunho: '#64748b',
        programado: '#2563eb',
        feito: '#d97706',
        aprovado: '#4f46e5',
        publicado: '#059669'
      }[post.status] || '#64748b';

      const networkColors = {
        instagram: { bg: '#fdf2f8', text: '#db2777' },
        facebook: { bg: '#eff6ff', text: '#1d4ed8' },
        linkedin: { bg: '#f0f9ff', text: '#0369a1' },
        tiktok: { bg: '#f3f4f6', text: '#111827' },
        youtube: { bg: '#fef2f2', text: '#b91c1c' }
      }[post.social_network.toLowerCase()] || { bg: '#f3f4f6', text: '#4b5563' };

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;">
          <td style="padding: 12px; font-size: 11px; font-weight: bold; color: #475569; width: 14%;">
            ${new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR')}<br/>
            <span style="font-size: 10px; font-weight: 500; color: #94a3b8; font-family: monospace;">${post.scheduled_time || '12:00'}</span>
          </td>
          <td style="padding: 12px; vertical-align: middle; width: 12%;">
            <span style="background-color: ${networkColors.bg}; color: ${networkColors.text}; font-size: 9.5px; font-weight: 900; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
              ${post.social_network}
            </span>
          </td>
          <td style="padding: 12px; font-size: 13px; font-weight: 700; color: #1e293b; width: 28%;">
            ${post.title}
          </td>
          <td style="padding: 12px; font-size: 11.5px; color: #475569; line-height: 1.4; white-space: pre-line; width: 33%;">
            ${post.caption || '<span style="color: #cbd5e1; font-style: italic;">Nenhuma legenda cadastrada.</span>'}
          </td>
          <td style="padding: 12px; text-align: center; vertical-align: middle; width: 13%;">
            <span style="background-color: ${statusColor}15; color: ${statusColor}; font-size: 9.5px; font-weight: 800; padding: 5px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid ${statusColor}30; display: inline-block; min-width: 90px; text-align: center;">
              ● ${statusLabel}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Postagens Mensal - ${monthlyClientDetails.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #4338ca;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #1e1b4b;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              color: #4f46e5;
              font-weight: bold;
              margin-top: 5px;
            }
            .meta-box {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
              background-color: #f8fafc;
              padding: 15px 20px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .meta-val {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }
            .grid-stats {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 40px;
            }
            .stat-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              text-align: center;
            }
            .stat-num {
              font-size: 24px;
              font-weight: 800;
              color: #1e293b;
            }
            .stat-label {
              font-size: 10px;
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
              margin-top: 5px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 800;
              color: #1e1b4b;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #4338ca;
              color: white;
              font-weight: 800;
              text-align: left;
              padding: 12px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
              .grid-stats { grid-template-cols: repeat(4, 1fr) !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background-color: #4338ca; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer;">Imprimir / Salvar PDF</button>
          </div>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="background-color: #4338ca; color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(67, 56, 202, 0.25);">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div>
                <h1 class="title">Relatório Executivo de Postagens</h1>
                <div class="subtitle" style="font-size: 12px; color: #4f46e5; font-weight: 700; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Desempenho, Produção & Cronograma Mensal</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: 800; color: #1e1b4b; font-size: 16px;">${monthlyClientDetails.company || 'Geral / Não Informado'}</span>
              <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 4px;">Cliente: ${monthlyClientDetails.name}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <span class="meta-label">Cliente</span>
              <span class="meta-val">${monthlyClientDetails.name}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Referência Mensal</span>
              <span class="meta-val">${monthNames[monthlyReportMonth]} de ${monthlyReportYear}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Data de Geração</span>
              <span class="meta-val" style="color: #4338ca;">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <h3 class="section-title">Métricas de Entrega</h3>
          <div class="grid-stats">
            <div class="stat-card">
              <div class="stat-num" style="color: #4338ca;">${monthlyMetrics.total}</div>
              <div class="stat-label">Total Cadastrado</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color: #059669;">${monthlyMetrics.published}</div>
              <div class="stat-label">Publicados</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color: #4f46e5;">${monthlyMetrics.approved}</div>
              <div class="stat-label">Aprovados</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color: #d97706;">${monthlyMetrics.inProd}</div>
              <div class="stat-label">Post Feito / Produção</div>
            </div>
          </div>

          <h3 class="section-title">Detalhamento de Conteúdo por Cliente</h3>
          
          <table>
            <thead>
              <tr>
                <th style="width: 14%;">Data / Hora</th>
                <th style="width: 12%;">Canal</th>
                <th style="width: 28%;">Título do Post / Tema</th>
                <th style="width: 33%;">Texto da Legenda / Briefing</th>
                <th style="width: 13%; text-align: center;">Status Atual</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="5" style="color: #94a3b8; text-align: center; font-size: 13px; padding: 24px;">Nenhuma postagem programada ou lançada para este período.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            <p>Relatório Executivo de Marketing gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por MarketingManager. Todos os direitos reservados.</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter all posts for the chosen week
  const weeklyStatusReportPosts = useMemo(() => {
    if (!weeklyStatusReportStartDate) return [];
    
    const start = new Date(weeklyStatusReportStartDate + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // end on Sunday

    const startYMD = start.toISOString().split('T')[0];
    const endYMD = end.toISOString().split('T')[0];

    return posts.filter(post => {
      const postYMD = post.scheduled_date.split('T')[0];
      const isWithinDateRange = postYMD >= startYMD && postYMD <= endYMD;
      if (!isWithinDateRange) return false;

      const client = clients.find(c => c.id.toString() === post.client_id?.toString());
      if (client && client.publication_days) {
        const days = client.publication_days.split(',');
        const date = new Date(post.scheduled_date + 'T00:00:00');
        const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
        return days.includes(dayName);
      }
      return true;
    });
  }, [posts, weeklyStatusReportStartDate, clients]);

  // Aggregate metrics for this chosen week
  const weeklyStatusMetrics = useMemo(() => {
    const total = weeklyStatusReportPosts.length;
    const drafts = weeklyStatusReportPosts.filter(p => p.status === 'rascunho').length;
    const scheduled = weeklyStatusReportPosts.filter(p => p.status === 'programado').length;
    const inProd = weeklyStatusReportPosts.filter(p => p.status === 'feito').length;
    const approved = weeklyStatusReportPosts.filter(p => p.status === 'aprovado').length;
    const published = weeklyStatusReportPosts.filter(p => p.status === 'publicado').length;
    
    // Count unique clients with posts
    const clientIds = new Set(weeklyStatusReportPosts.map(p => p.client_id?.toString() || 'general'));
    const uniqueClientsCount = clientIds.size;

    return { total, drafts, scheduled, inProd, approved, published, uniqueClientsCount };
  }, [weeklyStatusReportPosts]);

  const handlePrintWeeklyStatusReport = async () => {
    if (weeklyStatusReportPosts.length === 0) {
      await dialogAlert("Nenhum post encontrado nesta semana para gerar o relatório.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const start = new Date(weeklyStatusReportStartDate + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const dateRangeStr = `Semana de ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;

    // Grouping logic
    const grouped: Record<string, {
      clientName: string;
      company: string;
      posts: MarketingPost[];
    }> = {};

    weeklyStatusReportPosts.forEach(post => {
      const clientId = post.client_id ? post.client_id.toString() : 'general';
      const client = clients.find(c => c.id.toString() === clientId);
      
      if (!grouped[clientId]) {
        grouped[clientId] = {
          clientName: client ? client.name : 'Tema Geral / Institucional',
          company: client ? (client.company || 'Agência') : 'Agência',
          posts: []
        };
      }
      grouped[clientId].posts.push(post);
    });

    // Generate HTML for each client
    const clientsHtml = Object.entries(grouped).map(([clientId, group]) => {
      const statuses = ['rascunho', 'programado', 'feito', 'aprovado', 'publicado'] as const;
      const statusNames = {
        rascunho: 'Rascunho / Tema',
        programado: 'Programado / Agendado',
        feito: 'Post Feito / Produção',
        aprovado: 'Aprovado pelo Cliente',
        publicado: 'Publicado / No Ar'
      };
      const statusColors = {
        rascunho: '#64748b',
        programado: '#2563eb',
        feito: '#d97706',
        aprovado: '#4f46e5',
        publicado: '#059669'
      };

      const statusesHtml = statuses.map(status => {
        const statusPosts = group.posts.filter(p => p.status === status);
        if (statusPosts.length === 0) return '';

        const postsRows = statusPosts.map(post => {
          return `
            <div style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 13px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 5px; background-color: #f1f5f9; border-radius: 4px; color: #4b5563; font-family: monospace;">
                    ${post.social_network}
                  </span>
                  ${post.title}
                </div>
                ${post.caption ? `<div style="font-size: 11px; color: #64748b; margin-top: 5px; font-style: italic; white-space: pre-line; line-height: 1.3;">${post.caption}</div>` : ''}
              </div>
              <div style="text-align: right; font-size: 11px; color: #94a3b8; font-weight: bold; min-width: 100px;">
                ${new Date(post.scheduled_date).toLocaleDateString('pt-BR')} ${post.scheduled_time || '12:00'}
              </div>
            </div>
          `;
        }).join('');

        return `
          <div style="margin-top: 15px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: ${statusColors[status]}15; color: ${statusColors[status]}; padding: 8px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
              <span>● ${statusNames[status]}</span>
              <span style="background-color: ${statusColors[status]}; color: white; border-radius: 12px; padding: 1px 6px; font-size: 10px;">${statusPosts.length} posts</span>
            </div>
            <div>
              ${postsRows}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="client-section" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px; page-break-inside: avoid;">
          <div style="border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #1e1b4b;">${group.clientName}</h2>
            <span style="font-size: 11px; font-weight: bold; color: #4338ca; background-color: #e0e7ff; padding: 4px 8px; border-radius: 6px;">
              ${group.company || 'Empresa'}
            </span>
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 10px;">
            Total de postagens agendadas nesta semana: <strong>${group.posts.length}</strong>
          </div>
          <div>
            ${statusesHtml}
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Semanal Multicliente - ${dateRangeStr}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #4338ca;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #1e1b4b;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              color: #4f46e5;
              font-weight: bold;
              margin-top: 5px;
            }
            .meta-box {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
              background-color: #f8fafc;
              padding: 15px 20px;
              border-radius: 12px;
              border: 1px solid #f1f5f9;
            }
            .meta-item {
              text-align: center;
            }
            .meta-label {
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.5px;
            }
            .meta-val {
              font-weight: 800;
              color: #1e293b;
              font-size: 18px;
              margin-top: 3px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 800;
              color: #1e1b4b;
              margin-top: 30px;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-left: 4px solid #4338ca;
              padding-left: 10px;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
              .client-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background-color: #4338ca; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer;">Imprimir / Salvar PDF</button>
          </div>
          <div class="header">
            <div>
              <h1 class="title">Relatório Semanal de Atividades</h1>
              <div class="subtitle">Acompanhamento de Conteúdo por Cliente e Status</div>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: 800; color: #4338ca; font-size: 16px;">Controle de Fluxo Semanal</span>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <div class="meta-label">Período de Referência</div>
              <div class="meta-val" style="font-size: 13px;">${dateRangeStr}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Clientes Atendidos</div>
              <div class="meta-val">${Object.keys(grouped).length}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Total de Posts</div>
              <div class="meta-val">${weeklyStatusReportPosts.length}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Publicados / Aprovados</div>
              <div class="meta-val" style="color: #059669;">
                ${weeklyStatusReportPosts.filter(p => p.status === 'publicado' || p.status === 'aprovado').length}
              </div>
            </div>
          </div>

          <h3 class="section-title">Detalhamento de Conteúdo por Cliente</h3>
          
          <div style="margin-top: 20px;">
            ${clientsHtml}
          </div>

          <div class="footer">
            <p>Gerado automaticamente via Sistema de Gestão de Marketing. Todos os direitos reservados.</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-gray-50/50 min-h-screen p-1 sm:p-4 font-sans antialiased text-gray-800">
      
      {/* Dynamic Sub-tab Selector */}
      <div className="mb-6 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            onClick={() => { setActiveSubTab('calendar'); setErrorInfo(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'calendar' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <CalendarIcon size={16} />
            Calendário de Conteúdo
          </button>
          <button
            onClick={() => { setActiveSubTab('clients'); setErrorInfo(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'clients' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Users size={16} />
            Clientes de Marketing
          </button>
          <button
            onClick={() => { setActiveSubTab('payments'); setErrorInfo(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'payments' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <DollarSign size={16} />
            Financeiro Mensalidades
          </button>
          <button
            onClick={() => { setActiveSubTab('reports'); setErrorInfo(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'reports' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Printer size={16} />
            Emissor de Relatórios (PDF)
          </button>
        </div>

        <button 
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-700 transition-all rounded-lg"
        >
          Sincronizar Banco
        </button>
      </div>

      {/* Migration Alert */}
      {errorInfo && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs sm:text-sm items-start">
          <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold">Upgrade de Banco Requerido</p>
            <p className="mt-1 opacity-90">
              Caso as novas colunas ou estados ('programado', 'feito', 'aprovado') causem erros ao salvar, execute a query de alteração de restrição no seu painel Supabase:
            </p>
            <pre className="mt-2 p-2.5 bg-amber-100/60 rounded-lg text-[10px] font-mono overflow-x-auto select-all">
              ALTER TABLE marketing_posts DROP CONSTRAINT IF EXISTS marketing_posts_status_check;
              ALTER TABLE marketing_posts ADD CONSTRAINT marketing_posts_status_check CHECK (status IN ('rascunho', 'programado', 'feito', 'aprovado', 'publicado'));
            </pre>
          </div>
        </div>
      )}

      {/* Content Switcher */}
      <AnimatePresence mode="wait">
        
        {/* SUB TAB 1: CALENDAR */}
        {activeSubTab === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Quick stats on top */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Total Cadastrado</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{realPosts.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider">Programados</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{realPosts.filter(p => p.status === 'programado').length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Posts Feitos</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{realPosts.filter(p => p.status === 'feito').length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">Aprovados</p>
                <p className="text-xl font-bold text-indigo-600 mt-1">{realPosts.filter(p => p.status === 'aprovado').length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 sm:col-span-1 text-center">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Publicados</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{realPosts.filter(p => p.status === 'publicado').length}</p>
              </div>
            </div>
            
            {/* View Selector: Calendar vs Kanban */}
            <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex-col sm:flex-row gap-3">
              <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setMarketingViewMode('calendar')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    marketingViewMode === 'calendar'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <CalendarIcon size={14} />
                  Calendário Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setMarketingViewMode('kanban')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    marketingViewMode === 'kanban'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Layers size={14} />
                  Quadro Kanban (Fluxo)
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenPostModal(undefined, undefined, true)}
                  className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all w-full sm:w-auto justify-center"
                >
                  <Plus size={12} /> Novo Feriado / Data
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPostModal()}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm w-full sm:w-auto justify-center"
                >
                  <Plus size={12} /> Novo Post
                </button>
              </div>
            </div>

            {marketingViewMode === 'calendar' ? (
              <>
                {/* Interactive Monthly Grid Calendar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="text-indigo-600" size={18} />
                  <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">Calendário de Conteúdo Mensal</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-black text-gray-800 text-xs sm:text-sm uppercase tracking-widest min-w-[130px] text-center">
                    {monthNames[selectedMonth]} {selectedYear}
                  </span>
                  <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenPostModal(undefined, undefined, true)}
                    className="flex items-center gap-1 bg-rose-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-sm w-full sm:w-auto justify-center"
                  >
                    <Plus size={14} /> Novo Feriado
                  </button>
                  <button
                    onClick={() => handleOpenPostModal()}
                    className="flex items-center gap-1 bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm w-full sm:w-auto justify-center"
                  >
                    <Plus size={14} /> Novo Post
                  </button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-gray-100 text-center py-2 bg-gray-50/20 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 bg-gray-100/30 gap-px">
                {/* Empty starting cells */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-gray-50/20 min-h-[90px] sm:min-h-[110px]"></div>
                ))}

                {/* Days cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dayStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const dayItems = postsByDateMap[dayStr] || [];
                  const dayHolidays = dayItems.filter(p => p.caption === '[FERIADO]' || p.caption === '[DATA_COMEMORATIVA]');
                  const dayPosts = dayItems.filter(p => p.caption !== '[FERIADO]' && p.caption !== '[DATA_COMEMORATIVA]');

                  return (
                    <div 
                      key={`day-${day}`} 
                      onClick={() => handleOpenPostModal(undefined, dayStr)}
                      className="bg-white min-h-[90px] sm:min-h-[110px] p-1 sm:p-2 border-b border-r border-gray-100 hover:bg-indigo-50/10 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <span className="font-extrabold text-xs text-gray-400 self-start">{day}</span>
                      
                      <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[65px] sm:max-h-[85px] scrollbar-thin">
                        {/* Render Holidays first */}
                        {dayHolidays.map(holiday => (
                          <div
                            key={holiday.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPostModal(holiday);
                            }}
                            className="p-1 rounded text-[9px] bg-rose-50 border border-rose-100 text-rose-800 font-extrabold flex flex-col gap-0.5 hover:bg-rose-100 transition-all"
                            title={`Feriado / Data: ${holiday.title}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate flex items-center gap-1 text-[8.5px]">
                                {holiday.caption === '[FERIADO]' ? '🚩' : '🎉'} {holiday.title}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPostModal(undefined, dayStr, false);
                                  setPostForm(prev => ({
                                    ...prev,
                                    title: `Post: ${holiday.title}`,
                                    caption: `Postagem de comemoração de ${holiday.title}.`
                                  }));
                                }}
                                className="text-[7px] bg-white text-rose-700 px-1 rounded hover:bg-rose-50 transition-all font-black border border-rose-200"
                                title="Agendar Post para esta data"
                              >
                                +Post
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Render Regular Posts */}
                        {dayPosts.map(post => (
                          <div
                            key={post.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPostModal(post);
                            }}
                            className={`p-1 rounded text-[9px] border flex flex-col gap-0.5 transition-all ${getWorkflowColor(post.status)}`}
                          >
                            <span className="truncate font-bold flex items-center gap-1">
                              {getSocialIcon(post.social_network, 9)}
                              {post.title}
                            </span>
                            <div className="flex justify-between items-center opacity-85 text-[8px]">
                              <span>{post.scheduled_time || '12:00'}</span>
                              <span className="font-bold uppercase tracking-widest text-[7px] bg-white/60 px-1 rounded">
                                {post.status === 'rascunho' ? 'Rasc' : post.status === 'feito' ? 'Feito' : post.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Structured Table Listing with Status Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">Fila Completa de Postagens</h3>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-lg">
                  {realPosts.length} cadastradas
                </span>
              </div>

              {realPosts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Megaphone className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-xs">Nenhum post agendado no calendário.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-5 py-3">Rede & Título</th>
                        <th className="px-5 py-3">Cliente</th>
                        <th className="px-5 py-3">Data Programada</th>
                        <th className="px-5 py-3">Fluxo / Status</th>
                        <th className="px-5 py-3">Anexo</th>
                        <th className="px-5 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                      {realPosts.map(post => {
                        const matchingClient = clients.find(c => c.id.toString() === post.client_id?.toString());
                        return (
                          <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                                  {getSocialIcon(post.social_network, 16)}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{post.title}</p>
                                  {post.caption && (
                                    <p className="text-[10px] text-gray-400 truncate max-w-[220px]">{post.caption}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-semibold text-gray-700">
                              {matchingClient?.name || <span className="text-gray-400 italic">Tema Livre / Geral</span>}
                            </td>
                            <td className="px-5 py-4 font-mono font-bold text-gray-600">
                              {new Date(post.scheduled_date).toLocaleDateString('pt-BR')} {post.scheduled_time || '12:00'}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1.5">
                                <div>{getWorkflowBadge(post.status)}</div>
                                
                                {/* Quick status advancement controls */}
                                <select 
                                  value={post.status} 
                                  onChange={(e) => handleQuickStatusChange(post, e.target.value as any)}
                                  className="p-1 border border-gray-200 rounded text-[10px] bg-white font-medium focus:outline-none"
                                >
                                  <option value="rascunho">1. Rascunho / Tema</option>
                                  <option value="programado">2. Programado</option>
                                  <option value="feito">3. Post Feito</option>
                                  <option value="aprovado">4. Aprovado</option>
                                  <option value="publicado">5. Publicado</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {post.attachment_url ? (
                                <a 
                                  href={post.attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                                >
                                  <LinkIcon size={12} />
                                  Ver Anexo
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">Sem anexo</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenPostModal(post)}
                                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Feriados e Datas Comemorativas Cadastradas */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-rose-500 font-bold text-lg">🎉</span>
                  <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">Feriados e Datas Comemorativas Cadastradas</h3>
                </div>
                <button
                  onClick={() => handleOpenPostModal(undefined, undefined, true)}
                  className="flex items-center gap-1 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all border border-rose-100"
                >
                  <Plus size={12} /> Novo Feriado / Data
                </button>
              </div>

              {holidays.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-xs">Nenhum feriado ou data comemorativa registrada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
                  {holidays.map(holiday => (
                    <div key={holiday.id} className="p-3 bg-rose-50/40 border border-rose-100/60 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{holiday.caption === '[FERIADO]' ? '🚩' : '🎉'}</span>
                          <p className="font-bold text-gray-800 text-xs truncate">{holiday.title}</p>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono font-bold mt-1">
                          {new Date(holiday.scheduled_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            handleOpenPostModal(undefined, holiday.scheduled_date, false);
                            setPostForm(prev => ({
                              ...prev,
                              title: `Post: ${holiday.title}`,
                              caption: `Postagem de comemoração de ${holiday.title}.`
                            }));
                          }}
                          className="px-2 py-1 bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-black transition-all flex items-center gap-0.5 whitespace-nowrap"
                          title="Agendar Post para esta data"
                        >
                          <Plus size={10} /> +Post
                        </button>
                        <button
                          onClick={() => handleOpenPostModal(holiday)}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded transition-all"
                          title="Editar Feriado"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeletePost(holiday.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                          title="Excluir Feriado"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Kanban Board View */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="space-y-1 text-left">
                <h4 className="font-extrabold text-indigo-900 text-sm flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" /> Quadro de Fluxo Kanban
                </h4>
                <p className="text-xs text-indigo-700 font-medium">
                  Arraste e solte os cards de postagens ou use os botões direcionais de atalho para avançar/retroceder o fluxo de aprovação.
                </p>
              </div>
              <div className="text-[10px] text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-xl font-black uppercase tracking-wider">
                {realPosts.length} postagens ativas
              </div>
            </div>

            {/* Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
              {[
                { id: 'rascunho' as const, title: '1. Rascunhos', border: 'border-slate-200/80 bg-slate-50/50', text: 'text-slate-800', badge: 'bg-slate-100 text-slate-700' },
                { id: 'programado' as const, title: '2. Programados', border: 'border-blue-200/80 bg-blue-50/20', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700' },
                { id: 'feito' as const, title: '3. Posts Feitos', border: 'border-amber-200/80 bg-amber-50/20', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700' },
                { id: 'aprovado' as const, title: '4. Aprovados', border: 'border-purple-200/80 bg-purple-50/20', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' },
                { id: 'publicado' as const, title: '5. Publicados', border: 'border-emerald-200/80 bg-emerald-50/20', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' }
              ].map((column, colIndex, columnsArr) => {
                const columnPosts = realPosts.filter(p => p.status === column.id);

                return (
                  <div
                    key={column.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const idStr = e.dataTransfer.getData("text/plain");
                      if (!idStr) return;
                      const post = realPosts.find(p => p.id.toString() === idStr);
                      if (post && post.status !== column.id) {
                        await handleQuickStatusChange(post, column.id);
                      }
                    }}
                    className={`rounded-2xl border ${column.border} p-3 flex flex-col min-h-[480px] transition-all`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 shrink-0">
                      <span className={`font-black text-[11px] uppercase tracking-wider ${column.text}`}>
                        {column.title}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${column.badge}`}>
                        {columnPosts.length}
                      </span>
                    </div>

                    {/* Cards container */}
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-0.5 scrollbar-thin">
                      {columnPosts.length === 0 ? (
                        <div className="h-28 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 p-4 text-center">
                          <p className="text-[10px] font-bold">Sem postagens nesta fase</p>
                        </div>
                      ) : (
                        columnPosts.map(post => {
                          const matchingClient = clients.find(c => c.id.toString() === post.client_id?.toString());
                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", post.id.toString());
                              }}
                              className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-2 group hover:border-indigo-200 text-left"
                            >
                              {/* Top Row with Icon and Date */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  {getSocialIcon(post.social_network, 12)}
                                  <span className="text-[9px] font-black uppercase text-gray-400 truncate">
                                    {post.social_network}
                                  </span>
                                </div>
                                <span className="text-[9px] text-gray-500 font-mono font-bold bg-gray-50 px-1 rounded border border-gray-100 shrink-0">
                                  {new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                              </div>

                              {/* Title & Caption */}
                              <div>
                                <h5 className="font-extrabold text-gray-800 text-[11px] leading-snug line-clamp-2">
                                  {post.title}
                                </h5>
                                {post.caption && (
                                  <p className="text-[9px] text-gray-400 font-semibold line-clamp-1 mt-0.5">
                                    {post.caption}
                                  </p>
                                )}
                              </div>

                              {/* Metadata */}
                              <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-gray-50">
                                <span className="font-black text-indigo-700 truncate max-w-[80px]" title={matchingClient?.name || 'Geral'}>
                                  {matchingClient?.name || 'Livre / Geral'}
                                </span>
                                <span className="font-mono text-gray-400 font-bold flex items-center gap-0.5">
                                  <Clock size={9} />
                                  {post.scheduled_time || '12:00'}
                                </span>
                              </div>

                              {/* Quick Actions Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-1 shrink-0">
                                {/* Arrows for sliding */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={colIndex === 0}
                                    onClick={async () => {
                                      const prevStatus = columnsArr[colIndex - 1].id;
                                      await handleQuickStatusChange(post, prevStatus);
                                    }}
                                    className="p-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed border border-gray-100 transition active:scale-90"
                                    title="Mover anterior"
                                  >
                                    <ChevronLeft size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={colIndex === columnsArr.length - 1}
                                    onClick={async () => {
                                      const nextStatus = columnsArr[colIndex + 1].id;
                                      await handleQuickStatusChange(post, nextStatus);
                                    }}
                                    className="p-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed border border-gray-100 transition active:scale-90"
                                    title="Mover próximo"
                                  >
                                    <ChevronRight size={10} />
                                  </button>
                                </div>

                                {/* Edit / Delete */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPostModal(post)}
                                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded transition"
                                    title="Editar"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePost(post.id)}
                                    className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                    title="Excluir"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    )}

        {/* SUB TAB 2: CLIENTS */}
        {activeSubTab === 'clients' && (
          <motion.div
            key="clients"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Client metrics card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clientes Ativos</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{activeClientsCount}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Users size={20} /></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prospects / Leads</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{prospectClientsCount}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><Sparkles size={20} /></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recorrência Mensal Estimada</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    R$ {totalMonthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp size={20} /></div>
              </div>
            </div>

            {/* Clients Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="text-indigo-600" size={18} />
                  <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">Carteira de Clientes de Marketing</h3>
                </div>
                <button
                  onClick={() => handleOpenClientModal()}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm w-full sm:w-auto justify-center"
                >
                  <Plus size={14} /> Adicionar Cliente
                </button>
              </div>

              {clients.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-xs">Nenhum cliente cadastrado ainda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-5 py-3">Cliente / Empresa</th>
                        <th className="px-5 py-3">Telefone</th>
                        <th className="px-5 py-3">Contrato / Pacote</th>
                        <th className="px-5 py-3">Dias de Publicação</th>
                        <th className="px-5 py-3">Valor Mensal</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                      {clients.map(client => (
                        <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-extrabold text-gray-800">{client.name}</p>
                              {client.company && (
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{client.company}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-medium text-gray-600">
                            {client.phone || <span className="text-gray-300">Não informado</span>}
                          </td>
                          <td className="px-5 py-4 font-bold text-gray-700">
                            {client.plan_name || <span className="text-gray-300">Sem pacote</span>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {client.publication_days ? (
                                client.publication_days.split(',').map((day, dIdx) => (
                                  <span key={dIdx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-extrabold rounded-md uppercase">
                                    {day}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-300 italic text-xs">Todos os dias</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono font-extrabold text-gray-800">
                            R$ {Number(client.plan_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4">
                            {client.status === 'ativo' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">Ativo</span>
                            ) : client.status === 'prospect' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 uppercase">Prospect</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-800 uppercase">Inativo</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenClientModal(client)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(client.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SUB TAB 3: PAYMENTS */}
        {activeSubTab === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Quick cash stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 border border-gray-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Recebido</p>
                  <p className="text-lg font-black text-emerald-600 mt-1">R$ {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={18} /></div>
              </div>
              <div className="bg-white p-4 border border-gray-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pendente / A Receber</p>
                  <p className="text-lg font-black text-amber-600 mt-1">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock size={18} /></div>
              </div>
              <div className="bg-white p-4 border border-gray-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Atrasado / Pendente</p>
                  <p className="text-lg font-black text-rose-600 mt-1">R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle size={18} /></div>
              </div>
              <div className="bg-white p-4 border border-gray-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Lançamentos</p>
                  <p className="text-lg font-black text-indigo-700 mt-1">R$ {(totalCollected + totalPending + totalOverdue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><DollarSign size={18} /></div>
              </div>
            </div>

            {/* List and tools */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-indigo-600" size={18} />
                    <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">Mensalidades & Recebíveis</h3>
                  </div>
                  
                  {/* Search box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Pesquisar cliente ou referência..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs w-full sm:w-60 font-semibold"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPaymentModal()}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm w-full sm:w-auto justify-center"
                >
                  <Plus size={14} /> Novo Lançamento
                </button>
              </div>

              {filteredPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-xs">Nenhum lançamento financeiro encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-5 py-3">Cliente</th>
                        <th className="px-5 py-3">Referência / Mês</th>
                        <th className="px-5 py-3">Valor Cobrado</th>
                        <th className="px-5 py-3">Vencimento</th>
                        <th className="px-5 py-3">Recebido Em</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                      {filteredPayments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-extrabold text-gray-800">
                                {payment.marketing_clients?.name || 'Pagamento Avulso'}
                              </p>
                              {payment.marketing_clients?.company ? (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  {payment.marketing_clients?.company}
                                </p>
                              ) : (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider italic text-gray-400">
                                  Lançamento à Parte / Avulso
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-bold text-indigo-950 font-mono">
                            {payment.month_reference}
                          </td>
                          <td className="px-5 py-4 font-mono font-extrabold text-gray-800">
                            R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4 font-mono font-medium text-gray-600">
                            {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-5 py-4 font-mono font-medium text-emerald-700">
                            {payment.payment_date 
                              ? new Date(payment.payment_date).toLocaleDateString('pt-BR') 
                              : <span className="text-gray-300">Pendente</span>
                            }
                          </td>
                          <td className="px-5 py-4">
                            {getPaymentStatusBadge(payment.status)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => sendWhatsAppReminder(payment)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Enviar lembrete via WhatsApp"
                              >
                                <MessageSquare size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenPaymentModal(payment)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SUB TAB 4: REPORTS GENERATOR */}
        {activeSubTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SECTION A: WEEKLY PLANNER */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Sparkles className="text-indigo-600" size={18} />
                  <h3 className="font-extrabold text-gray-800 uppercase tracking-wide text-xs">1. Emissor de Cronograma Semanal (PDF)</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Cliente Atendido</label>
                    <select
                      value={reportClient}
                      onChange={(e) => setReportClient(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company || 'Empresa'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Segunda-feira de Início</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Display client's standard publication days */}
                {selectedClientDetails && (
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-800 text-xs">
                    <span className="font-bold">Dias habituais de publicação:</span>{' '}
                    <span className="font-extrabold uppercase text-indigo-900">
                      {selectedClientDetails.publication_days || "Todos os dias"}
                    </span>
                  </div>
                )}

                {/* Days form builder */}
                <div className="space-y-4 border-t border-gray-100 pt-4 max-h-[350px] overflow-y-auto pr-1">
                  {daysOfWeekLabels.map(day => {
                    const item = weeklyPlannerItems[day.num];
                    return (
                      <div key={day.num} className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-indigo-950">{day.name}</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 cursor-pointer">
                              <input 
                                type="radio" 
                                checked={item.isCustom} 
                                onChange={() => handleWeeklyItemChange(day.num, 'isCustom', true)}
                              />
                              Digitar Tema
                            </label>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 cursor-pointer">
                              <input 
                                type="radio" 
                                checked={!item.isCustom} 
                                disabled={clientDraftPosts.length === 0}
                                onChange={() => handleWeeklyItemChange(day.num, 'isCustom', false)}
                              />
                              Buscar Rascunho ({clientDraftPosts.length})
                            </label>
                          </div>
                        </div>

                        {item.isCustom ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Título do Tema ou Assunto..."
                              value={item.customTheme}
                              onChange={(e) => handleWeeklyItemChange(day.num, 'customTheme', e.target.value)}
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <textarea
                              placeholder="Legenda / Observação / Ideia do Post..."
                              rows={2}
                              value={item.caption}
                              onChange={(e) => handleWeeklyItemChange(day.num, 'caption', e.target.value)}
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={item.social_network}
                                onChange={(e) => handleWeeklyItemChange(day.num, 'social_network', e.target.value)}
                                className="p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                              >
                                <option value="instagram">Instagram</option>
                                <option value="facebook">Facebook</option>
                                <option value="youtube">YouTube</option>
                                <option value="tiktok">TikTok</option>
                                <option value="other">Outra</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <select
                              value={item.postId}
                              onChange={(e) => handleWeeklyItemChange(day.num, 'postId', e.target.value)}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                            >
                              <option value="">-- Selecionar Post em Rascunho --</option>
                              {clientDraftPosts.map(p => (
                                <option key={p.id} value={p.id}>[{p.social_network.toUpperCase()}] {p.title}</option>
                              ))}
                            </select>
                            
                            {item.postId && (
                              <div className="mt-2 p-2 bg-white rounded border border-gray-100 text-[11px] text-gray-500 line-clamp-2 italic">
                                Legenda: {item.caption || '(Sem legenda)'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handlePrintWeeklyAndSave}
                    disabled={!reportClient || isSavingWeekly}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-[10px] sm:text-xs tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
                    title="Salva todos os temas no Kanban e gera o relatório em PDF"
                  >
                    <Printer size={16} /> Salvar & Gerar PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveWeeklyToKanban(false)}
                    disabled={!reportClient || isSavingWeekly}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-[10px] sm:text-xs tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
                    title="Apenas salva as postagens e temas diretamente no fluxo Kanban"
                  >
                    {isSavingWeekly ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Layers size={16} />
                    )}
                    Salvar no Kanban
                  </button>
                </div>
              </div>

              {/* SECTION B: MONTHLY REPORT */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Layers className="text-indigo-600" size={18} />
                    <h3 className="font-extrabold text-gray-800 uppercase tracking-wide text-xs">2. Relatório de Postagens Mensal (PDF)</h3>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div>
                      <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Cliente</label>
                      <select
                        value={monthlyReportClient}
                        onChange={(e) => setMonthlyReportClient(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                      >
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Mês</label>
                        <select
                          value={monthlyReportMonth}
                          onChange={(e) => setMonthlyReportMonth(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                        >
                          {monthNames.map((m, idx) => (
                            <option key={idx} value={idx}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Ano</label>
                        <select
                          value={monthlyReportYear}
                          onChange={(e) => setMonthlyReportYear(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                        >
                          <option value={2026}>2026</option>
                          <option value={2025}>2025</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Summary of what will be printed */}
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                    <h4 className="font-extrabold text-[10px] uppercase text-gray-400 tracking-wider">Posts Encontrados no Período</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-gray-400 font-bold">Total Encontrado</span>
                        <p className="text-base font-black text-indigo-950 mt-0.5">{monthlyMetrics.total}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-emerald-500 font-bold">Publicados</span>
                        <p className="text-base font-black text-emerald-600 mt-0.5">{monthlyMetrics.published}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-indigo-500 font-bold">Aprovados</span>
                        <p className="text-base font-black text-indigo-600 mt-0.5">{monthlyMetrics.approved}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-amber-500 font-bold">Feito / Em Produção</span>
                        <p className="text-base font-black text-amber-600 mt-0.5">{monthlyMetrics.inProd}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePrintMonthlyReport}
                  disabled={!monthlyReportClient || monthlyMetrics.total === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Printer size={16} /> Gerar PDF do Relatório Mensal
                </button>
              </div>

              {/* SECTION C: WEEKLY MULTI-CLIENT STATUS REPORT */}
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Layers className="text-indigo-600" size={18} />
                  <h3 className="font-extrabold text-gray-800 uppercase tracking-wide text-xs">3. Relatório Semanal Multicliente por Status (PDF)</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Escolha a Segunda-feira da Semana</label>
                    <input
                      type="date"
                      value={weeklyStatusReportStartDate}
                      onChange={(e) => setWeeklyStatusReportStartDate(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-xs font-bold"
                    />
                  </div>
                  
                  <button
                    onClick={handlePrintWeeklyStatusReport}
                    disabled={weeklyStatusReportPosts.length === 0}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Printer size={16} /> Gerar Relatório Semanal Multicliente
                  </button>
                </div>

                {/* Live Preview Metrics for Chosen Week */}
                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-[10px] uppercase text-gray-400 tracking-wider">Posts da Semana Selecionada</h4>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {weeklyStatusMetrics.uniqueClientsCount} {weeklyStatusMetrics.uniqueClientsCount === 1 ? 'cliente' : 'clientes'} com atividade
                    </span>
                  </div>
                  
                  {weeklyStatusReportPosts.length === 0 ? (
                    <p className="text-xs text-gray-500 italic text-center py-2">Nenhuma postagem cadastrada para o período selecionado.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-gray-400 font-bold">Total Posts</span>
                        <p className="text-sm font-black text-indigo-950 mt-0.5">{weeklyStatusMetrics.total}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-gray-400 font-bold">Rascunhos</span>
                        <p className="text-sm font-black text-gray-600 mt-0.5">{weeklyStatusMetrics.drafts}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-blue-500 font-bold">Programados</span>
                        <p className="text-sm font-black text-blue-600 mt-0.5">{weeklyStatusMetrics.scheduled}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-amber-500 font-bold">Em Produção</span>
                        <p className="text-sm font-black text-amber-600 mt-0.5">{weeklyStatusMetrics.inProd}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-indigo-500 font-bold">Aprovados</span>
                        <p className="text-sm font-black text-indigo-600 mt-0.5">{weeklyStatusMetrics.approved}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200/50">
                        <span className="text-emerald-500 font-bold">Publicados</span>
                        <p className="text-sm font-black text-emerald-600 mt-0.5">{weeklyStatusMetrics.published}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* MODAL: ADD/EDIT CLIENT */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                {editingClient ? 'Editar Cadastro de Cliente' : 'Adicionar Novo Cliente'}
              </h3>
              <button 
                onClick={() => setIsClientModalOpen(false)} 
                className="text-white hover:opacity-80 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-lg"
              >
                Voltar
              </button>
            </div>
            
            <form onSubmit={handleSaveClient} className="p-6 space-y-4 text-xs sm:text-sm max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Empresa / Marca</label>
                  <input
                    type="text"
                    value={clientForm.company}
                    onChange={(e) => setClientForm(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Status na Agência</label>
                  <select
                    value={clientForm.status}
                    onChange={(e) => setClientForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="mensalista">Mensalista</option>
                    <option value="semanal">Semanal</option>
                    <option value="anúncio">Anúncio</option>
                    <option value="encerrado">Encerrado</option>
                    <option value="ativo">Ativo</option>
                    <option value="prospect">Prospect</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Nome do Pacote contratado</label>
                  <input
                    type="text"
                    value={clientForm.plan_name}
                    onChange={(e) => setClientForm(prev => ({ ...prev, plan_name: e.target.value }))}
                    placeholder="Ex: Combo 12 Posts/Mês"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Valor da Mensalidade (R$)</label>
                  <input
                    type="number"
                    value={clientForm.plan_value}
                    onChange={(e) => setClientForm(prev => ({ ...prev, plan_value: e.target.value }))}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Dias de Publicação Checkboxes */}
              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-2">Dias habituais de publicação</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleTogglePublicationDay(day)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                        clientForm.publication_days.includes(day)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD/EDIT POST */}
      {isPostModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                {editingPost ? 'Editar Postagem' : 'Programar Nova Postagem'}
              </h3>
              <button 
                onClick={() => setIsPostModalOpen(false)} 
                className="text-white hover:opacity-80 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-lg"
              >
                Voltar
              </button>
            </div>
            
            <form onSubmit={handleSavePost} className="p-6 space-y-4 text-xs sm:text-sm max-h-[500px] overflow-y-auto">
              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Título do Post / Tema *</label>
                <input
                  type="text"
                  required
                  value={postForm.title}
                  onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Post Carrossel sobre Vendas"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Cliente Vinculado</label>
                  <select
                    value={postForm.client_id}
                    onChange={(e) => setPostForm(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="">-- Tema Livre (Sem Cliente) --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Rede Social Principal</label>
                  <select
                    value={postForm.social_network}
                    onChange={(e) => setPostForm(prev => ({ ...prev, social_network: e.target.value as any }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="other">Outra / Geral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Data Programada</label>
                  <input
                    type="date"
                    required
                    value={postForm.scheduled_date}
                    onChange={(e) => setPostForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Horário (Opcional)</label>
                  <input
                    type="text"
                    value={postForm.scheduled_time}
                    placeholder="12:00"
                    onChange={(e) => setPostForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold"
                  />
                </div>
              </div>

              {holidayOnSelectedDate && !isHolidayForm && (
                <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded-full mb-1">
                      💡 Sugestão de Tema
                    </span>
                    <h5 className="font-bold text-gray-800 text-xs sm:text-sm">
                      {holidayOnSelectedDate.caption === '[FERIADO]' ? '🚩 Feriado' : '🎉 Data Comemorativa'}: {holidayOnSelectedDate.title}
                    </h5>
                    <p className="text-[10px] text-gray-500 font-medium">
                      Esta data especial está ativa. Deseja usar como tema do post?
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPostForm(prev => ({
                      ...prev,
                      title: `Especial: ${holidayOnSelectedDate.title}`,
                      caption: `Postagem especial em comemoração ao ${holidayOnSelectedDate.title}.`
                    }))}
                    className="self-stretch sm:self-auto px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition shadow-md whitespace-nowrap active:scale-95"
                  >
                    Usar Tema
                  </button>
                </div>
              )}

              {/* Workflow Status Picker */}
              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1.5">Fluxo de Aprovação / Status</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'rascunho', label: '1. Rascunho / Tema' },
                    { id: 'programado', label: '2. Programado' },
                    { id: 'feito', label: '3. Post Feito / Produção' },
                    { id: 'aprovado', label: '4. Aprovado pelo Cliente' },
                    { id: 'publicado', label: '5. Publicado' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPostForm(prev => ({ ...prev, status: item.id as any }))}
                      className={`p-2.5 rounded-xl text-left text-xs font-bold transition-all border flex items-center justify-between ${
                        postForm.status === item.id 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span>{item.label}</span>
                      {postForm.status === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Legenda / Texto do Post</label>
                <textarea
                  rows={4}
                  value={postForm.caption}
                  onChange={(e) => setPostForm(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Insira as hashtags, CTAs e texto do post..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* File Upload Section - Handles up to 50MB */}
              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Mídia do Post / Arquivo (Max 50MB)</label>
                <div 
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/10 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                >
                  <FileUp className="text-gray-400" size={24} />
                  <div className="text-xs">
                    <span className="font-extrabold text-indigo-600 hover:underline">Clique para carregar</span> ou arraste o arquivo aqui
                  </div>
                  <span className="text-[10px] text-gray-400">Imagens, vídeos, PSDs, PDFs de até 50MB</span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden" 
                />

                {isUploading && (
                  <div className="mt-2 p-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold animate-pulse flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    {uploadProgress}
                  </div>
                )}

                {uploadError && (
                  <div className="mt-2 p-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={14} />
                    {uploadError}
                  </div>
                )}

                {postForm.attachment_url && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="text-emerald-500 flex-shrink-0" size={16} />
                      <span className="truncate font-bold">Arquivo anexado com sucesso!</span>
                    </div>
                    <a 
                      href={postForm.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-600 font-extrabold hover:underline whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                    >
                      Visualizar
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                >
                  Salvar Programação
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD/EDIT PAYMENT */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                {editingPayment ? 'Editar Lançamento' : 'Lançar Nova Mensalidade'}
              </h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="text-white hover:opacity-80 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-lg"
              >
                Voltar
              </button>
            </div>
            
            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Cliente Solicitante</label>
                <select
                  value={paymentForm.client_id}
                  onChange={(e) => handlePaymentClientChange(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="">-- Pagamento Avulso (Sem Cliente Vinculado) --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    {paymentForm.client_id ? 'Mês de Referência *' : 'Descrição / Referência *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={paymentForm.client_id ? 'MM/AAAA' : 'Ex: Criação de Logo / Avulso'}
                    value={paymentForm.month_reference}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, month_reference: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Valor Cobrado (R$) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.due_date}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Data de Pagamento</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-extrabold uppercase text-[10px] tracking-wider mb-1">Status do Recebimento</label>
                <select
                  value={paymentForm.status}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="pendente">Pendente / Aguardando</option>
                  <option value="pago">Pago / Confirmado</option>
                  <option value="atrasado">Atrasado / Cobrança Enviada</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
