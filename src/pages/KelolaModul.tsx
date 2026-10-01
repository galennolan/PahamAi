import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, Tabs, Stat } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul, ModulKategori } from '../types';
import { KATEGORI_MODUL, resolveKategori } from '../types';
import { listModulByProgram, listProgramTerpakai } from '../services/modul';
import { PROGRAM, programLabel, type ProgramKode } from '../constants/program';
import { renderMarkdown } from '../lib/markdown';
import { ChevronDown, Plus, Eye, X } from 'lucide-react';

type FilterKategori = ModulKategori | 'SEMUA';

const EMPTY_FORM = {
  id: '',
  kode: '',
  judul: '',
  kategori: '' as string,
  urutan_sesi: 1,
  durasi_menit: 60,
  content_md: '',
  slide_url: '',
};

export default function KelolaModulPage() {
  const { push: toast } = useToast();
  const [program, setProgram] = useState<ProgramKode>('B1');
  const [programOptions, setProgramOptions] = useState<ProgramKode[]>([]);
  const [filterKategori, setFilterKategori] = useState<FilterKategori>('SEMUA');
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Modul | null>(null);
  const [viewing, setViewing] = useState<Modul | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

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

    toast(editing ? 'Modul diperbarui' : 'Modul dibuat', 'success');
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
      slide_url: m.slide_url ?? '',
    });
    setShowForm(true);
  };

  const kategoriTanpaIsi = KATEGORI_MODUL.filter((k) => (kategoriCounts.get(k.kode) ?? 0) === 0);

  if (loading) return <Loading text="Memuat modul..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Modul</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {programLabel(program)} · {moduls.length} modul · {KATEGORI_MODUL.length} kategori
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ ...EMPTY_FORM });
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah Modul
          </Button>
        </div>
      </div>

      <Tabs
        label="Pilih program"
        value={program}
        onChange={(v) => setProgram(v as ProgramKode)}
        options={programOptions.map((kode) => ({ key: kode, label: programLabel(kode) }))}
      />

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kategori">
            <button
              type="button"
              onClick={() => setFilterKategori('SEMUA')}
              aria-pressed={filterKategori === 'SEMUA'}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-[8px] border px-3 py-1.5 text-sm transition ${
                filterKategori === 'SEMUA'
                  ? 'border-primary bg-primary/10 text-primary-text'
                  : 'border-border-2 bg-surface text-fg-muted hover:border-border-3 hover:text-fg'
              }`}
            >
              Semua kategori
              <span className="font-mono text-xs opacity-70">{moduls.length}</span>
            </button>
            {KATEGORI_MODUL.map((k) => (
              <button
                key={k.kode}
                type="button"
                onClick={() => setFilterKategori(k.kode)}
                aria-pressed={filterKategori === k.kode}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-sm transition ${
                  filterKategori === k.kode
                    ? `${k.warnaBadge} border-current`
                    : 'border-border-2 bg-surface text-fg-muted hover:border-border-3 hover:text-fg'
              }`}
              >
                <span>{k.label}</span>
                <span className="font-mono text-xs opacity-70">{kategoriCounts.get(k.kode) ?? 0}</span>
              </button>
            ))}
          </div>

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

          {showForm && (
            <Card>
              <h2 className="mb-4 text-subhead font-semibold text-fg">
                {editing ? `Edit ${editing.kode}` : 'Buat Modul Baru'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Kode Modul">
                    <TextInput
                      placeholder="A01, B101"
                      value={form.kode}
                      onChange={(e) => setForm({ ...form, kode: e.target.value })}
                      required
                      disabled={!!editing}
                    />
                  </Field>
                  <Field label="Judul">
                    <TextInput
                      placeholder="Membahas AI dasar..."
                      value={form.judul}
                      onChange={(e) => setForm({ ...form, judul: e.target.value })}
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Kategori" hint="Kosong = otomatis dari kode modul">
                    <SelectInput
                      value={form.kategori}
                      onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    >
                      <option value="" className="bg-surface">
                        — Otomatis dari kode —
                      </option>
                      {KATEGORI_MODUL.map((k) => (
                        <option key={k.kode} value={k.kode} className="bg-surface">
                          {k.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Urutan">
                    <TextInput
                      type="number"
                      min={1}
                      value={form.urutan_sesi}
                      onChange={(e) => setForm({ ...form, urutan_sesi: parseInt(e.target.value) || 1 })}
                    />
                  </Field>
                  <Field label="Durasi (menit)">
                    <TextInput
                      type="number"
                      min={1}
                      value={form.durasi_menit}
                      onChange={(e) => setForm({ ...form, durasi_menit: parseInt(e.target.value) || 60 })}
                    />
                  </Field>
                </div>

                <Field label="Link Slide">
                  <TextInput
                    placeholder="https://docs.google.com/presentation/..."
                    value={form.slide_url}
                    onChange={(e) => setForm({ ...form, slide_url: e.target.value })}
                  />
                </Field>

                <Field label="Konten Modul (Markdown)">
                  <textarea
                    value={form.content_md}
                    onChange={(e) => setForm({ ...form, content_md: e.target.value })}
                    className="h-40 w-full rounded-[4px] border border-border-2 bg-bg px-3.5 py-2.5 font-mono text-sm text-fg outline-none focus:border-[fg] focus:shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                    placeholder={'# Judul\n\nKonten modul...'}
                  />
                </Field>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editing ? 'Simpan Perubahan' : 'Simpan'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                      setForm(EMPTY_FORM);
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!showForm && moduls.length === 0 && (
            <EmptyState
              title="Belum ada modul"
              desc="Jalankan import-modul atau buat modul baru untuk memulai."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setForm({ ...EMPTY_FORM });
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

          {!showForm && grouped.length > 0 && (
            <div className="space-y-4">
              {grouped.map((g) => (
                <section key={g.def.kode}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-subhead font-semibold text-fg">{g.def.label}</h2>
                    <Badge className={`font-mono ${g.def.warnaBadge}`}>{g.def.kode}</Badge>
                    <span className="font-mono text-xs text-fg-subtle">
                      {g.items.length} modul · {g.items.reduce((a, m) => a + m.durasi_menit, 0)} menit
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {g.items.map((m) => {
                      const auto = resolveKategori({ ...m, kategori: null });
                      const differs = m.kategori != null && m.kategori !== auto;
                      return (
                        <li key={m.id}>
                          <Card className="!p-3.5 sm:!p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-primary-text">{m.kode}</span>
                                  <p className="min-w-0 truncate text-sm font-semibold text-fg">{m.judul}</p>
                                  {differs && (
                                    <Badge className="border-[primary-hover]/30 bg-primary-hover/10 text-[primary-hover] text-[10px]">
                                      manual
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 font-mono text-xs text-fg-subtle">
                                  #{m.urutan_sesi} · {m.durasi_menit} menit
                                  {m.slide_url && <span className="text-[border-3]"> · ada slide</span>}
                                  {m.content_md ? '' : ' · konten kosong'}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Button size="sm" variant="ghost" onClick={() => setViewing(m)}>
                                  <Eye className="h-3.5 w-3.5" />
                                  Lihat
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => startEdit(m)}>
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
            <p className="border-t border-border pt-3 font-mono text-xs text-fg-subtle">
              Belum terisi: {kategoriTanpaIsi.map((k) => k.label).join(', ')}
            </p>
          )}


      <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
        <ChevronDown className="h-3 w-3" aria-hidden />
        Urutan sesi tetap mengikuti urutan_sesi di dalam masing-masing kategori.
      </p>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border-2 bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary-text">{viewing.kode}</span>
                  <Badge className="font-mono">{viewing.kategori ?? '—'}</Badge>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-fg">{viewing.judul}</h2>
                <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                  #{viewing.urutan_sesi} · {viewing.durasi_menit} menit · {programLabel(program)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {viewing.slide_url && (
              <a
                href={viewing.slide_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-primary-text underline"
              >
                Buka Slide
              </a>
            )}
            <div
              className="prose prose-sm max-w-none text-fg"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(viewing.content_md) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}