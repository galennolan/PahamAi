import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, Tabs, Stat, ConfirmDialog } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul, Jalur, JalurInfo, ModulKategori } from '../types';
import { JALUR_FALLBACK, jalurLabel, KATEGORI_MODUL, resolveKategori } from '../types';
import { listModulByJalur, listJalurInfo, createJalur, updateJalur, deleteJalur } from '../services/modul';
import { renderMarkdown } from '../lib/markdown';
import { ChevronDown, Plus, Eye, X, Pencil, Trash2 } from 'lucide-react';

type FilterKategori = ModulKategori | 'SEMUA';
type JalurTab = 'modul' | 'jalur';

const EMPTY_FORM = {
  id: '',
  kode: '',
  judul: '',
  jalur: 'A' as Jalur,
  kategori: '' as string,
  urutan_sesi: 1,
  durasi_menit: 60,
  content_md: '',
  slide_url: '',
};

export default function KelolaModulPage() {
  const { push: toast } = useToast();
  const [jalurTab, setJalurTab] = useState<JalurTab>('modul');
  const [jalur, setJalur] = useState<Jalur>('A');
  const [jalurList, setJalurList] = useState<JalurInfo[]>(JALUR_FALLBACK);
  const [filterKategori, setFilterKategori] = useState<FilterKategori>('SEMUA');
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Modul | null>(null);
  const [viewing, setViewing] = useState<Modul | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savingJalur, setSavingJalur] = useState(false);
  const [editingJalur, setEditingJalur] = useState<JalurInfo | null>(null);
  const [jalurForm, setJalurForm] = useState({ kode: '', label: '', deskripsi: '', urutan: 99, aktif: true });
  const [deletingJalur, setDeletingJalur] = useState<JalurInfo | null>(null);

  const loadJalur = useCallback(async () => {
    const list = await listJalurInfo(false);
    setJalurList(list.length > 0 ? list : JALUR_FALLBACK);
    const aktif = list.filter((j) => j.aktif);
    setJalur((prev) => {
      const pool = aktif.length > 0 ? aktif : list;
      return pool.some((j) => j.kode === prev) ? prev : (pool[0]?.kode as Jalur ?? 'A');
    });
  }, []);

  const load = useCallback(async () => {
    setModuls(await listModulByJalur(jalur));
  }, [jalur]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadJalur();
      } catch (e: unknown) {
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadJalur, toast]);

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
      jalur: form.jalur,
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
      jalur: m.jalur,
      kategori: m.kategori ?? '',
      urutan_sesi: m.urutan_sesi,
      durasi_menit: m.durasi_menit,
      content_md: m.content_md ?? '',
      slide_url: m.slide_url ?? '',
    });
    setShowForm(true);
  };

  const handleSubmitJalur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jalurForm.kode || !jalurForm.label) {
      toast('Kode dan label wajib diisi', 'error');
      return;
    }
    setSavingJalur(true);
    try {
      if (editingJalur) {
        await updateJalur(editingJalur.kode, {
          label: jalurForm.label.trim(),
          deskripsi: jalurForm.deskripsi?.trim() || null,
          aktif: jalurForm.aktif,
        });
        toast('Jalur diperbarui', 'success');
      } else {
        await createJalur({
          kode: jalurForm.kode.trim().toUpperCase(),
          label: jalurForm.label.trim(),
          deskripsi: jalurForm.deskripsi?.trim() || null,
          urutan: jalurForm.urutan ?? 99,
        });
        toast('Jalur dibuat', 'success');
      }
      setShowForm(false);
      setEditingJalur(null);
      setJalurForm({ kode: '', label: '', deskripsi: '', urutan: 99, aktif: true });
      await loadJalur();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSavingJalur(false);
    }
  };

  const handleDeleteJalur = async () => {
    if (!deletingJalur) return;
    setSavingJalur(true);
    try {
      await deleteJalur(deletingJalur.kode);
      toast('Jalur dihapus', 'success');
      setDeletingJalur(null);
      await loadJalur();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSavingJalur(false);
    }
  };

  const activeJalur = useMemo(() => jalurList.filter((j) => j.aktif), [jalurList]);
  const kategoriTanpaIsi = KATEGORI_MODUL.filter((k) => (kategoriCounts.get(k.kode) ?? 0) === 0);

  if (loading) return <Loading text="Memuat modul..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Modul</h1>
          {jalurTab === 'modul' ? (
            <p className="mt-0.5 text-sm text-fg-muted">
              {jalurLabel(jalurList, jalur)} · {moduls.length} modul · {KATEGORI_MODUL.length} kategori
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-fg-muted">
              {jalurList.filter((j) => j.aktif).length} jalur aktif · {jalurList.length} total
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            label="Pilih mode"
            value={jalurTab}
            onChange={setJalurTab}
            options={[
              { key: 'modul', label: 'Modul' },
              { key: 'jalur', label: 'Jalur' },
            ]}
          />
          {jalurTab === 'modul' && (
            <Button
              onClick={() => {
                setEditing(null);
                setForm({ ...EMPTY_FORM, jalur });
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tambah Modul
            </Button>
          )}
          {jalurTab === 'jalur' && (
            <Button
              onClick={() => {
                setEditingJalur(null);
                setJalurForm({ kode: '', label: '', deskripsi: '', urutan: 99, aktif: true });
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tambah Jalur
            </Button>
          )}
        </div>
      </div>

      {jalurTab === 'modul' && (
        <>
          <Tabs
            label="Pilih jalur"
            value={jalur}
            onChange={(v) => setJalur(v as Jalur)}
            options={activeJalur.map((j) => ({ key: j.kode, label: j.label }))}
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Jalur">
                    <SelectInput
                      value={form.jalur}
                      onChange={(e) => setForm({ ...form, jalur: e.target.value as Jalur })}
                    >
                      {activeJalur.map((j) => (
                        <option key={j.kode} value={j.kode} className="bg-surface">
                          {j.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
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
                    setForm({ ...EMPTY_FORM, jalur });
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
              desc="Tidak ada modul pada kategori ini untuk jalur yang dipilih."
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
        </>
      )}

      {jalurTab === 'jalur' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-subhead font-semibold text-fg">Kelola Jalur</h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Tambah, edit, atau nonaktifkan jalur. Jalur nonaktif disembunyikan dari dropdown modul/batch.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingJalur(null);
                setJalurForm({ kode: '', label: '', deskripsi: '', urutan: 99, aktif: true });
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tambah Jalur
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jalurList.map((j) => (
              <Card key={j.kode} className="!p-4 transition hover:border-border-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary-text">{j.kode}</span>
                      <span className="font-semibold text-fg">{j.label}</span>
                      {!j.aktif && <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]">nonaktif</Badge>}
                    </div>
                    <p className="mt-1 font-mono text-xs text-fg-subtle">
                      Urutan: {j.urutan} · {j.deskripsi ?? '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingJalur(j);
                      setJalurForm({ kode: j.kode, label: j.label, deskripsi: j.deskripsi ?? '', urutan: j.urutan, aktif: j.aktif });
                      setShowForm(true);
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {j.kode !== 'A' && (
                      <Button size="sm" variant="ghost" onClick={() => setDeletingJalur(j)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {showForm && editingJalur && (
            <Card>
              <h2 className="mb-4 text-subhead font-semibold text-fg">
                Edit Jalur {editingJalur.kode}
              </h2>
              <form onSubmit={handleSubmitJalur} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Kode Jalur" hint="Singkat, uppercase, unik (cth: A, B1, C1)">
                    <TextInput
                      placeholder="C1"
                      value={jalurForm.kode}
                      onChange={(e) => setJalurForm({ ...jalurForm, kode: e.target.value.toUpperCase() })}
                      required
                      disabled
                    />
                  </Field>
                  <Field label="Label">
                    <TextInput
                      placeholder="C1 — Menengah Lanjutan"
                      value={jalurForm.label}
                      onChange={(e) => setJalurForm({ ...jalurForm, label: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                <Field label="Deskripsi" hint="Opsional, tampil di tooltip dropdown">
                  <TextInput
                    placeholder="Menengah lanjutan · 12 sesi · 120 mnt"
                    value={jalurForm.deskripsi}
                    onChange={(e) => setJalurForm({ ...jalurForm, deskripsi: e.target.value })}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={savingJalur}>
                    {savingJalur ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowForm(false); setEditingJalur(null); setJalurForm({ kode: '', label: '', deskripsi: '', urutan: 99, aktif: true }); }}>
                    Batal
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {showForm && !editingJalur && !editing && (
            <Card>
              <h2 className="mb-4 text-subhead font-semibold text-fg">Buat Jalur Baru</h2>
              <form onSubmit={handleSubmitJalur} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Kode Jalur" hint="Singkat, uppercase, unik (cth: A, B1, C1)">
                    <TextInput
                      placeholder="C1"
                      value={jalurForm.kode}
                      onChange={(e) => setJalurForm({ ...jalurForm, kode: e.target.value.toUpperCase() })}
                      required
                    />
                  </Field>
                  <Field label="Label">
                    <TextInput
                      placeholder="C1 — Menengah Lanjutan"
                      value={jalurForm.label}
                      onChange={(e) => setJalurForm({ ...jalurForm, label: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Urutan">
                    <TextInput type="number" min={1} value={jalurForm.urutan ?? 99} onChange={(e) => setJalurForm({ ...jalurForm, urutan: parseInt(e.target.value) || 99 })} />
                  </Field>
                  <Field label="Aktif">
                    <SelectInput value={String(jalurForm.aktif ?? true)} onChange={(e) => setJalurForm({ ...jalurForm, aktif: e.target.value === 'true' })}>
                      <option value="true" className="bg-surface">Ya</option>
                      <option value="false" className="bg-surface">Tidak</option>
                    </SelectInput>
                  </Field>
                </div>
                <Field label="Deskripsi" hint="Opsional, tampil di tooltip dropdown">
                  <TextInput
                    placeholder="Menengah lanjutan · 12 sesi · 120 mnt"
                    value={jalurForm.deskripsi}
                    onChange={(e) => setJalurForm({ ...jalurForm, deskripsi: e.target.value })}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={savingJalur}>
                    {savingJalur ? 'Menyimpan...' : 'Buat Jalur'}
                  </Button>
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowForm(false); setJalurForm({ kode: '', label: '', deskripsi: '', urutan: 99, aktif: true }); }}>
                    Batal
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {deletingJalur && (
            <ConfirmDialog
              title="Hapus Jalur?"
              message={`Jalur "${deletingJalur.label}" ({deletingJalur.kode}) akan dihapus permanen. Pastikan tidak ada modul/batch yang masih pakai jalur ini.`}
              confirmLabel="Hapus"
              onConfirm={handleDeleteJalur}
              onCancel={() => setDeletingJalur(null)}
              busy={savingJalur}
            />
          )}
        </div>
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
                  #{viewing.urutan_sesi} · {viewing.durasi_menit} menit · {jalurLabel(jalurList, viewing.jalur)}
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