import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { formatJakarta } from '../lib/time';
import { syncPendingOps } from '../services/api';
import type { Peserta, JadwalSesi } from '../types';

export default function BerandaPage() {
  const [peserta, setPeserta] = useState<Peserta | null>(null);
  const [jadwal, setJadwal] = useState<JadwalSesi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await syncPendingOps();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: profil, error: profilErr } = await supabase
        .from('peserta')
        .select('*')
        .eq('user_id', auth.user.id)
        .single();
      if (!profilErr) setPeserta(profil as Peserta);

      const { data: jadwalData, error: jadwalErr } = await supabase
        .from('jadwal_sesi')
        .select('*, modul(*)')
        .eq('batch_id', (profil as Peserta)?.batch_id ?? '')
        .order('tanggal_kelas', { ascending: true });
      if (!jadwalErr) setJadwal(jadwalData as JadwalSesi[]);

      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading text="Memuat dasbor..." />;
  if (!peserta) return <EmptyState title="Belum terdaftar" desc="Hubungi Admin untuk didaftarkan sebagai peserta." />;

  const upcoming = jadwal.filter((s) => new Date(s.tanggal_kelas ?? '') >= new Date());
  const stats = {
    peserta: jadwal.length,
    sesi: upcoming.length,
    warning: jadwal.filter(s => new Date(s.tanggal_kelas ?? '') < new Date() && !s.modul).length,
    ok: upcoming.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-[#F1F5F9]">Halo, {peserta.nama_panggil ?? peserta.nama_lengkap}!</h1>
          <p className="mt-1 text-body text-[#94A3B8]">
            Jalur: <Badge className="ml-1">{peserta.jalur ?? '-'}</Badge> &middot; Batch: {formatJakarta(peserta.created_at)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 w-full sm:w-auto">
          <Card className="text-center">
            <p className="text-3xl font-bold text-[#4ADE80] font-display">{upcoming.length}</p>
            <p className="text-caption text-[#64748B]">Sesi Mendatang</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-[#22D3EE] font-display">{jadwal.length}</p>
            <p className="text-caption text-[#64748B]">Total Modul</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-[#FBBF24] font-display">{stats.warning}</p>
            <p className="text-caption text-[#64748B]">Peringatan</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-[#F1F5F9] font-display">{stats.ok}</p>
            <p className="text-caption text-[#64748B]">Siap Aksi</p>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Sesi Mendatang</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="Tidak ada sesi mendatang" desc="Periksa kembali nanti." />
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-[4px] border border-[#334155] bg-[#1E293B] p-4 hover:border-[#475569] transition">
                <Link to={`/modul/${s.modul?.kode ?? s.id}`} className="font-medium text-[#F1F5F9] hover:text-[#4ADE80]">
                  {s.kode_sesi_friendly} — {s.judul_sesi}
                </Link>
                <div className="text-right">
                  <p className="text-caption text-[#94A3B8]">
                    {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : '-'}
                  </p>
                  <p className="text-caption text-[#64748B]">
                    {s.jam_mulai ?? '-'}–{s.jam_akhir ?? '-'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}