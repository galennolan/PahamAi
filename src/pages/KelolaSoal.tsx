import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, TextArea, Tabs, SectionHeader } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Jalur, Modul, SoalButir, SoalPaket } from '../types';
import { JALUR_LABELS } from '../types';

const BULK_TEMPLATE = `1. Apa kepanjangan AI? | Artificial Intelligence | Automated Interaction | Analytical Integration | Applied Interface | A | Artifical Intelligence adalah...
2. Manakah yang termasuk contoh AI? | Mesin cuci | Asisten virtual | Lampu kipas | Sepeda motor | B | Asisten virtual adalah contoh AI...`;

const TIPE_LABELS: Record<string, string> = {
  kuis: 'Kuis Sesi',
  pre_test: 'Pre-Test',
  post_test: 'Post-Test',
};

const JALUR_URUT: Jalur[] = ['A', 'B1', 'B2', 'B3', 'G'];

interface ParsedSoal {
  no_soal: number;
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  kunci: string;
  pembahasan: string;
}

export default function KelolaSoalPage() {
  const { push: toast } = useToast();
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [paketList, setPaketList] = useState<SoalPaket[]>([]);
  const [butirMap, setButirMap] = useState<Record<string, SoalButir[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tabJalur, setTabJalur] = useState<string>('SEMUA');
  const [tabTipe, setTabTipe] = useState<string>('SEMUA');
  const [lihatKode, setLihatKode] = useState<string | null>(null);

  const [form, setForm] = useState({
    kode_paket: '',
    jalur: 'A',
    tipe: 'pre_test',
    sesi_target: '',
    durasi_menit: 15,
  });
  const [bulkText, setBulkText] = useState('');
  const [parsed, setParsed] = useState<ParsedSoal[]>([]);

  const load = async () => {
    setLoading(true);
    try {
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
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  const parseBulk = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const result: ParsedSoal[] = [];
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)$/);
      if (!match) continue;
      const no_soal = parseInt(match[1]);
      const parts = match[2].split('|').map((p) => p.trim());
      if (parts.length < 6) {
        toast(`Baris ${no_soal}: minimal 6 kolom (pertanyaan|A|B|C|D|kunci)`, 'error');
        return;
      }
      const [pertanyaan, a, b, c, d, kunciRaw, ...rest] = parts;
      const kunci = kunciRaw.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(kunci)) {
        toast(`Baris ${no_soal}: kunci harus A/B/C/D`, 'error');
        return;
      }
      result.push({ no_soal, pertanyaan, pilihan_a: a, pilihan_b: b, pilihan_c: c, pilihan_d: d, kunci, pembahasan: rest.join(' | ') || '' });
    }
    if (result.length === 0) {
      toast('Tidak ada soal valid. Cek format input.', 'error');
      return;
    }
    setParsed(result);
    toast(`${result.length} soal berhasil di-parse`, 'success');
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
        jalur: form.jalur,
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

  const paketDipilih = paketList.find((p) => p.kode_paket === lihatKode) ?? null;
  const butirDipilih = lihatKode ? (butirMap[lihatKode] ?? []) : [];

  const paketTersaring = paketList
    .filter((p) => (tabJalur === 'SEMUA' ? true : p.jalur === tabJalur))
    .filter((p) => (tabTipe === 'SEMUA' ? true : p.tipe === tabTipe));

  // Kelompokkan per jalur agar rapi: A, B1, B2, B3 (+ paket tanpa jalur).
  const kelompokJalur = JALUR_URUT.map((j) => ({
    key: j as string,
    label: JALUR_LABELS[j],
    paket: paketTersaring.filter((p) => p.jalur === j),
  })).filter((g) => g.paket.length > 0);

  const paketTanpaJalur = paketTersaring.filter((p) => !p.jalur || !JALUR_URUT.includes(p.jalur));
  if (paketTanpaJalur.length > 0) {
    kelompokJalur.push({ key: 'lainnya', label: 'Tanpa Jalur', paket: paketTanpaJalur });
  }

  const tabJalurOptions = [
    { key: 'SEMUA', label: `Semua (${paketList.length})` },
    ...JALUR_URUT.filter((j) => paketList.some((p) => p.jalur === j)).map((j) => ({
      key: j as string,
      label: `${JALUR_LABELS[j]} (${paketList.filter((p) => p.jalur === j).length})`,
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
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-headline font-bold text-fg">{paketDipilih.kode_paket}</h1>
            <p className="mt-0.5 text-sm text-fg-muted">
              {paketDipilih.jalur ? JALUR_LABELS[paketDipilih.jalur] : 'Tanpa jalur'} ·{' '}
              {TIPE_LABELS[paketDipilih.tipe] ?? paketDipilih.tipe} · {paketDipilih.durasi_menit} menit ·{' '}
              {butirDipilih.length} soal
              {paketDipilih.sesi_target ? ` · Sesi ${paketDipilih.sesi_target}` : ''}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setLihatKode(null)}>Kembali ke daftar</Button>
        </div>

        {butirDipilih.length === 0 ? (
          <EmptyState title="Paket ini belum punya soal" desc="Tambahkan soal lewat form Input Soal Bulk." />
        ) : (
          <div className="space-y-3">
            {butirDipilih.map((s) => (
              <Card key={s.id} className="p-4">
                <p className="text-sm font-medium text-fg">
                  <span className="font-mono text-primary-text">{s.no_soal}.</span> {s.pertanyaan}
                </p>
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
                {s.pembahasan && (
                  <p className="mt-2 text-xs text-fg-subtle">
                    <span className="font-semibold text-fg-muted">Pembahasan:</span> {s.pembahasan}
                  </p>
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
        <h2 className="mb-4 text-subhead font-semibold text-fg">Paket Soal</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Kode Paket" hint="Contoh: PRE-A01, POST-A01">
            <TextInput value={form.kode_paket} onChange={(e) => setForm({ ...form, kode_paket: e.target.value })} placeholder="PRE-A01" />
          </Field>
          <Field label="Tipe">
            <SelectInput value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })}>
              <option value="pre_test">Pre-Test</option>
              <option value="post_test">Post-Test</option>
              <option value="kuis">Kuis</option>
            </SelectInput>
          </Field>
          <Field label="Jalur">
            <SelectInput value={form.jalur} onChange={(e) => setForm({ ...form, jalur: e.target.value })}>
              {(['A', 'B1', 'B2', 'B3', 'G'] as const).map((j) => <option key={j} value={j}>{JALUR_LABELS[j]}</option>)}
            </SelectInput>
          </Field>
          <Field label="Sesi Target (kode modul)" hint="Opsional — mis. A01">
            <TextInput value={form.sesi_target} onChange={(e) => setForm({ ...form, sesi_target: e.target.value })} placeholder="A01" list="modul-list" />
            <datalist id="modul-list">
              {moduls.map((m) => <option key={m.id} value={m.kode}>{m.judul}</option>)}
            </datalist>
          </Field>
          <Field label="Durasi (menit)">
            <TextInput type="number" min={1} value={form.durasi_menit} onChange={(e) => setForm({ ...form, durasi_menit: parseInt(e.target.value) || 15 })} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-subhead font-semibold text-fg">Input Soal Bulk</h2>
        <p className="mb-3 text-xs text-fg-muted">
          Format per baris: <code className="rounded bg-surface px-1.5 py-0.5 font-mono">1. Pertanyaan | A | B | C | D | Kunci | Pembahasan</code>
        </p>
        <TextArea
          rows={10}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={BULK_TEMPLATE}
          className="font-mono text-sm"
        />
        <div className="mt-3 flex gap-2">
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
                {s.pembahasan && <p className="mt-1 text-xs text-fg-subtle">Pembahasan: {s.pembahasan}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <SectionHeader title={`Daftar Paket (${paketTersaring.length}/${paketList.length})`} desc="Dikelompokkan per jalur. Klik Lihat untuk membaca soal." />
        <Tabs options={tabJalurOptions} value={tabJalur} onChange={setTabJalur} label="Filter jalur paket soal" />
        <Tabs options={tabTipeOptions} value={tabTipe} onChange={setTabTipe} label="Filter tipe paket soal" />
      </div>

      {paketTersaring.length === 0 ? (
        <EmptyState
          title="Belum ada paket"
          desc={paketList.length === 0 ? 'Buat paket soal pertama Anda di atas.' : 'Tidak ada paket pada filter ini.'}
        />
      ) : (
        <div className="space-y-5">
          {kelompokJalur.map((g) => (
            <div key={g.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-subhead font-semibold text-fg">{g.label}</h2>
                <Badge className="text-[10px]">{g.paket.length} paket</Badge>
              </div>
              <ul className="space-y-2">
                {g.paket.map((p) => {
                  const jumlahSoal = (butirMap[p.kode_paket] ?? []).length;
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
                        <p className="mt-0.5 text-xs text-fg-muted">{p.durasi_menit} menit</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setLihatKode(p.kode_paket)}>Lihat</Button>
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
