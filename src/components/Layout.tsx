import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import { Button } from './ui';

const navLinkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-[4px] px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-[#4ADE80] text-[#0F172A]' : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F1F5F9]'}`;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/masuk');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]">
      <header className="sticky top-0 z-40 border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-headline font-bold tracking-tight text-[#4ADE80]">
            Paham AI
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            <NavLink to="/" className={navLinkCls}>
              Beranda
            </NavLink>
            <NavLink to="/modul" className={navLinkCls}>
              Modul
            </NavLink>
            {(role === 'admin' || role === 'instruktur') && (
              <NavLink to="/absensi" className={navLinkCls}>
                Absensi
              </NavLink>
            )}
            {role === 'admin' && (
              <NavLink to="/pendaftar" className={navLinkCls}>
                Pendaftar
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {role && (
              <span className="hidden rounded-full bg-[#1E293B] border border-[#334155] px-2 py-0.5 text-xs font-medium text-[#4ADE80] sm:block">
                {ROLE_LABELS[role]}
              </span>
            )}
            <span className="hidden max-w-40 truncate text-xs text-[#64748B] sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}