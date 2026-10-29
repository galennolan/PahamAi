import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BarChart3, Award, User, ArrowRight, ChevronRight, Baby, ClipboardList, TrendingUp, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, EmptyState, Badge, ProgressBar, Stat, Skeleton } from '../components/ui';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { syncPendingOps } from '../services/api';
import { listSesiAssigned, type SesiAssigned } from '../services/penugasan';
import { useAuth } from '../context/AuthContext';
import type { Peserta, JadwalSesi, Pembayaran } from '../types';

const QUICK_MENU = [
  { to: '/belajar', label: 'Belajar', desc: 'Modul & jadwal sesi', icon: BookOpen },
  { to: '/progres', label: 'Progres', desc: 'Absensi, nilai, kuis', icon: BarChart3 },
  { to: '/karya', label: 'Karya & Sertifikat', desc: 'Portfolio & kelulusan', icon: Award },
  { to: '/profil', label: 'Profil', desc: 'Bayar & survei', icon: User },
];

/** Ringkasan satu anak untuk beranda orang tua: sesi berikut + kehadiran. */
interface RingkasAnak {
  id: string;
  nama: string;
  kelasNama: string | null;
  persenHadir: number;
  hadirDari: string;
  sesiBerikut: { kode: string; judul: string; tanggal: string | null; jamMulai: string | null } | null;
}

function BerandaOrangTua() {
  const { user } = useAuth();
  const [anaks, setAnaks] = useState<RingkasAnak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const { data: parentRow } = await supabase
          .from('parent_user').select('id').eq('user_id', user.id).maybeSingle();
        const parentId = (parentRow as { id: string } | null)?.id;
        if (!parentId) return;
        const { data: links } = await supabase
          .from('parent_child_link').select('child_id').eq('parent_id', parentId);
        const childIds = ((links ?? []) as Array<{ child_id: string }>).map((l) => l.child_id);
        if (childIds.length === 0) return;
        const { data: pesertas } = await supabase
          .from('peserta').select('id,nama_lengkap,nama_panggil,kelas(nama)').in('id', childIds);
        const daftar = (pesertas ?? []) as unknown as Array<{
          id: string; nama_lengkap: string; nama_panggil: string | null;
          kelas: { nama: string } | null;
        }>;
        const hariIni = todayJakartaISO();
        const hasil = await Promise.all(daftar.map(async (p) => {
          const sesi = await listSesiAssigned(p.id);
          const spIds = sesi.map((s) => s.sesi_peserta_id);
          const { data: abs } = spIds.length > 0
            ? await supabase.from('absensi').select('sesi_peserta_id,status_kehadiran').in('sesi_peserta_id', spIds)
            : { data: [] as Array<{ sesi_peserta_id: string; status_kehadiran: string }> };
          const statusBySp = new Map(((abs ?? []) as Array<{ sesi_peserta_id: string; status_kehadiran: string }>).map((a) => [a.sesi_peserta_id, a.status_kehadiran]));
          const lampau = sesi.filter((s) => (s.tanggal_kelas ?? '') <= hariIni);
          const hadir = lampau.filter((s) => {
            const st = statusBySp.get(s.sesi_peserta_id);
            return st === 'hadir' || st === 'telat';
          }).length;
          const berikut = sesi.find((s) => (s.tanggal_kelas ?? '') >= hariIni) ?? null;
          return {
            id: p.id,
            nama: p.nama_panggil ?? p.nama_lengkap,
            kelasNama: p.kelas?.nama ?? null,
            persenHadir: lampau.length > 0 ? Math.round((hadir / lampau.length) * 100) : 0,
            hadirDari: `${hadir}/${lampau.length}`,
            sesiBerikut: berikut ? {
              kode: berikut.kode_sesi_friendly,
              judul: berikut.judul_sesi,
              tanggal: berikut.tanggal_kelas,
              jamMulai: berikut.jam_mulai,
            } : null,
          };
        }));
        setAnaks(hasil);
      } catch (e) {
        console.error('[Beranda] gagal memuat ringkasan anak:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-headline font-bold text-fg">Halo, Orang Tua Hebat!</h1>
        <p className="mt-0.5 text-sm text-fg-muted">Pantau kehadiran dan jadwal anak Anda di sini.</p>
      </div>

      {anaks.length === 0 ? (
        <EmptyState
          title="Belum ada anak terhubung"
          desc="Hubungi Admin untuk menautkan akun anak Anda."
        />
      ) : (
        <div className="space-y-4">
          {anaks.map((a) => (
            <Card key={a.id} className="!p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-subhead font-bold text-fg">
                    <Baby className="h-5 w-5 text-primary-text" aria-hidden />
                    {a.nama}
                  </p>
                  <p className="mt-0.5 text-sm text-fg-muted">Kelas: {a.kelasNama ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-text font-display">{a.persenHadir}%</p>
                  <p className="text-xs text-fg-subtle">hadir {a.hadirDari}</p>
                </div>
              </div>
              <ProgressBar value={a.persenHadir} className="mt-3" />
              {a.sesiBerikut ? (
                <p className="mt-3 text-sm text-fg-muted">
                  Sesi berikut: <span className="font-mono text-xs text-primary-text">{a.sesiBerikut.kode}</span>{' '}
                  <span className="font-medium text-fg">{a.sesiBerikut.judul}</span>
                  {' · '}{a.sesiBerikut.tanggal ? formatJakarta(a.sesiBerikut.tanggal) : 'tanggal menyusul'}
                  {a.sesiBerikut.jamMulai ? ` · ${a.sesiBerikut.jamMulai.slice(0, 5)}` : ''}
                </p>
              ) : (
                <p className="mt-3 text-sm text-fg-subtle">Tidak ada sesi mendatang.</p>
              )}
              <Link
                to="/anak"
                className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] bg-primary px-4 py-3 text-center text-sm font-bold text-[rgb(var(--on-primary))] transition hover:bg-primary-hover active:bg-primary-active"
              >
                Lihat Detail Anak <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2.5 text-sm font-semibold text-fg-muted">Menu orang tua</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/anak" className="group block">
            <Card className="transition hover:border-primary/40 active:scale-[0.99]">
              <span className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border-2 bg-bg text-primary-text transition group-hover:border-primary/40">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </span>
              <span className="mt-2.5 flex items-center justify-between gap-2 font-semibold text-fg">
                Anak
                <ArrowRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-primary-text" aria-hidden />
              </span>
              <span className="mt-0.5 block text-xs text-fg-subtle">Riwayat kehadiran lengkap</span>
            </Card>
          </Link>
          <Link to="/survei" className="group block">
            <Card className="transition hover:border-primary/40 active:scale-[0.99]">
              <span className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border-2 bg-bg text-primary-text transition group-hover:border-primary/40">
                <BarChart3 className="h-5 w-5" aria-hidden />
              </span>
              <span className="mt-2.5 flex items-center justify-between gap-2 font-semibold text-fg">
                Survei
                <ArrowRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-primary-text" aria-hidden />
              </span>
              <span className="mt-0.5 block text-xs text-fg-subtle">Beri masukan kursus</span>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Ringkasan akuisisi untuk beranda marketing. */
interface RingkasAkuisisi {
  total: number;
  pending: number;
  approved: number;
  terbaru: Array<{ id: string; nama: string; minat: string | null; status: string; tanggal: string }>;
}

function BerandaMarketing() {
  const [ringkas, setRingkas] = useState<RingkasAkuisisi | null>(null);
  const [takAdaAkses, setTakAdaAkses] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [totalRes, baruRes] = await Promise.all([
          supabase.from('pendaftar').select('*', { count: 'exact', head: true }),
          supabase.from('pendaftar')
            .select('id,nama_lengkap,minat_program,status,created_at')
            .order('created_at', { ascending: false })
            .limit(30),
        ]);
        if (totalRes.error) throw new Error(totalRes.error.message);
        if (baruRes.error) throw new Error(baruRes.error.message);
        const daftar = (baruRes.data ?? []) as Array<{
          id: string; nama_lengkap: string; minat_program: string | null; status: string; created_at: string;
        }>;
        // Status dihitung dari sampel terbaru; total pasti dari count.
        const { data: semuaStatus } = await supabase.from('pendaftar').select('status');
        const statusList = ((semuaStatus ?? []) as Array<{ status: string }>).map((s) => s.status);
        setRingkas({
          total: totalRes.count ?? 0,
          pending: statusList.filter((s) => s === 'pending').length,
          approved: statusList.filter((s) => s === 'approved').length,
          terbaru: daftar.slice(0, 5).map((p) => ({
            id: p.id, nama: p.nama_lengkap, minat: p.minat_program, status: p.status, tanggal: p.created_at,
          })),
        });
      } catch (e) {
        console.error('[Beranda] pendaftar tidak terbaca role marketing:', e);
        setTakAdaAkses(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-3 gap-2.5">
          <Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-headline font-bold text-fg">Halo, Tim Marketing!</h1>
        <p className="mt-0.5 text-sm text-fg-muted">Pantau pendaftar baru dan buka dashboard lengkap.</p>
      </div>

      {takAdaAkses || !ringkas ? (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm text-fg">
            <span className="font-semibold text-warning">Data pendaftar belum bisa dibaca.</span>{' '}
            Minta admin menjalankan{' '}
            <span className="font-mono">supabase/migrations/0053_marketing_read_pendaftar.sql</span> di
            Supabase SQL Editor, lalu muat ulang halaman ini.
          </p>
          <Link
            to="/marketing"
            className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] bg-primary px-4 py-3 text-center text-sm font-bold text-[rgb(var(--on-primary))] transition hover:bg-primary-hover active:bg-primary-active"
          >
            Tetap Buka Dashboard Marketing <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat value={ringkas.total} label="Total Pendaftar" accent="text-primary-text" />
            <Stat value={ringkas.pending} label="Menunggu" accent="text-accent" />
            <Stat value={ringkas.approved} label="Disetujui" accent="text-success" />
          </div>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <TrendingUp className="h-4 w-4 text-primary-text" aria-hidden />
                Pendaftar terbaru
              </h2>
              <Link to="/marketing" className="inline-flex items-center gap-1 text-sm text-primary-text">
                Semua <ChevronRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
            {ringkas.terbaru.length === 0 ? (
              <p className="text-sm text-fg-subtle">Belum ada pendaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {ringkas.terbaru.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{p.nama}</p>
                      <p className="text-xs text-fg-subtle">
                        {p.minat ?? '-'} · {formatJakarta(p.tanggal)}
                      </p>
                    </div>
                    <Badge>{p.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Link
            to="/marketing"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] bg-primary px-4 py-3 text-center text-sm font-bold text-[rgb(var(--on-primary))] transition hover:bg-primary-hover active:bg-primary-active"
          >
            <Megaphone className="h-4 w-4" aria-hidden />
            Buka Dashboard Marketing
          </Link>
        </>
      )}
    </div>
  );
}

export default function BerandaPage() {
  const { role, user, loading: authLoading } = useAuth();
  const [peserta, setPeserta] = useState<Peserta | null>(null);
  const [nextSesi, setNextSesi] = useState<JadwalSesi | null>(null);
  const [stats, setStats] = useState({ kehadiran: 0, totalSesi: 0, kuisSelesai: 0, tugasSelesai: 0 });
  const [tagihan, setTagihan] = useState<Pembayaran | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (currentRole: string | null, userId: string | null) => {
    try {
    if (currentRole !== 'peserta' || !userId) {
      setLoading(false);
      return;
    }
    // Antrean offline tidak boleh memblokir dashboard; sinkron ulang di belakang layar.
    syncPendingOps().catch(() => {});

    const { data: profil } = await supabase
        .from('peserta')
        .select('*, kelas(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profil) {
      setLoading(false);
      return;
    }
    const p = profil as Peserta;
    setPeserta(p);

    const [sesiRes, bayarRes, kuisRes, portRes] = await Promise.all([
      listSesiAssigned(p.id),
      supabase.from('pembayaran').select('*').eq('peserta_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('quiz_attempt').select('kode_paket').eq('id_peserta_fk', p.id),
      supabase.from('portfolio_item').select('id').eq('id_peserta_fk', p.id),
    ]);

    // Hanya sesi yang di-assign tutor yang boleh dibuka peserta.
    const sesiList = sesiRes as SesiAssigned[];
    const today = todayJakartaISO();
    setNextSesi(sesiList.find((s) => (s.tanggal_kelas ?? '') >= today) ?? sesiList[sesiList.length - 1] ?? null);

    if (sesiList.length > 0) {
      const [catRes, absRes] = await Promise.all([
        supabase.from('catatan_ketik').select('id').in('sesi_peserta_id', sesiList.map((s) => s.sesi_peserta_id)),
        supabase.from('absensi').select('status_kehadiran').in('sesi_peserta_id', sesiList.map((s) => s.sesi_peserta_id)),
      ]);
      const hadir = ((absRes.data ?? []) as Array<{ status_kehadiran: string }>).filter(
        (a) => a.status_kehadiran === 'hadir' || a.status_kehadiran === 'telat'
      ).length;
      const catatan = ((catRes.data ?? []) as Array<unknown>).length;
      setStats({
        kehadiran: Math.round((hadir / sesiList.length) * 100),
        totalSesi: sesiList.length,
        kuisSelesai: new Set(((kuisRes.data ?? []) as Array<{ kode_paket: string }>).map((k) => k.kode_paket)).size,
        tugasSelesai: catatan + ((portRes.data ?? []) as Array<unknown>).length,
      });
    } else {
      setStats((s) => ({ ...s, totalSesi: 0 }));
    }

    if (bayarRes.data) setTagihan(bayarRes.data as Pembayaran);
    } catch (e) {
      console.error('[Beranda] gagal memuat dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat satu kali per user. Menunggu auth selesai dulu supaya tidak
  // load ganda (role null → 'peserta') dan tidak reset loading berulang.
  const loadedFor = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (authLoading) return;
    const key = user?.id ?? null;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    setLoading(true);
    void load(role, user?.id ?? null);
  }, [authLoading, role, user?.id, load]);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-3 gap-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Universal dashboard — no redirects
  if (role === 'parent') return <BerandaOrangTua />;
  if (role === 'marketing') return <BerandaMarketing />;
  if (!peserta && role !== 'peserta') {
    return (
      <div className="space-y-5 pt-2">
        <div>
          <h1 className="text-headline font-bold text-fg">Dashboard</h1>
          <p className="mt-0.5 text-sm text-fg-muted">Pilih menu di navigasi untuk mulai.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="cursor-pointer" onClick={() => window.location.href = '/kelola-sesi'}>
            <Card className="p-4 hover:border-primary/40 transition">
              <h3 className="font-semibold text-fg">Kelola Sesi</h3>
              <p className="mt-1 text-sm text-fg-muted">Absensi, nilai, jadwal</p>
            </Card>
          </div>
          <div className="cursor-pointer" onClick={() => window.location.href = '/kelola-peserta'}>
            <Card className="p-4 hover:border-primary/40 transition">
              <h3 className="font-semibold text-fg">Kelola Peserta</h3>
              <p className="mt-1 text-sm text-fg-muted">Tambah, edit, hapus</p>
            </Card>
          </div>
          <div className="cursor-pointer" onClick={() => window.location.href = '/kelola-modul'}>
            <Card className="p-4 hover:border-primary/40 transition">
              <h3 className="font-semibold text-fg">Kelola Modul</h3>
              <p className="mt-1 text-sm text-fg-muted">Materi per sesi</p>
            </Card>
          </div>
          <div className="cursor-pointer" onClick={() => window.location.href = '/absensi'}>
            <Card className="p-4 hover:border-primary/40 transition">
              <h3 className="font-semibold text-fg">Absensi</h3>
              <p className="mt-1 text-sm text-fg-muted">Monitor kehadiran</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!peserta) {
    return (
      <div className="pt-6 text-center">
        <EmptyState
          title="Belum terdaftar sebagai peserta"
          desc="Akun Anda belum memiliki profil peserta. Hubungi Admin, atau daftarkan diri Anda lewat form pre-registrasi."
          action={
            <div className="flex gap-2 justify-center">
              <Link to="/pendaftaran" className="inline-block min-h-[48px] rounded-[8px] bg-primary px-5 py-2.5 text-sm font-bold text-[rgb(var(--on-primary))]">
                Daftar Sekarang
              </Link>
              <Link to="/masuk" className="inline-block min-h-[48px] rounded-[8px] border border-border-2 bg-surface px-5 py-2.5 text-sm font-medium text-fg">
                Login Lain
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const perluBayar = tagihan && tagihan.status_bayar !== 'lunas';
  const sisaBayar = tagihan ? Math.max(0, Number(tagihan.biaya_total || 0) - Number(tagihan.dibayar || 0)) : 0;

  return (
    <div className="space-y-6 pt-2 pb-16 max-w-5xl mx-auto animate-fade-in">
      {/* 1. GREETING & ENROLLMENT BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-2 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-0.5 text-xs font-bold text-primary-text font-mono">
              {peserta.kelas?.nama ?? peserta.kelas_penempatan ?? 'Kelas Paham AI'}
            </span>
            <span className="text-xs text-fg-subtle">
              Siswa Aktif
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
            Halo, {peserta.nama_panggil ?? peserta.nama_lengkap}! 👋
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-fg-muted">
            Selamat datang kembali di portal pembelajaran AI. Lanjutkan progres belajarmu hari ini.
          </p>
        </div>

        {/* Status Pembayaran / Finansial Badge */}
        <div className="shrink-0">
          {tagihan && tagihan.status_bayar === 'lunas' ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 flex items-center gap-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Biaya Kursus Lunas
            </div>
          ) : perluBayar ? (
            <Link
              to="/profil"
              className="group flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            >
              <span>Ada Tagihan: Rp {sisaBayar.toLocaleString('id-ID')}</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* 2. TAGIHAN ALERT (Jika ada tagihan tertunda) */}
      {perluBayar && (
        <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          tagihan.lock_status === 'terkunci' ? 'border-destructive/40 bg-destructive/10' : 'border-amber-500/40 bg-amber-500/10'
        }`}>
          <div>
            <p className={`text-sm font-bold flex items-center gap-2 ${tagihan.lock_status === 'terkunci' ? 'text-destructive' : 'text-amber-300'}`}>
              {tagihan.lock_status === 'terkunci' ? '⚠️ Akses Modul Terkunci Sementara' : '💳 Status Pembayaran Kursus (Cicilan)'}
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              Sisa tagihan: <span className="font-mono font-bold text-fg">Rp {sisaBayar.toLocaleString('id-ID')}</span>
              {tagihan.due_date ? ` · Jatuh tempo ${formatJakarta(tagihan.due_date)}` : ''}.
              Konfirmasi atau upload bukti bayar di menu Profil.
            </p>
          </div>
          <Link
            to="/profil"
            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition"
          >
            Lihat Rekening & Bukti Bayar
          </Link>
        </div>
      )}

      {/* 3. HERO CARD: SESI BERIKUTNYA */}
      {nextSesi ? (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-surface to-surface-2 p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary-text">
                <BookOpen className="h-3 w-3" /> Sesi Belajar Berikutnya
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-fg leading-tight">
                {nextSesi.kode_sesi_friendly} — {nextSesi.judul_sesi}
              </h2>
              <p className="text-xs sm:text-sm text-fg-muted font-mono flex flex-wrap items-center gap-2">
                <span>{nextSesi.tanggal_kelas ? formatJakarta(nextSesi.tanggal_kelas) : 'Jadwal menyusul'}</span>
                {nextSesi.jam_mulai && <span>· Pukul {nextSesi.jam_mulai.slice(0, 5)}–{nextSesi.jam_akhir?.slice(0, 5) ?? ''} WIB</span>}
                {nextSesi.lokasi && <span>· {nextSesi.lokasi}</span>}
              </p>
            </div>

            <Link
              to={`/modul/${nextSesi.modul?.kode ?? nextSesi.kode_sesi_friendly}`}
              className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-black hover:bg-primary-hover active:bg-primary-active transition shadow-sm hover:shadow-primary/20"
            >
              Lanjutkan Belajar Sekarang <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Semua Sesi Telah Terselesaikan"
          desc="Kerja bagus! Anda sudah menyelesaikan seluruh modul yang ditugaskan untuk kelas ini."
          action={
            <Link to="/belajar" className="inline-block rounded-xl border border-primary px-5 py-2.5 text-sm font-bold text-primary-text hover:bg-primary/10">
              Buka Katalog Modul
            </Link>
          }
        />
      )}

      {/* 4. STATISTIK BELAJAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat value={`${stats.kehadiran}%`} label="Kehadiran Sesi" accent="text-primary-text" />
        <Stat value={stats.kuisSelesai} label="Kuis Lulus" accent="text-accent" />
        <Stat value={stats.tugasSelesai} label="Catatan & Portofolio" accent="text-success" />
        <Stat value={stats.totalSesi} label="Total Sesi Terjadwal" accent="text-fg" />
      </div>

      {/* 5. MENU CEPAT */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-fg-muted">Akses Cepat Belajar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_MENU.map((m) => (
            <Link key={m.to} to={m.to} className="group block">
              <Card className="p-4 sm:p-5 h-full transition-all duration-200 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-2 bg-bg text-primary-text transition group-hover:border-primary/50 group-hover:bg-primary/10">
                  <m.icon className="h-5 w-5" />
                </span>
                <span className="mt-3 flex items-center justify-between gap-1.5 font-bold text-sm text-fg">
                  {m.label}
                  <ArrowRight className="h-3.5 w-3.5 text-fg-subtle group-hover:translate-x-1 group-hover:text-primary-text transition" />
                </span>
                <span className="mt-1 block text-xs text-fg-subtle leading-tight">{m.desc}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 6. PERJALANAN KURSUS PROGRESS CARD */}
      {stats.totalSesi > 0 && (
        <Card className="p-5 border-border-2">
          <div className="flex items-center justify-between text-xs text-fg-muted mb-2">
            <span className="font-bold text-fg">Perjalanan Kelulusan Kursus</span>
            <Link to="/belajar" className="inline-flex items-center gap-1 text-primary-text font-semibold hover:underline">
              Lihat silabus lengkap <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ProgressBar value={stats.kehadiran} className="h-2.5" />
          <p className="mt-2 text-xs font-mono text-fg-subtle">
            {stats.kehadiran}% sesi telah Anda selesaikan dari total {stats.totalSesi} sesi angkatan ini.
          </p>
        </Card>
      )}
    </div>
  );
}