import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Field, TextInput, SelectInput, EmptyState, Loading, ConfirmDialog, Badge } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import { JALUR_FALLBACK, jalurLabel } from '../types';
import type { Batch, Jalur, JalurInfo, Modul, Peserta, JadwalSesi } from '../types';
import { Plus, Users, UserPlus, UserMinus, ArrowLeft, ArrowRight, Check, BookOpen, CalendarDays } from 'lucide-react';
import { listJalurInfo } from '../services/modul';

const STATUS_LABELS: Record<string, string> = {
  terbuka: 'Terbuka',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

type SesiDraft = {
  key: string;
  modul_id: string;
  kode: string;
  judul: string;
  tanggal: string;
  jam_mulai: string;
  jam_akhir: string;
  durasi: number;
  included: boolean;
};

function addDaysISO(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function addMinutes(timeStr: string, mins: number): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function suggestKode(jalur: Jalur): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  if (jalur === 'G') return `GAFB/${yy}${mm}`;
  return `PAHAI/${jalur}/${yy}${mm}`;
}

const STEPS = [
  { n: 1, label: 'Info Kelas', icon: BookOpen },
  { n: 2, label: 'Peserta', icon: Users },
  { n: 3, label: 'Sesi & Tanggal', icon: CalendarDays },
];

export default function KelolaKelasPage() {
  const { push: toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchPeserta, setBatchPeserta] = useState<Peserta[]>([]);
  const [batchJadwal, setBatchJadwal] = useState<JadwalSesi[]>([]);
  const [allPeserta, setAllPeserta] = useState<Peserta[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [jalurOptions, setJalurOptions] = useState<JalurInfo[]>(JALUR_FALLBACK);
  const [addPesertaModal, setAddPesertaModal] = useState(false);
  const [searchAdd, setSearchAdd] = useState('');

  // Wizard state
  const [wizStep, setWizStep] = useState(1);
  const [form, setForm] = useState({
    kode_batch: suggestKode('A'),
    jalur: 'A' as Jalur,
    nama_batch: '',
    tanggal_mulai: '',
    jam_mulai: '14:00',
    interval_hari: 7,
    lokasi: '',
    link_rapat: '',
    kapasitas_maks: 12,
  });
  const [, setModuls] = useState<Modul[]>([]);
  const [modulsLoading, setModulsLoading] = useState(false);
  const [sesiDraft, setSesiDraft] = useState<SesiDraft[]>([]);
  const [selectedPesertaWizard, setSelectedPesertaWizard] = useState<string[]>([]);
  const [pesertaSearch, setPesertaSearch] = useState('');

  const load = async () => {
    const { data, error } = await supabase.from('batch').select('*').order('created_at', { ascending: false });
    if (!error) setBatches((data as Batch[]) ?? []);
    const list = await listJalurInfo(false);
    const pool = list.length > 0 ? list : JALUR_FALLBACK;
    setJalurOptions(pool.filter((j) => j.aktif).length > 0 ? pool.filter((j) => j.aktif) : pool);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e) {
        console.error('[KelolaKelas] gagal memuat kelas:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // load peserta saat detail kelas dibuka atau wizard dibuka
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('peserta').select('*').order('nama_lengkap');
      setAllPeserta((data as Peserta[]) ?? []);
    })();
  }, [selectedBatch, showWizard]);

  // load detail kelas (peserta & jadwal)
  useEffect(() => {
    if (!selectedBatch) return;
    (async () => {
      const [{ data: p }, { data: j }] = await Promise.all([
        supabase.from('peserta').select('*').eq('batch_id', selectedBatch.id).order('nama_lengkap'),
        supabase.from('jadwal_sesi').select('*, modul(*)').eq('batch_id', selectedBatch.id).order('tanggal_kelas'),
      ]);
      setBatchPeserta((p as Peserta[]) ?? []);
      setBatchJadwal((j as JadwalSesi[]) ?? []);
    })();
  }, [selectedBatch]);

  // load modul untuk wizard
  useEffect(() => {
    if (!showWizard) return;
    (async () => {
      setModulsLoading(true);
      try {
        const { data } = await supabase
          .from('modul')
          .select('*')
          .eq('jalur', form.jalur)
          .order('urutan_sesi', { ascending: true });
        const list = (data as Modul[]) ?? [];
        setModuls(list);
        setSesiDraft(
          list.map((m, i) => {
            const tanggal = form.tanggal_mulai ? addDaysISO(form.tanggal_mulai, i * form.interval_hari) : '';
            return {
              key: m.id,
              modul_id: m.id,
              kode: m.kode,
              judul: m.judul,
              tanggal,
              jam_mulai: form.jam_mulai,
              jam_akhir: addMinutes(form.jam_mulai, m.durasi_menit || 60),
              durasi: m.durasi_menit || 60,
              included: true,
            };
          }),
        );
      } catch (e) {
        console.error('[KelolaKelas] gagal memuat modul wizard:', e);
      } finally {
        setModulsLoading(false);
      }
    })();
  }, [showWizard, form.jalur]);

  const updateDraft = (key: string, patch: Partial<SesiDraft>) => {
    setSesiDraft((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const includedSesi = sesiDraft.filter((s) => s.included);
  const overCapacity = selectedPesertaWizard.length > form.kapasitas_maks;
  const canNext1 = form.kode_batch.trim() !== '' && form.tanggal_mulai !== '' && form.kapasitas_maks >= 1;
  const lastTanggal = includedSesi.length > 0 ? includedSesi.map((s) => s.tanggal).filter(Boolean).sort().pop() ?? null : null;

  const handleWizardSubmit = async () => {
    if (includedSesi.length === 0 || includedSesi.some((s) => !s.tanggal)) {
      toast('Lengkapi sesi dan tanggal terlebih dahulu', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data: batchRow, error: batchErr } = await supabase
        .from('batch')
        .insert({
          kode_batch: form.kode_batch.trim(),
          jalur: form.jalur,
          nama_batch: form.nama_batch.trim() || null,
          tanggal_mulai: form.tanggal_mulai || null,
          tanggal_akhir: lastTanggal,
          kapasitas_maks: form.kapasitas_maks,
          terdaftar: selectedPesertaWizard.length,
          status: 'terbuka',
        })
        .select()
        .single();
      if (batchErr || !batchRow) throw new Error(batchErr?.message ?? 'Gagal membuat kelas');
      const batchId = (batchRow as Batch).id;

      const jadwalRows = includedSesi.map((s) => ({
        modul_id: s.modul_id,
        batch_id: batchId,
        kode_sesi_friendly: s.kode,
        judul_sesi: s.judul,
        tanggal_kelas: s.tanggal || null,
        jam_mulai: s.jam_mulai || null,
        jam_akhir: s.jam_akhir || null,
        link_rapat: form.link_rapat.trim() || null,
        lokasi: form.lokasi.trim() || null,
        status_sesi: 'belum',
      }));
      const { data: sesiRows, error: sesiErr } = await supabase.from('jadwal_sesi').insert(jadwalRows).select();
      if (sesiErr) throw new Error(`Kelas dibuat, tapi sesi gagal: ${sesiErr.message}`);
      const sesiIds = ((sesiRows ?? []) as Array<{ id: string }>).map((r) => r.id);

      if (selectedPesertaWizard.length > 0) {
        await supabase.from('peserta').update({ batch_id: batchId }).in('id', selectedPesertaWizard);
        const spRows = sesiIds.flatMap((sesi_id) => selectedPesertaWizard.map((peserta_id) => ({ sesi_id, peserta_id })));
        if (spRows.length > 0) {
          await supabase.from('sesi_peserta').insert(spRows);
        }
      }

      toast('Kelas berhasil dibuat!', 'success');
      setShowWizard(false);
      await load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addPesertaToBatch = async (pesertaId: string) => {
    if (!selectedBatch) return;
    try {
      // update peserta batch_id
      await supabase.from('peserta').update({ batch_id: selectedBatch.id }).eq('id', pesertaId);
      // daftarkan ke semua jadwal sesi di batch ini
      const sesiIds = batchJadwal.map((s) => s.id);
      if (sesiIds.length > 0) {
        const spRows = sesiIds.map((sesi_id) => ({ sesi_id, peserta_id: pesertaId }));
        await supabase.from('sesi_peserta').insert(spRows);
      }
      // update count terdaftar
      await supabase.from('batch').update({ terdaftar: batchPeserta.length + 1 }).eq('id', selectedBatch.id);

      toast('Peserta ditambahkan ke kelas', 'success');
      // reload detail
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from('peserta').select('*').eq('batch_id', selectedBatch.id).order('nama_lengkap'),
        supabase.from('batch').select('*').eq('id', selectedBatch.id).single(),
      ]);
      setBatchPeserta((p as Peserta[]) ?? []);
      if (b) setSelectedBatch(b as Batch);
      await load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
  };

  const removePesertaFromBatch = async (pesertaId: string) => {
    if (!selectedBatch) return;
    try {
      await supabase.from('peserta').update({ batch_id: null }).eq('id', pesertaId);
      // hapus sesi_peserta untuk sesi di batch ini
      const sesiIds = batchJadwal.map((s) => s.id);
      if (sesiIds.length > 0) {
        await supabase.from('sesi_peserta').delete().eq('peserta_id', pesertaId).in('sesi_id', sesiIds);
      }
      await supabase.from('batch').update({ terdaftar: Math.max(0, batchPeserta.length - 1) }).eq('id', selectedBatch.id);

      toast('Peserta dikeluarkan dari kelas', 'success');
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from('peserta').select('*').eq('batch_id', selectedBatch.id).order('nama_lengkap'),
        supabase.from('batch').select('*').eq('id', selectedBatch.id).single(),
      ]);
      setBatchPeserta((p as Peserta[]) ?? []);
      if (b) setSelectedBatch(b as Batch);
      await load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
  };

  const updateBatchStatus = async (status: string) => {
    if (!selectedBatch) return;
    const { error } = await supabase.from('batch').update({ status }).eq('id', selectedBatch.id);
    if (error) toast(error.message, 'error');
    else {
      toast(`Status kelas → ${STATUS_LABELS[status] ?? status}`, 'success');
      setSelectedBatch({ ...selectedBatch, status });
      await load();
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleting) return;
    setSaving(true);
    const { error } = await supabase.from('batch').delete().eq('id', deleting.id);
    setSaving(false);
    setDeleting(null);
    if (error) toast(error.message, 'error');
    else {
      toast('Kelas dihapus', 'success');
      setSelectedBatch(null);
      await load();
    }
  };

  const availablePesertaToAdd = useMemo(() => {
    const inBatch = new Set(batchPeserta.map((p) => p.id));
    const q = searchAdd.trim().toLowerCase();
    return allPeserta.filter((p) => {
      if (inBatch.has(p.id)) return false;
      if (q && !`${p.nama_lengkap} ${p.email ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allPeserta, batchPeserta, searchAdd]);

  if (loading) return <Loading text="Memuat kelas..." />;

  // DETAIL KELAS VIEW
  if (selectedBatch) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedBatch(null)}
            className="inline-flex items-center gap-1.5 font-mono text-sm text-fg-muted hover:text-primary-text"
          >
            ← Kembali ke Daftar Kelas
          </button>
          <div className="flex items-center gap-2">
            {Object.keys(STATUS_LABELS).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={selectedBatch.status === s ? 'primary' : 'secondary'}
                onClick={() => updateBatchStatus(s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(selectedBatch)}>
              Hapus Kelas
            </Button>
          </div>
        </div>

        <Card className="border-primary/25">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-bold text-primary-text">{selectedBatch.kode_batch}</span>
              <h1 className="mt-1 text-xl font-bold text-fg">{selectedBatch.nama_batch ?? jalurLabel(jalurOptions, selectedBatch.jalur)}</h1>
              <p className="mt-1 text-xs text-fg-subtle">
                Jalur: <span className="font-mono font-bold">{selectedBatch.jalur}</span> ·
                Mulai: {selectedBatch.tanggal_mulai ? formatJakarta(selectedBatch.tanggal_mulai) : '-'} ·
                Kapasitas: {batchPeserta.length}/{selectedBatch.kapasitas_maks ?? '∞'} peserta
              </p>
            </div>
          </div>
        </Card>

        {/* PESERTA DI KELAS INI */}
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-subhead font-semibold text-fg">Daftar Peserta di Kelas ({batchPeserta.length})</h2>
            <Button size="sm" onClick={() => setAddPesertaModal(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Tambah Peserta
            </Button>
          </div>

          {batchPeserta.length === 0 ? (
            <EmptyState title="Belum ada peserta" desc="Tambahkan peserta ke kelas ini." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-2">
                    <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Nama</th>
                    <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Kontak</th>
                    <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Usia / Jalur</th>
                    <th className="px-3 py-2 text-right font-mono text-overline uppercase text-fg-muted">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {batchPeserta.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                      <td className="px-3 py-2 text-fg font-medium">{p.nama_lengkap}</td>
                      <td className="px-3 py-2 text-xs text-fg-muted">{p.email ?? p.no_wa ?? '-'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-fg-muted">{p.usia ? `${p.usia} th` : '-'} · {p.jalur}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removePesertaFromBatch(p.id)}>
                          <UserMinus className="h-4 w-4" /> Keluarkan
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* JADWAL SESI DI KELAS INI */}
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-fg">Jadwal Sesi ({batchJadwal.length})</h2>
          {batchJadwal.length === 0 ? (
            <EmptyState title="Belum ada sesi" desc="Sesi otomatis terbuat saat membuat kelas dari modul." />
          ) : (
            <div className="space-y-2">
              {batchJadwal.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-[8px] border border-border-2 p-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-primary-text">{s.kode_sesi_friendly}</span>
                    <p className="font-semibold text-fg">{s.judul_sesi}</p>
                    <p className="font-mono text-xs text-fg-subtle">
                      {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : 'Belum dijadwalkan'}
                      {s.jam_mulai && ` · ${s.jam_mulai}–${s.jam_akhir ?? ''}`}
                    </p>
                  </div>
                  <Badge>{s.status_sesi}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* MODAL TAMBAH PESERTA */}
        {addPesertaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-subhead font-semibold text-fg">Tambah Peserta ke Kelas</h3>
                <button type="button" onClick={() => setAddPesertaModal(false)} className="text-fg-muted hover:text-fg">✕</button>
              </div>
              <TextInput
                placeholder="Cari nama atau email..."
                value={searchAdd}
                onChange={(e) => setSearchAdd(e.target.value)}
              />
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {availablePesertaToAdd.length === 0 ? (
                  <p className="py-6 text-center text-sm text-fg-subtle">Tidak ada peserta tersedia.</p>
                ) : (
                  availablePesertaToAdd.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-[8px] border border-border-2 p-2.5">
                      <div>
                        <p className="text-sm font-medium text-fg">{p.nama_lengkap}</p>
                        <p className="text-xs text-fg-subtle">{p.email ?? p.no_wa ?? '-'} · {p.jalur}</p>
                      </div>
                      <Button size="sm" onClick={() => addPesertaToBatch(p.id)}>
                        + Masukkan
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <Button variant="secondary" onClick={() => setAddPesertaModal(false)} className="w-full">Tutup</Button>
            </Card>
          </div>
        )}

        {deleting && (
          <ConfirmDialog
            title="Hapus Kelas?"
            message={`Kelas "${deleting.kode_batch}" beserta seluruh sesi dan absensinya akan dihapus permanen.`}
            confirmLabel="Hapus"
            onConfirm={handleDeleteBatch}
            onCancel={() => setDeleting(null)}
            busy={saving}
          />
        )}
      </div>
    );
  }

  // WIZARD BUAT KELAS
  if (showWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setShowWizard(false)} className="font-mono text-sm text-fg-muted hover:text-primary-text">
            ← Batal
          </button>
          <h1 className="text-subhead font-bold text-fg">Buat Kelas Baru</h1>
        </div>

        <Card className="!p-5 sm:!p-6">
          <div className="mb-6 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWizStep(s.n)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition ${
                    wizStep === s.n
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))]'
                      : wizStep > s.n
                        ? 'border-[success] bg-success/15 text-success'
                        : 'border-border-2 bg-bg text-fg-subtle'
                  }`}
                >
                  {wizStep > s.n ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </button>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${wizStep === s.n ? 'text-primary-text' : 'text-fg-muted'}`}>
                    {s.n}. {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && <div className="mx-1 h-px flex-1 bg-surface-2" />}
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          {wizStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama Kelas" hint="Cth: Kelas Anak Angkatan 3">
                  <TextInput
                    placeholder="Kelas Anak Angkatan 3"
                    value={form.nama_batch}
                    onChange={(e) => setForm({ ...form, nama_batch: e.target.value })}
                  />
                </Field>
                <Field label="Kode Kelas">
                  <div className="flex gap-2">
                    <TextInput value={form.kode_batch} disabled className="bg-surface-2/50" />
                    <Button type="button" variant="secondary" onClick={() => setForm({ ...form, kode_batch: suggestKode(form.jalur) })}>
                      Refresh
                    </Button>
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Jalur">
                  <SelectInput
                    value={form.jalur}
                    onChange={(e) => {
                      const jalur = e.target.value as Jalur;
                      setForm({ ...form, jalur, kode_batch: suggestKode(jalur) });
                    }}
                  >
                    {jalurOptions.map((j) => (
                      <option key={j.kode} value={j.kode} className="bg-surface">{j.label}</option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Tanggal Mulai">
                  <TextInput type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} required />
                </Field>
                <Field label="Kapasitas Maks">
                  <TextInput
                    type="number" min={1} value={form.kapasitas_maks}
                    onChange={(e) => setForm({ ...form, kapasitas_maks: parseInt(e.target.value) || 1 })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Jam Default">
                  <TextInput type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} />
                </Field>
                <Field label="Jarak Antar Sesi (hari)">
                  <TextInput
                    type="number" min={1} max={30} value={form.interval_hari}
                    onChange={(e) => setForm({ ...form, interval_hari: parseInt(e.target.value) || 7 })}
                  />
                </Field>
                <Field label="Lokasi Default">
                  <TextInput placeholder="Ruang 1 / Online" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {wizStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-fg-muted">
                  Terpilih <span className={`font-bold ${overCapacity ? 'text-destructive' : 'text-primary-text'}`}>{selectedPesertaWizard.length}</span> / {form.kapasitas_maks} kursi
                </p>
                <TextInput
                  placeholder="Cari peserta..."
                  value={pesertaSearch}
                  onChange={(e) => setPesertaSearch(e.target.value)}
                  className="!w-64"
                />
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-[8px] border border-border-2 p-3">
                {allPeserta.length === 0 ? (
                  <p className="py-6 text-center text-sm text-fg-subtle">Belum ada peserta. Tambahkan di menu Peserta.</p>
                ) : (
                  allPeserta.map((p) => {
                    const checked = selectedPesertaWizard.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2.5 transition ${
                          checked ? 'border-primary/50 bg-primary/5' : 'border-border-2 bg-bg hover:border-border-3'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedPesertaWizard((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]));
                          }}
                          className="h-5 w-5 shrink-0 accent-[primary]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{p.nama_lengkap}</span>
                          <span className="block truncate text-xs text-fg-subtle">{p.email ?? p.no_wa ?? '—'}</span>
                        </span>
                        <Badge>{p.jalur ?? '—'}</Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {wizStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-fg-muted">
                <span className="font-bold text-primary-text">{includedSesi.length}</span> sesi dari modul jalur {form.jalur}
              </p>
              {modulsLoading && <Loading text="Memuat modul..." />}
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {sesiDraft.map((s) => (
                  <div key={s.key} className="flex items-center gap-3 rounded-[8px] border border-border-2 p-3 bg-bg">
                    <input
                      type="checkbox"
                      checked={s.included}
                      onChange={(e) => updateDraft(s.key, { included: e.target.checked })}
                      className="h-5 w-5 shrink-0 accent-[primary]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold text-primary-text">{s.kode} — {s.judul}</p>
                    </div>
                    <TextInput
                      type="date"
                      value={s.tanggal}
                      onChange={(e) => updateDraft(s.key, { tanggal: e.target.value })}
                      className="!w-40"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="mt-6 flex gap-2">
            {wizStep > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setWizStep((s) => s - 1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setShowWizard(false)} className="flex-1">
                Batal
              </Button>
            )}
            {wizStep < 3 ? (
              <Button type="button" onClick={() => {
                if (wizStep === 1 && !canNext1) {
                  toast('Lengkapi info kelas dulu', 'error');
                  return;
                }
                setWizStep((s) => s + 1);
              }} className="flex-1">
                Lanjut <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleWizardSubmit} disabled={saving} className="flex-1">
                {saving ? 'Membuat...' : 'Simpan & Buat Kelas'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // DAFTAR KELAS VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Kelas</h1>
          <p className="text-sm text-fg-muted">Buat kelas, cek isi peserta, dan atur sesi dalam satu halaman.</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="mr-2 h-4 w-4" /> Buat Kelas
        </Button>
      </div>

      {batches.length === 0 ? (
        <EmptyState title="Belum ada kelas" desc="Buat kelas baru untuk mulai menjadwalkan." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <Card key={b.id} className="flex flex-col justify-between hover:border-primary/50 transition">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary-text">{b.kode_batch}</span>
                  <Badge>{STATUS_LABELS[b.status] ?? b.status}</Badge>
                </div>
                <h3 className="mt-2 text-lg font-bold text-fg">{b.nama_batch ?? jalurLabel(jalurOptions, b.jalur)}</h3>
                <p className="mt-1 text-xs text-fg-subtle">
                  Jalur: <span className="font-mono font-bold">{b.jalur}</span> · Terdaftar: <span className="font-bold text-primary-text">{b.terdaftar}</span>/{b.kapasitas_maks ?? '∞'}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-border-2">
                <Button size="sm" className="w-full" onClick={() => setSelectedBatch(b)}>
                  Kelola Kelas & Peserta →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
