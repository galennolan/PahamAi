import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BarChart3, Award, User, ArrowRight, ChevronRight, Baby, ClipboardList, TrendingUp, Megaphone } from 'lucide-react';
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