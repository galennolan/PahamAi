import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { formatJakarta } from '../lib/time';
import type { Peserta, JadwalSesi, Absensi, Catatan, Pembayaran } from '../types';

interface AnakWithLink {
  linkId: string;
  childId: string;
  nama_lengkap: string;
  nama_panggil: string | null;
  jalur: string | null;
  batch_id: string | null;
  jadwal: JadwalSesi[];
  absensi: Absensi[];
  catatan: (Catatan | null)[];
  pembayaran: Pembayaran | null;
}

export default function OrangTuaPage() {
  const [anaks, setAnaks] = useState<AnakWithLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setError('Anda harus masuk terlebih dahulu');
        setLoading(false);
        return;
      }

      try {
        const { data: links, error: linkErr } = await supabase
          .from('parent_child_link')
          .select('id, child_id')
          .eq('parent_id', (await supabase.from('parent_user').select('id').eq('user_id', auth.user.id).maybeSingle()).data?.id ?? '');

        if (linkErr) throw linkErr;

        const childIds = links?.map((l: { child_id: string }) => l.child_id) ?? [];
        if (childIds.length === 0) {
          setAnaks([]);
          setLoading(false);
          return;
        }

        const { data: pesertas, error: pesertaErr } = await supabase
          .from('peserta')
          .select('*')
          .in('id', childIds);

        if (pesertaErr) throw pesertaErr;

        const mapped: AnakWithLink[] = [];
        for (const p of pesertas) {
          const child = p as Peserta;
          const { data: jadwal } = await supabase
            .from('jadwal_sesi')
            .select('*, modul(*)')
            .eq('batch_id', child.batch_id ?? '')
            .order('tanggal_kelas', { ascending: false });

          const { data: absensi } = await supabase
            .from('absensi')
            .select('*, sesi_peserta!inner(*)')
            .in('sesi_peserta.sesi_id', (jadwal as JadwalSesi[] | []).map((j) => j.id));

          const sesiPesertaIds = (absensi as Absensi[] | null)?.map((a) => a.sesi_peserta_id) ?? [];

          const catatanList: (Catatan | null)[] = [];
          for (const spId of sesiPesertaIds) {
            const { data: cat } = await supabase.from('catatan_ketik').select('*').eq('sesi_peserta_id', spId).maybeSingle();
            catatanList.push(cat as Catatan | null);
          }

          const { data: pembayaran } = await supabase
            .from('pembayaran')
            .select('*')
            .eq('peserta_id', child.id)
            .maybeSingle();

          mapped.push({
            linkId: links?.find((l: { child_id: string }) => l.child_id === child.id)?.id ?? '',
            childId: child.id,
            nama_lengkap: child.nama_lengkap,
            nama_panggil: child.nama_panggil,
            jalur: child.jalur,
            batch_id: child.batch_id,
            jadwal: (jadwal as JadwalSesi[]) ?? [],
            absensi: (absensi as Absensi[]) ?? [],
            catatan: catatanList,
            pembayaran: (pembayaran as Pembayaran | null) ?? null,
          });
        }

        setAnaks(mapped);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading text="Memuat progres anak..." />;
  if (error) return <EmptyState title="Gagal memuat" desc={error} />;

  if (anaks.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-headline font-bold text-fg">Dashboard Orang Tua</h1>
        <EmptyState title="Belum ada anak terhubung" desc="Hubungi Admin untuk menautkan akun anak Anda." />
      </div>
    );
  }

  const kehadiranStats = (anak: AnakWithLink) => {
    const total = anak.jadwal.length;
    const hadir = anak.absensi.filter((a) => a.status_kehadiran === 'hadir' || a.status_kehadiran === 'telat').length;
    const persentase = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { total, hadir, persentase };
  };

  const isLocked = (anak: AnakWithLink) => anak.pembayaran?.lock_status === 'terkunci';

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-fg">Dashboard Orang Tua</h1>
      <p className="text-body text-fg-muted">Pantau progres &amp; kehadiran anak Anda.</p>

      <div className="grid gap-6">
        {anaks.map((anak) => {
          const stats = kehadiranStats(anak);
          const jalurLabel = { A: 'Anak (8-14)', B1: 'Pemula', B2: 'Menengah', B3: 'Expert' }[anak.jalur ?? 'A'] ?? 'Tidak diketahui';
          return (
            <Card key={anak.childId}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-subhead font-bold text-fg">
                    {anak.nama_panggil ?? anak.nama_lengkap}
                  </h2>
                  <p className="text-sm text-fg-muted">Jalur: {jalurLabel}</p>
                </div>
                <Badge className="font-mono text-primary-text">{anak.jalur ?? '-'}</Badge>
              </div>

              {isLocked(anak) && (
                <div className="mb-4 rounded-[4px] border border-[destructive]/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  <strong>Akses terkunci.</strong>{' '}
                  {anak.pembayaran?.due_date
                    ? `Lunaskan pembayaran sebelum ${formatJakarta(anak.pembayaran.due_date)}.`
                    : 'Hubungi admin untuk info pembayaran.'}
                </div>
              )}

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-text font-display">{stats.persentase}%</p>
                  <p className="text-xs text-fg-subtle">Kehadiran</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent font-display">{stats.hadir}/{stats.total}</p>
                  <p className="text-xs text-fg-subtle">Sesi Selesai</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success font-display">{anak.catatan.filter((c) => c).length}</p>
                  <p className="text-xs text-fg-subtle">Catatan</p>
                </div>
              </div>

              <Card>
                <h3 className="mb-2 text-caption font-semibold text-fg-muted uppercase">Sesi Mendatang</h3>
                {anak.jadwal.filter((s) => new Date(s.tanggal_kelas ?? '') >= new Date()).slice(0, 5).length === 0 ? (
                  <p className="text-sm text-fg-subtle">Tidak ada sesi mendatang.</p>
                ) : (
                  <ul className="space-y-1">
                    {anak.jadwal.filter((s) => new Date(s.tanggal_kelas ?? '') >= new Date()).slice(0, 5).map((s) => (
                      <li key={s.id} className="flex justify-between text-sm">
                        <span className="font-mono text-fg">
                          {s.kode_sesi_friendly} — {s.judul_sesi}
                        </span>
                        <span className="text-fg-subtle">
                          {s.tanggal_kelas ? formatJakarta(s.tanggal_kelas) : '-'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Card>
          );
        })}
      </div>
    </div>
  );
}