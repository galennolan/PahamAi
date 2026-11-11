import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowRight, GraduationCap, Clock, BookOpen, Layers, ArrowLeft, ChevronRight } from 'lucide-react';
import { listModul, listModulInduk, listPertemuanByModul } from '../services/modul';
import { Card, Loading, Button, Badge } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Modul, ModulInduk } from '../types';
import { estimateReadingTime } from '../lib/markdown';

export default function ModulPage() {
  const { user, role } = useAuth();
  const isStaff = role === 'admin' || role === 'instruktur';

  const [selectedModulInduk, setSelectedModulInduk] = useState<ModulInduk | null>(null);
  const [modulIndukList, setModulIndukList] = useState<ModulInduk[]>([]);
  const [pertemuanList, setPertemuanList] = useState<Modul[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const induks = await listModulInduk();
        if (cancelled) return;
        setModulIndukList(induks);

        if (isStaff) {
          const semua = await listModul();
          setDone(new Set(semua.map((m) => m.kode)));
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

        const spIds = sesiList.map((r) => r.id);
        const [{ data: jadwal }, { data: cat }, { data: abs }] = await Promise.all([
          supabase.from('jadwal_sesi').select('id, modul_id').in('id', sesiList.map((r) => r.sesi_id)),
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

        const semua = await listModul();
        const marked = new Set<string>();
        for (const m of semua) {
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

  const handleSelectModul = async (m: ModulInduk) => {
    setSelectedModulInduk(m);
    setLoading(true);
    try {
      const list = await listPertemuanByModul(m.id);
      setPertemuanList(list);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const doneCount = pertemuanList.filter((m) => done.has(m.kode)).length;
  const pct = pertemuanList.length > 0 ? Math.round((doneCount / pertemuanList.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ==================================================================== */}
      {/* LEVEL 1: DAFTAR BEBERAPA MODUL                                       */}
      {/* ==================================================================== */}
      {!selectedModulInduk && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8 shadow-sm">
            <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 font-mono text-xs font-bold text-primary-text flex items-center gap-1.5 w-fit mb-2">
              <Layers className="h-3.5 w-3.5" />
              Katalog Kurikulum AI
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Pilih Modul Pembelajaran
            </h1>
            <p className="mt-1 text-sm text-fg-muted max-w-xl">
              Pilih salah satu modul di bawah ini untuk melihat dan membaca silabus pertemuan 1 sampai 14.
            </p>
          </div>

          {loading && <Loading text="Memuat modul..." />}
          {error && <Card><p className="text-sm text-destructive">{error}</p></Card>}

          {!loading && (
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
                    <span>Buka Pertemuan 1–14</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* LEVEL 2: DAFTAR PERTEMUAN DARI MODUL TERPILIH                        */}
      {/* ==================================================================== */}
      {selectedModulInduk && (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-2 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedModulInduk(null)}
              className="text-fg-muted hover:text-fg"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali ke Daftar Modul
            </Button>

            <div className="text-right">
              <span className="font-mono text-xs text-fg-muted block">Progres Selesai</span>
              <span className="font-mono text-sm font-bold text-primary-text">
                {doneCount}/{pertemuanList.length} Pertemuan ({pct}% Selesai)
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-6 shadow-sm">
            <span className="rounded-md bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary-text flex items-center gap-1.5 w-fit mb-2">
              <GraduationCap className="h-3.5 w-3.5" />
              {selectedModulInduk.kode}
            </span>
            <h1 className="text-2xl font-bold text-fg">{selectedModulInduk.nama}</h1>
            <p className="mt-1 text-sm text-fg-muted">{selectedModulInduk.deskripsi}</p>
          </div>

          {loading && <Loading text="Memuat pertemuan..." />}

          {!loading && pertemuanList.length > 0 && (
            <ol className="relative space-y-0 border-l-2 border-border-2 pl-0">
              {pertemuanList.map((m, i) => {
                const isDone = done.has(m.kode);
                const isNext = i === 0 || done.has(pertemuanList[i - 1]?.kode);
                const isLocked = false; // Seluruh 14 pertemuan terbuka untuk dibaca
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

                    {isLocked ? (
                      <Card className="opacity-50 cursor-not-allowed">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="shrink-0 font-mono text-xs text-fg-subtle">
                              P{String(m.urutan_sesi).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-fg-subtle">{m.judul}</p>
                              <p className="mt-0.5 font-mono text-xs text-fg-subtle flex items-center gap-1">
                                <Lock className="h-3 w-3" /> terkunci
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
                                      <ArrowRight className="h-3 w-3" /> buka materi
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
      )}
    </div>
  );
}
