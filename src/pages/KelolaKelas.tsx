import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Plus,
  Users,
  Edit3,
  Trash2,
  ArrowRight,
  UserPlus,
  UserMinus,
  GraduationCap,
  Layers,
  X,
  RotateCw,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Loading, SelectInput, TextInput, ConfirmDialog } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabaseClient';
import { formatJakarta } from '../lib/time';
import { listModulInduk, assignModulKeKelas, renameKelas } from '../services/modul';
import type { Kelas, JadwalSesi, ModulInduk, Peserta, KelasStatus } from '../types';

const STATUS_LABELS: Record<string, string> = {
  terbuka: 'Terbuka',
  berjalan: 'Sedang Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

function generateKodeKelas(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rnd = Math.floor(100 + Math.random() * 900);
  return `KLS-${yy}${mm}-${rnd}`;
}

export default function KelolaKelasPage() {
  const { push: toast } = useToast();

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [modulIndukList, setModulIndukList] = useState<ModulInduk[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail view
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null);
  const [kelasPeserta, setKelasPeserta] = useState<Peserta[]>([]);
  const [kelasJadwal, setKelasJadwal] = useState<JadwalSesi[]>([]);
  const [allPeserta, setAllPeserta] = useState<Peserta[]>([]);

  // Modal Buat Kelas Baru
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    nama: '',
    kode: generateKodeKelas(),
    modul_id: 'MOD-AI-01',
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    kapasitas_maks: 20,
  });
  const [creating, setCreating] = useState(false);

  // Modal Rename Kelas
  const [renamingKelas, setRenamingKelas] = useState<Kelas | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Modal Ganti Modul Kelas
  const [changingModulKelas, setChangingModulKelas] = useState<Kelas | null>(null);
  const [selectedNewModulId, setSelectedNewModulId] = useState('MOD-AI-01');
  const [changingModul, setChangingModul] = useState(false);

  // Modal Tambah Peserta & Hapus Kelas
  const [addPesertaModal, setAddPesertaModal] = useState(false);
  const [searchAdd, setSearchAdd] = useState('');
  const [deleting, setDeleting] = useState<Kelas | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [kelasRes, modulInduks, jadwalRes] = await Promise.all([
        supabase.from('kelas').select('*, peserta(count)').order('created_at', { ascending: false }),
        listModulInduk(),
        supabase.from('jadwal_sesi').select('kelas_id, modul(offline_material_path, slide_url)'),
      ]);

      setModulIndukList(modulInduks);

      // Petakan modul yang dipelajari ke setiap kelas
      const kelasToModulMap = new Map<string, { id: string; nama: string }>();
      for (const j of (jadwalRes.data ?? [])) {
        const mod = j.modul as unknown as { offline_material_path?: string; slide_url?: string } | null;
        if (j.kelas_id && mod?.offline_material_path && !kelasToModulMap.has(j.kelas_id)) {
          kelasToModulMap.set(j.kelas_id, {
            id: mod.offline_material_path,
            nama: mod.slide_url || 'Modul AI',
          });
        }
      }

      setKelasList(
        ((kelasRes.data ?? []) as unknown as Array<Kelas & { peserta?: Array<{ count: number }> }>).map((r) => {
          const modInfo = kelasToModulMap.get(r.id);
          return {
            ...r,
            terdaftar: r.peserta?.[0]?.count ?? 0,
            modul_id: modInfo?.id || 'MOD-AI-01',
            modul_nama: modInfo?.nama || 'Dasar AI & Prompt Engineering',
          };
        }),
      );
    } catch (e) {
      console.error('[KelolaKelas] gagal memuat:', e);
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Load peserta saat detail kelas dibuka
  useEffect(() => {
    if (!selectedKelas) return;
    (async () => {
      const [{ data: p }, { data: j }, { data: ap }] = await Promise.all([
        supabase.from('peserta').select('*').eq('kelas_id', selectedKelas.id).order('nama_lengkap'),
        supabase.from('jadwal_sesi').select('*, modul(*)').eq('kelas_id', selectedKelas.id).order('tanggal_kelas'),
        supabase.from('peserta').select('*').order('nama_lengkap'),
      ]);
      setKelasPeserta((p as Peserta[]) ?? []);
      setKelasJadwal((j as JadwalSesi[]) ?? []);
      setAllPeserta((ap as Peserta[]) ?? []);
    })();
  }, [selectedKelas]);

  // 1. BUAT KELAS BARU (PILIH MODUL & NAMA KELAS)
  const handleCreateKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nama.trim()) {
      toast('Nama kelas wajib diisi', 'error');
      return;
    }

    setCreating(true);
    try {
      // 1. Simpan baris kelas baru
      const { data: newKelas, error: kErr } = await supabase
        .from('kelas')
        .insert({
          kode: createForm.kode.trim() || generateKodeKelas(),
          nama: createForm.nama.trim(),
          status: 'terbuka',
          tanggal_mulai: createForm.tanggal_mulai || null,
          kapasitas_maks: Number(createForm.kapasitas_maks) || 20,
        })
        .select()
        .single();

      if (kErr) throw new Error(kErr.message);

      // 2. Jadwalkan 14 pertemuan dari modul yang dipilih
      await assignModulKeKelas(newKelas.id, createForm.modul_id, createForm.tanggal_mulai);

      toast(`Kelas "${newKelas.nama}" berhasil dibuat dengan modul terpilih!`, 'success');
      setShowCreateModal(false);
      setCreateForm({
        nama: '',
        kode: generateKodeKelas(),
        modul_id: modulIndukList[0]?.id || 'MOD-AI-01',
        tanggal_mulai: new Date().toISOString().slice(0, 10),
        kapasitas_maks: 20,
      });
      await loadData();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setCreating(false);
    }
  };

  // 2. RENAME KELAS
  const handleOpenRename = (k: Kelas) => {
    setRenamingKelas(k);
    setRenameValue(k.nama);
  };

  const handleSaveRename = async () => {
    if (!renamingKelas || !renameValue.trim()) return;
    setRenaming(true);
    try {
      await renameKelas(renamingKelas.id, renameValue.trim());
      toast('Nama kelas berhasil diperbarui!', 'success');
      setRenamingKelas(null);
      if (selectedKelas && selectedKelas.id === renamingKelas.id) {
        setSelectedKelas({ ...selectedKelas, nama: renameValue.trim() });
      }
      await loadData();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setRenaming(false);
    }
  };

  // 3. GANTI / PILIH MODUL YANG DIPELAJARI KELAS
  const handleOpenChangeModul = (k: Kelas) => {
    setChangingModulKelas(k);
    setSelectedNewModulId(k.modul_id || 'MOD-AI-01');
  };

  const handleSaveChangeModul = async () => {
    if (!changingModulKelas) return;
    setChangingModul(true);
    try {
      await assignModulKeKelas(changingModulKelas.id, selectedNewModulId, changingModulKelas.tanggal_mulai ?? undefined);
      toast(`Modul pembelajaran kelas berhasil diubah! 14 pertemuan telah dijadwalkan ulang.`, 'success');
      setChangingModulKelas(null);
      await loadData();

      // Jika sedang membuka detail kelas ini, reload jadwal
      if (selectedKelas && selectedKelas.id === changingModulKelas.id) {
        const { data: j } = await supabase.from('jadwal_sesi').select('*, modul(*)').eq('kelas_id', selectedKelas.id).order('tanggal_kelas');
        setKelasJadwal((j as JadwalSesi[]) ?? []);
      }
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setChangingModul(false);
    }
  };

  // 4. PESERTA MANAJEMEN
  const addPesertaToKelas = async (pesertaId: string) => {
    if (!selectedKelas) return;
    try {
      await supabase.from('peserta').update({ kelas_id: selectedKelas.id }).eq('id', pesertaId);
      const sesiIds = kelasJadwal.map((s) => s.id);
      if (sesiIds.length > 0) {
        const spRows = sesiIds.map((sesi_id) => ({ sesi_id, peserta_id: pesertaId }));
        await supabase.from('sesi_peserta').insert(spRows);
      }

      toast('Peserta berhasil dimasukkan ke kelas', 'success');
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from('peserta').select('*').eq('kelas_id', selectedKelas.id).order('nama_lengkap'),
        supabase.from('kelas').select('*').eq('id', selectedKelas.id).single(),
      ]);
      setKelasPeserta((p as Peserta[]) ?? []);
      if (b) setSelectedKelas(b as Kelas);
      await loadData();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
  };

  const removePesertaFromKelas = async (pesertaId: string) => {
    if (!selectedKelas) return;
    try {
      await supabase.from('peserta').update({ kelas_id: null }).eq('id', pesertaId);
      const sesiIds = kelasJadwal.map((s) => s.id);
      if (sesiIds.length > 0) {
        await supabase.from('sesi_peserta').delete().eq('peserta_id', pesertaId).in('sesi_id', sesiIds);
      }

      toast('Peserta dikeluarkan dari kelas', 'success');
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from('peserta').select('*').eq('kelas_id', selectedKelas.id).order('nama_lengkap'),
        supabase.from('kelas').select('*').eq('id', selectedKelas.id).single(),
      ]);
      setKelasPeserta((p as Peserta[]) ?? []);
      if (b) setSelectedKelas(b as Kelas);
      await loadData();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
  };

  const updateKelasStatus = async (status: KelasStatus) => {
    if (!selectedKelas) return;
    const { error } = await supabase.from('kelas').update({ status }).eq('id', selectedKelas.id);
    if (error) toast(error.message, 'error');
    else {
      toast(`Status kelas → ${STATUS_LABELS[status] ?? status}`, 'success');
      setSelectedKelas({ ...selectedKelas, status });
      await loadData();
    }
  };

  const handleDeleteKelas = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('kelas').delete().eq('id', deleting.id);
    setDeleting(null);
    if (error) toast(error.message, 'error');
    else {
      toast('Kelas berhasil dihapus', 'success');
      setSelectedKelas(null);
      await loadData();
    }
  };

  const availablePesertaToAdd = useMemo(() => {
    const inKelas = new Set(kelasPeserta.map((p) => p.id));
    const q = searchAdd.trim().toLowerCase();
    return allPeserta.filter((p) => {
      if (inKelas.has(p.id)) return false;
      if (q && !`${p.nama_lengkap} ${p.email ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allPeserta, kelasPeserta, searchAdd]);

  if (loading) return <Loading text="Memuat daftar kelas..." />;

  // ====================================================================
  // VIEW: DETAIL KELAS & PESERTA
  // ====================================================================
  if (selectedKelas) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* Navigation & Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-2 pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedKelas(null)}
            className="text-fg-muted hover:text-fg"
          >
            ← Kembali ke Daftar Kelas
          </Button>

          <div className="flex items-center gap-2">
            {Object.keys(STATUS_LABELS).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={selectedKelas.status === s ? 'primary' : 'secondary'}
                onClick={() => updateKelasStatus(s as KelasStatus)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleting(selectedKelas)}>
              <Trash2 className="h-4 w-4 mr-1" /> Hapus
            </Button>
          </div>
        </div>

        {/* Card Header Kelas */}
        <Card className="border border-primary/25 bg-surface">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary-text bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded">
                  {selectedKelas.kode}
                </span>
                <span className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-xs font-bold text-accent flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Modul: {selectedKelas.modul_nama}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <h1 className="text-2xl font-bold text-fg">{selectedKelas.nama}</h1>
                <button
                  type="button"
                  onClick={() => handleOpenRename(selectedKelas)}
                  className="p-1 text-fg-subtle hover:text-primary-text transition"
                  title="Rename Kelas"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-fg-muted">
                Mulai: {selectedKelas.tanggal_mulai ? formatJakarta(selectedKelas.tanggal_mulai) : '-'} ·
                Kapasitas: {kelasPeserta.length}/{selectedKelas.kapasitas_maks ?? '20'} peserta terdaftar
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleOpenChangeModul(selectedKelas)}>
                <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Ganti Modul Kelas
              </Button>
            </div>
          </div>
        </Card>

        {/* PESERTA DI KELAS INI */}
        <Card className="border border-border-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-text" />
                Peserta Terdaftar ({kelasPeserta.length})
              </h2>
            </div>
            <Button size="sm" onClick={() => setAddPesertaModal(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Tambah Peserta
            </Button>
          </div>

          {kelasPeserta.length === 0 ? (
            <EmptyState title="Belum ada peserta" desc="Tambahkan peserta ke kelas ini untuk memulai kegiatan belajar." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-2 text-xs font-mono text-fg-muted uppercase">
                    <th className="px-3 py-2 text-left">Nama Peserta</th>
                    <th className="px-3 py-2 text-left">Email / Kontak</th>
                    <th className="px-3 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {kelasPeserta.map((p) => (
                    <tr key={p.id} className="border-b border-border-2/60 last:border-0 hover:bg-surface-2/40">
                      <td className="px-3 py-2.5 font-medium text-fg">{p.nama_lengkap}</td>
                      <td className="px-3 py-2.5 text-xs text-fg-muted">{p.email ?? p.no_wa ?? '-'}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removePesertaFromKelas(p.id)}>
                          <UserMinus className="h-3.5 w-3.5 mr-1" /> Keluarkan
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* JADWAL 14 PERTEMUAN KELAS INI */}
        <Card className="border border-border-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-fg flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-text" />
              Jadwal Pertemuan Kelas ({kelasJadwal.length} Sesi)
            </h2>
            <span className="text-xs font-mono text-fg-muted">14 Pertemuan Lengkap</span>
          </div>

          {kelasJadwal.length === 0 ? (
            <EmptyState title="Belum ada sesi pertemuan" desc="Klik Ganti Modul di atas untuk menjadwalkan 14 pertemuan." />
          ) : (
            <div className="space-y-2">
              {kelasJadwal.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border-2 p-3 bg-surface hover:border-border-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-text bg-primary/10 px-2 py-0.5 rounded">
                        Pertemuan {idx + 1} ({s.kode_sesi_friendly})
                      </span>
                      <span className="text-xs text-fg-muted font-mono">
                        {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : 'Jadwal menyusul'}
                      </span>
                    </div>
                    <p className="font-semibold text-fg text-sm">{s.judul_sesi}</p>
                  </div>
                  <Badge className="font-mono text-[11px]">{s.status_sesi}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Modal Tambah Peserta */}
        {addPesertaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg space-y-4 shadow-2xl border-border-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-fg text-base">Tambah Peserta ke Kelas</h3>
                <button type="button" onClick={() => setAddPesertaModal(false)} className="text-fg-muted hover:text-fg">✕</button>
              </div>
              <TextInput
                placeholder="Cari nama peserta..."
                value={searchAdd}
                onChange={(e) => setSearchAdd(e.target.value)}
                autoFocus
              />
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {availablePesertaToAdd.length === 0 ? (
                  <p className="py-6 text-center text-sm text-fg-subtle">Semua peserta sudah terdaftar di kelas.</p>
                ) : (
                  availablePesertaToAdd.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-border-2 p-2.5 bg-surface">
                      <div>
                        <p className="text-sm font-semibold text-fg">{p.nama_lengkap}</p>
                        <p className="text-xs text-fg-muted">{p.email ?? '-'}</p>
                      </div>
                      <Button size="sm" onClick={() => addPesertaToKelas(p.id)}>
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
      </div>
    );
  }

  // ====================================================================
  // VIEW: DAFTAR SELURUH KELAS
  // ====================================================================
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Utama */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 font-mono text-xs font-bold text-primary-text flex items-center gap-1.5 w-fit">
              <GraduationCap className="h-3.5 w-3.5" />
              Manajemen Kelas Pembelajaran
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Daftar Kelas & Modul
            </h1>
            <p className="text-sm text-fg-muted">
              Buat kelas baru, tentukan modul yang dipelajari (14 pertemuan), dan ubah nama kelas dengan mudah.
            </p>
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Buat Kelas Baru
          </Button>
        </div>
      </div>

      {/* Grid Daftar Kelas */}
      {kelasList.length === 0 ? (
        <EmptyState
          title="Belum ada kelas"
          desc="Buat kelas baru untuk memulai menjadwalkan modul pembelajaran."
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Buat Kelas Pertama
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {kelasList.map((k) => (
            <Card
              key={k.id}
              className="flex flex-col justify-between border-border-2 bg-surface hover:border-primary/40 transition-all p-5 shadow-sm"
            >
              <div className="space-y-3">
                {/* Header Kartu: Kode & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary-text bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {k.kode}
                  </span>
                  <Badge className="font-mono text-[11px]">{STATUS_LABELS[k.status] ?? k.status}</Badge>
                </div>

                {/* Nama Kelas & Tombol Rename */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-fg leading-snug">
                      {k.nama}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenRename(k)}
                      className="p-1 text-fg-subtle hover:text-primary-text transition shrink-0"
                      title="Rename nama kelas"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-fg-muted mt-1">
                    Mulai: {k.tanggal_mulai ? formatJakarta(k.tanggal_mulai) : '-'}
                  </p>
                </div>

                {/* Modul yang Dipelajari & Tombol Ganti Modul */}
                <div className="rounded-xl border border-border-2 bg-surface-2/40 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-subtle font-mono flex items-center gap-1">
                      <Layers className="h-3 w-3 text-primary-text" /> Modul Dipelajari:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenChangeModul(k)}
                      className="font-semibold text-primary-text hover:underline text-[11px]"
                    >
                      Ganti Modul
                    </button>
                  </div>
                  <p className="text-xs font-bold text-fg line-clamp-1">
                    {k.modul_nama}
                  </p>
                </div>

                {/* Peserta terdaftar */}
                <div className="flex items-center justify-between text-xs text-fg-muted pt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Users className="h-3.5 w-3.5 text-fg-subtle" /> Peserta:
                  </span>
                  <span className="font-bold text-fg font-mono">
                    {k.terdaftar ?? 0}/{k.kapasitas_maks ?? 20}
                  </span>
                </div>
              </div>

              {/* Action Buka Kelas */}
              <div className="mt-5 pt-3 border-t border-border-2/70 flex items-center gap-2">
                <Button size="sm" className="w-full" onClick={() => setSelectedKelas(k)}>
                  Kelola Kelas & Peserta <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: BIKIN KELAS BARU (NAMA KELAS & PILIH MODUL)                */}
      {/* ==================================================================== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border-2 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-2 pb-3 mb-4">
              <div>
                <span className="font-mono text-xs text-primary-text font-bold uppercase">Form Kelas</span>
                <h3 className="text-lg font-bold text-fg">Buat Kelas Pembelajaran Baru</h3>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-fg-muted hover:text-fg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKelas} className="space-y-4">
              <Field label="Nama Kelas" hint="Contoh: Kelas AI Weekend Malam - Batch 1">
                <TextInput
                  placeholder="Nama Kelas..."
                  value={createForm.nama}
                  onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })}
                  required
                  autoFocus
                />
              </Field>

              <Field label="Pilih Modul yang Dipelajari" hint="Menentukan kurikulum 14 pertemuan yang diajarkan">
                <SelectInput
                  value={createForm.modul_id}
                  onChange={(e) => setCreateForm({ ...createForm, modul_id: e.target.value })}
                >
                  {modulIndukList.map((m) => (
                    <option key={m.id} value={m.id} className="bg-surface">
                      {m.nama} ({m.total_pertemuan} Pertemuan)
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Kode Kelas" hint="ID unik rombel">
                  <TextInput
                    value={createForm.kode}
                    onChange={(e) => setCreateForm({ ...createForm, kode: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Kapasitas Maksimal">
                  <TextInput
                    type="number"
                    min={1}
                    value={createForm.kapasitas_maks}
                    onChange={(e) => setCreateForm({ ...createForm, kapasitas_maks: parseInt(e.target.value) || 20 })}
                  />
                </Field>
              </div>

              <Field label="Tanggal Mulai Kelas" hint="Pertemuan 1 akan dijadwalkan pada tanggal ini">
                <TextInput
                  type="date"
                  value={createForm.tanggal_mulai}
                  onChange={(e) => setCreateForm({ ...createForm, tanggal_mulai: e.target.value })}
                  required
                />
              </Field>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={creating || !createForm.nama.trim()}>
                  {creating ? 'Membuat & Menjadwalkan...' : 'Buat Kelas Sekarang'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: RENAME KELAS                                                */}
      {/* ==================================================================== */}
      {renamingKelas && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setRenamingKelas(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-2 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-2 pb-3 mb-4">
              <h3 className="text-base font-bold text-fg flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary-text" /> Rename Nama Kelas
              </h3>
              <button type="button" onClick={() => setRenamingKelas(null)} className="text-fg-muted hover:text-fg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Nama Kelas Baru" hint="Ubah nama kelas agar mudah diidentifikasi">
                <TextInput
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Nama kelas..."
                  autoFocus
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setRenamingKelas(null)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleSaveRename} disabled={renaming || !renameValue.trim()}>
                  {renaming ? 'Menyimpan...' : 'Simpan Nama'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: PILIH / GANTI MODUL YANG DIPELAJARI                         */}
      {/* ==================================================================== */}
      {changingModulKelas && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setChangingModulKelas(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-2 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-2 pb-3 mb-4">
              <h3 className="text-base font-bold text-fg flex items-center gap-2">
                <RotateCw className="h-4 w-4 text-primary-text" /> Pilih Modul untuk Kelas
              </h3>
              <button type="button" onClick={() => setChangingModulKelas(null)} className="text-fg-muted hover:text-fg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-fg-muted">
                Pilih modul kurikulum yang akan dipelajari oleh kelas <strong className="text-fg">{changingModulKelas.nama}</strong>. Sistem akan otomatis menjadwalkan 14 pertemuan dari modul tersebut.
              </p>

              <Field label="Pilih Modul">
                <SelectInput
                  value={selectedNewModulId}
                  onChange={(e) => setSelectedNewModulId(e.target.value)}
                >
                  {modulIndukList.map((m) => (
                    <option key={m.id} value={m.id} className="bg-surface">
                      {m.nama} ({m.total_pertemuan} Pertemuan)
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setChangingModulKelas(null)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleSaveChangeModul} disabled={changingModul}>
                  {changingModul ? 'Menerapkan Modul...' : 'Terapkan Modul Ini'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus Kelas */}
      {deleting && (
        <ConfirmDialog
          title="Hapus Kelas?"
          message={`Kelas "${deleting.nama}" (${deleting.kode}) beserta seluruh sesi dan absensinya akan dihapus permanen.`}
          confirmLabel="Hapus"
          onConfirm={handleDeleteKelas}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
