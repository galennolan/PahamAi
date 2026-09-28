import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, TextArea } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul, SoalPaket } from '../types';
import { JALUR_LABELS } from '../types';

const BULK_TEMPLATE = `1. Apa kepanjangan AI? | Artificial Intelligence | Automated Interaction | Analytical Integration | Applied Interface | A | Artifical Intelligence adalah...
2. Manakah yang termasuk contoh AI? | Mesin cuci | Asisten virtual | Lampu kipas | Sepeda motor | B | Asisten virtual adalah contoh AI...`;

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase.from('modul').select('*').order('urutan_sesi'),
        supabase.from('soal_paket').select('*').order('kode_paket'),
      ]);
      setModuls((m as Modul[]) ?? []);
      setPaketList((p as SoalPaket[]) ?? []);
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
    else { toast(`Paket ${kode} dihapus`, 'success'); load(); }
  };

  if (loading) return <Loading text="Memuat soal..." />;

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

      <Card>
        <h2 className="mb-3 text-subhead font-semibold text-fg">Paket Ada ({paketList.length})</h2>
        {paketList.length === 0 ? (
          <EmptyState title="Belum ada paket" desc="Buat paket soal pertama Anda di atas." />
        ) : (
          <ul className="space-y-2">
            {paketList.map((p) => (
              <li key={p.kode_paket} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-2 p-3">
                <div>
                  <span className="font-mono text-sm font-bold text-primary-text">{p.kode_paket}</span>
                  <Badge className="ml-2 text-[10px]">{p.tipe}</Badge>
                  {p.sesi_target && <Badge className="ml-1 text-[10px]">{p.sesi_target}</Badge>}
                  <p className="mt-0.5 text-xs text-fg-muted">{p.jalur} · {p.durasi_menit} mnt</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDeletePaket(p.kode_paket)}>Hapus</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
