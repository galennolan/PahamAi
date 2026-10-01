import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState } from '../components/ui';
import { formatJakarta } from '../lib/time';
import type { Peserta, JadwalSesi, Absensi, Catatan, Pembayaran } from '../types';

interface AnakWithLink {
  linkId: string;
  childId: string;
  nama_lengkap: string;
  nama_panggil: string | null;
  kelas_id: string | null;
  kelas_nama: string | null;
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
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          setError('Anda harus masuk terlebih dahulu');
          return;
        }

        const { data: parentRow } = await supabase
          .from('parent_user')
          .select('id')
          .eq('user_id', auth.user.id)
          .maybeSingle();
        const parentId = (parentRow as { id: string } | null)?.id ?? '';
        if (!parentId) {
          setAnaks([]);
          return;
        }

        const { data: links, error: linkErr } = await supabase
          .from('parent_child_link')
          .select('id, child_id')
          .eq('parent_id', parentId);
        if (linkErr) throw linkErr;

        const childIds = links?.map((l: { child_id: string }) => l.child_id) ?? [];
        if (childIds.length === 0) {
          setAnaks([]);
          return;
        }

        const { data: pesertas, error: pesertaErr } = await supabase
          .from('peserta')
          .select('*, kelas(*)')
          .in('id', childIds);
        if (pesertaErr) throw pesertaErr;

        const mapped: AnakWithLink[] = [];
        for (const p of pesertas) {
          const child = p as Peserta;
          const [jadwalRes, absRes, bayarRes] = await Promise.all([
            supabase
              .from('jadwal_sesi')
              .select('*, modul(*)')
              .eq('kelas_id', child.kelas_id ?? '')
              .order('tanggal_kelas', { ascending: false }),
            supabase
              .from('absensi')
              .select('*, sesi_peserta!inner(*)')
              .eq('sesi_peserta.peserta_id', child.id),
            supabase.from('pembayaran').select('*').eq('peserta_id', child.id).maybeSingle(),
          ]);
          const jadwal = (jadwalRes.data as JadwalSesi[] | null) ?? [];
          const absensi = (absRes.data as Absensi[] | null) ?? [];

          const sesiPesertaIds = absensi.map((a) => a.sesi_peserta_id);
          const { data: catList } = sesiPesertaIds.length > 0
            ? await supabase.from('catatan_ketik').select('*').in('sesi_peserta_id', sesiPesertaIds)
            : { data: [] as Catatan[] };
          const catBySp = new Map(
            ((catList as Catatan[] | null) ?? []).map((c) => [c.sesi_peserta_id, c]),
          );
          const catatanList = sesiPesertaIds.map((spId) => catBySp.get(spId) ?? null);

          mapped.push({
            linkId: links?.find((l: { child_id: string }) => l.child_id === child.id)?.id ?? '',
            childId: child.id,
            nama_lengkap: child.nama_lengkap,
            nama_panggil: child.nama_panggil,
            kelas_id: child.kelas_id,
            kelas_nama: child.kelas?.nama ?? null,
            jadwal,
            absensi,
            catatan: catatanList,
            pembayaran: (bayarRes.data as Pembayaran | null) ?? null,
          });
        }

        setAnaks(mapped);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
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
          return (
            <Card key={anak.childId}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-subhead font-bold text-fg">
                    {anak.nama_panggil ?? anak.nama_lengkap}
                  </h2>
                  <p className="text-sm text-fg-muted">Kelas: {anak.kelas_nama ?? '—'}</p>
                </div>
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