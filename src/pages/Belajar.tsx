import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock, Calendar, Clock,
  CheckCircle2, ArrowRight, Video, GraduationCap, BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, EmptyState, Badge, ProgressBar, Tabs, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { listModul } from '../services/modul';
import { getProgresSesi, listSesiAssigned, urutModulDariSesi, type ProgresSesi, type SesiAssigned } from '../services/penugasan';
import { estimateReadingTime } from '../lib/markdown';
import type { Modul, Peserta } from '../types';

type Tab = 'modul' | 'jadwal';

const SESI_STATUS: Record<string, string> = {
  belum: 'Belum Dimulai',
  berlangsung: 'Sedang Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export default function BelajarPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('modul');
  const [peserta, setPeserta] = useState<Peserta | null>(null);
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [jadwal, setJadwal] = useState<SesiAssigned[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgresSesi>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const modulNama = useMemo(() => {
    return moduls[0]?.slide_url || 'Dasar Kecerdasan Buatan & Prompt Engineering';
  }, [moduls]);

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
        // Fallback untuk staff/admin yang membuka halaman belajar
        const semua = await listModul();
        setModuls(semua);
        setLoading(false);
        return;
      }

      const p = profil as Peserta;
      setPeserta(p);

      const sesiList = await listSesiAssigned(p.id);
      setJadwal(sesiList);

      const dariSesi = urutModulDariSesi(sesiList);
      if (dariSesi.length > 0) {
        setModuls(dariSesi);
      } else {
        const semua = await listModul();
        setModuls(semua);
      }

      if (sesiList.length > 0) {
        setProgress(await getProgresSesi(sesiList.map((s) => s.sesi_peserta_id)));
      }
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

  const doneCount = moduls.filter((m) => {
    const sesi = sesiByModul.get(m.id);
    return sesi ? progress[sesi.sesi_peserta_id]?.selesai === true : false;
  }).length;

  const pct = moduls.length > 0 ? Math.round((doneCount / moduls.length) * 100) : 0;
  const today = todayJakartaISO();

  const sortedModuls = useMemo(() => {
    return [...moduls].sort((a, b) => a.urutan_sesi - b.urutan_sesi);
  }, [moduls]);

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

  return (
    <div className="space-y-6 pt-2 pb-16 max-w-5xl mx-auto animate-fade-in">
      {/* 1. HERO LEARNING BANNER (Perkuliahan) */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 font-mono text-xs font-bold text-primary-text flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Modul: {modulNama}
              </span>
              {peserta?.kelas && (
                <span className="text-xs text-fg-subtle">
                  Kelas: {peserta.kelas.nama}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Silabus Perkuliahan (14 Pertemuan)
            </h1>
            <p className="text-sm text-fg-muted max-w-xl">
              Kurikulum terstruktur dari pengantar hingga proyek capstone akhir. Pelajari materi pertemuan, catat poin pemahaman, dan kerjakan evaluasi mandiri.
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
              {doneCount} dari {moduls.length} pertemuan selesai
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
            { key: 'modul', label: `Pertemuan Perkuliahan (${moduls.length})` },
            { key: 'jadwal', label: `Jadwal Tatap Muka (${jadwal.length})` },
          ]}
        />
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat data: {error}
        </Card>
      )}

      {/* 3. TAB 1: MODUL PERTEMUAN 1 SAMPAI 14 (Simpel & Elegan) */}
      {tab === 'modul' && (
        <div className="space-y-4">
          {sortedModuls.length === 0 ? (
            <EmptyState
              title="Belum ada modul perkuliahan"
              desc="Modul pembelajaran sedang dipersiapkan oleh dosen/instruktur."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedModuls.map((m) => {
                const j = sesiByModul.get(m.id);
                const prog = j ? progress[j.sesi_peserta_id] : undefined;
                const isDone = prog?.selesai === true;

                // Urutan buka: Pertemuan 1 selalu terbuka, pertemuan berikutnya terbuka jika sebelumnya selesai atau jika user adalah staf
                const originalIndex = sortedModuls.findIndex((x) => x.id === m.id);
                const unlocked =
                  !peserta || // staf selalu terbuka
                  originalIndex === 0 ||
                  sortedModuls.slice(0, originalIndex).every((prev) => {
                    const pj = sesiByModul.get(prev.id);
                    return pj ? progress[pj.sesi_peserta_id]?.selesai === true : false;
                  });

                const content = m.materi_peserta_md || m.content_md || '';
                const estMins = estimateReadingTime(content);

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
                            {/* Card Header: Pertemuan & Status */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold font-mono text-primary-text">
                                Pertemuan {m.urutan_sesi} · {m.kode}
                              </span>

                              {isDone ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4" /> Selesai
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-fg-subtle flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> ~{estMins} mnt baca
                                </span>
                              )}
                            </div>

                            {/* Judul Modul */}
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
                                  Catatan Perkuliahan ✓
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Footer Action */}
                          <div className="mt-5 pt-3 border-t border-border-2/60 flex items-center justify-between text-xs font-semibold">
                            <span className={isDone ? 'text-fg-subtle' : 'text-primary-text flex items-center gap-1'}>
                              <BookOpen className="h-3.5 w-3.5" />
                              {isDone ? 'Tinjau Materi' : 'Mulai Kuliah / Baca Modul'}
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
                          <span className="rounded-md border border-border-2 px-2.5 py-0.5 text-xs font-mono text-fg-subtle">
                            Pertemuan {m.urutan_sesi} · {m.kode}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle font-mono">
                            <Lock className="h-3.5 w-3.5" /> Terkunci
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-fg-subtle">{m.judul}</h3>
                        <p className="mt-3 text-xs text-fg-subtle italic">
                          Selesaikan pertemuan sebelumnya untuk membuka modul ini.
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
              desc="Dosen/tutor belum menjadwalkan sesi perkuliahan langsung untuk kelas Anda."
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
                            <Video className="h-4 w-4" /> Masuk Perkuliahan Online
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
