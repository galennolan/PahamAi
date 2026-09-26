import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, BarChart3, Award, User, ArrowRight, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, EmptyState, Badge, ProgressBar, Stat, Skeleton } from '../components/ui';
import { formatJakarta, formatJakartaDateTime, todayJakartaISO } from '../lib/time';
import { syncPendingOps } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Peserta, JadwalSesi, Pembayaran } from '../types';

const QUICK_MENU = [
  { to: '/belajar', label: 'Belajar', desc: 'Modul & jadwal sesi', icon: BookOpen },
  { to: '/progres', label: 'Progres', desc: 'Absensi, nilai, kuis', icon: BarChart3 },
  { to: '/karya', label: 'Karya & Sertifikat', desc: 'Portfolio & kelulusan', icon: Award },
  { to: '/profil', label: 'Profil', desc: 'Bayar & survei', icon: User },
];

export default function BerandaPage() {
  const { role } = useAuth();
  const [peserta, setPeserta] = useState<Peserta | null>(null);
  const [nextSesi, setNextSesi] = useState<JadwalSesi | null>(null);
  const [stats, setStats] = useState({ kehadiran: 0, totalSesi: 0, kuisSelesai: 0, tugasSelesai: 0 });
  const [tagihan, setTagihan] = useState<Pembayaran | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (currentRole: string | null) => {
    if (currentRole !== 'peserta') {
      setLoading(false);
      return;
    }
    await syncPendingOps();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }

    const { data: profil } = await supabase
      .from('peserta')
      .select('*')
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (!profil) {
      setLoading(false);
      return;
    }
    const p = profil as Peserta;
    setPeserta(p);

    const [jadwalRes, spRes, bayarRes, kuisRes, portRes] = await Promise.all([
      p.batch_id
        ? supabase.from('jadwal_sesi').select('*, modul(*)').eq('batch_id', p.batch_id).order('tanggal_kelas', { ascending: true })
        : Promise.resolve({ data: null as JadwalSesi[] | null }),
      supabase.from('sesi_peserta').select('id, sesi_id').eq('peserta_id', p.id),
      supabase.from('pembayaran').select('*').eq('peserta_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('quiz_attempt').select('kode_paket').eq('id_peserta_fk', p.id),
      supabase.from('portfolio_item').select('id').eq('id_peserta_fk', p.id),
    ]);

    const jadwalList = (jadwalRes.data as JadwalSesi[]) ?? [];
    const today = todayJakartaISO();
    setNextSesi(jadwalList.find((s) => (s.tanggal_kelas ?? '') >= today) ?? jadwalList[jadwalList.length - 1] ?? null);

    const spList = (spRes.data ?? []) as Array<{ id: string; sesi_id: string }>;
    if (spList.length > 0) {
      const spIds = spList.map((s) => s.id);
      const [catRes, absRes] = await Promise.all([
        supabase.from('catatan_ketik').select('sesi_peserta_id').in('sesi_peserta_id', spIds),
        supabase.from('absensi').select('sesi_peserta_id, status_kehadiran').in('sesi_peserta_id', spIds),
      ]);
      const hadir = ((absRes.data ?? []) as Array<{ status_kehadiran: string }>).filter(
        (a) => a.status_kehadiran === 'hadir' || a.status_kehadiran === 'telat'
      ).length;
      const catatan = ((catRes.data ?? []) as Array<unknown>).length;
      setStats({
        kehadiran: spList.length > 0 ? Math.round((hadir / Math.max(spList.length, 1)) * 100) : 0,
        totalSesi: jadwalList.length,
        kuisSelesai: new Set(((kuisRes.data ?? []) as Array<{ kode_paket: string }>).map((k) => k.kode_paket)).size,
        tugasSelesai: ((catRes.data ?? []) as Array<unknown>).length + catatan * 0 + ((portRes.data ?? []) as Array<unknown>).length,
      });
    } else {
      setStats((s) => ({ ...s, totalSesi: jadwalList.length }));
    }

    if (bayarRes.data) setTagihan(bayarRes.data as Pembayaran);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load(role);
    })();
  }, [load, role]);

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

  if (role === 'parent') return <Navigate to="/anak" replace />;
  if (role === 'marketing') return <Navigate to="/marketing" replace />;
  if (role === 'admin' || role === 'instruktur') return <Navigate to="/kelola-sesi" replace />;
  if (!peserta) {
    return (
      <div className="pt-6 text-center">
        <EmptyState
          title="Belum terdaftar sebagai peserta"
          desc="Akun Anda belum memiliki profil peserta. Hubungi Admin, atau daftarkan diri Anda lewat form pre-registrasi."
          action={
            <div className="flex gap-2 justify-center">
              <Link to="/pendaftaran" className="inline-block min-h-[48px] rounded-[8px] bg-[#FBBF24] px-5 py-2.5 text-sm font-bold text-[#0F172A]">
                Daftar Sekarang
              </Link>
              <Link to="/masuk" className="inline-block min-h-[48px] rounded-[8px] border border-[#334155] bg-[#1E293B] px-5 py-2.5 text-sm font-medium text-[#F1F5F9]">
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
        <h1 className="text-headline font-bold text-[#F1F5F9]">
          Halo, {peserta.nama_panggil ?? peserta.nama_lengkap}!
        </h1>
        <p className="mt-0.5 text-sm text-[#94A3B8]">
          Jalur <Badge className="mx-1">{peserta.jalur ?? '-'}</Badge> · Sejak {formatJakartaDateTime(peserta.created_at)}
        </p>
      </div>

      {perluBayar && (
        <Link to="/profil" className="block">
          <div className={`rounded-[12px] border p-4 ${tagihan.lock_status === 'terkunci' ? 'border-[#F87171]/40 bg-[#F87171]/10' : 'border-[#FBBF24]/40 bg-[#FBBF24]/10'}`}>
            <p className={`text-sm font-semibold ${tagihan.lock_status === 'terkunci' ? 'text-[#F87171]' : 'text-[#FBBF24]'}`}>
              {tagihan.lock_status === 'terkunci' ? 'Akses terkunci — lunasi tagihan' : 'Ada tagihan pembayaran'}
            </p>
            <p className="mt-0.5 text-xs text-[#94A3B8]">
              {tagihan.due_date ? `Jatuh tempo ${formatJakarta(tagihan.due_date)}` : 'Lihat detail di Profil'} · Ketuk untuk detail <ChevronRight className="inline h-3 w-3" />
            </p>
          </div>
        </Link>
      )}

      {nextSesi ? (
        <Card className="border-[#FBBF24]/30 !p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FBBF24]">Sesi berikutnya</p>
          <h2 className="mt-1.5 text-lg font-bold leading-snug text-[#F1F5F9]">
            {nextSesi.kode_sesi_friendly} — {nextSesi.judul_sesi}
          </h2>
          <p className="mt-1 font-mono text-sm text-[#94A3B8]">
            {nextSesi.tanggal_kelas ? formatJakarta(nextSesi.tanggal_kelas) : '-'}
            {nextSesi.jam_mulai && ` · ${nextSesi.jam_mulai}–${nextSesi.jam_akhir ?? ''}`}
          </p>
          {nextSesi.lokasi && <p className="mt-0.5 text-xs text-[#64748B]">{nextSesi.lokasi}</p>}
          <Link
            to={`/modul/${nextSesi.modul?.kode ?? nextSesi.kode_sesi_friendly}`}
            className="mt-4 block min-h-[48px] rounded-[8px] bg-[#FBBF24] px-4 py-3 text-center text-sm font-bold text-[#0F172A] transition hover:bg-[#F59E0B] active:bg-[#D97706]"
          >
            Masuk Kelas <ArrowRight className="inline h-4 w-4" />
          </Link>
        </Card>
      ) : (
        <EmptyState
          title="Belum ada sesi terjadwal"
          desc="Jadwal akan muncul setelah admin membuat sesi untuk batch Anda."
          action={<Link to="/belajar" className="inline-block rounded-[8px] border border-[#FBBF24] px-4 py-2 text-sm text-[#FBBF24]">Lihat Modul</Link>}
        />
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={`${stats.kehadiran}%`} label="Kehadiran" accent="text-[#FBBF24]" />
        <Stat value={stats.kuisSelesai} label="Kuis Selesai" accent="text-[#22D3EE]" />
        <Stat value={stats.tugasSelesai} label="Tugas & Karya" accent="text-[#4ADE80]" />
      </div>

      <div>
        <h2 className="mb-2.5 text-sm font-semibold text-[#94A3B8]">Menu cepat</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_MENU.map((m) => (
            <Link key={m.to} to={m.to} className="group block">
              <Card className="transition hover:border-[#FBBF24]/40 active:scale-[0.99]">
                <span className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#334155] bg-[#0F172A] text-[#FBBF24] transition group-hover:border-[#FBBF24]/40">
                  <m.icon className="h-5 w-5" />
                </span>
                <span className="mt-2.5 flex items-center justify-between gap-2 font-semibold text-[#F1F5F9]">
                  {m.label}
                  <ArrowRight className="h-4 w-4 text-[#64748B] transition group-hover:translate-x-0.5 group-hover:text-[#FBBF24]" />
                </span>
                <span className="mt-0.5 block text-xs text-[#64748B]">{m.desc}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {stats.totalSesi > 0 && (
        <Card>
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="font-medium">Perjalanan kursus</span>
            <Link to="/belajar" className="inline-flex items-center gap-1 text-[#FBBF24]">Lihat semua <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <ProgressBar value={stats.kehadiran} className="mt-2" />
          <p className="mt-1.5 text-xs text-[#64748B]">{stats.totalSesi} sesi di batch Anda</p>
        </Card>
      )}
    </div>
  );
}