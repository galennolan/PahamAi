import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Loading, SelectInput, TextInput } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import { listJalurInfo } from '../services/modul';
import type { Batch, Jalur, JalurInfo, Modul, Peserta } from '../types';
import { JALUR_FALLBACK, jalurLabel } from '../types';

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

export default function KelolaBatchPage() {
  const { push: toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [jalurOptions, setJalurOptions] = useState<JalurInfo[]>(JALUR_FALLBACK);

  // wizard state (persisted to localStorage)
  const WIZARD_KEY = 'pahamai-batch-wizard';
  const [wizStep, setWizStep] = useState(() => {
    try {
      const saved = localStorage.getItem(WIZARD_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wizStep >= 1 && parsed.wizStep <= 3) return parsed.wizStep;
      }
    } catch { /* ignore */ }
    return 1;
  });
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(WIZARD_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) return { ...parsed.form, jalur: parsed.form.jalur ?? 'A' };
      }
    } catch { /* ignore */ }
    return {
      kode_batch: suggestKode('A'),
      jalur: 'A' as Jalur,
      nama_batch: '',
      tanggal_mulai: '',
      jam_mulai: '14:00',
      interval_hari: 7,
      lokasi: '',
      link_rapat: '',
      kapasitas_maks: 12,
    };
  });
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [modulsLoading, setModulsLoading] = useState(false);
  const [sesiDraft, setSesiDraft] = useState<SesiDraft[]>([]);
  const [pesertasAll, setPesertasAll] = useState<Peserta[]>([]);
  const [selectedPeserta, setSelectedPeserta] = useState<string[]>([]);
  const [pesertaSearch, setPesertaSearch] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(WIZARD_KEY, JSON.stringify({ wizStep, form }));
    } catch { /* ignore */ }
  }, [wizStep, form]);

  const load = async () => {
    const { data, error } = await supabase.from('batch').select('*').order('created_at', { ascending: false });
    if (!error) setBatches((data as Batch[]) ?? []);
    const list = await listJalurInfo(false);
    const pool = list.length > 0 ? list : JALUR_FALLBACK;
    setJalurOptions(pool.filter((j) => j.aktif).length > 0 ? pool.filter((j) => j.aktif) : pool);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  // load peserta saat wizard dibuka
  useEffect(() => {
    if (!showForm) return;
    (async () => {
      const { data } = await supabase.from('peserta').select('*').order('nama_lengkap');
      setPesertasAll((data as Peserta[]) ?? []);
    })();
  }, [showForm]);

  // load modul per jalur
  useEffect(() => {
    if (!showForm) return;
    (async () => {
      setModulsLoading(true);
      const { data } = await supabase
        .from('modul')
        .select('*')
        .eq('jalur', form.jalur)
        .order('urutan_sesi', { ascending: true });
      setModuls((data as Modul[]) ?? []);
      setModulsLoading(false);
    })();
  }, [showForm, form.jalur]);

  // auto-build draft sesi saat modul / tanggal / jam berubah dan draft masih kosong
  useEffect(() => {
    if (!showForm || moduls.length === 0) return;
    setSesiDraft((prev) => {
      if (prev.length > 0) return prev;
      return moduls.map((m, i) => {
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
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduls, showForm]);

  const rebuildDraft = () => {
    setSesiDraft(
      moduls.map((m, i) => {
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
      })
    );
  };

  const updateDraft = (key: string, patch: Partial<SesiDraft>) => {
    setSesiDraft((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const filteredPeserta = useMemo(() => {
    const q = pesertaSearch.trim().toLowerCase();
    return pesertasAll.filter((p) => {
      if (q && !`${p.nama_lengkap} ${p.email ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pesertasAll, pesertaSearch]);

  const seJalurCount = useMemo(
    () => pesertasAll.filter((p) => !p.jalur || p.jalur === form.jalur).length,
    [pesertasAll, form.jalur]
  );

  const includedSesi = sesiDraft.filter((s) => s.included);
  const overCapacity = selectedPeserta.length > form.kapasitas_maks;
  const canNext1 = form.kode_batch.trim() !== '' && form.tanggal_mulai !== '' && form.kapasitas_maks >= 1;
  const lastTanggal = includedSesi.length > 0 ? includedSesi.map((s) => s.tanggal).filter(Boolean).sort().pop() ?? null : null;

  const togglePeserta = (id: string) => {
    setSelectedPeserta((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openWizard = () => {
    setWizStep(1);
    setSesiDraft([]);
    setSelectedPeserta([]);
    setPesertaSearch('');
    setForm((f: typeof form) => ({ ...f, kode_batch: f.kode_batch || suggestKode(f.jalur) }));
    setShowForm(true);
  };

  const goNext = () => {
    if (wizStep === 1 && !canNext1) {
      toast('Lengkapi kode, tanggal mulai, dan kapasitas dulu', 'error');
      return;
    }
    if (wizStep === 2 && overCapacity) {
      toast(`Peserta melebihi kapasitas (${form.kapasitas_maks})`, 'error');
      return;
    }
    setWizStep((s: number) => Math.min(3, s + 1));
  };

  const handleWizardSubmit = async () => {
    if (!canNext1) {
      toast('Lengkapi info kelas dulu', 'error');
      setWizStep(1);
      return;
    }
    if (overCapacity) {
      toast('Kurangi peserta sesuai kapasitas', 'error');
      setWizStep(2);
      return;
    }
    if (includedSesi.length === 0) {
      toast('Pilih minimal 1 sesi', 'error');
      return;
    }
    if (includedSesi.some((s) => !s.tanggal)) {
      toast('Isi tanggal semua sesi yang dipilih', 'error');
      return;
    }
    setSaving(true);
    try {
      // 1. buat batch
      const { data: batchRow, error: batchErr } = await supabase
        .from('batch')
        .insert({
          kode_batch: form.kode_batch.trim(),
          jalur: form.jalur,
          nama_batch: form.nama_batch.trim() || null,
          tanggal_mulai: form.tanggal_mulai || null,
          tanggal_akhir: lastTanggal,
          kapasitas_maks: form.kapasitas_maks,
          terdaftar: selectedPeserta.length,
          status: 'terbuka',
        })
        .select()
        .single();
      if (batchErr || !batchRow) throw new Error(batchErr?.message ?? 'Gagal membuat kelas');
      const batchId = (batchRow as Batch).id;

      // 2. buat sesi dari draft
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

      // 3. assign peserta ke batch + daftarkan ke semua sesi
      if (selectedPeserta.length > 0) {
        const { error: pErr } = await supabase.from('peserta').update({ batch_id: batchId }).in('id', selectedPeserta);
        if (pErr) throw new Error(`Sesi dibuat, tapi assign peserta gagal: ${pErr.message}`);
        const spRows = sesiIds.flatMap((sesi_id) => selectedPeserta.map((peserta_id) => ({ sesi_id, peserta_id })));
        if (spRows.length > 0) {
          const { error: spErr } = await supabase.from('sesi_peserta').insert(spRows);
          if (spErr) throw new Error(`Peserta ter-assign ke kelas, tapi pendaftaran sesi gagal: ${spErr.message}`);
        }
      }

      toast(`Kelas dibuat: ${includedSesi.length} sesi, ${selectedPeserta.length} peserta`, 'success');
      setShowForm(false);
      setWizStep(1);
      setSesiDraft([]);
      setSelectedPeserta([]);
      try { localStorage.removeItem(WIZARD_KEY); } catch { /* ignore */ }
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal membuat kelas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (batch: Batch, status: string) => {
    const { error } = await supabase.from('batch').update({ status }).eq('id', batch.id);
    if (error) toast(error.message, 'error');
    else {
      toast(`Status kelas → ${STATUS_LABELS[status] ?? status}`, 'success');
      await load();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    const { error } = await supabase.from('batch').delete().eq('id', deleting.id);
    setSaving(false);
    setDeleting(null);
    if (error) toast(error.message, 'error');
    else {
      toast('Kelas dihapus', 'success');
      await load();
    }
  };

  if (loading) return <Loading text="Memuat kelas..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Kelas</h1>
          <p className="text-sm text-fg-muted">Buat kelas sekali jalan: info kelas, pilih peserta, sesi otomatis dari modul.</p>
        </div>
        {!showForm && (
          <Button onClick={openWizard}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Buat Kelas
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="!p-5 sm:!p-6">
          {/* step indicator */}
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
                  aria-label={`Langkah ${s.n}: ${s.label}`}
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
                <Field label="Nama Kelas" hint="Cth: Kelas Anak Angkatan 3 — Solo">
                  <TextInput
                    placeholder="Kelas Anak Angkatan 3"
                    value={form.nama_batch}
                    onChange={(e) => setForm({ ...form, nama_batch: e.target.value })}
                  />
                </Field>
                <Field label="Kode Kelas" hint="Unik, cth: PAHAI/A/2601">
                                  <div className="flex gap-2">
                  <TextInput
                    placeholder="PAHAI/A/2601"
                    value={form.kode_batch}
                    disabled
                    className="bg-surface-2/50"
                  />
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
                      setForm({ ...form, jalur, kode_batch: form.kode_batch.startsWith('PAHAI/') ? suggestKode(jalur) : form.kode_batch });
                      setSesiDraft([]);
                    }}
                  >
                    {jalurOptions.map((j) => (
                      <option key={j.kode} value={j.kode} className="bg-surface">{j.label}</option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Tanggal Mulai" hint="Sesi 1 jatuh di tanggal ini">
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
                <Field label="Jam Default" hint="Dipakai semua sesi, bisa diubah per sesi">
                  <TextInput type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} />
                </Field>
                <Field label="Jarak Antar Sesi (hari)" hint="7 = mingguan">
                  <TextInput
                    type="number" min={1} max={30} value={form.interval_hari}
                    onChange={(e) => setForm({ ...form, interval_hari: parseInt(e.target.value) || 7 })}
                  />
                </Field>
                <Field label="Lokasi Default">
                  <TextInput placeholder="Ruang 1 / Online" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} />
                </Field>
              </div>
              <Field label="Link Rapat Default" hint="Opsional, dipakai semua sesi">
                <TextInput placeholder="https://meet..." value={form.link_rapat} onChange={(e) => setForm({ ...form, link_rapat: e.target.value })} />
              </Field>
              <p className="rounded-[8px] border border-[accent]/25 bg-accent/5 px-4 py-3 text-xs text-fg-muted">
                {modulsLoading
                  ? 'Memuat modul...'
                  : `${moduls.length} modul di jalur ${form.jalur} akan otomatis jadi sesi di langkah 3.`}
              </p>
            </div>
          )}

          {/* STEP 2 */}
          {wizStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-fg-muted">
                  Terpilih <span className={`font-bold ${overCapacity ? 'text-destructive' : 'text-primary-text'}`}>{selectedPeserta.length}</span>
                  {' / '}{form.kapasitas_maks} kursi · {seJalurCount} calon sesuai jalur {form.jalur}
                </p>
                <TextInput
                  placeholder="Cari nama / email..."
                  value={pesertaSearch}
                  onChange={(e) => setPesertaSearch(e.target.value)}
                  className="!w-full sm:!w-64"
                />
              </div>
              {overCapacity && <p className="text-xs font-medium text-destructive">Kurangi peserta agar sesuai kapasitas.</p>}
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-[8px] border border-border-2 p-3">
                {filteredPeserta.length === 0 && (
                  <p className="py-6 text-center text-sm text-fg-subtle">Tidak ada peserta. Tambahkan dulu di menu Peserta.</p>
                )}
                {filteredPeserta.map((p) => {
                  const checked = selectedPeserta.includes(p.id);
                  const mismatch = p.jalur && p.jalur !== form.jalur;
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
                        onChange={() => togglePeserta(p.id)}
                        className="h-5 w-5 shrink-0 accent-[primary]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{p.nama_lengkap}</span>
                        <span className="block truncate text-xs text-fg-subtle">{p.email ?? p.no_wa ?? '—'}{p.batch_id ? ' · sudah ada kelas' : ''}</span>
                      </span>
                      <Badge className={mismatch ? 'border-[destructive]/30 text-destructive' : ''}>{p.jalur ?? '—'}</Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {wizStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-fg-muted">
                  <span className="font-bold text-primary-text">{includedSesi.length}</span> sesi ·{' '}
                  <span className="font-bold text-fg">{selectedPeserta.length}</span> peserta
                  {lastTanggal ? ` · berakhir ${formatJakarta(lastTanggal)}` : ''}
                </p>
                <Button type="button" variant="secondary" size="sm" onClick={rebuildDraft} disabled={moduls.length === 0}>
                  Generate ulang dari modul
                </Button>
              </div>
              {modulsLoading && <Loading text="Memuat modul..." />}
              {!modulsLoading && sesiDraft.length === 0 && (
                <EmptyState title="Belum ada modul" desc={`Tidak ada modul di jalur ${form.jalur}. Buat modul dulu di menu Modul.`} />
              )}
              <div className="space-y-2">
                {sesiDraft.map((s) => (
                  <div
                    key={s.key}
                    className={`rounded-[8px] border p-3 transition ${s.included ? 'border-border-2 bg-bg' : 'border-border bg-bg/50 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={s.included}
                        onChange={(e) => updateDraft(s.key, { included: e.target.checked })}
                        className="h-5 w-5 shrink-0 accent-[primary]"
                        aria-label={`Sertakan ${s.kode}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm font-semibold text-primary-text">{s.kode} <span className="font-body font-normal text-fg">— {s.judul}</span></p>
                        <p className="text-xs text-fg-subtle">{s.durasi} mnt</p>
                      </div>
                    </div>
                    {s.included && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Field label="Tanggal">
                          <TextInput type="date" value={s.tanggal} onChange={(e) => updateDraft(s.key, { tanggal: e.target.value })} />
                        </Field>
                        <Field label="Mulai">
                          <TextInput
                            type="time" value={s.jam_mulai}
                            onChange={(e) => {
                              const jam_mulai = e.target.value;
                              updateDraft(s.key, { jam_mulai, jam_akhir: addMinutes(jam_mulai, s.durasi) });
                            }}
                          />
                        </Field>
                        <Field label="Selesai">
                          <TextInput type="time" value={s.jam_akhir} onChange={(e) => updateDraft(s.key, { jam_akhir: e.target.value })} />
                        </Field>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* nav */}
          <div className="mt-6 flex gap-2">
            {wizStep > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setWizStep((s: number) => s - 1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Kembali
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
                Batal
              </Button>
            )}
            {wizStep < 3 ? (
              <Button type="button" onClick={goNext} className="flex-1">
                Lanjut <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button type="button" onClick={handleWizardSubmit} disabled={saving} className="flex-1">
                {saving ? 'Membuat kelas...' : `Buat Kelas (${includedSesi.length} sesi)`}
              </Button>
            )}
          </div>
        </Card>
      )}

      {!showForm && batches.length === 0 && (
        <EmptyState title="Belum ada kelas" desc="Buat kelas untuk mulai menjadwalkan sesi." />
      )}

      {!showForm && (
        <div className="grid gap-4">
          {batches.map((b) => {
            const fill = b.kapasitas_maks ? Math.round((b.terdaftar / b.kapasitas_maks) * 100) : 0;
            return (
              <Card key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-primary-text">{b.kode_batch}</p>
                    <p className="text-sm text-fg">{b.nama_batch ?? jalurLabel(jalurOptions, b.jalur)}</p>
                    <p className="mt-1 text-xs text-fg-subtle">
                      {b.tanggal_mulai ? formatJakarta(b.tanggal_mulai) : '-'} → {b.tanggal_akhir ? formatJakarta(b.tanggal_akhir) : '-'}
                    </p>
                    <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(fill, 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-fg-subtle">{b.terdaftar}/{b.kapasitas_maks ?? '-'} peserta ({fill}%)</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(STATUS_LABELS).map((s) => (
                        <Button key={s} size="sm" variant={b.status === s ? 'primary' : 'secondary'} onClick={() => updateStatus(b, s)}>
                          {STATUS_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleting(b)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title="Hapus Kelas?"
          message={`Kelas "${deleting.kode_batch}" beserta seluruh sesi dan absensinya akan dihapus permanen.`}
          confirmLabel="Hapus"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={saving}
        />
      )}
    </div>
  );
}
