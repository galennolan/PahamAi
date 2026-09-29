import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Field, TextInput, PasswordInput, SecondaryButton } from '../components/ui';

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-headline font-bold text-fg">{title}</h1>
          <p className="mt-2 text-body text-fg-muted">{subtitle}</p>
        </div>
        <div className="surface-card p-6 glow-green">{children}</div>
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </main>
  );
}

function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'Email atau password salah. Periksa kembali email Anda, atau hubungi admin jika lupa password.';
  }
  if (m.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Cek inbox Anda atau hubungi admin.';
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  }
  if (m.includes('user not found')) {
    return 'Email tidak terdaftar. Pastikan email benar atau daftar akun baru.';
  }
  if (m.includes('database error')) {
    return 'Server auth sedang bermasalah. Coba lagi beberapa saat, atau hubungi admin.';
  }
  return msg;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get('role');

  const roleLabel = presetRole === 'tutor' ? 'Tutor / Instruktur' : presetRole === 'peserta' ? 'Peserta' : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setError(mapAuthError(error));
      } else {
        navigate('/app');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Periksa koneksi lalu coba lagi.');
    }
    setLoading(false);
  };

  return (
    <AuthShell
      title={roleLabel ? `Masuk sebagai ${roleLabel}` : 'Masuk ke Paham AI'}
      subtitle="Masukkan email & password akun Anda."
      footer={
        <p className="text-center text-sm text-fg-muted">
          Belum punya akun?{' '}
          <Link to="/daftar" className="text-primary-text underline">
            Daftar
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {roleLabel && (
          <div className="rounded-[8px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary-text">
            Anda masuk sebagai <strong>{roleLabel}</strong>
          </div>
        )}
        <Field label="Email">
          <TextInput type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <PasswordInput placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Memproses...' : 'Masuk'}
        </Button>
        {roleLabel && (
          <button type="button" onClick={() => navigate('/masuk')} className="w-full text-center text-xs text-fg-subtle hover:text-primary-text">
            Masuk sebagai role lain
          </button>
        )}
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password);
    if (error) setError(error);
    else navigate('/masuk');
    setLoading(false);
  };

  return (
    <AuthShell
      title="Daftar Paham AI"
      subtitle="Akun dibuat oleh Admin. Jika belum diverifikasi, hubungi instruktur."
      footer={
        <div className="text-center">
          <SecondaryButton onClick={() => navigate('/masuk')} className="w-full">
            Sudah punya akun? Masuk
          </SecondaryButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <TextInput type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" hint="Minimal 8 karakter.">
          <TextInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Mendaftarkan...' : 'Daftar'}
        </Button>
      </form>
    </AuthShell>
  );
}