import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { Penilaian, JadwalSesi, Modul } from '../types';

interface NilaiRow extends Penilaian {
  sesi_peserta: {
    jadwal_sesi?: JadwalSesi & { modul?: Modul | null };
  };
}

const STATUS_STYLE: Record<string, string> = {
  lulus: 'border-green-500/30 bg-green-500/10 text-green-400',
  revisi: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  belum: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
};

const LEVEL_LABEL: Record<number, string> = {
  1: 'Unmet',
  2: 'Needs Revision',
  3: 'Meet',
  4: 'Exceed',
};

export default function NilaiPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<NilaiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profil } = await supabase
        .from('peserta')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profil) {
        const { data } = await supabase
          .from('penilaian')
          .select('*, sesi_peserta!inner(*, jadwal_sesi!inner(*, modul(*)))')
          .eq('sesi_peserta.peserta_id', (profil as { id: string }).id)
          .order('created_at', { ascending: false });
        setRows((data as NilaiRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Loading text="Memuat nilai..." />;

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-headline font-bold text-[#F1F5F9]">Nilai & Penilaian</h1>
        <EmptyState title="Belum ada nilai" desc="Nilai akan muncul setelah instruktur menilai tugas/proyek Anda." />
      </div>
    );
  }

  const rataSkor = rows.reduce((a, r) => a + (r.skor ?? 0), 0) / rows.length;
  const lulus = rows.filter((r) => r.status_kelulusan === 'lulus').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-[#F1F5F9]">Nilai & Penilaian</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">Skor rubrik (1–4) dari instruktur untuk tugas & proyek Anda.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-[#FBBF24] font-display">{rataSkor.toFixed(2)}</p>
          <p className="text-caption text-[#64748B]">Rata-rata Skor (skala 1–4)</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-[#4ADE80] font-display">{lulus}</p>
          <p className="text-caption text-[#64748B]">Aspek Lulus</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#334155]">
              <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Sesi</th>
              <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Aspek Dinilai</th>
              <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Skor</th>
              <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Level</th>
              <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Bobot</th>
              <th className="px-4 py-3 text-left font-mono text-overline uppercase text-[#94A3B8]">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id} className="border-b border-[#1E293B] last:border-0 hover:bg-[#1E293B]">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-[#FBBF24]">{n.sesi_peserta?.jadwal_sesi?.modul?.kode ?? '-'}</span>
                </td>
                <td className="px-4 py-3 text-[#F1F5F9]">
                  {n.rubrik_item}
                  {n.catatan_instruktur && <p className="mt-0.5 text-xs text-[#64748B]">{n.catatan_instruktur}</p>}
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-[#F1F5F9]">{n.skor}</td>
                <td className="px-4 py-3 text-xs text-[#94A3B8]">{LEVEL_LABEL[n.skor] ?? '-'}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{n.bobot_persen}%</td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_STYLE[n.status_kelulusan] ?? ''}>{n.status_kelulusan}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}