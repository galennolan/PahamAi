import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, EmptyState, Badge, ProgressBar, Tabs, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { listModul } from '../services/modul';
import { getProgresSesi, listSesiAssigned, urutModulDariSesi, type ProgresSesi, type SesiAssigned } from '../services/penugasan';
import type { Modul, Peserta } from '../types';

type Tab = 'modul' | 'jadwal';

const SESI_STATUS: Record<string, string> = {
  belum: 'Belum',
  berlangsung: 'Berlangsung',
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

      // Katalog modul dipanaskan untuk cache offline (Sesi.tsx membacanya).
      void listModul().catch(() => []);

      // Modul yang boleh dibuka peserta = modul yang di-assign tutor lewat
      // `sesi_peserta`, bukan seluruh katalog jalur. Sesi "dibatalkan" diabaikan.
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
    (async () => {
      setLoading(true);
      await load();
    })();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!peserta) {
    return (
      <div className="pt-6">
        <EmptyState title="Belum terdaftar" desc="Hubungi Admin untuk didaftarkan sebagai peserta." />
      </div>
    );
  }

  const sesiByModul = new Map(jadwal.map((s) => [s.modul_id, s]));
  const doneCount = moduls.filter((m) => progress[sesiByModul.get(m.id)?.sesi_peserta_id ?? '']?.selesai === true).length;
  const pct = moduls.length > 0 ? Math.round((doneCount / moduls.length) * 100) : 0;
  const today = todayJakartaISO();

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-headline font-bold text-fg">Belajar</h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          {peserta.kelas?.nama ?? 'Tanpa kelas'} · {moduls.length} modul
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <span className="font-medium">Progres belajar</span>
          <span className="font-mono">{doneCount}/{moduls.length} ({pct}%)</span>
        </div>
        <ProgressBar value={pct} className="mt-2" />
      </Card>

      <Tabs
        label="Pilih tampilan"
        value={tab}
        onChange={setTab}
        options={[
          { key: 'modul', label: 'Modul' },
          { key: 'jadwal', label: 'Jadwal' },
        ]}
      />

      {error && (
        <Card>
          <p className="text-sm text-destructive">Gagal memuat: {error}</p>
        </Card>
      )}

      {tab === 'modul' && (
        moduls.length === 0 ? (
          <EmptyState title="Belum ada modul" desc="Modul akan muncul setelah tutor memberi tugas modul ini untuk kelas Anda." />
        ) : (
          <ol className="space-y-2.5">
            {moduls.map((m, i) => {
              const j = sesiByModul.get(m.id);
              const prog = j ? progress[j.sesi_peserta_id] : undefined;
              const isDone = prog?.selesai === true;
              // Urut: sebuah modul terbuka hanya setelah semua modul yang
              // ditugaskan sebelumnya selesai. Sama dengan aturan di Sesi.tsx.
              const unlocked = i === 0 || moduls.slice(0, i).every((prev) => {
                const pj = sesiByModul.get(prev.id);
                return pj ? progress[pj.sesi_peserta_id]?.selesai === true : false;
              });

              return (
                <li key={m.id}>
                  {unlocked ? (
                    <Link to={`/modul/${m.kode}`} className="block">
                      <Card className={`transition active:scale-[0.99] hover:border-border-3 ${isDone ? '' : 'border-primary/25'}`}>
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold font-mono ${isDone ? 'border-primary bg-primary text-[rgb(var(--on-primary))]' : 'border-primary bg-transparent text-primary-text'}`}>
                            {isDone ? <Check className="h-4 w-4" /> : String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate font-semibold ${isDone ? 'text-fg-muted' : 'text-fg'}`}>{m.judul}</p>
                            <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                              {m.kode} · {m.durasi_menit} mnt
                              {isDone && <span className="ml-2 text-primary-text">selesai</span>}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {prog?.absen && <Badge className="text-[10px]">Absen: {prog.absen}</Badge>}
                              {prog?.adaCatatan && <Badge className="text-[10px] text-success">Catatan <Check className="inline h-3 w-3" /></Badge>}
                              {!isDone && !prog && <Badge className="border-primary/30 text-[10px] text-primary-text">Mulai di sini</Badge>}
                            </div>
                          </div>
                          <span className="mt-1 shrink-0 font-mono text-sm text-fg-subtle">
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ) : (
                    <Card className="opacity-55">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border-2 text-xs text-fg-subtle">
                          <Lock className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-fg-subtle">{m.judul}</p>
                          <p className="mt-0.5 font-mono text-xs text-fg-subtle">{m.kode} · Selesaikan sesi sebelumnya</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </li>
              );
            })}
          </ol>
        )
      )}

      {tab === 'jadwal' && (
        jadwal.length === 0 ? (
          <EmptyState title="Belum ada jadwal" desc="Tutor belum menjadwalkan sesi untuk kelas Anda." />
        ) : (
          <ul className="space-y-2.5">
            {jadwal.map((s) => {
              const isPast = (s.tanggal_kelas ?? '') < today;
              const prog = progress[s.sesi_peserta_id];
              return (
                <li key={s.id}>
                  <Card className={!isPast ? 'border-primary/25' : ''}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-primary-text">{s.kode_sesi_friendly}</span>
                          <Badge className={`text-[10px] ${s.status_sesi === 'selesai' ? 'text-success' : s.status_sesi === 'berlangsung' ? 'text-accent' : ''}`}>
                            {SESI_STATUS[s.status_sesi] ?? s.status_sesi}
                          </Badge>
                          {prog?.selesai && <Badge className="text-[10px] text-success"><Check className="h-3 w-3" /></Badge>}
                        </div>
                        <p className="mt-1 font-semibold text-fg">{s.judul_sesi}</p>
                        <p className="mt-0.5 font-mono text-xs text-fg-muted">
                          {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : '-'}
                          {s.jam_mulai && ` · ${s.jam_mulai}–${s.jam_akhir ?? ''}`}
                        </p>
                        {s.lokasi && <p className="mt-1 text-xs text-fg-subtle">{s.lokasi}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        {s.link_rapat && (
                          <a
                            href={s.link_rapat}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-[8px] border border-border-2 px-3 py-1.5 text-center text-xs text-accent hover:border-[accent]"
                          >
                            Rapat
                            <ExternalLink className="inline h-3 w-3 ml-1" />
                          </a>
                        )}
                        <Link
                          to={`/modul/${s.modul?.kode ?? s.kode_sesi_friendly}`}
                          className="rounded-[8px] border border-primary bg-primary/10 px-3 py-1.5 text-center text-xs font-medium text-primary-text hover:bg-primary/20"
                        >
                          {isPast ? 'Ulangi' : 'Buka'}
                        </Link>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )
      )}
      {peserta.kelas?.nama && (
        <p className="mt-8 text-center text-xs text-fg-subtle">
          {peserta.kelas.nama}
        </p>
      )}
    </div>
  );
}