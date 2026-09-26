import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { listAbsensiForSesi } from '../services/absensi';
import { Card, Loading, EmptyState, Badge, Button, Field, SelectInput } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import type { JadwalSesi, Kehadiran } from '../types';

interface AbsensiItem {
  id: string;
  status_kehadiran: Kehadiran;
  menit_telat: number;
  sesi_peserta?: {
    peserta?: {
      nama_panggil?: string | null;
      nama_lengkap?: string;
    };
  };
}

export default function AbsensiPage() {
  const { push: toast } = useToast();
  const [jadwals, setJadwals] = useState<JadwalSesi[]>([]);
  const [selectedJadwal, setSelectedJadwal] = useState<string>('');
  const [absensis, setAbsensis] = useState<AbsensiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('jadwal_sesi')
        .select('*, modul(*)')
        .order('tanggal_kelas', { ascending: false })
        .limit(20);
      if (!error) setJadwals(data as JadwalSesi[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedJadwal) return;
    (async () => {
      setSaving(true);
      const data = await listAbsensiForSesi(selectedJadwal);
      setAbsensis(data ?? []);
      setSaving(false);
    })();
  }, [selectedJadwal]);

  const handleUpdate = async (id: string, status: Kehadiran) => {
    const { error } = await supabase.from('absensi').update({ status_kehadiran: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast(error.message, 'error');
    else {
      toast('Absensi diperbarui', 'success');
      setAbsensis(absensis.map((a) => (a.id === id ? { ...a, status_kehadiran: status } : a)));
    }
  };

  if (loading) return <Loading text="Memuat daftar sesi..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-[#F1F5F9]">Kelola Absensi</h1>

      <Card>
        <Field label="Pilih Sesi" className="max-w-xs">
          <SelectInput value={selectedJadwal} onChange={(e) => setSelectedJadwal(e.target.value)}>
            <option value="">— Pilih sesi —</option>
            {jadwals.map((j) => (
              <option key={j.id} value={j.id} className="bg-[#1E293B]">
                {j.tanggal_kelas ? formatJakarta(j.tanggal_kelas) : '-'} {j.kode_sesi_friendly}: {j.judul_sesi}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      {saving && <Loading text="Memuat absensi..." />}
      {!saving && !selectedJadwal && <EmptyState title="Pilih sesi" desc="Pilih sesi dari dropdown untuk melihat daftar hadir." />}
      {!saving && selectedJadwal && absensis.length === 0 && <EmptyState title="Belum ada absensi" desc="Absensi akan muncul saat peserta mengabsen." />}

      {!saving && selectedJadwal && absensis.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="px-4 py-3 text-left font-mono text-overline text-[#94A3B8] uppercase">Peserta</th>
                <th className="px-4 py-3 text-left font-mono text-overline text-[#94A3B8] uppercase">Status</th>
                <th className="px-4 py-3 text-left font-mono text-overline text-[#94A3B8] uppercase">Telat</th>
                <th className="px-4 py-3 text-left font-mono text-overline text-[#94A3B8] uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {absensis.map((a) => (
                <tr key={a.id} className="border-b border-[#1E293B] last:border-0 hover:bg-[#1E293B]">
                  <td className="px-4 py-3 text-[#F1F5F9]">{a.sesi_peserta?.peserta?.nama_panggil ?? a.sesi_peserta?.peserta?.nama_lengkap}</td>
                  <td className="px-4 py-3">
                    <Badge className="font-mono">{a.status_kehadiran}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{a.menit_telat ?? 0} menit</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(['hadir', 'telat', 'izin', 'alpha'] as Kehadiran[]).map((k) => (
                        <Button key={k} variant={a.status_kehadiran === k ? 'primary' : 'secondary'} size="sm" onClick={() => handleUpdate(a.id, k)}>
                          {k}
                        </Button>
                      ))}
                    </div>
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