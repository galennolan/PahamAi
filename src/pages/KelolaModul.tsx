import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, Badge } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul } from '../types';
import { listModul } from '../services/modul';
import { renderMarkdown, estimateReadingTime, extractTOC } from '../lib/markdown';
import {
  Plus,
  Eye,
  X,
  Table as TableIcon,
  ExternalLink,
  Edit3,
  Columns,
  EyeOff,
  Clock,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  GraduationCap,
} from 'lucide-react';

interface ModulForm {
  id: string;
  pertemuan: number;
  kode: string;
  nama_modul: string;
  isi_modul: string;
}

const EMPTY_FORM: ModulForm = {
  id: '',
  pertemuan: 1,
  kode: 'P01',
  nama_modul: '',
  isi_modul: '',
};

const DEFAULT_MATKUL = 'Kecerdasan Buatan & AI Engineering';

export default function KelolaModulPage() {
  const { push: toast } = useToast();
  const [matkulNama, setMatkulNama] = useState<string>(() => {
    return localStorage.getItem('paham_ai_matkul_nama') || DEFAULT_MATKUL;
  });
  const [isEditingMatkul, setIsEditingMatkul] = useState(false);
  const [tempMatkul, setTempMatkul] = useState(matkulNama);

  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Simpel: Nama Modul & Isi Modul)
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Modul | null>(null);
  const [form, setForm] = useState<ModulForm>(EMPTY_FORM);
  const [formViewMode, setFormViewMode] = useState<'split' | 'edit' | 'preview'>('split');

  // Preview Modal states
  const [viewing, setViewing] = useState<Modul | null>(null);

  // Online Image Insertion Modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imgModalUrl, setImgModalUrl] = useState('');
  const [imgModalCaption, setImgModalCaption] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await listModul();
      setModuls(data);
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await load();
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
  }, [load]);

  const sortedModuls = useMemo(() => {
    return [...moduls].sort((a, b) => a.urutan_sesi - b.urutan_sesi);
  }, [moduls]);

  const handleSaveMatkul = () => {
    const val = tempMatkul.trim() || DEFAULT_MATKUL;
    setMatkulNama(val);
    localStorage.setItem('paham_ai_matkul_nama', val);
    setIsEditingMatkul(false);
    toast('Nama mata kuliah berhasil disimpan', 'success');
  };

  const handleOpenAdd = () => {
    const nextPertemuan = (sortedModuls[sortedModuls.length - 1]?.urutan_sesi ?? 0) + 1;
    const kode = `P${String(nextPertemuan).padStart(2, '0')}`;
    setEditing(null);
    setForm({
      id: '',
      pertemuan: nextPertemuan,
      kode,
      nama_modul: `Pertemuan ${nextPertemuan}: `,
      isi_modul: `# Pertemuan ${nextPertemuan}: \n\n## 1. Capaian Pembelajaran\n\n## 2. Materi Inti\n\n## 3. Rangkuman & Latihan\n`,
    });
    setShowForm(true);
  };

  const handleStartEdit = (m: Modul) => {
    setEditing(m);
    setForm({
      id: m.id,
      pertemuan: m.urutan_sesi,
      kode: m.kode,
      nama_modul: m.judul,
      isi_modul: m.materi_peserta_md || m.content_md || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_modul.trim()) {
      toast('Nama modul wajib diisi', 'error');
      return;
    }

    const payload = {
      kode: form.kode || `P${String(form.pertemuan).padStart(2, '0')}`,
      judul: form.nama_modul.trim(),
      urutan_sesi: Number(form.pertemuan) || 1,
      durasi_menit: 100, // Standar 2 SKS perkuliahan
      content_md: form.isi_modul,
      materi_peserta_md: form.isi_modul,
      kategori: null,
    };

    let error: { message: string } | null = null;
    if (editing) {
      const res = await supabase.from('modul').update(payload).eq('id', editing.id);
      error = res.error;
    } else {
      const res = await supabase.from('modul').insert(payload);
      error = res.error;
    }

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast(editing ? 'Modul pertemuan berhasil diperbarui' : 'Pertemuan baru berhasil ditambahkan', 'success');
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    await load();
  };

  // Helper insertion for Markdown Toolbar
  const insertMarkdownSnippet = (snippet: string) => {
    const currentVal = form.isi_modul;
    const updated = currentVal ? `${currentVal.trimEnd()}\n\n${snippet}\n` : `${snippet}\n`;
    setForm({ ...form, isi_modul: updated });
  };

  const handleInsertImage = () => {
    if (!imgModalUrl.trim()) return;
    const caption = imgModalCaption.trim() || 'Gambar Pembelajaran';
    const snippet = `![${caption}](${imgModalUrl.trim()})\n*${caption}*`;
    insertMarkdownSnippet(snippet);
    setShowImageModal(false);
    setImgModalUrl('');
    setImgModalCaption('');
  };

  const viewingContent = viewing?.materi_peserta_md || viewing?.content_md || '';
  const viewingTOC = useMemo(() => extractTOC(viewingContent), [viewingContent]);
  const viewingReadTime = useMemo(() => estimateReadingTime(viewingContent), [viewingContent]);

  if (loading) return <Loading text="Memuat silabus perkuliahan..." />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header: Gaya Perkuliahan */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary-text flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                Mata Kuliah
              </span>
              <Badge className="border-border bg-surface font-mono text-xs">
                {moduls.length} Pertemuan
              </Badge>
            </div>

            {isEditingMatkul ? (
              <div className="flex items-center gap-2 pt-1">
                <TextInput
                  value={tempMatkul}
                  onChange={(e) => setTempMatkul(e.target.value)}
                  placeholder="Nama Mata Kuliah..."
                  className="max-w-md font-bold text-lg"
                />
                <Button size="sm" onClick={handleSaveMatkul}>Simpan</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingMatkul(false)}>Batal</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                  {matkulNama}
                </h1>
                <button
                  type="button"
                  onClick={() => { setTempMatkul(matkulNama); setIsEditingMatkul(true); }}
                  className="text-fg-subtle hover:text-primary-text transition p-1"
                  title="Ubah nama mata kuliah"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            )}

            <p className="text-sm text-fg-muted">
              Silabus Terstruktur 14 Pertemuan Perkuliahan · Standar Akademik & Pedagogi AI Modern
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              Tambah Pertemuan
            </Button>
          </div>
        </div>
      </div>

      {/* Form Tambah / Edit Modul (HANYA Nama Modul & Isi Modul) */}
      {showForm && (
        <Card className="border-border-2 bg-surface shadow-xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-2 pb-4">
            <div>
              <span className="font-mono text-xs text-primary-text font-semibold uppercase tracking-wider">
                {editing ? 'Editor Modul Perkuliahan' : 'Pertemuan Perkuliahan Baru'}
              </span>
              <h2 className="text-lg font-bold text-fg">
                {editing ? `Edit ${editing.judul}` : `Buat Pertemuan #${form.pertemuan}`}
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
            {/* Pertemuan & Nama Modul */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <Field label="Pertemuan Ke-" hint="Urutan 1 s/d 14">
                  <TextInput
                    type="number"
                    min={1}
                    max={30}
                    value={form.pertemuan}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      const kode = `P${String(num).padStart(2, '0')}`;
                      setForm({ ...form, pertemuan: num, kode });
                    }}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Nama Modul / Topik Pertemuan" hint="Contoh: Pertemuan 1: Pengantar AI">
                  <TextInput
                    placeholder="Pertemuan X: Judul Materi Perkuliahan..."
                    value={form.nama_modul}
                    onChange={(e) => setForm({ ...form, nama_modul: e.target.value })}
                    required
                  />
                </Field>
              </div>
            </div>

            {/* Markdown Editor Section untuk Isi Modul */}
            <div className="rounded-xl border border-border-2 bg-surface-2/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-2/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-fg flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary-text" />
                    Isi Modul (Materi Perkuliahan)
                  </span>
                  <span className="font-mono text-xs text-fg-subtle">
                    ({form.isi_modul.length} karakter)
                  </span>
                </div>

                {/* View Mode: Split / Edit / Preview */}
                <div className="flex items-center gap-1 rounded-lg border border-border-2 bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setFormViewMode('split')}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                      formViewMode === 'split' ? 'bg-primary text-black font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    Split Editor & Pratinjau
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormViewMode('edit')}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                      formViewMode === 'edit' ? 'bg-primary text-black font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hanya Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormViewMode('preview')}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                      formViewMode === 'preview' ? 'bg-primary text-black font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Hanya Pratinjau
                  </button>
                </div>
              </div>

              {/* Quick Markdown Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-fg-subtle mr-1 font-mono text-[11px]">Sisipkan Cepat:</span>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '| Kolom 1 | Kolom 2 | Kolom 3 |\n|---|---|---|\n| Data 1 | Data 2 | Data 3 |\n| Data 4 | Data 5 | Data 6 |'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2 py-1 text-fg hover:border-primary"
                >
                  <TableIcon className="h-3 w-3" />
                  + Tabel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '> [!NOTE]\n> **Capaian Pembelajaran (Sub-CPMK):** Mahasiswa mampu menguasai...'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2 py-1 text-sky-400 hover:border-sky-500"
                >
                  ℹ️ + Capaian
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '> [!TIP]\n> **Tips Praktik:** Gunakan instruksi ini untuk performa optimal.'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2 py-1 text-emerald-400 hover:border-emerald-500"
                >
                  💡 + Tips
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '> [!IMPORTANT]\n> **Poin Kunci:** Konsep penting yang harus dipahami.'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2 py-1 text-amber-400 hover:border-amber-500"
                >
                  ⭐ + Poin Kunci
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdownSnippet(
                      '```python\n# Contoh Kode Implementasi\nimport os\n\ndef run():\n    print("Hello AI")\n```'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2 py-1 text-cyan-400 hover:border-cyan-500"
                >
                  🐍 + Kode Python
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="inline-flex items-center gap-1 rounded border border-border-2 bg-surface px-2 py-1 text-purple-400 hover:border-purple-500"
                >
                  <ImageIcon className="h-3 w-3" />
                  + Sisipkan Gambar
                </button>
              </div>

              {/* Editor Workspace: Split or Single */}
              <div
                className={`grid gap-4 ${
                  formViewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {(formViewMode === 'split' || formViewMode === 'edit') && (
                  <div className="space-y-1.5">
                    <textarea
                      value={form.isi_modul}
                      onChange={(e) => setForm({ ...form, isi_modul: e.target.value })}
                      placeholder="# Pertemuan X: ...&#10;&#10;Tulis materi perkuliahan lengkap menggunakan Markdown..."
                      rows={18}
                      className="w-full rounded-lg border border-border-2 bg-surface p-4 font-mono text-xs sm:text-sm text-fg leading-relaxed placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {(formViewMode === 'split' || formViewMode === 'preview') && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-fg-subtle">
                      <span className="font-mono text-primary-text font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Pratinjau Hasil Render
                      </span>
                      <span className="font-mono">
                        ~{estimateReadingTime(form.isi_modul)} mnt baca
                      </span>
                    </div>
                    <div className="h-[420px] w-full overflow-y-auto rounded-lg border border-border-2 bg-surface p-5 shadow-inner">
                      {form.isi_modul.trim() ? (
                        <div
                          className="prose-md text-fg"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(form.isi_modul) }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-fg-subtle">
                          <BookOpen className="h-8 w-8 stroke-[1.5] mb-2 opacity-40" />
                          <p className="text-sm">Belum ada isi modul.</p>
                          <p className="text-xs text-fg-muted mt-1">Ketik materi di editor untuk melihat pratinjau.</p>
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
                {editing ? 'Simpan Perubahan Modul' : 'Simpan Pertemuan Baru'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Empty States */}
      {!showForm && sortedModuls.length === 0 && (
        <EmptyState
          title="Belum ada modul perkuliahan"
          desc="Silabus mata kuliah ini belum diisi. Buat pertemuan baru sekarang."
          action={
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              Tambah Pertemuan 1
            </Button>
          }
        />
      )}

      {/* Daftar 14 Pertemuan Perkuliahan (Sederhana & Bersih) */}
      {!showForm && sortedModuls.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-2/70 pb-2.5">
            <span className="font-mono text-xs font-semibold text-fg-subtle uppercase tracking-wider">
              Daftar Pertemuan ({sortedModuls.length} Pertemuan)
            </span>
            <span className="font-mono text-xs text-fg-muted">
              Standar 14 Pertemuan Semester Perkuliahan
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sortedModuls.map((m) => {
              const content = m.materi_peserta_md || m.content_md || '';
              const estMins = estimateReadingTime(content);

              return (
                <Card
                  key={m.id}
                  className="!p-4 sm:!p-5 hover:border-primary/40 transition-all border border-border-2 bg-surface"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="rounded-md bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-mono text-xs font-bold text-primary-text">
                          Pertemuan {m.urutan_sesi}
                        </span>
                        <span className="font-mono text-xs text-fg-subtle">
                          ({m.kode})
                        </span>
                        <h3 className="font-bold text-fg text-sm sm:text-base">
                          {m.judul}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-fg-subtle" /> ~{estMins} mnt baca
                        </span>
                        <span className="font-mono">
                          · {content.length.toLocaleString('id-ID')} karakter materi
                        </span>
                      </div>
                    </div>

                    {/* Actions: Lihat, Edit, Buka */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewing(m)}
                        title="Lihat isi materi perkuliahan"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Lihat Isi Modul
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStartEdit(m)}
                        title="Edit nama dan isi modul"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit Modul
                      </Button>
                      <Link to={`/modul/${m.kode}`}>
                        <Button size="sm" variant="ghost" title="Buka tampilan belajar">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Preview Isi Modul */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6"
          onClick={() => setViewing(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-border-2 bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 border-b border-border-2 bg-surface/95 px-6 py-4 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold rounded bg-primary/10 text-primary-text border border-primary/30 px-2 py-0.5">
                      Pertemuan {viewing.urutan_sesi} · {viewing.kode}
                    </span>
                    <span className="text-xs text-fg-muted font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> ~{viewingReadTime} mnt baca
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-fg">{viewing.judul}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/modul/${viewing.kode}`}>
                    <Button size="sm" variant="secondary">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka di Halaman Belajar
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {/* Table of Contents */}
              {viewingTOC.length > 0 && (
                <div className="mb-6 rounded-xl border border-border-2 bg-surface-2/50 p-4">
                  <span className="font-bold text-xs uppercase tracking-wider text-fg-muted block mb-2">
                    Daftar Bahasan Pertemuan
                  </span>
                  <ul className="space-y-1 text-xs">
                    {viewingTOC.map((t, idx) => (
                      <li key={idx} style={{ paddingLeft: `${(t.level - 2) * 12}px` }}>
                        <span className="text-primary-text font-mono mr-1.5">§</span>
                        <span className="text-fg-muted hover:text-fg">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rendered Content */}
              <div
                className="prose-md text-fg"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(viewingContent) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Online Image Insertion Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-2 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-fg mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary-text" />
              Sisipkan Gambar Online ke Modul
            </h3>

            <div className="space-y-4">
              <Field label="URL Gambar Online" hint="Contoh: https://images.unsplash.com/photo-...">
                <TextInput
                  placeholder="https://images.unsplash.com/..."
                  value={imgModalUrl}
                  onChange={(e) => setImgModalUrl(e.target.value)}
                  autoFocus
                />
              </Field>

              <Field label="Keterangan / Caption Gambar" hint="Penjelasan singkat gambar">
                <TextInput
                  placeholder="Contoh: Diagram Arsitektur Neural Network"
                  value={imgModalCaption}
                  onChange={(e) => setImgModalCaption(e.target.value)}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setShowImageModal(false)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleInsertImage} disabled={!imgModalUrl.trim()}>
                  Sisipkan ke Materi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
