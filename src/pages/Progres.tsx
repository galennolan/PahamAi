import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, EmptyState, Badge, Tabs, ProgressBar, Stat, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta } from '../lib/time';
import type { Peserta, JadwalSesi, Modul } from '../types';

type Tab = 'ringkas' | 'absensi' | 'nilai' | 'catatan';

const ABSEN_STYLE: Record<string, string> = {
  hadir: 'border-green-500/30 bg-green-500/10 text-green-400',
  telat: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  izin: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  alpha: 'border-red-500/30 bg-red-500/10 text-red-400',
};

const NILAI_STYLE: Record<string, string> = {
  lulus: 'border-green-500/30 bg-green-500/10 text-green-400',
  revisi: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  belum: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
};

interface AbsensiRow {
  id: string;
  status_kehadiran: string;
  sesi_peserta?: { jadwal_sesi?: JadwalSesi & { modul?: Modul | null } };
}

interface NilaiRow {
  id: string;
  rubrik_item: string;
  skor: number;
  status_kelulusan: string;
  sesi_peserta?: { jadwal_sesi?: JadwalSesi & { modul?: Modul | null } };
}

interface CatatanRow {
  catatan: { id: string; catatan_text: string; status_pengumpulan: boolean; created_at: string };
  jadwal: JadwalSesi & { modul?: Modul | null };
}

export default function ProgresPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('ringkas');
  const [pesertaId, setPesertaId] = useState<string | null>(null);
  const [absensi, setAbsensi] = useState<AbsensiRow[]>([]);
  const [nilai, setNilai] = useState<NilaiRow[]>([]);
  const [catatan, setCatatan] = useState<CatatanRow[]>([]);
  const [kuisCount, setKuisCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
    const pid = (profil as Peserta | null)?.id ?? null;
    setPesertaId(pid);
    if (!pid) { setLoading(false); return; }

    const [absRes, nilRes, quizRes] = await Promise.all([
      supabase.from('absensi').select('*, sesi_peserta!inner(sesi_id, peserta_id, jadwal_sesi(*, modul(kode, judul)))').eq('sesi_peserta.peserta_id', pid),
      supabase.from('penilaian').select('*, sesi_peserta!inner(sesi_id, jadwal_sesi(*, modul(kode, judul)))').eq('sesi_peserta.peserta_id', pid),
      supabase.from('quiz_attempt').select('kode_paket').eq('id_peserta_fk', pid),
    ]);
    setAbsensi((absRes.data as unknown as AbsensiRow[]) ?? []);
    setNilai((nilRes.data as unknown as NilaiRow[]) ?? []);
    setKuisCount(new Set(((quizRes.data ?? []) as Array<{ kode_paket: string }>).map((k) => k.kode_paket)).size);

    const { data: spList } = await supabase.from('sesi_peserta').select('id, sesi_id').eq('peserta_id', pid);
    const spIds = ((spList ?? []) as Array<{ id: string; sesi_id: string }>).map((s) => s.id);
    if (spIds.length > 0) {
      const { data: catList } = await supabase.from('catatan_ketik').select('*').in('sesi_peserta_id', spIds).order('created_at', { ascending: false });
      const spMap = new Map(((spList ?? []) as Array<{ id: string; sesi_id: string }>).map((s) => [s.id, s.sesi_id]));
      const rows: CatatanRow[] = [];
      for (const c of (catList as Array<{ id: string; sesi_peserta_id: string; catatan_text: string; status_pengumpulan: boolean; created_at: string }> ?? [])) {
        const sesiId = spMap.get(c.sesi_peserta_id);
        if (!sesiId) continue;
        const { data: j } = await supabase.from('jadwal_sesi').select('*, modul(*)').eq('id', sesiId).maybeSingle();
        if (j) rows.push({ catatan: c, jadwal: j as JadwalSesi & { modul?: Modul | null } });
      }
      setCatatan(rows);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { (async () => { setLoading(true); await load(); })(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-2.5"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      </div>
    );
  }

  if (!pesertaId) return <EmptyState title="Belum terdaftar" desc="Hubungi Admin untuk didaftarkan sebagai peserta." />;

  const hadir = absensi.filter((r) => r.status_kehadiran === 'hadir' || r.status_kehadiran === 'telat').length;
  const persenHadir = absensi.length > 0 ? Math.round((hadir / absensi.length) * 100) : 0;
  const rataNilai = nilai.length > 0 ? nilai.reduce((a, r) => a + (r.skor ?? 0), 0) / nilai.length : 0;

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-headline font-bold text-[#F1F5F9]">Progres</h1>
        <p className="mt-0.5 text-sm text-[#94A3B8]">Absensi, nilai, dan catatan dalam satu tempat.</p>
      </div>

      <Tabs
        label="Pilih progres"
        value={tab}
        onChange={setTab}
        options={[
          { key: 'ringkas', label: 'Ringkas' },
          { key: 'absensi', label: `Absensi (${absensi.length})` },
          { key: 'nilai', label: `Nilai (${nilai.length})` },
          { key: 'catatan', label: `Catatan (${catatan.length})` },
        ]}
      />

      {tab === 'ringkas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <Stat value={`${persenHadir}%`} label="Kehadiran" accent="text-[#FBBF24]" />
            <Stat value={rataNilai.toFixed(1)} label="Rata Nilai" accent="text-[#22D3EE]" />
            <Stat value={kuisCount} label="Kuis Selesai" accent="text-[#4ADE80]" />
          </div>
          <Card>
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="font-medium">Kehadiran</span>
              <span className="font-mono">{hadir}/{absensi.length}</span>
            </div>
            <ProgressBar value={persenHadir} className="mt-2" />
            <p className="mt-1.5 text-xs text-[#64748B]">Syarat kelulusan: 75–85% tergantung jalur</p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#94A3B8]">Butuh kerjakan kuis?</p>
              <Link to="/kuis" className="text-sm text-[#FBBF24] underline">Buka Kuis</Link>
            </div>
          </Card>
        </div>
      )}

      {tab === 'absensi' && (
        absensi.length === 0 ? (
          <EmptyState
            title="Belum ada absensi"
            desc="Absen lewat halaman sesi saat kelas berlangsung."
            action={<Link to="/belajar" className="inline-block rounded-[8px] border border-[#FBBF24] px-4 py-2 text-sm text-[#FBBF24]">Ke Belajar</Link>}
          />
        ) : (
          <ul className="space-y-2.5">
            {absensi.map((r) => (
              <li key={r.id}>
                <Card>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#F1F5F9]">
                        <span className="font-mono text-xs text-[#FBBF24]">{r.sesi_peserta?.jadwal_sesi?.modul?.kode ?? '-'}</span>{' '}
                        {r.sesi_peserta?.jadwal_sesi?.judul_sesi ?? '-'}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-[#94A3B8]">
                        {r.sesi_peserta?.jadwal_sesi?.tanggal_kelas ? formatJakarta(r.sesi_peserta.jadwal_sesi.tanggal_kelas) : '-'}
                      </p>
                    </div>
                    <Badge className={ABSEN_STYLE[r.status_kehadiran] ?? ''}>{r.status_kehadiran}</Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === 'nilai' && (
        nilai.length === 0 ? (
          <EmptyState title="Belum ada nilai" desc="Nilai muncul setelah instruktur menilai tugas/proyek Anda." />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-[#334155]">
                    <th className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[#94A3B8]">Sesi</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[#94A3B8]">Aspek</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[#94A3B8]">Skor</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[#94A3B8]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {nilai.map((n) => (
                    <tr key={n.id} className="border-b border-[#1E293B] last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-[#FBBF24]">{n.sesi_peserta?.jadwal_sesi?.modul?.kode ?? '-'}</td>
                      <td className="px-4 py-3 text-[#F1F5F9]">{n.rubrik_item}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[#F1F5F9]">{n.skor}</td>
                      <td className="px-4 py-3"><Badge className={NILAI_STYLE[n.status_kelulusan] ?? ''}>{n.status_kelulusan}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {tab === 'catatan' && (
        catatan.length === 0 ? (
          <EmptyState
            title="Belum ada catatan"
            desc="Tulis catatan di halaman sesi — tersimpan otomatis bahkan offline."
            action={<Link to="/belajar" className="inline-block rounded-[8px] border border-[#FBBF24] px-4 py-2 text-sm text-[#FBBF24]">Ke Belajar</Link>}
          />
        ) : (
          <ul className="space-y-3">
            {catatan.map((item) => (
              <li key={item.catatan.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge className="shrink-0 font-mono text-[10px] text-[#FBBF24]">
                        {item.jadwal.modul?.kode ?? item.jadwal.kode_sesi_friendly}
                      </Badge>
                      <p className="truncate text-sm font-medium text-[#F1F5F9]">{item.jadwal.judul_sesi}</p>
                    </div>
                    <p className="shrink-0 font-mono text-[11px] text-[#64748B]">
                      {item.jadwal.tanggal_kelas ? formatJakarta(item.jadwal.tanggal_kelas) : '-'}
                    </p>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap rounded-[8px] border border-[#334155] bg-[#0F172A] p-3 font-mono text-sm leading-relaxed text-[#F1F5F9]">
                    {item.catatan.catatan_text || '(kosong)'}
                  </div>
                  {item.catatan.status_pengumpulan && (
                    <p className="mt-1.5 font-mono text-xs text-[#4ADE80]">Dikumpulkan</p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
