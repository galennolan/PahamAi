import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowRight, GraduationCap, Clock, BookOpen } from 'lucide-react';
import { listModul } from '../services/modul';
import { Card, Loading, EmptyState } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Modul } from '../types';
import { estimateReadingTime } from '../lib/markdown';

const DEFAULT_MATKUL = 'Kecerdasan Buatan & AI Engineering';

export default function ModulPage() {
  const { user, role } = useAuth();
  const isStaff = role === 'admin' || role === 'instruktur';
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const matkulNama = localStorage.getItem('paham_ai_matkul_nama') || DEFAULT_MATKUL;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listModul();
        if (cancelled) return;
        setModuls(data);

        if (isStaff) {
          setDone(new Set(data.map((m) => m.kode)));
          return;
        }

        if (!user) {
          setDone(new Set());
          return;
        }

        const { data: profil } = await supabase
          .from('peserta').select('id').eq('user_id', user.id).maybeSingle();
        if (!profil) {
          setDone(new Set());
          return;
        }

        const { data: sp } = await supabase
          .from('sesi_peserta').select('id, sesi_id').eq('peserta_id', profil.id);
        const sesiList = (sp ?? []) as Array<{ id: string; sesi_id: string }>;
        if (sesiList.length === 0) {
          setDone(new Set());
          return;
        }

        const sesiIds = sesiList.map((r) => r.sesi_id);
        const spIds = sesiList.map((r) => r.id);
        const [{ data: jadwal }, { data: cat }, { data: abs }] = await Promise.all([
          supabase.from('jadwal_sesi').select('id, modul_id').in('id', sesiIds),
          supabase.from('catatan_ketik').select('sesi_peserta_id, catatan_text').in('sesi_peserta_id', spIds),
          supabase.from('absensi').select('sesi_peserta_id, status_kehadiran').in('sesi_peserta_id', spIds),
        ]);

        const jadwalList = (jadwal ?? []) as Array<{ id: string; modul_id: string }>;
        const spToModul = new Map<string, string>();
        for (const j of jadwalList) {
          const entry = sesiList.find((s) => s.sesi_id === j.id);
          if (entry) spToModul.set(entry.id, j.modul_id);
        }

        const doneModulIds = new Set<string>();
        for (const c of (cat ?? []) as Array<{ sesi_peserta_id: string; catatan_text: string | null }>) {
          if (!c.catatan_text?.trim()) continue;
          const modId = spToModul.get(c.sesi_peserta_id);
          if (modId) doneModulIds.add(modId);
        }
        for (const a of (abs ?? []) as Array<{ sesi_peserta_id: string; status_kehadiran: string | null }>) {
          if (!a.status_kehadiran || a.status_kehadiran === 'alpha') continue;
          const modId = spToModul.get(a.sesi_peserta_id);
          if (modId) doneModulIds.add(modId);
        }

        const marked = new Set<string>();
        for (const m of data) {
          if (doneModulIds.has(m.id)) marked.add(m.kode);
        }
        if (cancelled) return;
        setDone(marked);
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, isStaff]);

  const sortedModuls = [...moduls].sort((a, b) => a.urutan_sesi - b.urutan_sesi);
  const doneCount = sortedModuls.filter((m) => done.has(m.kode)).length;
  const pct = sortedModuls.length > 0 ? Math.round((doneCount / sortedModuls.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Silabus */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-2 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary-text flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Mata Kuliah
            </span>
            <span className="font-mono text-xs text-fg-subtle">
              14 Pertemuan Semester
            </span>
          </div>
          <h1 className="text-2xl font-bold text-fg">{matkulNama}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Silabus materi perkuliahan lengkap: Pertemuan 1 sampai 14
          </p>
        </div>

        {/* Progres Belajar */}
        <div className="text-right">
          <span className="font-mono text-xs text-fg-muted block">Progres Silabus</span>
          <span className="font-mono text-sm font-bold text-primary-text">
            {doneCount}/{sortedModuls.length} Pertemuan ({pct}%)
          </span>
        </div>
      </div>

      {loading && <Loading text="Memuat silabus perkuliahan..." />}
      {error && (
        <Card>
          <p className="text-sm text-destructive">Gagal memuat: {error}</p>
        </Card>
      )}
      {!loading && !error && sortedModuls.length === 0 && (
        <EmptyState title="Modul belum tersedia" desc="Silabus perkuliahan belum dibuat di Kelola Modul." />
      )}

      {/* Daftar Pertemuan Berurutan */}
      {!loading && !error && sortedModuls.length > 0 && (
        <ol className="relative space-y-0 border-l-2 border-border-2 pl-0">
          {sortedModuls.map((m, i) => {
            const isDone = done.has(m.kode);
            const isNext = !isDone && (i === 0 || done.has(sortedModuls[i - 1].kode));
            const isLocked = !isDone && !isNext;
            const content = m.materi_peserta_md || m.content_md || '';
            const estMins = estimateReadingTime(content);

            return (
              <li key={m.id} className="relative pb-4 pl-8 last:pb-0">
                <span
                  className={`absolute -left-[9px] top-5 h-4 w-4 rounded-full border-2 ${
                    isDone ? 'border-primary bg-primary' : isNext ? 'border-primary bg-bg' : 'border-border-2 bg-bg'
                  }`}
                  aria-hidden
                />
                {isLocked && !isStaff ? (
                  <Card className="opacity-50 cursor-not-allowed">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 font-mono text-xs text-fg-subtle">
                          P{String(m.urutan_sesi).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-fg-subtle">{m.judul}</p>
                          <p className="mt-0.5 font-mono text-xs text-fg-subtle flex items-center gap-2">
                            <span>{m.kode}</span>
                            <span>·</span>
                            <span><Lock className="inline h-3 w-3 mr-0.5" />terkunci</span>
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-fg-subtle">
                        <Lock className="h-4 w-4" />
                      </span>
                    </div>
                  </Card>
                ) : (
                  <Link to={`/modul/${m.kode}`} className="block group">
                    <Card className={`transition hover:border-primary/50 hover:shadow-subtle ${isNext ? 'border-primary/40 bg-surface' : 'bg-surface'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 font-mono text-xs font-bold text-primary-text bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            P{String(m.urutan_sesi).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-semibold text-fg group-hover:text-primary-text transition">
                              {m.judul}
                            </p>
                            <p className="font-mono text-xs text-fg-muted flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> ~{estMins} mnt baca
                              </span>
                              {isDone && (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                  <Check className="h-3 w-3" /> selesai
                                </span>
                              )}
                              {isNext && !isDone && (
                                <span className="inline-flex items-center gap-1 text-accent font-semibold">
                                  <ArrowRight className="h-3 w-3" /> lanjutkan
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm text-fg-subtle group-hover:text-primary-text group-hover:translate-x-0.5 transition">
                          <BookOpen className="h-4 w-4" />
                        </span>
                      </div>
                    </Card>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
