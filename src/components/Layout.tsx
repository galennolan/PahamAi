import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS } from '../types';
import { Button } from './ui';
import {
  Home,
  BookOpen,
  BarChart2,
  BarChart3,
  Award,
  User,
  ClipboardList,
  Users,
  CheckCircle2,
  Calendar,
  Book,
  DollarSign,
  Baby,
  Clipboard,
  Menu,
  X,
  MoreHorizontal,
  Sun,
  Moon,
  Settings,
  Eye,
} from 'lucide-react';



interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const pesertaLinks: NavItem[] = [
  { to: '/app', label: 'Beranda', icon: <Home className="h-4 w-4" />, end: true },
  { to: '/belajar', label: 'Belajar', icon: <BookOpen className="h-4 w-4" /> },
  { to: '/progres', label: 'Progres', icon: <BarChart3 className="h-4 w-4" /> },
  { to: '/karya', label: 'Karya', icon: <Award className="h-4 w-4" /> },
  { to: '/profil', label: 'Profil', icon: <User className="h-4 w-4" /> },
];

const adminGroups: NavGroup[] = [
  {
    label: 'Kelola',
    items: [
      { to: '/kelola-kelas', label: 'Kelas', icon: <Calendar className="h-4 w-4" /> },
      { to: '/kelola-peserta', label: 'Peserta', icon: <Users className="h-4 w-4" /> },
      { to: '/kelola-modul', label: 'Modul', icon: <Book className="h-4 w-4" /> },
      { to: '/kelola-soal', label: 'Soal', icon: <ClipboardList className="h-4 w-4" /> },
      { to: '/pembayaran', label: 'Bayar', icon: <DollarSign className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Lihat',
    items: [
      { to: '/app', label: 'Beranda', icon: <Home className="h-4 w-4" />, end: true },
      { to: '/absensi', label: 'Absensi', icon: <CheckCircle2 className="h-4 w-4" /> },
    ],
  },
];

const instrukturLinks: NavItem[] = [
  { to: '/app', label: 'Beranda', icon: <Home className="h-4 w-4" />, end: true },
  { to: '/kelola-sesi', label: 'Sesi', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/kelola-peserta', label: 'Peserta', icon: <Users className="h-4 w-4" /> },
  { to: '/absensi', label: 'Absensi', icon: <CheckCircle2 className="h-4 w-4" /> },
  { to: '/kelola-batch', label: 'Batch', icon: <Calendar className="h-4 w-4" /> },
  { to: '/modul', label: 'Baca Modul', icon: <BookOpen className="h-4 w-4" /> },
];

const marketingLinks: NavItem[] = [
  { to: '/marketing', label: 'Dashboard', icon: <BarChart2 className="h-4 w-4" /> },
  { to: '/kelola-sesi', label: 'Sesi', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/kelola-peserta', label: 'Peserta', icon: <Users className="h-4 w-4" /> },
  { to: '/absensi', label: 'Absensi', icon: <CheckCircle2 className="h-4 w-4" /> },
];

const parentLinks: NavItem[] = [
  { to: '/app', label: 'Beranda', icon: <Home className="h-4 w-4" />, end: true },
  { to: '/anak', label: 'Anak', icon: <Baby className="h-4 w-4" /> },
  { to: '/survei', label: 'Survei', icon: <Clipboard className="h-4 w-4" /> },
];

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {adminGroups.map((group, gi) => (
        <div key={group.label} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1.5 h-5 w-px bg-border-2" aria-hidden />}
          <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-fg-subtle xl:block">
            {group.label}
          </span>
          {group.items.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-primary/10 text-primary-text'
                    : 'text-fg-muted hover:bg-surface hover:text-fg'
                }`
              }
            >
              {l.icon}
              <span className="hidden lg:inline">{l.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, user, role } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/masuk');
  };

  const getNavLinks = (): NavItem[] => {
    if (role === 'peserta') return pesertaLinks;
    if (role === 'parent') return parentLinks;
    if (role === 'instruktur') return instrukturLinks;
    if (role === 'marketing') return marketingLinks;
    return [];
  };

  const links = getNavLinks();
  const isAdmin = role === 'admin';
  const bottomLinks = links.length > 4 ? links.slice(0, 4) : links;
  const showMoreTab = links.length > 4;

  return (
    <div className="min-h-screen bg-bg text-fg pb-20 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="shrink-0 text-headline font-bold tracking-tight text-primary-text">
            Paham AI
          </Link>

          {/* Desktop nav */}
          {isAdmin ? (
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex" aria-label="Navigasi utama">
              <AdminNav />
            </nav>
          ) : (
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex" aria-label="Navigasi utama">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-primary/10 text-primary-text'
                        : 'text-fg-muted hover:bg-surface hover:text-fg'
                    }`
                  }
                >
                  {l.icon}
                  <span className="hidden lg:inline">{l.label}</span>
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {role && (
              <span className="hidden rounded-full border border-primary/25 bg-surface px-2 py-0.5 text-xs font-medium text-primary-text sm:block">
                {ROLE_LABELS[role]}
              </span>
            )}
            <span className="hidden max-w-40 truncate text-xs text-fg-subtle lg:block">{user?.email}</span>
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border-2 bg-surface text-fg-muted transition hover:border-border-3 hover:text-fg"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex">
              Keluar
            </Button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] border border-border-2 bg-surface text-lg text-fg md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="border-t border-border px-4 py-3 md:hidden" aria-label="Menu">
            {isAdmin ? (
              <div className="space-y-4">
                {adminGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                      {group.label === 'Kelola' ? <Settings className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {group.label}
                    </p>
                    <ul className="grid grid-cols-2 gap-2">
                      {group.items.map((l) => (
                        <li key={l.to}>
                          <NavLink
                            to={l.to}
                            end={l.end}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) =>
                              `flex min-h-[48px] items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-medium transition ${
                                isActive
                                  ? 'border-primary bg-primary/10 text-primary-text'
                                  : 'border-border-2 bg-surface text-fg'
                              }`
                            }
                          >
                            <span aria-hidden>{l.icon}</span>
                            {l.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {links.map((l) => (
                  <li key={l.to}>
                    <NavLink
                      to={l.to}
                      end={l.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-[48px] items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'border-primary bg-primary/10 text-primary-text'
                            : 'border-border-2 bg-surface text-fg'
                        }`
                      }
                    >
                      <span aria-hidden>{l.icon}</span>
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <span className="min-w-0 flex-1 truncate text-xs text-fg-subtle">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Keluar
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-2 sm:py-4">
        {children}
      </main>

      {/* Mobile bottom bar */}
      <nav className="tab-bar md:hidden" aria-label="Navigasi bawah">
        {isAdmin ? (
          <>
            {adminGroups[0].items.slice(0, 3).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                    isActive ? 'text-primary-text' : 'text-fg-muted'
                  }`
                }
              >
                <span className="text-lg leading-none" aria-hidden>{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Menu lainnya"
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${menuOpen ? 'text-primary-text' : 'text-fg-muted'}`}
            >
              <span className="text-lg leading-none" aria-hidden><MoreHorizontal className="h-6 w-6" /></span>
              <span>Lainnya</span>
            </button>
          </>
        ) : (
          <>
            {bottomLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                    isActive ? 'text-primary-text' : 'text-fg-muted'
                  }`
                }
              >
                <span className="text-lg leading-none" aria-hidden>{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
            {showMoreTab && (
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Menu lainnya"
                className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${menuOpen ? 'text-primary-text' : 'text-fg-muted'}`}
              >
                <span className="text-lg leading-none" aria-hidden><MoreHorizontal className="h-6 w-6" /></span>
                <span>Lainnya</span>
              </button>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
