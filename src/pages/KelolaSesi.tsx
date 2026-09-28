import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Loading, SelectInput, TextInput } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabaseClient';
import { formatJakarta } from '../lib/time';
import type { Batch, JadwalSesi, Modul, Peserta } from '../types';

interface PesertaProgress {
  peserta: Peserta;
  totalSesi: number;
  selesaiCount: number;
  hadirCount: number;
  catatanCount: number;
  pct: number;
  lastSesi: string | null;
  statusPerSesi: Record<string, { hadir: boolean; catatan: boolean; selesai: boolean; statusKehadiran?: string }>;
}

export default function KelolaSesiPage() {
  const { push: toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [jadwals, setJadwals] = useState<JadwalSesi[]>([]);
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [pesertas, setPesertas] = useState<Peserta[]>([]);
  const [progressList, setProgressList] = useState<PesertaProgress[]>([]);
  const [activeTab, setActiveTab] = useState<'jadwal' | 'progres'>('progres');
  const [expandedPeserta, setExpandedPeserta] = useState<string | null>(null);
  const [searchPeserta, setSearchPeserta] = useState('');

  const [loadingBatch, setLoadingBatch] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    modul_id: '',
    kode_sesi_friendly: '',
    judul_sesi: '',
    tanggal_kelas: '',
    jam_mulai: '',
    jam_akhir: '',
    link_rapat: '',
    lokasi: '',
  });

  // Load list batch
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('batch').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setBatches(data);
        if (data.length > 0) setSelectedBatch(data[0].id);
      }
      setLoadingBatch(false);
    })();
  }, []);

  // Load detail saat batch berubah
  useEffect(() => {
    if (!selectedBatch) {
      setJadwals([]);
      setPesertas([]);
      setProgressList([]);
      return;
    }

    (async () => {
      setLoadingData(true);
      const currBatch = batches.find((b) => b.id === selectedBatch);

      // 1. Jadwal & Modul
      const [jadwalRes, modulRes, pesertaRes] = await Promise.all([
        supabase.from('jadwal_sesi').select('*, modul(*)').eq('batch_id', selectedBatch).order('tanggal_kelas', { ascending: true }),
        currBatch
          ? supabase.from('modul').select('*').eq('jalur', currBatch.jalur).order('urutan_sesi', { ascending: true })
          : Promise.resolve({ data: [] as Modul[], error: null }),
        supabase.from('peserta').select('*').eq('batch_id', selectedBatch).order('nama_lengkap', { ascending: true }),
      ]);

      const jList = (jadwalRes.data as JadwalSesi[]) ?? [];
      const pList = (pesertaRes.data as Peserta[]) ?? [];
      setJadwals(jList);
      setModuls((modulRes.data as Modul[]) ?? []);
      setPesertas(pList);

      // 2. Jika ada jadwal & peserta, hitung matriks progres
      if (jList.length > 0 && pList.length > 0) {
        const jIds = jList.map((j) => j.id);
        const pIds = pList.map((p) => p.id);

        const { data: spData } = await supabase
          .from('sesi_peserta')
          .select('id, sesi_id, peserta_id')
          .in('sesi_id', jIds)
          .in('peserta_id', pIds);

        const spList = (spData ?? []) as Array<{ id: string; sesi_id: string; peserta_id: string }>;
        const spIds = spList.map((s) => s.id);

        let catSet = new Set<string>();
        let absMap = new Map<string, string>();

        if (spIds.length > 0) {
          const [catRes, absRes] = await Promise.all([
            supabase.from('catatan_ketik').select('sesi_peserta_id').in('sesi_peserta_id', spIds),
            supabase.from('absensi').select('sesi_peserta_id, status_kehadiran').in('sesi_peserta_id', spIds),
          ]);
          catSet = new Set(((catRes.data ?? []) as Array<{ sesi_peserta_id: string }>).map((c) => c.sesi_peserta_id));
          absMap = new Map(
            ((absRes.data ?? []) as Array<{ sesi_peserta_id: string; status_kehadiran: string }>).map((a) => [a.sesi_peserta_id, a.status_kehadiran])
          );
        }

        // Map per peserta
        const matrix: PesertaProgress[] = pList.map((p) => {
          const statusPerSesi: PesertaProgress['statusPerSesi'] = {};
          let selesai = 0;
          let hadir = 0;
          let catatan = 0;
          let lastSesiTitle: string | null = null;

          jList.forEach((j) => {
            const sp = spList.find((s) => s.peserta_id === p.id && s.sesi_id === j.id);
            if (!sp) {
              statusPerSesi[j.id] = { hadir: false, catatan: false, selesai: false };
              return;
            }
            const isHadir = absMap.has(sp.id);
            const statusKehadiran = absMap.get(sp.id);
            const isCatatan = catSet.has(sp.id);
            const isDone = isHadir || isCatatan;

            if (isHadir) hadir++;
            if (isCatatan) catatan++;
            if (isDone) {
              selesai++;
              lastSesiTitle = j.kode_sesi_friendly;
            }

            statusPerSesi[j.id] = {
              hadir: isHadir,
              statusKehadiran,
              catatan: isCatatan,
              selesai: isDone,
            };
          });

          return {
            peserta: p,
            totalSesi: jList.length,
            selesaiCount: selesai,
            hadirCount: hadir,
            catatanCount: catatan,
            pct: jList.length > 0 ? Math.round((selesai / jList.length) * 100) : 0,
            lastSesi: lastSesiTitle,
            statusPerSesi,
          };
        });

        setProgressList(matrix);
      } else {
        setProgressList([]);
      }

      setLoadingData(false);
    })();
  }, [selectedBatch, batches]);

  const handleCreateSesi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !form.modul_id) {
      toast('Pilih modul dan kelas dulu', 'error');
      return;
    }

    const { data: newSesi, error } = await supabase
      .from('jadwal_sesi')
      .insert({
        ...form,
        batch_id: selectedBatch,
      })
      .select()
      .single();

    if (error || !newSesi) {
      toast(error?.message ?? 'Gagal membuat sesi', 'error');
      return;
    }

    // Auto assign semua peserta batch ke sesi baru ini
    if (pesertas.length > 0) {
      const spRows = pesertas.map((p) => ({
        sesi_id: newSesi.id,
        peserta_id: p.id,
      }));
      await supabase.from('sesi_peserta').insert(spRows);
    }

    toast('Sesi ditambahkan & peserta didaftarkan', 'success');
    setShowForm(false);
    setForm({
      modul_id: '',
      kode_sesi_friendly: '',
      judul_sesi: '',
      tanggal_kelas: '',
      jam_mulai: '',
      jam_akhir: '',
      link_rapat: '',
      lokasi: '',
    });

    // Reload
    const { data } = await supabase.from('jadwal_sesi').select('*, modul(*)').eq('batch_id', selectedBatch).order('tanggal_kelas', { ascending: true });
    setJadwals((data as JadwalSesi[]) ?? []);
  };

  const filteredProgress = useMemo(() => {
    const q = searchPeserta.trim().toLowerCase();
    if (!q) return progressList;
    return progressList.filter(
      (p) =>
        p.peserta.nama_lengkap.toLowerCase().includes(q) ||
        (p.peserta.nama_panggil && p.peserta.nama_panggil.toLowerCase().includes(q)) ||
        (p.peserta.email && p.peserta.email.toLowerCase().includes(q))
    );
  }, [progressList, searchPeserta]);

  if (loadingBatch) return <Loading text="Memuat kelas..." />;

  const currBatchObj = batches.find((b) => b.id === selectedBatch);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-headline font-bold text-fg">Monitoring & Kelola Sesi</h1>
          <p className="text-sm text-fg-muted">Pantau capaian belajar peserta per modul dan atur jadwal kelas.</p>
        </div>

        {/* Pilih Batch */}
        <div className="flex items-center gap-2">
          <SelectInput
            value={selectedBatch ?? ''}
            onChange={(e) => setSelectedBatch(e.target.value)}
            disabled={loadingData}
            className="!min-w-[240px]"
          >
            {batches.length === 0 && <option value="">Belum ada kelas</option>}
            {batches.map((b) => (
              <option key={b.id} value={b.id} className="bg-surface">
                {b.kode_batch} — {b.nama_batch ?? b.jalur}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title="Belum ada kelas"
          desc="Buat kelas baru — info kelas, peserta, dan sesi dibuat sekali jalan."
          action={
            <Link to="/kelola-batch">
              <Button>
                Buat Kelas <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {moduls.length === 0 && currBatchObj && (
            <div className="rounded-[8px] border border-primary/25 bg-primary/5 p-3">
              <p className="text-sm text-fg">
                Belum ada modul di jalur {currBatchObj.jalur}. Buat dulu di{' '}
                <Link to="/kelola-modul" className="text-primary-text underline">Kelola Modul</Link>{' '}
                sebelum menambah sesi manual.
              </p>
            </div>
          )}
          {/* Tab Navigation & Sub Header */}
          <div className="flex items-center justify-between border-b border-border-2 pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('progres')}
                className={`flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'progres'
                    ? 'bg-primary text-[bg]'
                    : 'text-fg-muted hover:bg-surface hover:text-fg'
                }`}
              >
                <GraduationCap className="h-4 w-4" /> Progres Belajar Peserta
                {pesertas.length > 0 && (
                  <span className="rounded-full bg-bg/20 px-2 py-0.5 text-xs">
                    {pesertas.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('jadwal')}
                className={`flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'jadwal'
                    ? 'bg-primary text-[bg]'
                    : 'text-fg-muted hover:bg-surface hover:text-fg'
                }`}
              >
                <Calendar className="h-4 w-4" /> Jadwal Sesi
                {jadwals.length > 0 && (
                  <span className="rounded-full bg-bg/20 px-2 py-0.5 text-xs">
                    {jadwals.length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'jadwal' && !showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Tambah Sesi
              </Button>
            )}
          </div>

          {loadingData ? (
            <Loading text="Memuat data kelas..." />
          ) : (
            <>
              {/* TAB 1: PROGRES BELAJAR PESERTA */}
              {activeTab === 'progres' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-fg-muted">
                      Kelas <span className="font-semibold text-fg">{currBatchObj?.nama_batch ?? currBatchObj?.kode_batch}</span> · Jalur {currBatchObj?.jalur}
                    </p>
                    <TextInput
                      placeholder="Cari peserta..."
                      value={searchPeserta}
                      onChange={(e) => setSearchPeserta(e.target.value)}
                      className="!w-full sm:!w-64"
                    />
                  </div>

                  {pesertas.length === 0 ? (
                    <EmptyState
                      title="Belum ada peserta di kelas ini"
                      desc="Tambahkan peserta ke kelas ini lewat menu Kelola Kelas atau Peserta."
                    />
                  ) : jadwals.length === 0 ? (
                    <EmptyState
                      title="Belum ada jadwal sesi"
                      desc="Buat sesi modul terlebih dahulu agar progres bisa dihitung."
                    />
                  ) : (
                    <div className="space-y-3">
                      {filteredProgress.map((row) => {
                        const isExpanded = expandedPeserta === row.peserta.id;
                        return (
                          <Card key={row.peserta.id} className="!p-4 transition hover:border-border-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-fg">{row.peserta.nama_lengkap}</h3>
                                  {row.peserta.nama_panggil && (
                                    <span className="text-xs text-fg-subtle">({row.peserta.nama_panggil})</span>
                                  )}
                                  <Badge className="text-[10px]">{row.peserta.jalur ?? '—'}</Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-fg-subtle">
                                  {row.peserta.email ?? row.peserta.no_wa ?? 'Tanpa kontak'} · Capaian: {row.lastSesi ? `Terakhir sampai ${row.lastSesi}` : 'Belum mulai'}
                                </p>

                                {/* Mini Progress Bar */}
                                <div className="mt-2.5 flex items-center gap-3">
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        row.pct >= 100 ? 'bg-success' : row.pct > 0 ? 'bg-primary' : 'bg-surface-2'
                                      }`}
                                      style={{ width: `${row.pct}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-xs font-bold text-fg">{row.pct}%</span>
                                  <span className="text-xs text-fg-subtle">
                                    ({row.selesaiCount}/{row.totalSesi} sesi)
                                  </span>
                                </div>
                              </div>

                              {/* Toggle Detail Matrix */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedPeserta(isExpanded ? null : row.peserta.id)}
                                  className="text-xs"
                                >
                                  {isExpanded ? 'Tutup Detail' : 'Lihat Detail Sesi'}
                                  {isExpanded ? (
                                    <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* DETAIL BREAKDOWN MATRIKS SESI */}
                            {isExpanded && (
                              <div className="mt-4 border-t border-border-2 pt-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                                  Status Per Sesi Modul:
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                                  {jadwals.map((j) => {
                                    const st = row.statusPerSesi[j.id];
                                    return (
                                      <div
                                        key={j.id}
                                        className={`rounded-[6px] border p-2.5 text-xs ${
                                          st?.selesai
                                            ? 'border-[success]/30 bg-success/5'
                                            : 'border-border-2 bg-bg'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-mono font-bold text-primary-text">
                                            {j.kode_sesi_friendly}
                                          </span>
                                          {st?.selesai ? (
                                            <span className="flex items-center gap-1 font-semibold text-success">
                                              <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
                                            </span>
                                          ) : (
                                            <span className="text-fg-subtle">Belum</span>
                                          )}
                                        </div>
                                        <p className="mt-1 truncate font-medium text-fg">{j.judul_sesi}</p>
                                        <div className="mt-2 flex items-center gap-2 text-[11px] text-fg-muted">
                                          <span className={st?.hadir ? 'text-success' : 'text-fg-subtle'}>
                                            Absen: {st?.statusKehadiran ?? (st?.hadir ? 'Ya' : '—')}
                                          </span>
                                          <span>·</span>
                                          <span className={st?.catatan ? 'text-accent' : 'text-fg-subtle'}>
                                            Catatan: {st?.catatan ? 'Ada' : '—'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: JADWAL SESI & FORM */}
              {activeTab === 'jadwal' && (
                <div className="space-y-4">
                  {showForm && (
                    <Card className="border-primary/30">
                      <h2 className="mb-4 text-subhead font-semibold text-fg">Buat Sesi Tambahan</h2>
                      <form onSubmit={handleCreateSesi} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field label="Modul">
                            <select
                              value={form.modul_id}
                              onChange={(e) => {
                                const mId = e.target.value;
                                const m = moduls.find((x) => x.id === mId);
                                setForm({
                                  ...form,
                                  modul_id: mId,
                                  kode_sesi_friendly: m?.kode ?? '',
                                  judul_sesi: m?.judul ?? '',
                                });
                              }}
                              className="w-full rounded-[4px] border border-border-2 bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                              required
                            >
                              <option value="">— Pilih modul —</option>
                              {moduls.map((m) => (
                                <option key={m.id} value={m.id} className="bg-surface">
                                  {m.kode} — {m.judul}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Kode Sesi">
                            <TextInput
                              placeholder="A01, B101"
                              value={form.kode_sesi_friendly}
                              onChange={(e) => setForm({ ...form, kode_sesi_friendly: e.target.value })}
                              required
                            />
                          </Field>
                        </div>
                        <Field label="Judul Sesi">
                          <TextInput
                            placeholder="Membahas materi..."
                            value={form.judul_sesi}
                            onChange={(e) => setForm({ ...form, judul_sesi: e.target.value })}
                            required
                          />
                        </Field>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <Field label="Tanggal Kelas">
                            <TextInput
                              type="date"
                              value={form.tanggal_kelas}
                              onChange={(e) => setForm({ ...form, tanggal_kelas: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Jam Mulai">
                            <TextInput
                              type="time"
                              value={form.jam_mulai}
                              onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Jam Akhir">
                            <TextInput
                              type="time"
                              value={form.jam_akhir}
                              onChange={(e) => setForm({ ...form, jam_akhir: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field label="Lokasi">
                            <TextInput
                              placeholder="Ruang Kelas / Online"
                              value={form.lokasi}
                              onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                            />
                          </Field>
                          <Field label="Link Rapat">
                            <TextInput
                              placeholder="https://meet..."
                              value={form.link_rapat}
                              onChange={(e) => setForm({ ...form, link_rapat: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button type="submit" className="flex-1">
                            Simpan Sesi
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
                            Batal
                          </Button>
                        </div>
                      </form>
                    </Card>
                  )}

                  {jadwals.length === 0 ? (
                    <EmptyState
                      title="Belum ada sesi di kelas ini"
                      desc="Sesi dibuat otomatis saat membuat kelas di menu Kelola Kelas."
                    />
                  ) : (
                    <div className="grid gap-3">
                      {jadwals.map((j) => (
                        <Card key={j.id} className="!p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-primary-text">
                                  {j.kode_sesi_friendly}
                                </span>
                                <span className="font-semibold text-fg">— {j.judul_sesi}</span>
                                <Badge className="text-[10px]">{j.status_sesi}</Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-fg-subtle">
                                <span className="flex items-center gap-1 font-mono">
                                  <Calendar className="h-3 w-3" />
                                  {j.tanggal_kelas ? formatJakarta(j.tanggal_kelas) : 'Belum dijadwalkan'}
                                </span>
                                {(j.jam_mulai || j.jam_akhir) && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="h-3 w-3" />
                                    {j.jam_mulai ?? '-'} – {j.jam_akhir ?? '-'}
                                  </span>
                                )}
                                {j.lokasi && <span>Lokasi: {j.lokasi}</span>}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
