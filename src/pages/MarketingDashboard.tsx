import { BarChart2, Target, BookOpen, PenLine, Settings, Download, Plus, Edit2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge, Table, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakartaDateTime } from '../lib/time';
import { useToast } from '../hooks/useToast';
import { PROGRAM, programDariKodeModul, programLabel } from '../constants/program';

type PendaftarWithSource = {
  id: string;
  nama_lengkap: string;
  email: string | null;
  no_wa: string | null;
  minat_program: string | null;
  usia: number | null;
  status: string;
  source?: string | null;
  source_detail?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer_code?: string | null;
  created_at: string;
};

type ModulPromo = {
  id: string;
  kode: string;
  judul: string;
  kategori: string | null;
  durasi_menit: number;
  content_md: string | null;
};

type MarketingContent = {
  id: string;
  title: string;
  type: 'post_ig' | 'post_fb' | 'artikel_blog' | 'video_script' | 'whatsapp_blast' | 'email_template' | 'landing_copy';
  target_audience: string;
  topic: string;
  content: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  platforms: string[];
  created_at: string;
  updated_at: string;
};

type TechFeature = {
  id: string;
  name: string;
  category: 'platform' | 'content' | 'analytics' | 'automation' | 'community';
  description: string;
  marketing_value: string;
  implementation_effort: 'rendah' | 'sedang' | 'tinggi';
  status: 'tersedia' | 'dalam_pengembangan' | 'direncanakan';
};

export default function MarketingDashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const { push: toast } = useToast();
  const [pendaftar, setPendaftar] = useState<PendaftarWithSource[]>([]);
  const [modulPromo, setModulPromo] = useState<ModulPromo[]>([]);
  const [marketingContent, setMarketingContent] = useState<MarketingContent[]>([]);
  const [techFeatures, setTechFeatures] = useState<TechFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'modules' | 'content' | 'tech'>('overview');
  const [filterProgram, setFilterProgram] = useState('');
  /** Tabel opsional yang belum ada di database (migration 0050 belum jalan). */
  const [kontenTakTersedia, setKontenTakTersedia] = useState(false);
  const [fiturTakTersedia, setFiturTakTersedia] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (role !== 'admin' && role !== 'marketing') { setLoading(false); return; }
    loadAll();
  }, [authLoading, role]);

  async function loadAll() {
    setLoading(true);
    const [pendaftarRes, modulRes, contentRes, techRes] = await Promise.all([
      supabase.from('pendaftar').select('*').order('created_at', { ascending: false }),
      supabase.from('modul').select('*').order('urutan_sesi', { ascending: true }).order('kode', { ascending: true }),
      supabase.from('marketing_content').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('tech_features').select('*').order('category'),
    ]);
    setPendaftar((pendaftarRes.data ?? []) as PendaftarWithSource[]);
    setModulPromo((modulRes.data ?? []) as ModulPromo[]);
    setMarketingContent((contentRes.data ?? []) as MarketingContent[]);
    setTechFeatures((techRes.data ?? []) as TechFeature[]);
    // Tabel belum ada = migration 0050 belum dijalankan; tampilkan panduan, bukan kosong misterius.
    setKontenTakTersedia(!!contentRes.error);
    setFiturTakTersedia(!!techRes.error);
    setLoading(false);
  }

  function exportPendaftarCsv() {
    if (pendaftar.length === 0) {
      toast('Belum ada data pendaftar untuk diekspor.', 'error');
      return;
    }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const baris = [
      'nama_lengkap,email,no_wa,minat_program,usia,status,created_at',
      ...pendaftar.map((p) =>
        [p.nama_lengkap, p.email, p.no_wa, p.minat_program, p.usia, p.status, p.created_at].map(esc).join(','),
      ),
    ];
    const blob = new Blob([baris.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pendaftar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`${pendaftar.length} pendaftar diekspor ke CSV`, 'success');
  }

  if (authLoading || loading) return <Loading text="Memuat dashboard marketing..." />;
  if (role !== 'admin' && role !== 'marketing') return <EmptyState title="Akses ditolak" desc="Hanya admin/marketing yang bisa akses dashboard ini." />;

  // Overview stats
  const totalPendaftar = pendaftar.length;
  const bySource = pendaftar.reduce((acc, p) => {
    const s = p.source || p.utm_source || 'organic';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const byProgram = pendaftar.reduce((acc, p) => {
    const j = p.minat_program || 'unknown';
    acc[j] = (acc[j] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const modulTampil = filterProgram
    ? modulPromo.filter((m) => programDariKodeModul(m.kode) === filterProgram)
    : modulPromo;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'sources', label: 'Sumber Pendaftar', icon: Target },
    { id: 'modules', label: 'Modul Promosikan', icon: BookOpen },
    { id: 'content', label: 'Konten Marketing', icon: PenLine },
    { id: 'tech', label: 'Fitur Teknis', icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-fg">Dashboard Marketing</h1>
          <p className="mt-1 text-body text-fg-muted">Pantau performa akuisisi, konten promosi, & fitur teknis untuk marketing.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPendaftarCsv}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-caption text-fg-muted">Total Pendaftar</p>
          <p className="text-3xl font-bold text-primary-text font-display mt-1">{totalPendaftar}</p>
        </Card>
        <Card>
          <p className="text-caption text-fg-muted">Sumber Unik</p>
          <p className="text-3xl font-bold text-accent font-display mt-1">{Object.keys(bySource).length}</p>
        </Card>
        <Card>
          <p className="text-caption text-fg-muted">Total Modul</p>
          <p className="text-3xl font-bold text-success font-display mt-1">{modulPromo.length}</p>
        </Card>
        <Card>
          <p className="text-caption text-fg-muted">Konten Siap Publikasi</p>
          <p className="text-3xl font-bold text-fg font-display mt-1">
            {marketingContent.filter(c => c.status === 'approved' || c.status === 'published').length}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border-2 pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-sm font-medium transition ${
              activeTab === t.id
                ? 'bg-primary/10 border border-primary text-primary-text'
                : 'border border-transparent text-fg-muted hover:border-border-2 hover:text-fg'
            }`}
          >
            <t.icon className="h-4 w-4" aria-hidden />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-subhead font-semibold text-fg">Distribusi Sumber Pendaftar</h2>
            <div className="space-y-3">
              {Object.entries(bySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary/10 text-primary-text border-primary/30">{source}</Badge>
                    <span className="text-body text-fg">{count} pendaftar</span>
                  </div>
                  <div className="w-48 h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / totalPendaftar) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-subhead font-semibold text-fg">Distribusi Minat Program</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(byProgram).map(([program, count]) => (
                <Card key={program} className="text-center">
                  <p className="text-caption text-fg-muted">{programLabel(program)}</p>
                  <p className="text-2xl font-bold text-fg font-display mt-1">{count}</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'sources' && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-fg">Detail Sumber Pendaftar</h2>
          <Table>
            <thead>
              <tr className="border-b border-border-2">
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Nama</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Minat</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Sumber</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Detail</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">UTM</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Referral</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {pendaftar.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-fg font-medium">{p.nama_lengkap}</td>
                  <td className="px-4 py-3"><Badge>{p.minat_program ? programLabel(p.minat_program) : '-'}</Badge></td>
                  <td className="px-4 py-3 text-fg font-mono text-sm">{p.source ?? p.utm_source ?? 'organic'}</td>
                  <td className="px-4 py-3 text-fg-muted text-sm">{p.source_detail ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-subtle">
                    {p.utm_medium ? `${p.utm_source}/${p.utm_medium}/${p.utm_campaign}` : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-subtle">{p.referrer_code ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted">{formatJakartaDateTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-subhead font-semibold text-fg">Modul yang Siap Dipromosikan</h2>
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="rounded-[4px] border border-border-2 bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
            >
              <option value="">Semua Program</option>
              {PROGRAM.map((p) => (
                <option key={p.kode} value={p.kode}>{programLabel(p.kode)}</option>
              ))}
            </select>
          </div>

          <Table>
            <thead>
              <tr className="border-b border-border-2">
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Kode</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Judul</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Program</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Kategori</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Durasi</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {modulTampil.map(m => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-sm text-primary-text">{m.kode}</td>
                  <td className="px-4 py-3 text-fg">{m.judul}</td>
                  <td className="px-4 py-3"><Badge>{programDariKodeModul(m.kode) ?? '-'}</Badge></td>
                  <td className="px-4 py-3"><Badge className="font-mono">{m.kategori ?? '-'}</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm text-fg-muted">{m.durasi_menit} mnt</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => toast(`Form edit ${m.kode} sedang dalam pengembangan.`)}>
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-subhead font-semibold text-fg">Library Konten Marketing</h2>
            <Button onClick={() => toast('Formulir konten baru sedang dalam pengembangan.')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Buat Konten
            </Button>
          </div>

          {kontenTakTersedia && (
            <Card className="border-warning/40 bg-warning/5">
              <p className="text-sm text-fg">
                <span className="font-semibold text-warning">Tabel konten belum ada di database.</span>{' '}
                Jalankan <span className="font-mono">supabase/migrations/0050_pulihkan_objek_yang_hilang.sql</span> di
                Supabase SQL Editor, lalu muat ulang halaman ini.
              </p>
            </Card>
          )}

          <Table>
            <thead>
              <tr className="border-b border-border-2">
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Judul</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Tipe</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Topik</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Update</th>
              </tr>
            </thead>
            <tbody>
              {marketingContent.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-fg max-w-xs truncate">{c.title}</td>
                  <td className="px-4 py-3"><Badge className="text-xs">{c.type}</Badge></td>
                  <td className="px-4 py-3 text-fg-muted text-sm max-w-xs truncate">{c.topic}</td>
                  <td className="px-4 py-3 text-fg-muted text-sm">{c.target_audience}</td>
                  <td className="px-4 py-3 text-fg-muted text-sm">{c.platforms.join(', ')}</td>
                  <td className="px-4 py-3">
                    <Badge className={
                      c.status === 'published' ? 'border-green-500/30 text-green-400' :
                      c.status === 'approved' ? 'border-blue-500/30 text-blue-400' :
                      c.status === 'review' ? 'border-yellow-500/30 text-yellow-400' :
                      'border-gray-500/30 text-gray-400'
                    }>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-subtle">{formatJakartaDateTime(c.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {activeTab === 'tech' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-subhead font-semibold text-fg">Fitur Teknis untuk Marketing</h2>
            <Button onClick={() => toast('Form fitur teknis sedang dalam pengembangan.')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Tambah
            </Button>
          </div>

          {fiturTakTersedia && (
            <Card className="border-warning/40 bg-warning/5">
              <p className="text-sm text-fg">
                <span className="font-semibold text-warning">Tabel fitur belum ada di database.</span>{' '}
                Jalankan <span className="font-mono">supabase/migrations/0050_pulihkan_objek_yang_hilang.sql</span> di
                Supabase SQL Editor, lalu muat ulang halaman ini.
              </p>
            </Card>
          )}

          <div className="space-y-4">
            {techFeatures.map(f => (
              <Card key={f.id} className="hover:border-border-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-subhead font-semibold text-fg">{f.name}</h3>
                      <Badge className={`text-xs ${
                        f.category === 'platform' ? 'border-blue-500/30 text-blue-400' :
                        f.category === 'content' ? 'border-purple-500/30 text-purple-400' :
                        f.category === 'analytics' ? 'border-green-500/30 text-green-400' :
                        f.category === 'automation' ? 'border-orange-500/30 text-orange-400' :
                        'border-pink-500/30 text-pink-400'
                      }`}>{f.category}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{f.description}</p>
                    <p className="mt-1 text-xs text-fg-subtle font-mono">Nilai Marketing: {f.marketing_value}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Badge className={
                      f.status === 'tersedia' ? 'border-green-500/30 text-green-400' :
                      f.status === 'dalam_pengembangan' ? 'border-yellow-500/30 text-yellow-400' :
                      'border-gray-500/30 text-gray-400'
                    }>{f.status}</Badge>
                    <Badge className={`text-xs ${
                      f.implementation_effort === 'rendah' ? 'border-green-500/30 text-green-400' :
                      f.implementation_effort === 'sedang' ? 'border-yellow-500/30 text-yellow-400' :
                      'border-red-500/30 text-red-400'
                    }`}>Effort: {f.implementation_effort}</Badge>
                    <Button size="sm" variant="ghost">Detail</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}