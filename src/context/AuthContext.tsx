import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { UserRole } from '../types';

interface AuthValue {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

async function fetchRole(userId: string): Promise<UserRole | null> {
  // Coba ambil dari tabel user_roles
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (!error && data) {
    const r = (data as { role: string }).role;
    if (r === 'admin' || r === 'instruktur' || r === 'peserta' || r === 'parent' || r === 'marketing') return r as UserRole;
  }
  // Fallback ke JWT metadata (raw_user_meta_data)
  try {
    const { data: auth } = await supabase.auth.getUser();
    const metaRole = auth.user?.user_metadata?.role;
    if (metaRole === 'admin' || metaRole === 'instruktur' || metaRole === 'peserta' || metaRole === 'parent' || metaRole === 'marketing') return metaRole as UserRole;
  } catch { /* ignore */ }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        setRole(await fetchRole(data.session.user.id));
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setRole(await fetchRole(sess.user.id));
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!email || !password) return { error: 'Email dan password wajib diisi' };
    if (password.length < 8) return { error: 'Password minimal 8 karakter' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'peserta' } },
    });
    return { error: error ? error.message : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
