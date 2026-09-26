import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowRight } from 'lucide-react';
import { listModulByJalur } from '../services/modul';
import { Card, Loading, EmptyState } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Modul, Jalur } from '../types';
import { JALUR_LABELS } from '../types';

const JALUR_DESC: Record<Jalur, string> = {
  A: 'Anak 8–14 th · 9 sesi · 60 mnt',
  B1: 'Pemula · 7 sesi · 90 mnt',
  B2: 'Menengah · 11 sesi · 120 mnt',
  B3: 'Expert · 11 sesi · 120–150 mnt',
};

export default function ModulPage() {
  const { user, role } = useAuth();
  const isStaff = role === 'admin' || role === 'instruktur';
  const [jalur, setJalur] = useState<Jalur>('A');
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listModulByJalur(jalur);
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
  }, [jalur, user, isStaff]);

  const doneCount = moduls.filter((m) => done.has(m.kode)).length;
  const pct = moduls.length > 0 ? Math.round((doneCount / moduls.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-fg">Modul Paham AI</h1>
          <p className="mt-1 font-mono text-sm text-fg-muted">{JALUR_DESC[jalur]}</p>
        </div>
        <div className="flex items-center gap-2" role="tablist" aria-label="Pilih jalur">
          {(['A', 'B1', 'B2', 'B3'] as Jalur[]).map((j) => (
            <button
              key={j}
              role="tab"
              aria-selected={jalur === j}
              onClick={() => setJalur(j)}
              className={`rounded-[4px] border px-3 py-2 font-mono text-sm transition ${
                jalur === j
                  ? 'border-primary bg-primary/10 text-primary-text'
                  : 'border-border-2 bg-surface text-fg-muted hover:border-border-3 hover:text-fg'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {!loading && moduls.length > 0 && (
        <Card>
          <div className="flex items-center justify-between font-mono text-xs text-fg-muted">
            <span>{JALUR_LABELS[jalur]}</span>
            <span>{doneCount}/{moduls.length} sesi ({pct}%)</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </Card>
      )}

      {loading && <Loading text="Memuat modul..." />}
      {error && (
        <Card>
          <p className="text-sm text-destructive">Gagal memuat: {error}</p>
        </Card>
      )}
      {!loading && !error && moduls.length === 0 && (
        <EmptyState title="Modul belum tersedia" desc="Modul akan muncul saat sesi dimulai." />
      )}

      {!loading && !error && moduls.length > 0 && (
        <ol className="relative space-y-0 border-l-2 border-border-2 pl-0">
          {moduls.map((m, i) => {
            const isDone = done.has(m.kode);
            const isNext = !isDone && (i === 0 || done.has(moduls[i - 1].kode));
            const isLocked = !isDone && !isNext;
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
                        <span className="shrink-0 font-mono text-xs text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-fg-subtle">{m.judul}</p>
                            <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                            {m.kode} · {m.durasi_menit} mnt
                            <span className="ml-2 text-fg-subtle inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              terkunci
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-fg-subtle">
                        <Lock className="h-4 w-4" />
                      </span>
                    </div>
                  </Card>
                ) : (
                  <Link to={`/modul/${m.kode}`} className="block">
                    <Card className={`transition hover:border-border-3 hover:shadow-subtle ${isNext ? 'border-primary/30' : ''}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 font-mono text-xs text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-fg">{m.judul}</p>
                            <p className="mt-0.5 font-mono text-xs text-fg-muted">
                              {m.kode} · {m.durasi_menit} mnt
                              {isDone && <span className="ml-2 inline-flex items-center gap-1 text-primary-text"><Check className="h-3 w-3" /> selesai</span>}
                              {isNext && !isDone && <span className="ml-2 inline-flex items-center gap-1 text-accent"><ArrowRight className="h-3 w-3" /> lanjutkan</span>}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm text-fg-subtle">›</span>
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
