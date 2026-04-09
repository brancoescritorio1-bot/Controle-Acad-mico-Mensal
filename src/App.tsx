import React, { useState, useEffect } from 'react';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { Login } from './components/Login';
import MainApp from './MainApp';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseConfig, setSupabaseConfig] = useState<{ supabaseUrl: string, supabaseKey: string } | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    async function initSupabase() {
      // 1. Try Vite environment variables first (Best for Vercel)
      const envUrl = import.meta.env.VITE_SUPABASE_URL;
      const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (envUrl && envKey) {
        console.log('Using Supabase config from environment variables');
        setSupabaseConfig({ supabaseUrl: envUrl, supabaseKey: envKey });
        setSupabaseClient(createClient(envUrl, envKey));
        return;
      }

      // 2. Fallback to backend API (Best for local/AI Studio)
      try {
        console.log('Fetching Supabase config from backend...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const res = await fetch('/api/config', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const config = await res.json();
        setSupabaseConfig(config);
        setSupabaseClient(createClient(config.supabaseUrl, config.supabaseKey));
      } catch (error) {
        console.error('Failed to initialize Supabase from backend:', error);
        
        // 3. Ultimate Fallback (Hardcoded values to guarantee it works on Vercel even without env vars)
        console.log('Using hardcoded fallback Supabase config');
        const fallbackUrl = "https://gymxdeijrgorugqqiteh.supabase.co";
        const fallbackKey = "sb_secret_IsUaKY6lLQP6OSb8bEfKKw_XjzvVjp-";
        
        setSupabaseConfig({ supabaseUrl: fallbackUrl, supabaseKey: fallbackKey });
        setSupabaseClient(createClient(fallbackUrl, fallbackKey));
        setAuthLoading(false);
      }
    }
    initSupabase();
  }, []);

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
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
          }
          await supabaseClient!.auth.signOut().catch(() => {});
        } else {
          setSession(session);
        }

        const { data: { subscription: authSubscription } } = supabaseClient!.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
            setSession(null);
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
          } else {
            setSession(session);
          }
        });
        
        subscription = authSubscription;
      } catch (error: any) {
        console.error('Failed to init session:', error);
        setSession(null);
        if (error?.message?.includes('Refresh Token Not Found') || error?.message?.includes('Invalid Refresh Token')) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!supabaseClient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro de Conexão</h2>
          <p className="text-gray-600 mb-6">
            Não foi possível conectar ao servidor. Se você publicou este app no Vercel, certifique-se de configurar as variáveis de ambiente <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">VITE_SUPABASE_URL</code> e <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">VITE_SUPABASE_ANON_KEY</code> no painel do Vercel.
          </p>
          <p className="text-sm text-gray-500">
            Além disso, como este app possui um backend (Express), ele requer configurações adicionais (vercel.json) para funcionar corretamente no Vercel.
          </p>
        </div>
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

  return <MainApp onLogout={handleLogout} session={session} supabaseClient={supabaseClient} />;
}
