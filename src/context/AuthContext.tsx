import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function fetchRole(userId: string): Promise<UserRole | null> {
  // Timeout 8 detik: lookup role tidak boleh menggantung loading auth selamanya.
  // Kalau timeout / tabel belum ada / RLS menolak → fallback metadata → null.
  try {
    const data = await withTimeout(
      (async () => {
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
        return null;
      })(),
      8000,
    );
    if (data) return data;
  } catch { /* timeout / network → lanjut ke fallback */ }
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

  // getSession + onAuthStateChange + TOKEN_REFRESHED bisa memicu berkali-kali
  // untuk user yang sama. Cache promise agar lookup role hanya 1x per user.
  const roleCache = useRef<{ userId: string; promise: Promise<UserRole | null> } | null>(null);
  const fetchRoleOnce = (userId: string): Promise<UserRole | null> => {
    if (roleCache.current?.userId === userId) return roleCache.current.promise;
    const promise = fetchRole(userId);
    roleCache.current = { userId, promise };
    return promise;
  };

  useEffect(() => {
    let alive = true;
    // Safety net: auth tidak boleh loading lebih dari 6 detik apa pun yang terjadi.
    const safety = window.setTimeout(() => {
      if (alive) setLoading(false);
    }, 6000);

    const resolveSession = (sess: Session | null) => {
      if (!alive) return;
      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user) {
        roleCache.current = null;
        setRole(null);
      } else {
        // Role dari metadata dipakai duluan supaya UI tidak perlu menunggu query.
        const m = (sess.user.user_metadata as Record<string, unknown> | undefined)?.role;
        const syncRole =
          m === 'admin' || m === 'instruktur' || m === 'peserta' || m === 'parent' || m === 'marketing'
            ? (m as UserRole)
            : null;
        if (syncRole) setRole(syncRole);
        // Upgrade dari tabel user_roles di latar; tidak memblokir render.
        void fetchRoleOnce(sess.user.id)
          .then((r) => {
            if (alive && r) setRole(r);
          })
          .catch(() => {});
      }

      // Melepas loading secepatnya: tidak menunggu jaringan apa pun.
      setLoading(false);
      window.clearTimeout(safety);
    };

    supabase.auth.getSession().then(
      ({ data }) => resolveSession(data.session),
      () => resolveSession(null),
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      resolveSession(sess);
    });    return () => {
      alive = false;
      window.clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
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
