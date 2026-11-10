import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, Badge } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul, ModulInduk } from '../types';
import { listModulInduk, listPertemuanByModul } from '../services/modul';
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
  BookOpen,
  Image as ImageIcon,
  GraduationCap,
  ArrowLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface PertemuanForm {
  id: string;
  modul_id: string;
  modul_nama: string;
  pertemuan: number;
  kode: string;
  nama_modul: string;
  isi_modul: string;
}

const EMPTY_PERTEMUAN_FORM: PertemuanForm = {
  id: '',
  modul_id: 'MOD-AI-01',
  modul_nama: 'Dasar Kecerdasan Buatan & Prompt Engineering',
  pertemuan: 1,
  kode: 'AI01-P01',
  nama_modul: '',
  isi_modul: '',
};

export default function KelolaModulPage() {
  const { push: toast } = useToast();

  // Navigation State: null = Level 1 (Katalog Modul), ModulInduk = Level 2 (Daftar Pertemuan Modul Tersebut)
  const [selectedModulInduk, setSelectedModulInduk] = useState<ModulInduk | null>(null);

  // Data states
  const [modulIndukList, setModulIndukList] = useState<ModulInduk[]>([]);
  const [pertemuanList, setPertemuanList] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Simpel: Nama Modul & Isi Modul per Pertemuan)
  const [showForm, setShowForm] = useState(false);
  const [editingPertemuan, setEditingPertemuan] = useState<Modul | null>(null);
  const [form, setForm] = useState<PertemuanForm>(EMPTY_PERTEMUAN_FORM);
  const [formViewMode, setFormViewMode] = useState<'split' | 'edit' | 'preview'>('split');

  // Preview Modal states
  const [viewing, setViewing] = useState<Modul | null>(null);

  // Online Image Insertion Modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imgModalUrl, setImgModalUrl] = useState('');
  const [imgModalCaption, setImgModalCaption] = useState('');

  // Modal Buat Modul Induk Baru
  const [showNewModulModal, setShowNewModulModal] = useState(false);
  const [newModulNama, setNewModulNama] = useState('');
  const [newModulDeskripsi, setNewModulDeskripsi] = useState('');

  const loadData = useCallback(async () => {
    try {
      const induks = await listModulInduk();
      setModulIndukList(induks);

      if (selectedModulInduk) {
        const pertemuans = await listPertemuanByModul(selectedModulInduk.id);
        setPertemuanList(pertemuans);
      }
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
  }, [selectedModulInduk, toast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await loadData();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const channel = supabase
      .channel('modul-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modul' }, () => {
        if (mounted) loadData();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Ketika pengguna mengklik sebuah modul dari Level 1
  const handleSelectModul = async (m: ModulInduk) => {
    setSelectedModulInduk(m);
    setLoading(true);
    try {
      const pertemuans = await listPertemuanByModul(m.id);
      setPertemuanList(pertemuans);
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddPertemuan = () => {
    if (!selectedModulInduk) return;
    const nextPertemuan = (pertemuanList[pertemuanList.length - 1]?.urutan_sesi ?? 0) + 1;
    const prefix = selectedModulInduk.id.replace('MOD-', '').replace('-', '');
    const kode = `${prefix}-P${String(nextPertemuan).padStart(2, '0')}`;

    setEditingPertemuan(null);
    setForm({
      id: '',
      modul_id: selectedModulInduk.id,
      modul_nama: selectedModulInduk.nama,
      pertemuan: nextPertemuan,
      kode,
      nama_modul: `Pertemuan ${nextPertemuan}: `,
      isi_modul: `# Pertemuan ${nextPertemuan}: \n\n## 1. Capaian Pembelajaran\n\n## 2. Pembahasan Materi\n\n## 3. Rangkuman & Latihan\n`,
    });
    setShowForm(true);
  };

  const handleStartEditPertemuan = (m: Modul) => {
    setEditingPertemuan(m);
    setForm({
      id: m.id,
      modul_id: m.offline_material_path || selectedModulInduk?.id || 'MOD-AI-01',
      modul_nama: m.slide_url || selectedModulInduk?.nama || 'Modul AI',
      pertemuan: m.urutan_sesi,
      kode: m.kode,
      nama_modul: m.judul,
      isi_modul: m.materi_peserta_md || m.content_md || '',
    });
    setShowForm(true);
  };

  const handleSubmitPertemuan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_modul.trim()) {
      toast('Nama pertemuan modul wajib diisi', 'error');
      return;
    }

    const payload = {
      kode: form.kode,
      judul: form.nama_modul.trim(),
      urutan_sesi: Number(form.pertemuan) || 1,
      durasi_menit: 100,
      content_md: form.isi_modul,
      materi_peserta_md: form.isi_modul,
      offline_material_path: form.modul_id,
      slide_url: form.modul_nama,
      kategori: null,
    };

    let error: { message: string } | null = null;
    if (editingPertemuan) {
      const res = await supabase.from('modul').update(payload).eq('id', editingPertemuan.id);
      error = res.error;
    } else {
      const res = await supabase.from('modul').insert(payload);
      error = res.error;
    }

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast(editingPertemuan ? 'Pertemuan berhasil diperbarui' : 'Pertemuan baru berhasil ditambahkan', 'success');
    setShowForm(false);
    setEditingPertemuan(null);
    setForm(EMPTY_PERTEMUAN_FORM);
    await loadData();
  };

  const handleCreateNewModulInduk = async () => {
    if (!newModulNama.trim()) {
      toast('Nama modul tidak boleh kosong', 'error');
      return;
    }

    const nextIdx = modulIndukList.length + 1;
    const newId = `MOD-AI-${String(nextIdx).padStart(2, '0')}`;
    const newPrefix = `AI${String(nextIdx).padStart(2, '0')}`;

    // Buat Pertemuan 1 awal untuk modul baru
    const defaultMateri = `# Pertemuan 1: Pengantar ${newModulNama.trim()}\n\n## 1. Capaian Pembelajaran\nMahasiswa memahami garis besar kurikulum dan konsep dasar.\n\n## 2. Materi Inti\nSilakan lengkapi materi pembelajaran di sini.\n`;

    const { error } = await supabase.from('modul').insert({
      kode: `${newPrefix}-P01`,
      judul: `Pertemuan 1: Pengantar ${newModulNama.trim()}`,
      urutan_sesi: 1,
      durasi_menit: 100,
      content_md: defaultMateri,
      materi_peserta_md: defaultMateri,
      offline_material_path: newId,
      slide_url: newModulNama.trim(),
      kategori: null,
    });

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast(`Modul "${newModulNama}" berhasil dibuat beserta Pertemuan 1!`, 'success');
    setShowNewModulModal(false);
    setNewModulNama('');
    setNewModulDeskripsi('');
    await loadData();
  };

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

  if (loading && !selectedModulInduk && modulIndukList.length === 0) {
    return <Loading text="Memuat katalog modul..." />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ==================================================================== */}
      {/* LEVEL 1: KATALOG MODUL UTAMA (KETIKA BELUM ADA MODUL YANG DIPILIH)   */}
      {/* ==================================================================== */}
      {!selectedModulInduk && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Katalog Modul */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 font-mono text-xs font-bold text-primary-text flex items-center gap-1.5 w-fit">
                  <Layers className="h-3.5 w-3.5" />
                  Katalog Modul Kursus
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                  Pilih Modul Pembelajaran
                </h1>
                <p className="text-sm text-fg-muted max-w-2xl">
                  Setiap modul mencakup kurikulum berstandar perkuliahan dengan 14 pertemuan terstruktur. Klik modul untuk melihat dan mengelola pertemuannya.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => setShowNewModulModal(true)}>
                  <Plus className="h-4 w-4" />
                  Buat Modul Baru
                </Button>
              </div>
            </div>
          </div>

          {/* Grid Daftar Modul */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {modulIndukList.map((m) => (
              <div
                key={m.id}
                onClick={() => handleSelectModul(m)}
                className="cursor-pointer group flex flex-col justify-between p-6 rounded-xl border border-border-2 bg-surface hover:border-primary/50 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary-text">
                      {m.kode}
                    </span>
                    <Badge className="border-border bg-surface-2 font-mono text-xs">
                      {m.total_pertemuan} Pertemuan
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-fg group-hover:text-primary-text transition leading-snug">
                    {m.nama}
                  </h3>

                  <p className="text-xs text-fg-muted line-clamp-3 leading-relaxed">
                    {m.deskripsi}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border-2/70 flex items-center justify-between text-xs font-semibold text-primary-text">
                  <span>Lihat 14 Pertemuan</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LEVEL 2: DETAIL MODUL TERPILIH (MENAMPILKAN PERTEMUAN 1 S/D 14)       */}
      {/* ==================================================================== */}
      {selectedModulInduk && (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb & Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-2 pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedModulInduk(null);
                  setShowForm(false);
                  setEditingPertemuan(null);
                }}
                className="text-fg-muted hover:text-fg"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Kembali ke Daftar Modul
              </Button>
              <span className="text-fg-subtle">/</span>
              <span className="font-bold text-fg text-sm sm:text-base">
                {selectedModulInduk.nama}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleOpenAddPertemuan}>
                <Plus className="h-4 w-4" />
                Tambah Pertemuan
              </Button>
            </div>
          </div>

          {/* Banner Modul Terpilih */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary-text flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {selectedModulInduk.kode}
                </span>
                <Badge className="border-border bg-surface font-mono text-xs">
                  {pertemuanList.length} Pertemuan Tersedia
                </Badge>
              </div>
              <h1 className="text-2xl font-extrabold text-fg tracking-tight">
                {selectedModulInduk.nama}
              </h1>
              <p className="text-sm text-fg-muted">
                {selectedModulInduk.deskripsi}
              </p>
            </div>
          </div>

          {/* Form Tambah / Edit Pertemuan (HANYA Nama Modul & Isi Modul) */}
          {showForm && (
            <Card className="border-border-2 bg-surface shadow-xl">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-2 pb-4">
                <div>
                  <span className="font-mono text-xs text-primary-text font-semibold uppercase tracking-wider">
                    {editingPertemuan ? 'Editor Pertemuan Modul' : 'Pertemuan Baru'}
                  </span>
                  <h2 className="text-lg font-bold text-fg">
                    {editingPertemuan ? `Edit ${editingPertemuan.judul}` : `Buat Pertemuan #${form.pertemuan}`}
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPertemuan(null);
                    setForm(EMPTY_PERTEMUAN_FORM);
                  }}
                >
                  <X className="h-4 w-4" />
                  Tutup
                </Button>
              </div>

              <form onSubmit={handleSubmitPertemuan} className="space-y-5">
                {/* Nomor Pertemuan & Nama Modul */}
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
                          const prefix = selectedModulInduk.id.replace('MOD-', '').replace('-', '');
                          const kode = `${prefix}-P${String(num).padStart(2, '0')}`;
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

                    {/* View Mode Controls */}
                    <div className="flex items-center gap-1 rounded-lg border border-border-2 bg-surface p-1">
                      <button
                        type="button"
                        onClick={() => setFormViewMode('split')}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                          formViewMode === 'split' ? 'bg-primary text-black font-semibold' : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        <Columns className="h-3.5 w-3.5" />
                        Split
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormViewMode('edit')}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                          formViewMode === 'edit' ? 'bg-primary text-black font-semibold' : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormViewMode('preview')}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                          formViewMode === 'preview' ? 'bg-primary text-black font-semibold' : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Pratinjau
                      </button>
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        insertMarkdownSnippet(
                          '| Kolom 1 | Kolom 2 | Kolom 3 |\n|---|---|---|\n| Data 1 | Data 2 | Data 3 |'
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
                          '> [!TIP]\n> **Tips Praktik:** Gunakan teknik ini untuk mempermudah implementasi.'
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
                          '```python\n# Kode Praktikum\ndef run():\n    print("Hello World")\n```'
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

                  {/* Editor Workspace */}
                  <div
                    className={`grid gap-4 ${
                      formViewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    {(formViewMode === 'split' || formViewMode === 'edit') && (
                      <textarea
                        value={form.isi_modul}
                        onChange={(e) => setForm({ ...form, isi_modul: e.target.value })}
                        placeholder="# Tulis isi modul materi perkuliahan lengkap menggunakan Markdown..."
                        rows={16}
                        className="w-full rounded-lg border border-border-2 bg-surface p-4 font-mono text-xs sm:text-sm text-fg leading-relaxed focus:border-primary focus:outline-none"
                      />
                    )}

                    {(formViewMode === 'split' || formViewMode === 'preview') && (
                      <div className="h-[380px] w-full overflow-y-auto rounded-lg border border-border-2 bg-surface p-5 shadow-inner">
                        {form.isi_modul.trim() ? (
                          <div
                            className="prose-md text-fg"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(form.isi_modul) }}
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center text-center text-fg-subtle">
                            <BookOpen className="h-8 w-8 stroke-[1.5] mb-2 opacity-40" />
                            <p className="text-sm">Belum ada isi modul.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPertemuan(null);
                      setForm(EMPTY_PERTEMUAN_FORM);
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingPertemuan ? 'Simpan Perubahan Pertemuan' : 'Simpan Pertemuan Baru'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Daftar Pertemuan 1 s.d. 14 dari Modul Terpilih */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-fg-muted font-mono border-b border-border-2 pb-2">
              <span>DAFTAR PERTEMUAN ({pertemuanList.length} PERTEMUAN)</span>
              <span>STANDAR 14 PERTEMUAN PERKULIAHAN</span>
            </div>

            {pertemuanList.length === 0 ? (
              <EmptyState
                title="Belum ada pertemuan di modul ini"
                desc="Tambahkan pertemuan 1 untuk memulai silabus modul ini."
                action={
                  <Button onClick={handleOpenAddPertemuan}>
                    <Plus className="h-4 w-4" /> Tambah Pertemuan 1
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {pertemuanList.map((m) => {
                  const content = m.materi_peserta_md || m.content_md || '';
                  const estMins = estimateReadingTime(content);

                  return (
                    <Card
                      key={m.id}
                      className="!p-4 sm:!p-5 hover:border-primary/40 transition-all border border-border-2 bg-surface"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-primary/10 border border-primary/30 px-2 py-0.5 font-mono text-xs font-bold text-primary-text">
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
                              · {content.length.toLocaleString('id-ID')} karakter isi modul
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewing(m)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Lihat Isi Modul
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStartEditPertemuan(m)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Link to={`/modul/${m.kode}`}>
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
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
            <div className="sticky top-0 z-10 border-b border-border-2 bg-surface/95 px-6 py-4 backdrop-blur-md flex items-start justify-between gap-3">
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
                    Buka Halaman Belajar
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
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
              <div
                className="prose-md text-fg"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(viewingContent) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Modul Induk Baru */}
      {showNewModulModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowNewModulModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-2 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-fg mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary-text" />
              Buat Modul Kursus Baru
            </h3>

            <div className="space-y-4">
              <Field label="Nama Modul Kursus" hint="Contoh: AI untuk Bisnis & Pemasaran">
                <TextInput
                  placeholder="Nama Modul..."
                  value={newModulNama}
                  onChange={(e) => setNewModulNama(e.target.value)}
                  autoFocus
                />
              </Field>

              <Field label="Deskripsi Singkat" hint="Ringkasan target dan cakupan modul">
                <TextInput
                  placeholder="Kurikulum 14 pertemuan seputar..."
                  value={newModulDeskripsi}
                  onChange={(e) => setNewModulDeskripsi(e.target.value)}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setShowNewModulModal(false)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleCreateNewModulInduk} disabled={!newModulNama.trim()}>
                  Buat Modul Sekarang
                </Button>
              </div>
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
