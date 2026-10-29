import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock, Calendar, Clock,
  CheckCircle2, ArrowRight, Video, Filter, Compass
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, EmptyState, Badge, ProgressBar, Tabs, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { listModul } from '../services/modul';
import { getProgresSesi, listSesiAssigned, urutModulDariSesi, type ProgresSesi, type SesiAssigned } from '../services/penugasan';
import { resolveKategori, KATEGORI_LABELS, type Modul, type Peserta, type ModulKategori } from '../types';

type Tab = 'modul' | 'jadwal';

const SESI_STATUS: Record<string, string> = {
  belum: 'Belum Dimulai',
  berlangsung: 'Sedang Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const KATEGORI_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FND:  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  TOOL: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  PRMP: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  PROD: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  ETHC: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  CODE: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  AUTO: { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/30' },
  ARCH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  PROJ: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  PRES: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
};

export default function BelajarPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('modul');
  const [selectedKategori, setSelectedKategori] = useState<string>('SEMUA');
  const [peserta, setPeserta] = useState<Peserta | null>(null);
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [jadwal, setJadwal] = useState<SesiAssigned[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgresSesi>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const { data: profil } = await supabase
        .from('peserta')
        .select('*, kelas(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profil) {
        setLoading(false);
        return;
      }
      const p = profil as Peserta;
      setPeserta(p);

      void listModul().catch(() => []);

      const sesiList = await listSesiAssigned(p.id);
      setJadwal(sesiList);
      setModuls(urutModulDariSesi(sesiList));
      setProgress(await getProgresSesi(sesiList.map((s) => s.sesi_peserta_id)));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const sesiByModul = useMemo(() => new Map(jadwal.map((s) => [s.modul_id, s])), [jadwal]);

  const doneCount = moduls.filter((m) => progress[sesiByModul.get(m.id)?.sesi_peserta_id ?? '']?.selesai === true).length;
  const pct = moduls.length > 0 ? Math.round((doneCount / moduls.length) * 100) : 0;
  const today = todayJakartaISO();

  // Kategori unik yang ada di modul peserta
  const availableKategori = useMemo(() => {
    const set = new Set<string>();
    for (const m of moduls) {
      set.add(resolveKategori(m));
    }
    return Array.from(set);
  }, [moduls]);

  // Filter modul berdasarkan kategori
  const filteredModuls = useMemo(() => {
    if (selectedKategori === 'SEMUA') return moduls;
    return moduls.filter((m) => resolveKategori(m) === selectedKategori);
  }, [moduls, selectedKategori]);

  if (loading) {
    return (
      <div className="space-y-4 pt-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-28 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!peserta) {
    return (
      <div className="pt-6 max-w-xl mx-auto text-center">
        <EmptyState title="Profil Belajar Belum Siap" desc="Hubungi Admin untuk mendaftarkan akun Anda ke dalam kelas kursus." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2 pb-16 max-w-5xl mx-auto animate-fade-in">
      {/* 1. HERO LEARNING BANNER */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 font-mono text-xs font-bold text-primary-text flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" /> {peserta.kelas?.nama ?? 'Kelas Paham AI'}
              </span>
              <span className="text-xs text-fg-subtle">
                {peserta.kelas?.status ? `Status: ${peserta.kelas.status}` : ''}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">Katalog Modul Pembelajaran</h1>
            <p className="mt-1 text-sm text-fg-muted max-w-xl">
              Pelajari kurikulum AI aplikatif selangkah demi selangkah. Setiap sesi mencakup materi interaktif, latihan praktik, dan evaluasi pemahaman.
            </p>
          </div>

          {/* Progress Card in Banner */}
          <div className="shrink-0 bg-bg/60 rounded-xl border border-border-2 p-4 min-w-[220px]">
            <div className="flex items-center justify-between text-xs text-fg-muted mb-2">
              <span className="font-semibold text-fg">Progres Belajar</span>
              <span className="font-mono font-bold text-primary-text">{pct}%</span>
            </div>
            <ProgressBar value={pct} className="h-2.5" />
            <p className="mt-2 text-xs font-mono text-fg-subtle text-right">
              {doneCount} dari {moduls.length} modul selesai
            </p>
          </div>
        </div>
      </div>

      {/* 2. TAB PILIHAN TAMPILAN */}
      <div className="flex items-center justify-between gap-4 border-b border-border-2 pb-2">
        <Tabs
          label="Pilih tampilan"
          value={tab}
          onChange={setTab}
          options={[
            { key: 'modul', label: `Modul Belajar (${moduls.length})` },
            { key: 'jadwal', label: `Jadwal & Sesi Tatap Muka (${jadwal.length})` },
          ]}
        />
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat data: {error}
        </Card>
      )}

      {/* 3. TAB 1: MODUL KURIKULUM */}
      {tab === 'modul' && (
        <div className="space-y-5">
          {/* Category Filter Badges */}
          {availableKategori.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-xs font-semibold text-fg-subtle flex items-center gap-1 shrink-0">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              <button
                onClick={() => setSelectedKategori('SEMUA')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  selectedKategori === 'SEMUA'
                    ? 'bg-primary text-[rgb(var(--on-primary))] font-bold shadow-sm'
                    : 'bg-surface border border-border-2 text-fg-muted hover:text-fg'
                }`}
              >
                Semua Kategori
              </button>
              {availableKategori.map((kat) => {
                const label = KATEGORI_LABELS[kat as ModulKategori] ?? kat;
                const active = selectedKategori === kat;
                const colors = KATEGORI_COLORS[kat] ?? { bg: 'bg-surface', text: 'text-fg', border: 'border-border-2' };
                return (
                  <button
                    key={kat}
                    onClick={() => setSelectedKategori(kat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition ${
                      active
                        ? 'border-primary bg-primary text-black font-bold shadow-sm'
                        : `${colors.border} ${colors.bg} ${colors.text} hover:opacity-90`
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {filteredModuls.length === 0 ? (
            <EmptyState
              title="Belum ada modul ditugaskan"
              desc="Modul pembelajaran akan tampil di sini setelah tutor menugaskan jadwal untuk kelas Anda."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModuls.map((m) => {
                const j = sesiByModul.get(m.id);
                const prog = j ? progress[j.sesi_peserta_id] : undefined;
                const isDone = prog?.selesai === true;

                // Aturan berurutan: modul terbuka jika modul sebelumnya sudah selesai
                const originalIndex = moduls.findIndex((x) => x.id === m.id);
                const unlocked =
                  originalIndex === 0 ||
                  moduls.slice(0, originalIndex).every((prev) => {
                    const pj = sesiByModul.get(prev.id);
                    return pj ? progress[pj.sesi_peserta_id]?.selesai === true : false;
                  });

                const kat = resolveKategori(m);
                const katDef = KATEGORI_COLORS[kat] ?? { bg: 'bg-surface', text: 'text-fg', border: 'border-border-2' };
                const katLabel = KATEGORI_LABELS[kat as ModulKategori] ?? kat;

                return (
                  <div key={m.id} className="relative group">
                    {unlocked ? (
                      <Link to={`/modul/${m.kode}`} className="block h-full">
                        <Card
                          className={`h-full flex flex-col justify-between p-5 transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 ${
                            isDone ? 'border-emerald-500/30 bg-surface/70' : 'border-border-2 bg-surface'
                          }`}
                        >
                          <div>
                            {/* Card Header: Kategori & Status */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span
                                className={`rounded-md border px-2.5 py-0.5 text-[11px] font-bold font-mono ${katDef.border} ${katDef.bg} ${katDef.text}`}
                              >
                                {m.kode} · {katLabel}
                              </span>
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4" /> Selesai
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-fg-subtle flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {m.durasi_menit} mnt
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className={`text-base font-bold leading-snug ${isDone ? 'text-fg/80' : 'text-fg'}`}>
                              {m.judul}
                            </h3>

                            {/* Progress Micro-badges */}
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              {prog?.absen && (
                                <Badge className="text-[10px] bg-bg/80">Absen: {prog.absen}</Badge>
                              )}
                              {prog?.adaCatatan && (
                                <Badge className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                  Catatan ✓
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Footer Action */}
                          <div className="mt-5 pt-3 border-t border-border-2/60 flex items-center justify-between text-xs font-semibold">
                            <span className={isDone ? 'text-fg-subtle' : 'text-primary-text'}>
                              {isDone ? 'Tinjau Materi' : 'Mulai Belajar'}
                            </span>
                            <span className="text-fg-subtle group-hover:translate-x-1 group-hover:text-primary-text transition">
                              <ArrowRight className="h-4 w-4" />
                            </span>
                          </div>
                        </Card>
                      </Link>
                    ) : (
                      /* Card Terkunci */
                      <Card className="h-full p-5 border-border-2 bg-surface/40 opacity-60 cursor-not-allowed">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="rounded-md border border-border-2 px-2.5 py-0.5 text-[11px] font-mono text-fg-subtle">
                            {m.kode}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle font-mono">
                            <Lock className="h-3.5 w-3.5" /> Terkunci
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-fg-subtle">{m.judul}</h3>
                        <p className="mt-3 text-xs text-fg-subtle italic">
                          Selesaikan modul sebelumnya untuk membuka materi ini.
                        </p>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: JADWAL & SESI TATAP MUKA */}
      {tab === 'jadwal' && (
        <div className="space-y-4">
          {jadwal.length === 0 ? (
            <EmptyState
              title="Belum ada jadwal tatap muka"
              desc="Tutor belum menjadwalkan sesi langsung untuk kelas Anda."
            />
          ) : (
            <div className="space-y-3">
              {jadwal.map((s) => {
                const isPast = (s.tanggal_kelas ?? '') < today;
                const isToday = (s.tanggal_kelas ?? '') === today;
                const prog = progress[s.sesi_peserta_id];

                return (
                  <Card
                    key={s.id}
                    className={`p-5 transition hover:border-primary/40 ${
                      isToday ? 'border-primary bg-primary/5' : isPast ? 'border-border-2 opacity-85' : 'border-border-2'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary-text bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            {s.kode_sesi_friendly}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              s.status_sesi === 'selesai'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : s.status_sesi === 'berlangsung'
                                ? 'border-accent/30 bg-accent/10 text-accent animate-pulse'
                                : 'border-border-2 bg-surface text-fg-muted'
                            }`}
                          >
                            {SESI_STATUS[s.status_sesi] ?? s.status_sesi}
                          </span>
                          {isToday && (
                            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                              Hari Ini!
                            </span>
                          )}
                          {prog?.selesai && (
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Selesai ✓
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-fg">{s.judul_sesi}</h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="h-3.5 w-3.5 text-primary-text" />
                            {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : 'Jadwal menyusul'}
                          </span>
                          {s.jam_mulai && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3.5 w-3.5 text-accent" />
                              {s.jam_mulai.slice(0, 5)}–{s.jam_akhir?.slice(0, 5) ?? ''} WIB
                            </span>
                          )}
                          {s.lokasi && <span>· {s.lokasi}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {s.link_rapat && (
                          <a
                            href={s.link_rapat}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-bold text-accent hover:bg-accent/20 transition"
                          >
                            <Video className="h-4 w-4" /> Masuk Rapat
                          </a>
                        )}
                        <Link
                          to={`/modul/${s.modul?.kode ?? s.kode_sesi_friendly}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-black hover:bg-primary-hover transition"
                        >
                          {isPast ? 'Buka Materi' : 'Masuk Sesi'} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}