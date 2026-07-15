import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';
import { DashboardData } from '../types';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
  action_url?: string;
  unique_key?: string;
}

export const createNotification = async (
  supabase: any,
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info',
  actionUrl?: string,
  uniqueKey?: string
) => {
  if (uniqueKey) {
    const { data: existing } = await supabase.from('notifications')
       .select('id')
       .eq('user_id', userId)
       .eq('unique_key', uniqueKey)
       .limit(1);
    if (existing && existing.length > 0) return { error: { message: 'Already exists' } };
  }
  return await supabase.from('notifications').insert([{
    user_id: userId,
    title,
    message,
    type,
    ...(actionUrl ? { action_url: actionUrl } : {}),
    ...(uniqueKey ? { unique_key: uniqueKey } : {})
  }]);
};

export function NotificationCenter({ supabase, user, dashboardData, onNavigate }: { supabase: any, user: any, dashboardData?: DashboardData[], onNavigate?: (module: string, tab: string) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasFetched, setHasFetched] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  const triggerBrowserNotification = (title: string, body: string, key?: string) => {
    if (key) {
      if (notifiedKeysRef.current.has(key)) return;
      notifiedKeysRef.current.add(key);
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new window.Notification(title, {
          body,
          icon: '/icon.svg',
        });
      } catch (e) {
        console.error('Error triggering browser notification:', e);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      // Subscribe to changes
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            fetchNotifications();
            if (payload.eventType === 'INSERT' && payload.new) {
              triggerBrowserNotification(payload.new.title, payload.new.message, payload.new.unique_key || payload.new.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (!dashboardData || !user || !hasFetched) return;

    const processDeadline = async (subject: string, taskName: string, deadlineStr: string, actionUrl?: string) => {
      let deadline: Date;
      if (deadlineStr.includes('/')) {
        const parts = deadlineStr.split('/');
        if (parts.length !== 3) return;
        deadline = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 23, 59, 59);
      } else if (deadlineStr.includes('-')) {
        const parts = deadlineStr.split('-');
        if (parts.length !== 3) return;
        deadline = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59);
      } else {
        return;
      }
      
      const diffTime = deadline.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let message = '';
      let type: 'warning' | 'error' = 'warning';
      
      const title = `Prazo: ${subject}`;
      
      if (diffDays < 0) {
        message = `A ${taskName} de ${subject} está ATRASADA (${Math.abs(diffDays)} dias).`;
        type = 'error';
      } else if (diffDays <= 3) {
        message = `A ${taskName} de ${subject} vence em ${diffDays} dia(s).`;
        type = 'warning';
      } else {
        return; 
      }

      const uniqueKey = `deadline_${subject}_${taskName}_${deadlineStr}_${diffDays <= 0 ? 'overdue' : 'warn'}`.replace(/\s+/g, '_');

      // Evita duplicatas verificando a mensagem exata localmente
      const exists = notifications.some(n => n.unique_key === uniqueKey);
      if (!exists) {
        // Trigger browser notification instantly
        triggerBrowserNotification(title, message, uniqueKey);

        // Tentative optimistic local state to avoid race condition of multiple inserts
        setNotifications(prev => [{
           id: Math.random().toString(), 
           title, 
           message, 
           type, 
           is_read: false, 
           created_at: new Date().toISOString(),
           unique_key: uniqueKey,
           action_url: actionUrl
        }, ...prev]);
        
        await createNotification(supabase, user.id, title, message, type, actionUrl, uniqueKey);
      }
    };

    const checkDeadlines = async () => {
      // Academic/Custom defined Deadlines
      for (const item of dashboardData) {
        if (item.act1_deadline && item.act1_status !== 'Concluída') {
          await processDeadline(item.subject_name, 'Atividade 1', item.act1_deadline, 'academic:activities');
        }
        if (item.act2_deadline && item.act2_status !== 'Concluída') {
          await processDeadline(item.subject_name, 'Atividade 2', item.act2_deadline, 'academic:activities');
        }
        if (item.exam_date && (item.exam_grade === null || item.exam_grade === 0)) {
          await processDeadline(item.subject_name, 'Prova', item.exam_date, 'academic:activities');
        }
      }

      // Financial Transactions
      try {
        const { data: finData } = await supabase
          .from('financial_transactions')
          .select('id, description, type, due_date, status')
          .eq('status', 'pendente')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(100);

        if (finData) {
          for (const tx of finData) {
            await processDeadline(tx.description, tx.type === 'receita' ? 'Receita' : 'Despesa', tx.due_date, 'financial:fin_transactions');
          }
        }
      } catch (err) {
         console.error('Error checking financial deadlines:', err);
      }

      // Fixed Bills
      try {
        const { data: fixedBillsData } = await supabase
          .from('fixed_bill_payments')
          .select('id, due_date, status, bill:fixed_bills(name)')
          .in('status', ['Pendente', 'Vencida'])
          .order('due_date', { ascending: true })
          .limit(100);

        if (fixedBillsData) {
          for (const fbp of fixedBillsData) {
             if (fbp.bill && fbp.bill.name) {
                await processDeadline(fbp.bill.name, 'Conta Fixa', fbp.due_date, 'financial:fin_fixed_bills');
             }
          }
        }
      } catch (err) {
         console.error('Error checking fixed bills deadlines:', err);
      }

      // Marketing Payments
      try {
        const { data: marketingPaymentsData } = await supabase
          .from('marketing_payments')
          .select('id, due_date, status, client:marketing_clients(name)')
          .eq('status', 'pendente')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(100);

        if (marketingPaymentsData) {
          for (const mp of marketingPaymentsData) {
             if (mp.client && mp.client.name) {
                await processDeadline(mp.client.name, 'Mensalidade Marketing', mp.due_date, 'marketing:marketing_payments');
             }
          }
        }
      } catch (err) {
         console.error('Error checking marketing deadlines:', err);
      }
    };

    checkDeadlines();
  }, [dashboardData, user, hasFetched]); // intentionally omitted 'notifications' so it runs once when dashboardData or user changes, or once fetched

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setHasFetched(true);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (err) {
      console.error('Error marking as read:', err);
      fetchNotifications(); // revert on error
    }
  };

  const markAllAsRead = async () => {
    try {
      if (unreadCount === 0) return;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    } catch (err) {
      console.error('Error marking all as read:', err);
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await supabase.from('notifications').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting notification:', err);
      fetchNotifications();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'success': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={18} className="text-rose-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="relative" ref={drawerRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-gray-500 hover:text-indigo-600 transition-colors relative"
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Drawer/Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Notificações
                {unreadCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs py-0.5 px-2 rounded-full">
                    {unreadCount} novas
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    Marcar todas lidas
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Bell size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Nenhuma notificação</p>
                  <p className="text-gray-400 text-xs mt-1">Você está em dia com seus avisos.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        if (!notif.is_read) markAsRead(notif.id);
                        if (notif.action_url && onNavigate) {
                          const [mod, tab] = notif.action_url.split(':');
                          if (mod && tab) onNavigate(mod, tab);
                          setIsOpen(false);
                        }
                      }}
                      className={cn(
                        "p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors relative group cursor-pointer",
                        !notif.is_read ? "bg-indigo-50/30" : ""
                      )}
                    >
                      {!notif.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                      )}
                      
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn("text-sm tracking-tight", !notif.is_read ? "font-bold text-gray-900" : "font-semibold text-gray-700")}>
                            {notif.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-gray-400 font-medium block mt-2">
                            {formatDate(notif.created_at)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.is_read && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Marcar como lida"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => deleteNotification(notif.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
               <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                 <p className="text-xs text-gray-400">As notificações são baseadas em suas atividades recentes.</p>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
