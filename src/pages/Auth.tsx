import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Field, TextInput, SecondaryButton } from '../components/ui';

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0F172A] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-headline font-bold text-[#F1F5F9]">{title}</h1>
          <p className="mt-2 text-body text-[#94A3B8]">{subtitle}</p>
        </div>
        <div className="surface-card p-6 glow-green">{children}</div>
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </main>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    else navigate('/');
    setLoading(false);
  };

  return (
    <AuthShell
      title="Masuk ke Paham AI"
      subtitle="Masukkan email & password akun Anda."
      footer={
        <p className="text-center text-sm text-[#94A3B8]">
          Belum punya akun?{' '}
          <Link to="/daftar" className="text-[#4ADE80] underline">
            Daftar
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <TextInput type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <TextInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-sm text-[#F87171]">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Memproses...' : 'Masuk'}
        </Button>
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
        {error && <p className="text-sm text-[#F87171]">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Mendaftarkan...' : 'Daftar'}
        </Button>
      </form>
    </AuthShell>
  );
}