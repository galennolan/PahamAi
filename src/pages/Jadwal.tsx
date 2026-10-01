import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { listSesiAssigned, type SesiAssigned } from '../services/penugasan';
import type { Peserta } from '../types';

const STATUS_LABELS: Record<string, string> = {
  belum: 'Belum',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export default function JadwalPage() {
  const { user } = useAuth();
  const [peserta, setPeserta] = useState<Peserta | null>(null);
  const [jadwal, setJadwal] = useState<SesiAssigned[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'semua' | 'belum' | 'selesai'>('semua');

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const { data: profil } = await supabase
          .from('peserta')
          .select('*, kelas(*)')
          .eq('user_id', user.id)
          .maybeSingle();
        const p = profil as Peserta | null;
        setPeserta(p);
        if (!p) return;
        setJadwal(await listSesiAssigned(p.id));
      } catch (e) {
        console.error('[Jadwal] gagal memuat jadwal:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <Loading text="Memuat jadwal..." />;
  if (!peserta) return <EmptyState title="Belum terdaftar" desc="Hubungi Admin untuk didaftarkan sebagai peserta." />;
  if (!peserta.kelas_id) return <EmptyState title="Belum ada kelas" desc="Admin belum memasukkan Anda ke kelas. Hubungi instruktur." />;

  const today = todayJakartaISO();
  const upcoming = jadwal.filter((s) => (s.tanggal_kelas ?? '') >= today && s.status_sesi !== 'dibatalkan');
  const past = jadwal.filter((s) => (s.tanggal_kelas ?? '') < today);
  const displayed = tab === 'belum' ? upcoming : tab === 'selesai' ? past : [...upcoming, ...past];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-fg">Jadwal Sesi</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Kelas: <Badge className="mx-1">{peserta.kelas?.nama ?? '—'}</Badge> · Total {jadwal.length} sesi
        </p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Filter jadwal">
        {([['semua', 'Semua'], ['belum', 'Mendatang'], ['selesai', 'Telah Lewat']] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-[4px] border px-4 py-2 text-sm transition ${
              tab === key
                ? 'border-primary bg-primary/10 text-primary-text'
                : 'border-border-2 bg-surface text-fg-muted hover:border-border-3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <EmptyState title="Belum ada sesi" desc="Jadwal sesi akan tampil di sini setelah admin membuat jadwal." />
      ) : (
        <div className="grid gap-4">
          {displayed.map((s) => {
            const isUpcoming = (s.tanggal_kelas ?? '') >= today;
            return (
              <Card key={s.id} className={isUpcoming ? 'border-primary/30' : ''}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-primary-text">{s.kode_sesi_friendly}</span>
                      <Badge className={s.status_sesi === 'selesai' ? 'text-success' : s.status_sesi === 'berlangsung' ? 'text-accent' : ''}>
                        {STATUS_LABELS[s.status_sesi] ?? s.status_sesi}
                      </Badge>
                    </div>
                    <h2 className="mt-1 text-subhead font-semibold text-fg">{s.judul_sesi}</h2>
                    <p className="mt-1 font-mono text-sm text-fg-muted">
                      {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : '-'}
                      {s.jam_mulai && ` · ${s.jam_mulai}–${s.jam_akhir ?? ''}`}
                    </p>
                    {s.lokasi && <p className="mt-1 text-xs text-fg-subtle">Lokasi: {s.lokasi}</p>}
                    {s.link_rapat && (
                      <a href={s.link_rapat} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-accent hover:underline">
                        Link Rapat
                      </a>
                    )}
                  </div>
                  <Link
                    to={`/modul/${s.modul?.kode ?? s.kode_sesi_friendly}`}
                    className="shrink-0 rounded-[4px] border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary-text hover:bg-primary/20"
                  >
                    Buka Modul
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}