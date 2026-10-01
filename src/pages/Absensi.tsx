import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { listAbsensiForSesi } from '../services/absensi';
import {
  Card,
  Loading,
  EmptyState,
  Badge,
  Button,
  Field,
  SelectInput,
  Stat,
  SectionHeader,
} from '../components/ui';
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

interface KelasRow {
  id: string;
  kode: string;
  nama: string | null;
  status: string | null;
  tanggal_mulai: string | null;
  tanggal_akhir: string | null;
}

type Ringkasan = Record<string, number>;

const STATUS_ABSENSI: Array<{ key: Kehadiran; label: string }> = [
  { key: 'hadir', label: 'Hadir' },
  { key: 'telat', label: 'Telat' },
  { key: 'izin', label: 'Izin' },
  { key: 'alpha', label: 'Alpha' },
];

const kosongkan = (): Ringkasan => ({ hadir: 0, telat: 0, izin: 0, alpha: 0 });

export default function AbsensiPage() {
  const { push: toast } = useToast();

  const [kelasList, setKelasList] = useState<KelasRow[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [sesiList, setSesiList] = useState<JadwalSesi[]>([]);
  const [selectedSesi, setSelectedSesi] = useState('');
  const [absensis, setAbsensis] = useState<AbsensiItem[]>([]);

  const [loadingKelas, setLoadingKelas] = useState(true);
  const [loadingSesi, setLoadingSesi] = useState(false);
  const [loadingAbsensi, setLoadingAbsensi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedSesi, setLoadedSesi] = useState('');
  const [absensiKelasMap, setAbsensiKelasMap] = useState<Map<string, AbsensiItem[]>>(new Map());

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('kelas')
          .select('id, kode, nama, status, tanggal_mulai, tanggal_akhir')
          .order('kode', { ascending: true });
        if (error) throw error;
        setKelasList((data ?? []) as KelasRow[]);
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setLoadingKelas(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!selectedKelas) {
      setSesiList([]);
      setSelectedSesi('');
      return;
    }
    (async () => {
      setLoadingSesi(true);
      setSelectedSesi('');
      setAbsensis([]);
      setLoadedSesi('');
      setAbsensiKelasMap(new Map());
      try {
        const { data: sesiData, error: sesiErr } = await supabase
          .from('jadwal_sesi')
          .select('*, modul(*)')
          .eq('kelas_id', selectedKelas)
          .order('tanggal_kelas', { ascending: true });
        if (sesiErr) throw sesiErr;
        const sessions = (sesiData ?? []) as JadwalSesi[];
        setSesiList(sessions);

        if (sessions.length > 0) {
          const sesiIds = sessions.map((s) => s.id);
          const { data: absData, error: absErr } = await supabase
            .from('absensi')
            .select('*, sesi_peserta!inner(sesi_id, peserta(nama_panggil, nama_lengkap))')
            .in('sesi_peserta.sesi_id', sesiIds);
          if (absErr) throw absErr;
          const absMap = new Map<string, AbsensiItem[]>();
          for (const a of (absData ?? []) as Array<AbsensiItem & { sesi_peserta: { sesi_id: string } }>) {
            const sid = a.sesi_peserta.sesi_id;
            if (!absMap.has(sid)) absMap.set(sid, []);
            absMap.get(sid)!.push(a);
          }
          setAbsensiKelasMap(absMap);
        } else {
          setAbsensiKelasMap(new Map());
        }
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setLoadingSesi(false);
      }
    })();
  }, [selectedKelas, toast]);

  useEffect(() => {
    if (!selectedSesi) {
      setAbsensis([]);
      setLoadedSesi('');
      return;
    }
    if (loadedSesi === selectedSesi) return;
    (async () => {
      setLoadingAbsensi(true);
      try {
        const data = await listAbsensiForSesi(selectedSesi);
        setAbsensis(data ?? []);
        setLoadedSesi(selectedSesi);
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setLoadingAbsensi(false);
      }
    })();
  }, [selectedSesi, loadedSesi, toast]);

  const handleUpdate = async (id: string, status: Kehadiran) => {
    if (absensis.length === 0) {
      toast('Belum ada peserta terdaftar di sesi ini', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('absensi')
        .update({ status_kehadiran: status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setAbsensis((prev) => prev.map((a) => (a.id === id ? { ...a, status_kehadiran: status } : a)));
      toast('Absensi diperbarui', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const ringkasanSesi = useMemo<Ringkasan>(() => {
    const r = kosongkan();
    for (const a of absensis) {
      if (a.status_kehadiran in r) r[a.status_kehadiran] += 1;
    }
    return r;
  }, [absensis]);

  const ringkasanKelas = useMemo<Ringkasan>(() => {
    const r = kosongkan();
    for (const s of sesiList) {
      const arr = absensiKelasMap.get(s.id);
      if (!Array.isArray(arr)) continue;
      for (const a of arr) {
        if (a.status_kehadiran in r) r[a.status_kehadiran] += 1;
      }
    }
    return r;
  }, [sesiList, absensiKelasMap]);

  const sesiTerpilih = sesiList.find((s) => s.id === selectedSesi) ?? null;
  const kelasTerpilih = kelasList.find((b) => b.id === selectedKelas) ?? null;

  if (loadingKelas) return <Loading text="Memuat daftar kelas..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-fg">Kelola Absensi</h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          Pilih kelas, lalu pilih sesi untuk melihat dan mengubah kehadiran peserta.
        </p>
      </div>

      <Card>
        <Field label="Pilih Kelas" className="max-w-md">
          <SelectInput value={selectedKelas} onChange={(e) => setSelectedKelas(e.target.value)}>
            <option value="">— pilih kelas —</option>
            {kelasList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.kode}
                {b.nama ? ` — ${b.nama}` : ''}
                {b.status ? ` (${b.status})` : ''}
              </option>
            ))}
          </SelectInput>
        </Field>

        {kelasTerpilih && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{kelasTerpilih.kode}</Badge>
            {kelasTerpilih.tanggal_mulai && <Badge>Mulai {kelasTerpilih.tanggal_mulai}</Badge>}
            {kelasTerpilih.tanggal_akhir && <Badge>Selesai {kelasTerpilih.tanggal_akhir}</Badge>}
          </div>
        )}
      </Card>

      {!selectedKelas && (
        <EmptyState
          title="Pilih kelas terlebih dahulu"
          desc="Absensi dihitung per sesi, jadi mulailah dari pilih kelas."
        />
      )}

      {selectedKelas && (
        <>
          <SectionHeader
            title={`Sesi di ${kelasTerpilih?.kode ?? 'kelas ini'}`}
            desc={`${sesiList.length} sesi terdaftar. Pilih satu sesi untuk mengelola absensi.`}
          />

          {loadingSesi && <Loading text="Memuat sesi..." />}

          {!loadingSesi && sesiList.length === 0 && (
            <EmptyState
              title="Belum ada sesi"
              desc="Tambahkan sesi dulu lewat menu Sesi / Jadwal."
            />
          )}

          {!loadingSesi && sesiList.length > 0 && (
            <>
              <div className="space-y-2">
                {sesiList.map((s) => {
                  const aktif = s.id === selectedSesi;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSesi(s.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        aktif
                          ? 'border-primary bg-surface-2'
                          : 'border-border-2 bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-fg">
                          {s.kode_sesi_friendly}
                        </span>
                        <span className="text-xs text-fg-muted">
                          {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : 'belum dijadwalkan'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-fg">{s.judul_sesi}</p>
                      <p className="mt-0.5 text-xs text-fg-subtle">
                        Modul: {s.modul?.kode ?? '-'} · {s.modul?.judul ?? '-'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {selectedSesi && (
        <Card>
          <SectionHeader
            title={sesiTerpilih ? `${sesiTerpilih.kode_sesi_friendly} — ${sesiTerpilih.judul_sesi}` : 'Absensi Sesi'}
            desc="Klik status untuk mengubah kehadiran peserta."
          />

          {selectedSesi && !loadingAbsensi && absensis.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_ABSENSI.map((s) => (
                <Stat
                  key={s.key}
                  value={ringkasanSesi[s.key]}
                  label={s.label}
                  accent={s.key === 'alpha' ? 'text-destructive' : 'text-fg'}
                />
              ))}
            </div>
          )}

          {loadingAbsensi && <Loading text="Memuat absensi..." />}

          {!loadingAbsensi && absensis.length === 0 && (
            <EmptyState
              title="Belum ada peserta di sesi ini"
              desc="Absensi muncul setelah peserta terdaftar ke sesi pada kelas ini."
            />
          )}

          {!loadingAbsensi && absensis.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-2">
                    <th className="px-4 py-3 text-left font-mono text-overline text-fg-muted uppercase">Peserta</th>
                    <th className="px-4 py-3 text-left font-mono text-overline text-fg-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-left font-mono text-overline text-fg-muted uppercase">Telat</th>
                    <th className="px-4 py-3 text-left font-mono text-overline text-fg-muted uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {absensis.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
                      <td className="px-4 py-3 text-fg">
                        {a.sesi_peserta?.peserta?.nama_panggil ?? a.sesi_peserta?.peserta?.nama_lengkap ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="font-mono">{a.status_kehadiran}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                        {a.menit_telat ?? 0} menit
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {STATUS_ABSENSI.map((k) => (
                            <Button
                              key={k.key}
                              variant={a.status_kehadiran === k.key ? 'primary' : 'secondary'}
                              size="sm"
                              disabled={saving}
                              onClick={() => handleUpdate(a.id, k.key)}
                            >
                              {k.label}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ringkasanKelas.hadir + ringkasanKelas.telat + ringkasanKelas.izin + ringkasanKelas.alpha > 0 && (
            <p className="mt-3 text-xs text-fg-muted">
              Rekap sesi yang sudah dimuat: {ringkasanKelas.hadir} hadir, {ringkasanKelas.telat} telat,{' '}
              {ringkasanKelas.izin} izin, {ringkasanKelas.alpha} alpha.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
