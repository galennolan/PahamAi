import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, Tabs, Stat } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul, ModulKategori } from '../types';
import { KATEGORI_MODUL, resolveKategori } from '../types';
import { listModulByProgram, listProgramTerpakai } from '../services/modul';
import { PROGRAM, programLabel, type ProgramKode } from '../constants/program';
import { renderMarkdown, estimateReadingTime, extractTOC } from '../lib/markdown';
import {
  ChevronDown,
  Plus,
  Eye,
  X,
  GraduationCap,
  User,
  Table as TableIcon,
  ExternalLink,
  Edit3,
  Columns,
  EyeOff,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';

type FilterKategori = ModulKategori | 'SEMUA';

const EMPTY_FORM = {
  id: '',
  kode: '',
  judul: '',
  kategori: '' as string,
  urutan_sesi: 1,
  durasi_menit: 60,
  content_md: '',
  materi_peserta_md: '',
  slide_url: '',
};

export default function KelolaModulPage() {
  const { push: toast } = useToast();
  const [program, setProgram] = useState<ProgramKode>('B1');
  const [programOptions, setProgramOptions] = useState<ProgramKode[]>([]);
  const [filterKategori, setFilterKategori] = useState<FilterKategori>('SEMUA');
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Modul | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formFieldTab, setFormFieldTab] = useState<'materi_peserta_md' | 'content_md'>('materi_peserta_md');
  const [formViewMode, setFormViewMode] = useState<'split' | 'edit' | 'preview'>('split');

  // Preview Modal states
  const [viewing, setViewing] = useState<Modul | null>(null);
  const [viewingTab, setViewingTab] = useState<'peserta' | 'instruktur'>('peserta');

  const loadProgram = useCallback(async () => {
    const progs = await listProgramTerpakai();
    const list = (progs.length > 0 ? progs : PROGRAM.map((p) => p.kode)) as ProgramKode[];
    setProgramOptions(list);
    setProgram((prev) => (list.includes(prev) ? prev : list[0]));
  }, []);

  const load = useCallback(async () => {
    setModuls(await listModulByProgram(program));
  }, [program]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadProgram();
      } catch (e: unknown) {
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadProgram, toast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e: unknown) {
        if (mounted) toast((e as Error).message, 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const channel = supabase
      .channel('modul-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modul' }, () => {
        if (mounted) load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load, toast]);

  const kategoriCounts = useMemo(() => {
    const counts = new Map<ModulKategori, number>();
    for (const m of moduls) {
      const k = resolveKategori(m);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [moduls]);

  const grouped = useMemo(() => {
    const buckets = new Map<ModulKategori, Modul[]>();
    for (const m of moduls) {
      const k = resolveKategori(m);
      const list = buckets.get(k);
      if (list) list.push(m);
      else buckets.set(k, [m]);
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => a.urutan_sesi - b.urutan_sesi || a.kode.localeCompare(b.kode));
    }
    return KATEGORI_MODUL.map((k) => ({ def: k, items: buckets.get(k.kode) ?? [] }))
      .filter((g) => (filterKategori === 'SEMUA' ? true : g.def.kode === filterKategori))
      .filter((g) => g.items.length > 0 || filterKategori !== 'SEMUA');
  }, [moduls, filterKategori]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kode || !form.judul) {
      toast('Kode dan judul wajib diisi', 'error');
      return;
    }

    const payload: Record<string, unknown> = {
      judul: form.judul,
      kategori: form.kategori === '' ? null : form.kategori,
      urutan_sesi: form.urutan_sesi,
      durasi_menit: form.durasi_menit,
      content_md: form.content_md === '' ? null : form.content_md,
      materi_peserta_md: form.materi_peserta_md === '' ? null : form.materi_peserta_md,
      slide_url: form.slide_url === '' ? null : form.slide_url,
    };

    let error: { message: string } | null = null;
    if (editing) {
      const res = await supabase.from('modul').update(payload).eq('id', editing.id);
      error = res.error;
    } else {
      const res = await supabase.from('modul').insert({ ...payload, kode: form.kode });
      error = res.error;
    }

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast(editing ? 'Modul berhasil diperbarui' : 'Modul berhasil dibuat', 'success');
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    await load();
  };

  const startEdit = (m: Modul) => {
    setEditing(m);
    setForm({
      id: m.id,
      kode: m.kode,
      judul: m.judul,
      kategori: m.kategori ?? '',
      urutan_sesi: m.urutan_sesi,
      durasi_menit: m.durasi_menit,
      content_md: m.content_md ?? '',
      materi_peserta_md: m.materi_peserta_md ?? '',
      slide_url: m.slide_url ?? '',
    });
    // Default edit tab to whichever has content
    setFormFieldTab(m.materi_peserta_md ? 'materi_peserta_md' : 'content_md');
    setShowForm(true);
  };

  const handleOpenView = (m: Modul) => {
    setViewing(m);
    // Prioritize showing student material if present, otherwise instructor content
    setViewingTab(m.materi_peserta_md ? 'peserta' : 'instruktur');
  };

  // Helper insertion for Markdown Toolbar
  const insertMarkdownSnippet = (snippet: string) => {
    const currentVal = form[formFieldTab];
    const updated = currentVal ? `${currentVal.trimEnd()}\n\n${snippet}\n` : `${snippet}\n`;
    setForm({ ...form, [formFieldTab]: updated });
  };

  // Active viewing content
  const activeViewingContent = useMemo(() => {
    if (!viewing) return '';
    if (viewingTab === 'peserta') {
      return viewing.materi_peserta_md || viewing.content_md || '';
    }
    return viewing.content_md || viewing.materi_peserta_md || '';
  }, [viewing, viewingTab]);

  const viewingTOC = useMemo(() => extractTOC(activeViewingContent), [activeViewingContent]);
  const viewingReadTime = useMemo(() => estimateReadingTime(activeViewingContent), [activeViewingContent]);

  const activeFormContent = form[formFieldTab];

  const kategoriTanpaIsi = KATEGORI_MODUL.filter((k) => (kategoriCounts.get(k.kode) ?? 0) === 0);

  if (loading) return <Loading text="Memuat katalog modul..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-headline font-bold text-fg">Kelola Modul</h1>
            <Badge className="border-primary/30 bg-primary/10 text-primary-text font-mono text-xs">
              {moduls.length} Modul
            </Badge>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Program {programLabel(program)} · Terbagi ke {KATEGORI_MODUL.length} kategori silabus standar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ ...EMPTY_FORM });
              setFormFieldTab('materi_peserta_md');
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah Modul
          </Button>
        </div>
      </div>

      {/* Program Selector */}
      <Tabs
        label="Pilih program kursus"
        value={program}
        onChange={(v) => setProgram(v as ProgramKode)}
        options={programOptions.map((kode) => ({ key: kode, label: programLabel(kode) }))}
      />

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kategori">
        <button
          type="button"
          onClick={() => setFilterKategori('SEMUA')}
          aria-pressed={filterKategori === 'SEMUA'}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[8px] border px-3.5 py-1.5 text-sm font-medium transition ${
            filterKategori === 'SEMUA'
              ? 'border-primary bg-primary/15 text-primary-text shadow-sm'
              : 'border-border-2 bg-surface text-fg-muted hover:border-border-3 hover:text-fg'
          }`}
        >
          Semua kategori
          <span className="font-mono text-xs opacity-75">{moduls.length}</span>
        </button>
        {KATEGORI_MODUL.map((k) => (
          <button
            key={k.kode}
            type="button"
            onClick={() => setFilterKategori(k.kode)}
            aria-pressed={filterKategori === k.kode}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-[8px] border px-3.5 py-1.5 text-sm font-medium transition ${
              filterKategori === k.kode
                ? `${k.warnaBadge} border-current shadow-sm`
                : 'border-border-2 bg-surface text-fg-muted hover:border-border-3 hover:text-fg'
            }`}
          >
            <span>{k.label}</span>
            <span className="font-mono text-xs opacity-75">{kategoriCounts.get(k.kode) ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Category Stats Grid */}
      {moduls.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {KATEGORI_MODUL.filter((k) => (kategoriCounts.get(k.kode) ?? 0) > 0).map((k) => {
            const c = kategoriCounts.get(k.kode) ?? 0;
            const total = moduls.length;
            return (
              <Stat
                key={k.kode}
                value={`${c}/${total}`}
                label={k.label}
                accent="text-fg"
              />
            );
          })}
        </div>
      )}

      {/* Form Create / Edit Modul */}
      {showForm && (
        <Card className="border-border-2 bg-surface shadow-lg">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-2 pb-4">
            <div>
              <span className="font-mono text-xs text-primary-text font-semibold uppercase tracking-wider">
                {editing ? 'Editor Modul' : 'Modul Baru'}
              </span>
              <h2 className="text-subhead font-bold text-fg">
                {editing ? `Edit ${editing.kode} — ${editing.judul}` : 'Buat Modul Kursus Baru'}
              </h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setForm(EMPTY_FORM);
              }}
            >
              <X className="h-4 w-4" />
              Tutup
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Kode Modul" hint="Contoh: B101, A01, B204">
                <TextInput
                  placeholder="B101"
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  required
                  disabled={!!editing}
                />
              </Field>
              <Field label="Judul Modul">
                <TextInput
                  placeholder="Dasar Pemahaman Artificial Intelligence..."
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Kategori Silabus" hint="Kosong = otomatis dari prefix kode">
                <SelectInput
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                >
                  <option value="" className="bg-surface">
                    — Otomatis dari kode modul —
                  </option>
                  {KATEGORI_MODUL.map((k) => (
                    <option key={k.kode} value={k.kode} className="bg-surface">
                      {k.label} ({k.kode})
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Urutan Sesi">
                <TextInput
                  type="number"
                  min={1}
                  value={form.urutan_sesi}
                  onChange={(e) => setForm({ ...form, urutan_sesi: parseInt(e.target.value) || 1 })}
                />
              </Field>
              <Field label="Durasi (Menit)">
                <TextInput
                  type="number"
                  min={1}
                  value={form.durasi_menit}
                  onChange={(e) => setForm({ ...form, durasi_menit: parseInt(e.target.value) || 60 })}
                />
              </Field>
            </div>

            <Field label="Tautan Slide Presentasi (Opsional)">
              <TextInput
                placeholder="https://docs.google.com/presentation/d/..."
                value={form.slide_url}
                onChange={(e) => setForm({ ...form, slide_url: e.target.value })}
              />
            </Field>

            {/* Markdown Editor Section */}
            <div className="rounded-xl border border-border-2 bg-surface-2/40 p-4 space-y-4">
              {/* Field Tab & View Mode Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-2/80 pb-3">
                {/* Switch between Materi Peserta vs Materi Instruktur */}
                <div className="flex items-center gap-1.5 rounded-lg border border-border-2 bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setFormFieldTab('materi_peserta_md')}
                    className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition ${
                      formFieldTab === 'materi_peserta_md'
                        ? 'bg-primary text-black shadow-sm'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    Materi Peserta
                    <span className="font-mono text-[11px] opacity-80">
                      {form.materi_peserta_md ? `(${form.materi_peserta_md.length} kar)` : '(kosong)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormFieldTab('content_md')}
                    className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition ${
                      formFieldTab === 'content_md'
                        ? 'bg-primary text-black shadow-sm'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Materi Instruktur
                    <span className="font-mono text-[11px] opacity-80">
                      {form.content_md ? `(${form.content_md.length} kar)` : '(kosong)'}
                    </span>
                  </button>
                </div>

                {/* View Mode: Split / Edit / Preview */}
                <div className="flex items-center gap-1 rounded-lg border border-border-2 bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setFormViewMode('split')}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                      formViewMode === 'split' ? 'bg-surface-2 text-fg font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    Split Editor & Pratinjau
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormViewMode('edit')}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                      formViewMode === 'edit' ? 'bg-surface-2 text-fg font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hanya Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormViewMode('preview')}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                      formViewMode === 'preview' ? 'bg-surface-2 text-fg font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Hanya Pratinjau
                  </button>
                </div>
              </div>

              {/* Quick Markdown Toolbar Helpers */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-fg-subtle mr-1 font-mono text-[11px]">Sisipkan Cepat:</span>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '| Kolom 1 | Kolom 2 | Kolom 3 |\n|---|---|---|\n| Data 1 | Data 2 | Data 3 |\n| Data 4 | Data 5 | Data 6 |'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2.5 py-1 text-fg hover:border-primary hover:text-primary-text"
                >
                  <TableIcon className="h-3 w-3" />
                  + Tabel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '> [!TIP]\n> **Tips Praktik:** Gunakan teknik ini untuk mempercepat riset Anda.'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2.5 py-1 text-emerald-400 hover:border-emerald-500"
                >
                  💡 + Tips
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '> [!NOTE]\n> **Catatan:** Pastikan Anda sudah terhubung ke jaringan sebelum mulai.'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2.5 py-1 text-sky-400 hover:border-sky-500"
                >
                  ℹ️ + Catatan
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '> [!IMPORTANT]\n> **Poin Kunci:** Jangan membagikan data sensitif kepada model umum.'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2.5 py-1 text-amber-400 hover:border-amber-500"
                >
                  ⭐ + Poin Kunci
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdownSnippet('## Judul Bagian Baru\n\nPenjelasan materi di sini...')}
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2.5 py-1 text-fg hover:border-primary hover:text-primary-text font-mono"
                >
                  ## H2
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdownSnippet('### Sub-Topik\n\nDetail langkah...')}
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2.5 py-1 text-fg hover:border-primary hover:text-primary-text font-mono"
                >
                  ### H3
                </button>
              </div>

              {/* Editor Workspace */}
              <div
                className={`grid gap-4 ${
                  formViewMode === 'split'
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {/* Markdown Input Area */}
                {(formViewMode === 'split' || formViewMode === 'edit') && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-fg-subtle">
                      <span className="font-mono">
                        Editor Markdown ({formFieldTab === 'materi_peserta_md' ? 'Materi Peserta' : 'Materi Instruktur'})
                      </span>
                      <span className="font-mono">{activeFormContent.length} karakter</span>
                    </div>
                    <textarea
                      value={activeFormContent}
                      onChange={(e) => setForm({ ...form, [formFieldTab]: e.target.value })}
                      className="h-[460px] w-full rounded-lg border border-border-2 bg-bg px-4 py-3 font-mono text-[13.5px] leading-relaxed text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                      placeholder={'# Judul Modul\n\nTuliskan uraian materi Markdown di sini...\n\n| Kolom 1 | Kolom 2 |\n|---|---|\n| Data 1 | Data 2 |'}
                    />
                  </div>
                )}

                {/* Real-Time Visual Preview Area */}
                {(formViewMode === 'split' || formViewMode === 'preview') && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-fg-subtle">
                      <span className="font-mono text-primary-text font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Pratinjau Visual (Rendered)
                      </span>
                      <span className="font-mono">
                        {estimateReadingTime(activeFormContent)} menit estimasi baca
                      </span>
                    </div>
                    <div className="h-[460px] w-full overflow-y-auto rounded-lg border border-border-2 bg-surface p-5 shadow-inner">
                      {activeFormContent.trim() ? (
                        <div
                          className="prose-md text-fg"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(activeFormContent) }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-fg-subtle">
                          <BookOpen className="h-8 w-8 stroke-[1.5] mb-2 opacity-50" />
                          <p className="text-sm">Belum ada konten untuk ditampilkan di pratinjau.</p>
                          <p className="text-xs text-fg-muted mt-1">
                            Ketik materi Markdown di panel editor atau klik tombol toolbar di atas.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm(EMPTY_FORM);
                }}
              >
                Batal
              </Button>
              <Button type="submit">
                {editing ? 'Simpan Perubahan Modul' : 'Buat Modul Sekarang'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Empty States */}
      {!showForm && moduls.length === 0 && (
        <EmptyState
          title="Belum ada modul"
          desc="Jalankan import-modul atau buat modul baru untuk memulai program ini."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setForm({ ...EMPTY_FORM });
                setFormFieldTab('materi_peserta_md');
                setShowForm(true);
              }}
            >
              Tambah Modul
            </Button>
          }
        />
      )}

      {!showForm && moduls.length > 0 && grouped.length === 0 && (
        <EmptyState
          title="Kategori kosong"
          desc="Tidak ada modul pada kategori ini untuk program yang dipilih."
          action={
            <Button variant="secondary" onClick={() => setFilterKategori('SEMUA')}>
              Tampilkan semua kategori
            </Button>
          }
        />
      )}

      {/* Modul List Cards */}
      {!showForm && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.def.kode} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex items-center gap-2.5">
                  <Badge className={`font-mono font-bold ${g.def.warnaBadge}`}>{g.def.kode}</Badge>
                  <h2 className="text-subhead font-bold text-fg">{g.def.label}</h2>
                </div>
                <span className="font-mono text-xs text-fg-subtle">
                  {g.items.length} modul · {g.items.reduce((a, m) => a + m.durasi_menit, 0)} menit total
                </span>
              </div>

              <ul className="space-y-2.5">
                {g.items.map((m) => {
                  const auto = resolveKategori({ ...m, kategori: null });
                  const differs = m.kategori != null && m.kategori !== auto;
                  const hasPeserta = !!m.materi_peserta_md && m.materi_peserta_md.trim().length > 0;
                  const hasInstruktur = !!m.content_md && m.content_md.trim().length > 0;
                  const hasTable = (m.content_md?.includes('|---|') || m.materi_peserta_md?.includes('|---|')) ?? false;

                  return (
                    <li key={m.id}>
                      <Card className="!p-4 sm:!p-5 hover:border-border-3 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-mono text-base font-bold text-primary-text">
                                {m.kode}
                              </span>
                              <h3 className="min-w-0 font-semibold text-fg text-sm sm:text-base">
                                {m.judul}
                              </h3>
                              {differs && (
                                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]">
                                  kategori manual
                                </Badge>
                              )}
                            </div>

                            {/* Badges and metadata */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                              <span className="font-mono text-fg-subtle">
                                #{m.urutan_sesi} · {m.durasi_menit} menit
                              </span>

                              {hasPeserta ? (
                                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[11px]">
                                  Peserta: Ada
                                </Badge>
                              ) : (
                                <Badge className="border-border bg-surface text-fg-subtle font-mono text-[11px]">
                                  Peserta: Belum
                                </Badge>
                              )}

                              {hasInstruktur ? (
                                <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-400 font-mono text-[11px]">
                                  Instruktur: Ada
                                </Badge>
                              ) : (
                                <Badge className="border-border bg-surface text-fg-subtle font-mono text-[11px]">
                                  Instruktur: Kosong
                                </Badge>
                              )}

                              {hasTable && (
                                <Badge className="border-purple-500/30 bg-purple-500/10 text-purple-400 font-mono text-[11px] flex items-center gap-1">
                                  <TableIcon className="h-3 w-3" />
                                  Ada Tabel
                                </Badge>
                              )}

                              {m.slide_url && (
                                <span className="font-mono text-xs text-primary-text underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  Slide
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleOpenView(m)}>
                              <Eye className="h-3.5 w-3.5" />
                              Lihat Modul
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => startEdit(m)}>
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {kategoriTanpaIsi.length > 0 && filterKategori === 'SEMUA' && (
        <p className="border-t border-border pt-4 font-mono text-xs text-fg-subtle">
          Kategori silabus yang belum memiliki modul: {kategoriTanpaIsi.map((k) => k.label).join(', ')}
        </p>
      )}

      <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
        <ChevronDown className="h-3 w-3" aria-hidden />
        Urutan sesi mengikuti urutan_sesi di dalam masing-masing kategori modul.
      </p>

      {/* Enhanced Viewing Modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6"
          onClick={() => setViewing(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-border-2 bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 border-b border-border-2 bg-surface/95 px-6 py-4 backdrop-blur-md space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-bold text-primary-text">{viewing.kode}</span>
                    <Badge className="font-mono">{viewing.kategori ?? 'Umum'}</Badge>
                    <Badge className="border-border bg-surface-2 font-mono text-xs">
                      #{viewing.urutan_sesi} · {viewing.durasi_menit} menit
                    </Badge>
                    <Badge className="border-primary/20 bg-primary/10 text-primary-text font-mono text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {viewingReadTime} mnt baca
                    </Badge>
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-fg">{viewing.judul}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {viewing.slide_url && (
                    <a
                      href={viewing.slide_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border-2 bg-surface px-3 py-1.5 text-xs font-semibold text-primary-text hover:border-primary transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Slide
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const v = viewing;
                      setViewing(null);
                      startEdit(v);
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Modul
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Material Toggle Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 rounded-lg border border-border-2 bg-surface-2/60 p-1">
                  <button
                    type="button"
                    onClick={() => setViewingTab('peserta')}
                    className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                      viewingTab === 'peserta'
                        ? 'bg-primary text-black shadow-sm'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    Materi Peserta (Untuk Siswa)
                    {viewing.materi_peserta_md ? (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[10px] text-emerald-400">
                        Ada
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.2 font-mono text-[10px]">
                        Kosong
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingTab('instruktur')}
                    className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                      viewingTab === 'instruktur'
                        ? 'bg-primary text-black shadow-sm'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Materi Instruktur (Pengajar)
                    {viewing.content_md ? (
                      <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 font-mono text-[10px] text-sky-400">
                        Ada
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.2 font-mono text-[10px]">
                        Kosong
                      </span>
                    )}
                  </button>
                </div>

                <span className="text-xs text-fg-subtle">
                  Format tabel dan callout diproses otomatis dengan rapi.
                </span>
              </div>

              {/* Quick TOC Anchor Bar */}
              {viewingTOC.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-border-2/50 text-xs">
                  <span className="shrink-0 text-fg-subtle font-mono text-[11px]">Daftar Isi:</span>
                  {viewingTOC.map((t) => (
                    <a
                      key={t.id}
                      href={`#${t.id}`}
                      className="shrink-0 rounded-md border border-border-2 bg-surface px-2.5 py-1 text-fg-muted hover:border-primary hover:text-primary-text transition"
                    >
                      # {t.title}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Body: Rich Rendered Markdown */}
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {activeViewingContent.trim() ? (
                <div
                  className="prose-md text-fg max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(activeViewingContent) }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-fg-subtle">
                  <BookOpen className="h-12 w-12 stroke-[1.5] mb-3 opacity-40 text-primary-text" />
                  <h3 className="text-base font-semibold text-fg">Konten Belum Tersedia</h3>
                  <p className="mt-1 text-sm max-w-md">
                    Modul ini belum memiliki teks untuk bagian{' '}
                    <strong className="text-primary-text">
                      {viewingTab === 'peserta' ? 'Materi Peserta' : 'Materi Instruktur'}
                    </strong>
                    . Anda dapat menambahkannya melalui editor.
                  </p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      const v = viewing;
                      setViewing(null);
                      startEdit(v);
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Isi Materi Sekarang
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}