import React, { useState, useEffect } from 'react';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { Login } from './components/Login';
import MainApp from './MainApp';

// Hardcoded fallback values to guarantee it works on Vercel
const FALLBACK_URL = "https://gymxdeijrgorugqqiteh.supabase.co";
const FALLBACK_KEY = "sb_secret_IsUaKY6lLQP6OSb8bEfKKw_XjzvVjp-";

// Initialize synchronously
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseClient] = useState<SupabaseClient>(supabase);

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
