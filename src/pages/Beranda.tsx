import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BarChart3, Award, User, ArrowRight, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, EmptyState, Badge, ProgressBar, Stat, Skeleton } from '../components/ui';
import { formatJakarta, formatJakartaDateTime, todayJakartaISO } from '../lib/time';
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

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-headline font-bold text-fg">
          Halo, {peserta.nama_panggil ?? peserta.nama_lengkap}!
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          <Badge className="mx-1">{peserta.kelas?.nama ?? peserta.kelas_penempatan ?? '-'}</Badge> · Sejak {formatJakartaDateTime(peserta.created_at)}
        </p>
      </div>

      {perluBayar && (
        <Link to="/profil" className="block">
          <div className={`rounded-[12px] border p-4 ${tagihan.lock_status === 'terkunci' ? 'border-[destructive]/40 bg-destructive/10' : 'border-primary/40 bg-primary/10'}`}>
            <p className={`text-sm font-semibold ${tagihan.lock_status === 'terkunci' ? 'text-destructive' : 'text-primary-text'}`}>
              {tagihan.lock_status === 'terkunci' ? 'Akses terkunci — lunasi tagihan' : 'Ada tagihan pembayaran'}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {tagihan.due_date ? `Jatuh tempo ${formatJakarta(tagihan.due_date)}` : 'Lihat detail di Profil'} · Ketuk untuk detail <ChevronRight className="inline h-3 w-3" />
            </p>
          </div>
        </Link>
      )}

      {nextSesi ? (
        <Card className="border-primary/30 !p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-text">Sesi berikutnya</p>
          <h2 className="mt-1.5 text-lg font-bold leading-snug text-fg">
            {nextSesi.kode_sesi_friendly} — {nextSesi.judul_sesi}
          </h2>
          <p className="mt-1 font-mono text-sm text-fg-muted">
            {nextSesi.tanggal_kelas ? formatJakarta(nextSesi.tanggal_kelas) : '-'}
            {nextSesi.jam_mulai && ` · ${nextSesi.jam_mulai}–${nextSesi.jam_akhir ?? ''}`}
          </p>
          {nextSesi.lokasi && <p className="mt-0.5 text-xs text-fg-subtle">{nextSesi.lokasi}</p>}
          <Link
            to={`/modul/${nextSesi.modul?.kode ?? nextSesi.kode_sesi_friendly}`}
            className="mt-4 block min-h-[48px] rounded-[8px] bg-primary px-4 py-3 text-center text-sm font-bold text-[rgb(var(--on-primary))] transition hover:bg-primary-hover active:bg-primary-active"
          >
            Masuk Kelas <ArrowRight className="inline h-4 w-4" />
          </Link>
        </Card>
      ) : (
        <EmptyState
          title="Belum ada sesi terjadwal"
          desc="Jadwal akan muncul setelah admin menugaskan Anda ke sesi."
          action={<Link to="/belajar" className="inline-block rounded-[8px] border border-primary px-4 py-2 text-sm text-primary-text">Lihat Modul</Link>}
        />
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={`${stats.kehadiran}%`} label="Kehadiran" accent="text-primary-text" />
        <Stat value={stats.kuisSelesai} label="Kuis Selesai" accent="text-accent" />
        <Stat value={stats.tugasSelesai} label="Tugas & Karya" accent="text-success" />
      </div>

      <div>
        <h2 className="mb-2.5 text-sm font-semibold text-fg-muted">Menu cepat</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_MENU.map((m) => (
            <Link key={m.to} to={m.to} className="group block">
              <Card className="transition hover:border-primary/40 active:scale-[0.99]">
                <span className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border-2 bg-bg text-primary-text transition group-hover:border-primary/40">
                  <m.icon className="h-5 w-5" />
                </span>
                <span className="mt-2.5 flex items-center justify-between gap-2 font-semibold text-fg">
                  {m.label}
                  <ArrowRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-primary-text" />
                </span>
                <span className="mt-0.5 block text-xs text-fg-subtle">{m.desc}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {stats.totalSesi > 0 && (
        <Card>
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span className="font-medium">Perjalanan kursus</span>
            <Link to="/belajar" className="inline-flex items-center gap-1 text-primary-text">Lihat semua <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <ProgressBar value={stats.kehadiran} className="mt-2" />
          <p className="mt-1.5 text-xs text-fg-subtle">{stats.totalSesi} sesi ditugaskan untuk Anda</p>
        </Card>
      )}
    </div>
  );
}