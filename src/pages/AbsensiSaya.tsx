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
  synced: 'text-success',
  pending: 'text-primary-text',
};

export default function AbsensiSayaPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AbsensiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const { data: profil } = await supabase
          .from('peserta')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        const pid = (profil as { id: string } | null)?.id;
        if (!pid) return;
        const { data: sp } = await supabase.from('sesi_peserta').select('id').eq('peserta_id', pid);
        const spIds = ((sp ?? []) as Array<{ id: string }>).map((s) => s.id);
        if (spIds.length === 0) return;
        const { data } = await supabase
          .from('absensi')
          .select('*, sesi_peserta(*, jadwal_sesi(*, modul(*)))')
          .in('sesi_peserta_id', spIds)
          .order('created_at', { ascending: false });
        setRows((data as AbsensiRow[]) ?? []);
      } catch (e) {
        console.error('[AbsensiSaya] gagal memuat absensi:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <Loading text="Memuat riwayat absensi..." />;

  const hadir = rows.filter((r) => r.status_kehadiran === 'hadir' || r.status_kehadiran === 'telat').length;
  const alpha = rows.filter((r) => r.status_kehadiran === 'alpha').length;
  const persen = rows.length > 0 ? Math.round((hadir / rows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-fg">Absensi Saya</h1>
        <p className="mt-1 text-sm text-fg-muted">Riwayat kehadiran Anda di semua sesi.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-text font-display">{persen}%</p>
          <p className="text-caption text-fg-subtle">Tingkat Kehadiran</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-success font-display">{hadir}</p>
          <p className="text-caption text-fg-subtle">Hadir / Telat</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-destructive font-display">{alpha}</p>
          <p className="text-caption text-fg-subtle">Alpha</p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada absensi" desc="Absensi tercatat otomatis saat Anda absen di halaman sesi." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-2">
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-fg-muted">Sesi</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-fg-muted">Tanggal</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-fg-muted">Status</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-fg-muted">Menit Telat</th>
                <th className="px-4 py-3 text-left font-mono text-overline uppercase text-fg-muted">Sync</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-fg">
                    <span className="font-mono text-xs text-primary-text">{r.sesi_peserta?.jadwal_sesi?.modul?.kode ?? '-'}</span>{' '}
                    {r.sesi_peserta?.jadwal_sesi?.judul_sesi ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                    {r.sesi_peserta?.jadwal_sesi?.tanggal_kelas ? formatJakarta(r.sesi_peserta.jadwal_sesi.tanggal_kelas) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_STYLE[r.status_kehadiran] ?? ''}>{r.status_kehadiran}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted">{r.menit_telat ?? 0}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${SYNC_STYLE[r.sync_status] ?? 'text-fg-subtle'}`}>
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