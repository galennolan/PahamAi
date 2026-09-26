import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta } from '../lib/time';
import type { Absensi, JadwalSesi, Modul } from '../types';

interface AbsensiRow extends Absensi {
  sesi_peserta: {
    sesi_id: string;
    jadwal_sesi?: JadwalSesi & { modul?: Modul | null };
  };
}

const STATUS_STYLE: Record<string, string> = {
  hadir: 'border-green-500/30 bg-green-500/10 text-green-400',
  telat: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  izin: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  alpha: 'border-red-500/30 bg-red-500/10 text-red-400',
};

const SYNC_STYLE: Record<string, string> = {
  synced: 'text-[#4ADE80]',
  pending: 'text-[#FBBF24]',
};

export default function AbsensiSayaPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AbsensiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profil } = await supabase
        .from('peserta')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profil) {
        const { data } = await supabase
          .from('absensi')
          .select('*, sesi_peserta!inner(*, jadwal_sesi!inner(*, modul(*)))')
          .eq('sesi_peserta.peserta_id', (profil as { id: string }).id)
          .order('created_at', { ascending: false });
        setRows((data as AbsensiRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Loading text="Memuat riwayat absensi..." />;

  const hadir = rows.filter((r) => r.status_kehadiran === 'hadir' || r.status_kehadiran === 'telat').length;
  const alpha = rows.filter((r) => r.status_kehadiran === 'alpha').length;
  const persen = rows.length > 0 ? Math.round((hadir / rows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-[#F1F5F9]">Absensi Saya</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">Riwayat kehadiran Anda di semua sesi.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-[#FBBF24] font-display">{persen}%</p>
          <p className="text-caption text-[#64748B]">Tingkat Kehadiran</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-[#4ADE80] font-display">{hadir}</p>
          <p className="text-caption text-[#64748B]">Hadir / Telat</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-[#F87171] font-display">{alpha}</p>
          <p className="text-caption text-[#64748B]">Alpha</p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada absensi" desc="Absensi tercatat otomatis saat Anda absen di halaman sesi." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Sesi</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Tanggal</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Status</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Menit Telat</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Sync</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#1E293B] last:border-0 hover:bg-[#1E293B]">
                  <td className="px-4 py-3 text-[#F1F5F9]">
                    <span className="font-mono text-xs text-[#FBBF24]">{r.sesi_peserta?.jadwal_sesi?.modul?.kode ?? '-'}</span>{' '}
                    {r.sesi_peserta?.jadwal_sesi?.judul_sesi ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">
                    {r.sesi_peserta?.jadwal_sesi?.tanggal_kelas ? formatJakarta(r.sesi_peserta.jadwal_sesi.tanggal_kelas) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_STYLE[r.status_kehadiran] ?? ''}>{r.status_kehadiran}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{r.menit_telat ?? 0}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${SYNC_STYLE[r.sync_status] ?? 'text-[#64748B]'}`}>
                    {r.sync_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}