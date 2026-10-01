import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta, formatJakartaDateTime } from '../lib/time';
import type { Peserta } from '../types';

type JoinedRow = {
  id?: string;
  status_kehadiran?: string;
  sesi_peserta?: { jadwal_sesi?: { modul?: { kode?: string; judul?: string }; tanggal_kelas?: string } };
};

function joined(r: unknown) {
  return r as JoinedRow;
}

function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full">{children}</table>;
}

export default function AnakPage() {
  const { role, user, loading: authLoading } = useAuth();
  const [anakList, setAnakList] = useState<Peserta[]>([]);
  const [selectedAnak, setSelectedAnak] = useState<Peserta | null>(null);
  const [absensi, setAbsensi] = useState<unknown[]>([]);
  const [catatan, setCatatan] = useState<unknown[]>([]);
  const [nilai, setNilai] = useState<unknown[]>([]);
  const [sertifikat, setSertifikat] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || role !== 'parent') { setLoading(false); return; }
    (async () => {
      try {
        if (!user) return;
        const { data: links } = await supabase
          .from('parent_child_link')
          .select('child_id')
          .eq('parent_user.user_id', user.id);
        const childIds = ((links ?? []) as Array<{ child_id: string }>).map((l) => l.child_id);
        if (childIds.length === 0) return;
        const { data: pesertaData } = await supabase.from('peserta').select('*, kelas(*)').in('id', childIds);
        const list = (pesertaData as Peserta[]) ?? [];
        setAnakList(list);
        if (list.length > 0) setSelectedAnak(list[0]);
      } catch (e) {
        console.error('[Anak] gagal memuat daftar anak:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, role, user]);

  useEffect(() => {
    if (!selectedAnak) return;
    (async () => {
      setLoading(true);
      try {
        const pid = selectedAnak.id;
        const { data: sp } = await supabase.from('sesi_peserta').select('id').eq('peserta_id', pid);
        const spIds = ((sp ?? []) as Array<{ id: string }>).map((s) => s.id);
        const nested = '*, sesi_peserta(*, jadwal_sesi(*, modul(*)))';
        const kosong = Promise.resolve({ data: [] as unknown[] });
        const [absRes, catRes, nilRes, serRes] = await Promise.all([
          spIds.length > 0 ? supabase.from('absensi').select(nested).in('sesi_peserta_id', spIds) : kosong,
          spIds.length > 0 ? supabase.from('catatan_ketik').select(nested).in('sesi_peserta_id', spIds) : kosong,
          spIds.length > 0 ? supabase.from('penilaian').select(nested).in('sesi_peserta_id', spIds) : kosong,
          supabase.from('sertifikat').select('*').eq('id_peserta_fk', pid),
        ]);
        setAbsensi(absRes.data ?? []);
        setCatatan(catRes.data ?? []);
        setNilai(nilRes.data ?? []);
        setSertifikat(serRes.data ?? []);
      } catch (e) {
        console.error('[Anak] gagal memuat detail anak:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAnak]);

  if (authLoading || loading) return <Loading text="Memuat data anak..." />;
  if (role !== 'parent') return <EmptyState title="Akses ditolak" desc="Halaman ini hanya untuk orang tua." />;
  if (anakList.length === 0) return <EmptyState title="Belum ada anak terdaftar" desc="Hubungi admin untuk menautkan akun anak." />;

  const hadir = absensi.filter((x) => {
    const r = joined(x) as { status_kehadiran?: string };
    return r.status_kehadiran === 'hadir';
  }).length;
  const alpha = absensi.filter((x) => {
    const r = joined(x) as { status_kehadiran?: string };
    return r.status_kehadiran === 'alpha';
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-headline font-bold text-fg">Dashboard Anak</h1>
        {anakList.length > 1 && (
          <select
            value={selectedAnak?.id ?? ''}
            onChange={(e) => {
              const found = anakList.find((a) => a.id === e.target.value);
              if (found) setSelectedAnak(found);
            }}
            className="rounded-[4px] border border-border-2 bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary max-w-xs"
          >
            {anakList.map((a) => (
              <option key={a.id} value={a.id} className="bg-surface">{a.nama_panggil ?? a.nama_lengkap}</option>
            ))}
          </select>
        )}
      </div>

      {selectedAnak && (
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-subhead font-semibold text-fg">{selectedAnak.nama_panggil ?? selectedAnak.nama_lengkap}</p>
              <p className="text-sm text-fg-muted">Kelas: <Badge>{selectedAnak.kelas?.nama ?? selectedAnak.kelas_penempatan ?? '-'}</Badge></p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[4px] border border-border-2 bg-surface p-3">
                <p className="text-2xl font-bold text-primary-text">{hadir}</p>
                <p className="text-caption text-fg-subtle">Hadir</p>
              </div>
              <div className="rounded-[4px] border border-border-2 bg-surface p-3">
                <p className="text-2xl font-bold text-destructive">{alpha}</p>
                <p className="text-caption text-fg-subtle">Alpha</p>
              </div>
              <div className="rounded-[4px] border border-border-2 bg-surface p-3">
                <p className="text-2xl font-bold text-accent">{nilai.length}</p>
                <p className="text-caption text-fg-subtle">Nilai</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-subhead font-semibold text-fg">Riwayat Absensi</h2>
        {absensi.length === 0 ? (
          <EmptyState title="Belum ada absensi" desc="Absensi akan muncul setelah sesi dimulai." />
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-border-2">
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Sesi</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs text-fg-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
               {absensi.map((x) => {
                 const r = joined(x) as { id: string; status_kehadiran?: string; sesi_peserta?: { jadwal_sesi?: { modul?: { kode?: string; judul?: string }; tanggal_kelas?: string } } };
                 const js = r.sesi_peserta?.jadwal_sesi;
                 return (
                   <tr key={r.id ?? ''} className="border-b border-border last:border-0">
                     <td className="px-4 py-3 font-mono text-sm text-fg">
                       {js?.modul?.kode ?? '-'} — {js?.modul?.judul ?? '-'}
                     </td>
                     <td className="px-4 py-3 font-mono text-sm text-fg-muted">
                       {js?.tanggal_kelas ? formatJakarta(js.tanggal_kelas) : '-'}
                     </td>
                     <td className="px-4 py-3"><Badge>{r.status_kehadiran ?? '-'}</Badge></td>
                   </tr>
                 );
               })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-subhead font-semibold text-fg">Catatan Belajar</h2>
        {catatan.length === 0 ? (
          <EmptyState title="Belum ada catatan" desc="Anak belum menulis catatan sesi." />
        ) : (
          <div className="space-y-3">
            {catatan.map((x) => {
              const r = joined(x) as { id: string; catatan_text: string; updated_at?: string; created_at: string; sesi_peserta?: { jadwal_sesi?: { modul?: { kode?: string; judul?: string } } } };
              const js = r.sesi_peserta?.jadwal_sesi;
              return (
                <div key={r.id} className="rounded-[4px] border border-border-2 bg-surface p-4">
                  <p className="font-mono text-sm text-primary-text mb-1">
                    {js?.modul?.kode ?? '-'} — {js?.modul?.judul ?? '-'}
                  </p>
                  <p className="text-body text-fg leading-relaxed whitespace-pre-wrap">{r.catatan_text}</p>
                   <p className="mt-2 text-xs text-fg-subtle">Diupdate: {formatJakartaDateTime(r.updated_at ?? r.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-subhead font-semibold text-fg">Nilai & Sertifikat</h2>
        {nilai.length === 0 && sertifikat.length === 0 ? (
          <EmptyState title="Belum ada nilai" desc="Nilai akan muncul setelah instruktur menginput." />
        ) : (
          <div className="space-y-2">
            {nilai.map((x) => {
              const r = joined(x) as { id: string; rubrik_item: string; skor: number; sesi_peserta?: { jadwal_sesi?: { modul?: { kode?: string; judul?: string } } } };
              const js = r.sesi_peserta?.jadwal_sesi;
              return (
                <div key={r.id} className="flex items-center justify-between rounded-[4px] border border-border-2 bg-surface p-3">
                  <span className="text-sm text-fg">{js?.modul?.kode ?? '-'} · {r.rubrik_item}</span>
                  <Badge>{String(r.skor)}</Badge>
                </div>
              );
            })}
            {sertifikat.map((x) => {
              const r = joined(x) as { id: string; nomor_seri: string };
              return (
                <div key={r.id} className="flex items-center gap-2 rounded-[4px] border border-border-2 bg-surface p-3">
                  <Award className="h-4 w-4 shrink-0 text-primary-text" />
                  <span className="font-mono text-sm text-primary-text">{r.nomor_seri}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
