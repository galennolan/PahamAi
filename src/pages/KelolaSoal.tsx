import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, TextArea, Tabs, SectionHeader } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul, SoalButir, SoalPaket } from '../types';
import { PROGRAM, programDariKodeModul, programLabel, type ProgramKode } from '../constants/program';
import {
  parseSoalBulk,
  soalKeTeks,
  TEMPLATE_SOAL_BULK,
  TEMPLATE_SOAL_SATUBARIS,
  type SoalBulk as ParsedSoal,
  type MasalahBulk,
} from '../lib/parse-soal-bulk';

const TIPE_LABELS: Record<string, string> = {
  kuis: 'Kuis Sesi',
  pre_test: 'Pre-Test',
  post_test: 'Post-Test',
};

const PROGRAM_URUT: ProgramKode[] = PROGRAM.map((p) => p.kode);

interface ButirForm {
  no_soal: number;
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  kunci: string;
  pembahasan: string;
  bobot_skor: number;
}

const EMPTY_BUTIR: ButirForm = {
  no_soal: 1,
  pertanyaan: '',
  pilihan_a: '',
  pilihan_b: '',
  pilihan_c: '',
  pilihan_d: '',
  kunci: '',
  pembahasan: '',
  bobot_skor: 1,
};

function butirKeForm(s: SoalButir): ButirForm {
  return {
    no_soal: s.no_soal,
    pertanyaan: s.pertanyaan,
    pilihan_a: s.pilihan_a ?? '',
    pilihan_b: s.pilihan_b ?? '',
    pilihan_c: s.pilihan_c ?? '',
    pilihan_d: s.pilihan_d ?? '',
    kunci: s.kunci ?? '',
    pembahasan: s.pembahasan ?? '',
    bobot_skor: s.bobot_skor ?? 1,
  };
}

/** Isian satu butir soal, dipakai untuk tambah maupun edit. */
function ButirFormFields({
  value,
  onChange,
  noSoalReadOnly,
}: {
  value: ButirForm;
  onChange: (v: ButirForm) => void;
  noSoalReadOnly?: boolean;
}) {
  const set = (patch: Partial<ButirForm>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="No. Soal">
          <TextInput
            type="number"
            min={1}
            value={value.no_soal}
            onChange={(e) => set({ no_soal: parseInt(e.target.value) || 1 })}
            disabled={noSoalReadOnly}
          />
        </Field>
        <Field label="Kunci Jawaban">
          <SelectInput value={value.kunci} onChange={(e) => set({ kunci: e.target.value })}>
            <option value="" className="bg-surface">— Belum ada —</option>
            {(['A', 'B', 'C', 'D'] as const).map((h) => (
              <option key={h} value={h} className="bg-surface">{h}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Bobot" hint="Untuk hitung nilai">
          <TextInput
            type="number"
            min={0}
            value={value.bobot_skor}
            onChange={(e) => set({ bobot_skor: parseInt(e.target.value) || 0 })}
          />
        </Field>
      </div>
      <Field label="Pertanyaan">
        <TextArea rows={3} value={value.pertanyaan} onChange={(e) => set({ pertanyaan: e.target.value })} placeholder="Tulis pertanyaan..." />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['a', 'b', 'c', 'd'] as const).map((h) => (
          <Field key={h} label={`Pilihan ${h.toUpperCase()}`}>
            <TextInput
              value={value[`pilihan_${h}` as 'pilihan_a' | 'pilihan_b' | 'pilihan_c' | 'pilihan_d']}
              onChange={(e) => set({ [`pilihan_${h}`]: e.target.value } as Partial<ButirForm>)}
              placeholder={`Jawaban ${h.toUpperCase()}`}
            />
          </Field>
        ))}
      </div>
      <Field label="Pembahasan" hint="Tampil setelah peserta submit">
        <TextArea rows={2} value={value.pembahasan} onChange={(e) => set({ pembahasan: e.target.value })} placeholder="Kenapa jawabannya benar..." />
      </Field>
    </div>
  );
}

export default function KelolaSoalPage() {
  const { push: toast } = useToast();
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [paketList, setPaketList] = useState<SoalPaket[]>([]);
  const [butirMap, setButirMap] = useState<Record<string, SoalButir[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tabProgram, setTabProgram] = useState<string>('SEMUA');
  const [tabTipe, setTabTipe] = useState<string>('SEMUA');
  const [lihatKode, setLihatKode] = useState<string | null>(null);

  const [form, setForm] = useState({
    kode_paket: '',
    program: 'B1',
    tipe: 'pre_test',
    sesi_target: '',
    durasi_menit: 15,
  });
  /** Kode paket yang sedang diedit info-nya; null = mode buat baru. */
  const [editingKode, setEditingKode] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [parsed, setParsed] = useState<ParsedSoal[]>([]);
  const [bulkMasalah, setBulkMasalah] = useState<MasalahBulk[]>([]);

  /** Butir yang sedang diedit (id) + form-nya; tambah baru pakai showTambah. */
  const [editingButirId, setEditingButirId] = useState<string | null>(null);
  const [butirForm, setButirForm] = useState<ButirForm>(EMPTY_BUTIR);
  const [showTambah, setShowTambah] = useState(false);

  const modulByKode = useMemo(() => new Map(moduls.map((m) => [m.kode, m])), [moduls]);

  const fetchAll = async () => {
    const [{ data: m }, { data: p }, { data: b }] = await Promise.all([
      supabase.from('modul').select('*').order('urutan_sesi'),
      supabase.from('soal_paket').select('*').order('kode_paket'),
      supabase.from('soal_butir').select('*').order('kode_paket').order('no_soal'),
    ]);
    setModuls((m as Modul[]) ?? []);
    setPaketList((p as SoalPaket[]) ?? []);
    const map: Record<string, SoalButir[]> = {};
    for (const item of (b as SoalButir[]) ?? []) {
      (map[item.kode_paket] ??= []).push(item);
    }
    setButirMap(map);
  };

  const load = async () => {
    setLoading(true);
    try {
      await fetchAll();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  const parseBulk = () => {
    if (!bulkText.trim()) {
      toast('Textarea masih kosong', 'error');
      return;
    }
    const { soal, masalah } = parseSoalBulk(bulkText);
    setBulkMasalah(masalah);
    setParsed(soal);
    if (soal.length === 0) {
      toast(masalah.length > 0 ? `Tidak ada soal valid. ${masalah.length} baris bermasalah.` : 'Tidak ada soal valid.', 'error');
      return;
    }
    if (masalah.length > 0) {
      toast(`${soal.length} soal siap, ${masalah.length} baris dilewati karena bermasalah`, 'success');
      return;
    }
    toast(`${soal.length} soal berhasil di-parse`, 'success');
  };

  /** Isi textarea dengan template siap pakai. */
  const isiTemplate = (tipe: 'blok' | 'satu') => {
    const tpl = tipe === 'blok' ? TEMPLATE_SOAL_BULK : TEMPLATE_SOAL_SATUBARIS;
    setBulkText(tpl);
    setParsed([]);
    setBulkMasalah([]);
    navigator.clipboard?.writeText(tpl).then(
      () => toast('Template sudah ditempel dan disalin ke clipboard', 'success'),
      () => toast('Template sudah ditempel di textarea', 'success'),
    );
  };

  /** Muat soal yang sudah ada ke textarea supaya bisa diedit ulang. */
  const muatExistingKeTextarea = (kodePaket: string) => {
    const butir = butirMap[kodePaket];
    if (!butir || butir.length === 0) {
      toast(`Paket ${kodePaket} belum punya soal`, 'error');
      return;
    }
    const teks = soalKeTeks(
      [...butir].sort((a, b) => a.no_soal - b.no_soal).map((s) => ({
        pertanyaan: s.pertanyaan,
        pilihan_a: s.pilihan_a,
        pilihan_b: s.pilihan_b,
        pilihan_c: s.pilihan_c,
        pilihan_d: s.pilihan_d,
        kunci: s.kunci,
        pembahasan: s.pembahasan,
      })),
    );
    setBulkText(teks);
    setParsed([]);
    setBulkMasalah([]);
    toast(`${butir.length} soal ${kodePaket} dimuat ke textarea, boleh diedit lalu di-parse ulang`, 'success');
  };

  const handleSave = async () => {
    if (!form.kode_paket || parsed.length === 0) {
      toast('Kode paket dan soal wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from('soal_paket').upsert({
        kode_paket: form.kode_paket,
        program: form.program,
        tipe: form.tipe,
        sesi_target: form.sesi_target || null,
        durasi_menit: form.durasi_menit,
      }, { onConflict: 'kode_paket' });
      if (pErr) throw pErr;

      const rows = parsed.map((s) => ({ ...s, kode_paket: form.kode_paket, bobot_skor: 1 }));
      const { error: sErr } = await supabase.from('soal_butir').upsert(rows, { onConflict: 'kode_paket,no_soal' });
      if (sErr) throw sErr;

      toast(`${parsed.length} soal tersimpan ke ${form.kode_paket}`, 'success');
      setBulkText('');
      setParsed([]);
      load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaket = async (kode: string) => {
    if (!confirm(`Hapus paket ${kode} dan semua soalnya?`)) return;
    const { error } = await supabase.from('soal_paket').delete().eq('kode_paket', kode);
    if (error) toast(error.message, 'error');
    else { toast(`Paket ${kode} dihapus`, 'success'); setLihatKode(null); load(); }
  };

  // ============ EDIT INFO PAKET ============
  const startEditPaket = (kode: string) => {
    const p = paketList.find((x) => x.kode_paket === kode);
    if (!p) return;
    setEditingKode(kode);
    setForm({
      kode_paket: p.kode_paket,
      program: p.program ?? programDariKodeModul(p.sesi_target ?? '') ?? 'B1',
      tipe: p.tipe,
      sesi_target: p.sesi_target ?? '',
      durasi_menit: p.durasi_menit,
    });
    setLihatKode(null);
    setEditingButirId(null);
    setShowTambah(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditPaket = () => {
    setEditingKode(null);
    setForm({ kode_paket: '', program: 'B1', tipe: 'pre_test', sesi_target: '', durasi_menit: 15 });
  };

  /** Simpan info paket saja (tanpa butir) — untuk mode edit maupun buat paket kosong. */
  const handleSavePaketMeta = async () => {
    if (!form.kode_paket.trim()) {
      toast('Kode paket wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('soal_paket').upsert({
        kode_paket: form.kode_paket.trim(),
        program: form.program,
        tipe: form.tipe,
        sesi_target: form.sesi_target || null,
        durasi_menit: form.durasi_menit,
      }, { onConflict: 'kode_paket' });
      if (error) throw error;
      toast(editingKode ? `Info ${form.kode_paket} diperbarui` : `Paket ${form.kode_paket} dibuat`, 'success');
      cancelEditPaket();
      await fetchAll();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============ EDIT / TAMBAH / HAPUS BUTIR ============
  const startEditButir = (s: SoalButir) => {
    setShowTambah(false);
    setEditingButirId(s.id);
    setButirForm(butirKeForm(s));
  };

  const handleSaveButir = async (kodePaket: string, id: string) => {
    if (!butirForm.pertanyaan.trim()) {
      toast('Pertanyaan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('soal_butir').update({
        pertanyaan: butirForm.pertanyaan.trim(),
        pilihan_a: butirForm.pilihan_a.trim() || null,
        pilihan_b: butirForm.pilihan_b.trim() || null,
        pilihan_c: butirForm.pilihan_c.trim() || null,
        pilihan_d: butirForm.pilihan_d.trim() || null,
        kunci: butirForm.kunci || null,
        pembahasan: butirForm.pembahasan.trim() || null,
        bobot_skor: butirForm.bobot_skor,
      }).eq('id', id);
      if (error) throw error;
      toast(`Soal no. ${butirForm.no_soal} di ${kodePaket} diperbarui`, 'success');
      setEditingButirId(null);
      await fetchAll();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteButir = async (s: SoalButir) => {
    if (!confirm(`Hapus soal no. ${s.no_soal} dari ${s.kode_paket}?`)) return;
    const { error } = await supabase.from('soal_butir').delete().eq('id', s.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Soal dihapus', 'success');
      if (editingButirId === s.id) setEditingButirId(null);
      await fetchAll();
    }
  };

  const startTambahButir = (kodePaket: string) => {
    const existing = butirMap[kodePaket] ?? [];
    const nextNo = existing.length > 0 ? Math.max(...existing.map((s) => s.no_soal)) + 1 : 1;
    setEditingButirId(null);
    setButirForm({ ...EMPTY_BUTIR, no_soal: nextNo });
    setShowTambah(true);
  };

  const handleTambahButir = async (kodePaket: string) => {
    if (!butirForm.pertanyaan.trim()) {
      toast('Pertanyaan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('soal_butir').insert({
        kode_paket: kodePaket,
        no_soal: butirForm.no_soal,
        pertanyaan: butirForm.pertanyaan.trim(),
        pilihan_a: butirForm.pilihan_a.trim() || null,
        pilihan_b: butirForm.pilihan_b.trim() || null,
        pilihan_c: butirForm.pilihan_c.trim() || null,
        pilihan_d: butirForm.pilihan_d.trim() || null,
        kunci: butirForm.kunci || null,
        pembahasan: butirForm.pembahasan.trim() || null,
        bobot_skor: butirForm.bobot_skor,
      });
      if (error) throw error;
      toast(`Soal no. ${butirForm.no_soal} ditambahkan ke ${kodePaket}`, 'success');
      setShowTambah(false);
      await fetchAll();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const paketDipilih = paketList.find((p) => p.kode_paket === lihatKode) ?? null;
  const butirDipilih = lihatKode ? (butirMap[lihatKode] ?? []) : [];

  const paketTersaring = paketList
    .filter((p) => (tabProgram === 'SEMUA' ? true : p.program === tabProgram))
    .filter((p) => (tabTipe === 'SEMUA' ? true : p.tipe === tabTipe));

  // Kelompokkan per program agar rapi (+ paket tanpa program).
  const kelompokProgram = PROGRAM_URUT.map((j) => ({
    key: j as string,
    label: programLabel(j),
    paket: paketTersaring.filter((p) => p.program === j),
  })).filter((g) => g.paket.length > 0);

  const paketTanpaProgram = paketTersaring.filter((p) => !p.program || !PROGRAM_URUT.includes(p.program as ProgramKode));
  if (paketTanpaProgram.length > 0) {
    kelompokProgram.push({ key: 'lainnya', label: 'Tanpa Program', paket: paketTanpaProgram });
  }

  const tabProgramOptions = [
    { key: 'SEMUA', label: `Semua (${paketList.length})` },
    ...PROGRAM_URUT.filter((j) => paketList.some((p) => p.program === j)).map((j) => ({
      key: j as string,
      label: `${programLabel(j)} (${paketList.filter((p) => p.program === j).length})`,
    })),
  ];

  const tabTipeOptions = [
    { key: 'SEMUA', label: 'Semua Tipe' },
    { key: 'pre_test', label: 'Pre-Test' },
    { key: 'post_test', label: 'Post-Test' },
    { key: 'kuis', label: 'Kuis Sesi' },
  ];

  if (loading) return <Loading text="Memuat soal..." />;

  // ============ MODE LIHAT: detail satu paket ============
  if (paketDipilih) {
    const modulTarget = paketDipilih.sesi_target ? modulByKode.get(paketDipilih.sesi_target) : undefined;
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-headline font-bold text-fg">{paketDipilih.kode_paket}</h1>
            <p className="mt-0.5 text-sm text-fg-muted">
              {paketDipilih.program ? programLabel(paketDipilih.program) : 'Tanpa program'} ·{' '}
              {TIPE_LABELS[paketDipilih.tipe] ?? paketDipilih.tipe} · {paketDipilih.durasi_menit} menit ·{' '}
              {butirDipilih.length} soal
            </p>
            <p className="mt-1 text-sm">
              {modulTarget ? (
                <span className="text-fg">
                  Modul: <Badge className="font-mono">{modulTarget.kode}</Badge>{' '}
                  <span className="text-fg-muted">{modulTarget.judul}</span>
                </span>
              ) : paketDipilih.sesi_target ? (
                <span className="text-warning">Sesi {paketDipilih.sesi_target} — kode modul tidak dikenal, periksa ejaan.</span>
              ) : (
                <span className="text-warning">Belum ditautkan ke modul — pre/post-test wajib menunjuk satu modul.</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => startEditPaket(paketDipilih.kode_paket)}>Edit Info</Button>
            <Button variant="ghost" onClick={() => { setLihatKode(null); setEditingButirId(null); setShowTambah(false); }}>Kembali</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-subhead font-semibold text-fg">Soal ({butirDipilih.length})</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                muatExistingKeTextarea(paketDipilih.kode_paket);
                setLihatKode(null);
              }}
            >
              Muat ke Textarea
            </Button>
            {!showTambah && (
              <Button size="sm" onClick={() => startTambahButir(paketDipilih.kode_paket)}>+ Tambah Soal</Button>
            )}
          </div>
        </div>

        {showTambah && (
          <Card className="border-primary/30">
            <h3 className="mb-3 text-subhead font-semibold text-fg">Tambah Soal ke {paketDipilih.kode_paket}</h3>
            <ButirFormFields value={butirForm} onChange={setButirForm} />
            <div className="mt-3 flex gap-2">
              <Button onClick={() => handleTambahButir(paketDipilih.kode_paket)} disabled={saving} className="flex-1">
                {saving ? 'Menyimpan...' : 'Tambah Soal'}
              </Button>
              <Button variant="secondary" onClick={() => setShowTambah(false)} className="flex-1">Batal</Button>
            </div>
          </Card>
        )}

        {butirDipilih.length === 0 && !showTambah ? (
          <EmptyState title="Paket ini belum punya soal" desc="Tambahkan soal lewat tombol di atas atau form Input Soal Bulk." />
        ) : (
          <div className="space-y-3">
            {butirDipilih.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium text-fg">
                    <span className="font-mono text-primary-text">{s.no_soal}.</span> {s.pertanyaan}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEditButir(s)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteButir(s)}>Hapus</Button>
                  </div>
                </div>
                {editingButirId === s.id ? (
                  <div className="mt-3 border-t border-border-2 pt-3">
                    <ButirFormFields value={butirForm} onChange={setButirForm} noSoalReadOnly />
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => handleSaveButir(paketDipilih.kode_paket, s.id)} disabled={saving} className="flex-1">
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingButirId(null)} className="flex-1">Batal</Button>
                    </div>
                  </div>
                ) : (
                  <>
                <ul className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  {(['A', 'B', 'C', 'D'] as const).map((h) => {
                    const val = s[`pilihan_${h.toLowerCase()}` as 'pilihan_a' | 'pilihan_b' | 'pilihan_c' | 'pilihan_d'];
                    if (!val) return null;
                    const benar = s.kunci === h;
                    return (
                      <li
                        key={h}
                        className={`rounded-md border px-2 py-1 ${
                          benar ? 'border-success/40 bg-success/10 font-semibold text-success' : 'border-border-2 text-fg-muted'
                        }`}
                      >
                        {h}. {val}
                        {benar && <span className="ml-1 text-[10px] uppercase">(kunci)</span>}
                      </li>
                    );
                  })}
                </ul>
                {s.kunci ? null : (
                  <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs text-fg-muted">
                    <span className="font-semibold text-warning">Perlu diperbaiki:</span> belum ada kunci jawaban A/B/C/D, jadi nilai soal ini tidak dihitung otomatis.
                  </p>
                )}
                {s.pembahasan && (
                  <p className="mt-2 text-xs text-fg-subtle">
                    <span className="font-semibold text-fg-muted">Pembahasan:</span> {s.pembahasan}
                  </p>
                )}
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============ MODE KELOLA ============
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-headline font-bold text-fg">Kelola Soal Bulk</h1>
        <p className="mt-0.5 text-sm text-fg-muted">Input soal pilihan ganda secara massal untuk pre-test / post-test</p>
      </div>

      <Card>
        <h2 className="mb-4 text-subhead font-semibold text-fg">
          {editingKode ? `Edit Paket ${editingKode}` : 'Paket Soal'}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Kode Paket" hint={editingKode ? 'Kode tidak bisa diubah.' : 'Contoh: PRE-A01, POST-A01'}>
            <TextInput
              value={form.kode_paket}
              onChange={(e) => {
                const kode_paket = e.target.value;
                // Tebak program dari kode paket (PRE-B201 -> B2); bisa diubah manual.
                const inti = kode_paket.replace(/^(PRE|POST|KUIS)-/i, '');
                const tebakan = programDariKodeModul(inti) ?? programDariKodeModul(form.sesi_target);
                setForm((f) => ({ ...f, kode_paket, ...(tebakan ? { program: tebakan } : {}) }));
              }}
              placeholder="PRE-A01"
              disabled={!!editingKode}
            />
          </Field>
          <Field label="Tipe">
            <SelectInput value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })}>
              <option value="pre_test">Pre-Test</option>
              <option value="post_test">Post-Test</option>
              <option value="kuis">Kuis</option>
            </SelectInput>
          </Field>
          <Field label="Program">
            <SelectInput value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
              {PROGRAM.map((p) => <option key={p.kode} value={p.kode}>{programLabel(p.kode)}</option>)}
            </SelectInput>
          </Field>
          <Field label="Modul" hint="Pre/post-test dikerjakan sebelum/sesudah modul ini dibaca">
            <SelectInput
              value={form.sesi_target}
              onChange={(e) => {
                const sesi_target = e.target.value;
                const tebakan = programDariKodeModul(sesi_target);
                setForm((f) => ({ ...f, sesi_target, ...(tebakan ? { program: tebakan } : {}) }));
              }}
            >
              <option value="" className="bg-surface">— Tanpa modul —</option>
              {[...moduls].sort((a, b) => a.kode.localeCompare(b.kode)).map((m) => (
                <option key={m.id} value={m.kode} className="bg-surface">
                  {m.kode} — {m.judul}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Durasi (menit)">
            <TextInput type="number" min={1} value={form.durasi_menit} onChange={(e) => setForm({ ...form, durasi_menit: parseInt(e.target.value) || 15 })} />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleSavePaketMeta} disabled={saving} className="flex-1">
            {saving ? 'Menyimpan...' : editingKode ? 'Simpan Info Paket' : 'Buat Paket Kosong'}
          </Button>
          {editingKode && (
            <Button variant="secondary" onClick={cancelEditPaket} className="flex-1">Batal Edit</Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-subhead font-semibold text-fg">Input Soal Bulk</h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Tulis satu soal beberapa baris. Nomor soal dibuat otomatis, jadi tidak perlu diketik.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => isiTemplate('blok')}>
              Isi Template Blok
            </Button>
            <Button type="button" variant="secondary" onClick={() => isiTemplate('satu')}>
              Isi Template 1 Baris
            </Button>
          </div>
        </div>

        <div className="mb-3 rounded-[8px] border border-border-2 bg-bg p-3 font-mono text-xs leading-relaxed">
          <p className="mb-1 font-sans font-semibold text-fg-muted">Format blok (disarankan)</p>
          <pre className="overflow-x-auto whitespace-pre text-fg">{TEMPLATE_SOAL_BULK.split('//')[0].trim()}</pre>
          <p className="mt-2 mb-1 font-sans font-semibold text-fg-muted">Atur label lain juga bisa</p>
          <p className="font-sans text-fg-muted">
            Pertanyaan: <span className="font-mono text-fg">Tanya:</span> / <span className="font-mono text-fg">Soal:</span> /{' '}
            <span className="font-mono text-fg">Q:</span> · Opsi <span className="font-mono text-fg">A.</span>{' '}
            <span className="font-mono text-fg">A)</span> <span className="font-mono text-fg">A:</span> <span className="font-mono text-fg">[A]</span>{' '}
            · Kunci <span className="font-mono text-fg">Kunci:</span> <span className="font-mono text-fg">Jawaban:</span> · Pembahasan{' '}
            <span className="font-mono text-fg">Pembahasan:</span> <span className="font-mono text-fg">Alasan:</span>
          </p>
          <p className="mt-2 mb-1 font-sans font-semibold text-fg-muted">Format 1 baris (format lama, tetap jalan)</p>
          <pre className="overflow-x-auto whitespace-pre text-fg">{TEMPLATE_SOAL_SATUBARIS.split('\n')[0]}</pre>
        </div>

        <TextArea
          rows={12}
          value={bulkText}
          onChange={(e) => { setBulkText(e.target.value); setParsed([]); setBulkMasalah([]); }}
          placeholder="Tulis soal di sini. Klik 'Isi Template Blok' untuk melihat contoh isian."
          className="font-mono text-sm"
        />

        {bulkMasalah.length > 0 && (
          <div className="mt-3 rounded-[8px] border border-warning/40 bg-warning/10 p-3">
            <p className="text-sm font-semibold text-warning">
              {bulkMasalah.length} baris bermasalah, {parsed.length} soal tetap bisa disimpan
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {bulkMasalah.slice(0, 8).map((m, i) => (
                <li key={`${m.baris}-${i}`} className="font-mono text-xs text-fg-muted">
                  {m.pesan}
                </li>
              ))}
              {bulkMasalah.length > 8 && (
                <li className="font-mono text-xs text-fg-subtle">
                  ... dan {bulkMasalah.length - 8} masalah lain
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={parseBulk} disabled={saving}>Parse Soal</Button>
          <Button onClick={handleSave} disabled={saving || parsed.length === 0}>
            {saving ? 'Menyimpan...' : `Simpan ${parsed.length} Soal`}
          </Button>
        </div>
      </Card>

      {parsed.length > 0 && (
        <Card>
          <h2 className="mb-3 text-subhead font-semibold text-fg">Preview ({parsed.length} soal)</h2>
          <div className="space-y-3">
            {parsed.map((s) => (
              <div key={s.no_soal} className="rounded-lg border border-border-2 p-3">
                <p className="text-sm font-medium text-fg">
                  <span className="font-mono text-primary-text">{s.no_soal}.</span> {s.pertanyaan}
                </p>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-fg-muted sm:grid-cols-4">
                  <span className={s.kunci === 'A' ? 'font-bold text-success' : ''}>A. {s.pilihan_a}</span>
                  <span className={s.kunci === 'B' ? 'font-bold text-success' : ''}>B. {s.pilihan_b}</span>
                  <span className={s.kunci === 'C' ? 'font-bold text-success' : ''}>C. {s.pilihan_c}</span>
                  <span className={s.kunci === 'D' ? 'font-bold text-success' : ''}>D. {s.pilihan_d}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-fg-subtle">
                  Kunci: <span className="font-bold text-success">{s.kunci}</span>
                  {s.pembahasan ? ` · Pembahasan: ${s.pembahasan}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <SectionHeader title={`Daftar Paket (${paketTersaring.length}/${paketList.length})`} desc="Dikelompokkan per program. Klik Lihat untuk membaca soal." />
        <Tabs options={tabProgramOptions} value={tabProgram} onChange={setTabProgram} label="Filter program paket soal" />
        <Tabs options={tabTipeOptions} value={tabTipe} onChange={setTabTipe} label="Filter tipe paket soal" />
      </div>

      {paketTersaring.length === 0 ? (
        <EmptyState
          title="Belum ada paket"
          desc={paketList.length === 0 ? 'Buat paket soal pertama Anda di atas.' : 'Tidak ada paket pada filter ini.'}
        />
      ) : (
        <div className="space-y-5">
          {kelompokProgram.map((g) => (
            <div key={g.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-subhead font-semibold text-fg">{g.label}</h2>
                <Badge className="text-[10px]">{g.paket.length} paket</Badge>
              </div>
              <ul className="space-y-2">
                {g.paket.map((p) => {
                  const jumlahSoal = (butirMap[p.kode_paket] ?? []).length;
                  const perluDiperbaiki = (butirMap[p.kode_paket] ?? []).filter((s) => !s.kunci).length;
                  const modulPaket = p.sesi_target ? modulByKode.get(p.sesi_target) : undefined;
                  return (
                    <li
                      key={p.kode_paket}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-2 p-3"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-bold text-primary-text">{p.kode_paket}</span>
                        <Badge className="ml-2 text-[10px]">{TIPE_LABELS[p.tipe] ?? p.tipe}</Badge>
                        {p.sesi_target && <Badge className="ml-1 text-[10px]">Sesi {p.sesi_target}</Badge>}
                        <Badge className={`ml-1 text-[10px] ${jumlahSoal === 0 ? 'text-destructive' : ''}`}>
                          {jumlahSoal} soal
                        </Badge>
                        {perluDiperbaiki > 0 && (
                          <Badge className="ml-1 border-warning/40 bg-warning/10 text-[10px] text-warning">
                            {perluDiperbaiki} tanpa kunci
                          </Badge>
                        )}
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {p.durasi_menit} menit · Modul: {modulPaket ? `${modulPaket.kode} — ${modulPaket.judul}` : (p.sesi_target ?? 'belum ditautkan')}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setLihatKode(p.kode_paket)}>Lihat</Button>
                        <Button size="sm" variant="ghost" onClick={() => startEditPaket(p.kode_paket)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeletePaket(p.kode_paket)}>Hapus</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
