import React, { useState, useEffect } from 'react';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { Login } from './components/Login';
import MainApp from './MainApp';
import { Download, AlertTriangle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseConfig, setSupabaseConfig] = useState<{ supabaseUrl: string, supabaseKey: string } | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch configuration from server');
        
        const config = await res.json();
        if (!config.supabaseUrl || !config.supabaseKey) {
          throw new Error('Supabase configuration is missing on server');
        }
        setSupabaseConfig(config);
        setSupabaseClient(createClient(config.supabaseUrl, config.supabaseKey));
      } catch (error: any) {
        console.error('Failed to fetch config:', error);
        setConfigError(error.message || 'Erro ao carregar configuração');
        setAuthLoading(false);
      }
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  useEffect(() => {
    if (!supabaseClient) return;

    let subscription: any = null;

    async function initSession() {
      try {
        const { data: { session }, error } = await supabaseClient!.auth.getSession();
        
        if (error) {
          console.error('Session error:', error.message);
          setSession(null);
          // If refresh token is invalid, clear local storage manually to prevent infinite loop
          const errorMsg = (error.message || '').toLowerCase();
          if (errorMsg.includes('refresh token') || errorMsg.includes('refresh_token')) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            window.location.reload();
            return;
          }
          await supabaseClient!.auth.signOut().catch(() => {});
        } else {
          setSession(session);
        }

        const { data: { subscription: authSubscription } } = supabaseClient!.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event);
          if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED' || event === 'TOKEN_REFRESHED' && !session) {
            setSession(null);
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
          } else {
            setSession(session);
          }
        });
        
        subscription = authSubscription;
      } catch (error: any) {
        console.error('Failed to init session:', error);
        setSession(null);
        const errorMsg = (error?.message || '').toLowerCase();
        if (errorMsg.includes('refresh token') || errorMsg.includes('refresh_token')) {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          window.location.reload();
          return;
        }
        await supabaseClient!.auth.signOut().catch(() => {});
      } finally {
        setAuthLoading(false);
      }
    }

    initSession();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [supabaseClient]);

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro de Configuração</h2>
          <p className="text-gray-600 mb-6">{configError}</p>
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl text-left font-mono">
            Verifique se as variáveis de ambiente SUPABASE_URL e SUPABASE_KEY estão configuradas no servidor.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session && supabaseClient) {
    return (
      <Login 
        supabaseClient={supabaseClient}
        onLoginSuccess={() => {}} 
      />
    );
  }

  const handleLogout = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
      setSession(null);
    }
  };

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-[9999] font-medium shadow-md">
          Você está offline
        </div>
      )}
      <MainApp onLogout={handleLogout} session={session} supabaseClient={supabaseClient} />
      {deferredPrompt && (
        <button 
          onClick={handleInstall}
          className="fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition"
          title="Instalar App"
        >
          <Download size={20} />
          Instalar
        </button>
      )}
    </>
  );
}
