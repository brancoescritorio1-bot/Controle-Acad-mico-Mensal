import React, { useState, useEffect } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { Login } from './components/Login';
import MainApp from './MainApp';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseConfig, setSupabaseConfig] = useState<{ supabaseUrl: string, supabaseKey: string } | null>(null);

  useEffect(() => {
    let subscription: any = null;

    async function initAuth() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        
        const config = await res.json();
        setSupabaseConfig(config);

        const supabase = createClient(config.supabaseUrl, config.supabaseKey);
        
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        });
        subscription = data.subscription;

      } catch (error) {
        console.error('Failed to init auth:', error);
      } finally {
        setAuthLoading(false);
      }
    }
    
    initAuth();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session && supabaseConfig) {
    return (
      <Login 
        supabaseUrl={supabaseConfig.supabaseUrl} 
        supabaseKey={supabaseConfig.supabaseKey} 
        onLoginSuccess={() => {}} 
      />
    );
  }

  const handleLogout = async () => {
    if (supabaseConfig) {
      const supabase = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseKey);
      await supabase.auth.signOut();
      setSession(null);
    }
  };

  return <MainApp onLogout={handleLogout} session={session} />;
}
