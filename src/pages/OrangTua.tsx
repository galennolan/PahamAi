import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Badge, Card, EmptyState, Loading, ProgressBar, Stat } from '../components/ui';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { listSesiAssigned, type SesiAssigned } from '../services/penugasan';
import type { Kehadiran, Pembayaran, Peserta } from '../types';

type StatusKehadiranOrangTua = Kehadiran | 'belum-tercatat' | 'mendatang' | 'tanpa-jadwal';

interface AbsensiAnak {
  sesi_peserta_id: string;
  status_kehadiran: Kehadiran;
  menit_telat: number | null;
}

interface RiwayatKehadiran {
  sesiPesertaId: string;
  kode: string;
  judul: string;
  tanggal: string | null;
  jamMulai: string | null;
  jamAkhir: string | null;
  status: StatusKehadiranOrangTua;
  menitTelat: number;
  adaCatatan: boolean;
}

interface RingkasanKehadiran {
  hadir: number;
  telat: number;
  izin: number;
  alpha: number;
  belumTercatat: number;
  mendatang: number;
  totalTerjadwal: number;
  persentase: number;
}

interface AnakWithLink {
  linkId: string;
  childId: string;
  nama_lengkap: string;
  nama_panggil: string | null;
  kelas_id: string | null;
  kelas_nama: string | null;
  riwayat: RiwayatKehadiran[];
  ringkasan: RingkasanKehadiran;
  jumlahCatatan: number;
  pembayaran: Pembayaran | null;
}

const LABEL_STATUS_KEHADIRAN: Record<StatusKehadiranOrangTua, string> = {
  hadir: 'Hadir',
  telat: 'Terlambat',
  izin: 'Izin',
  alpha: 'Tanpa keterangan',
  'belum-tercatat': 'Belum tercatat',
  mendatang: 'Mendatang',
  'tanpa-jadwal': 'Jadwal belum ditentukan',
};

const GAYA_STATUS_KEHADIRAN: Record<StatusKehadiranOrangTua, string> = {
  hadir: 'border-green-500/30 bg-green-500/10 text-green-600',
  telat: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700',
  izin: 'border-blue-500/30 bg-blue-500/10 text-blue-700',
  alpha: 'border-red-500/30 bg-red-500/10 text-red-600',
  'belum-tercatat': 'border-orange-500/30 bg-orange-500/10 text-orange-700',
  mendatang: 'border-slate-500/30 bg-slate-500/10 text-slate-600',
  'tanpa-jadwal': 'border-slate-500/30 bg-slate-500/10 text-slate-500',
};

function formatJam(jam: string | null): string {
  if (!jam) return '';
  const [h = '', m = ''] = jam.split(':');
  if (!h || !m) return jam;
  return `${h.padStart(2, '0')}.${m.padStart(2, '0')}`;
}

function formatWaktuSesi(sesi: Pick<RiwayatKehadiran, 'tanggal' | 'jamMulai' | 'jamAkhir'>): string {
  const tanggal = sesi.tanggal ? formatJakarta(sesi.tanggal) : 'Tanggal belum ditentukan';
  const mulai = formatJam(sesi.jamMulai);
  const akhir = formatJam(sesi.jamAkhir);
  if (!mulai) return tanggal;
  return `${tanggal} • ${mulai}${akhir ? `–${akhir}` : ''} WIB`;
}

function tentukanStatusSesi(
  sesi: SesiAssigned,
  absensi: AbsensiAnak | undefined,
  hariIni: string,
): StatusKehadiranOrangTua {
  if (absensi) return absensi.status_kehadiran;
  if (!sesi.tanggal_kelas) return 'tanpa-jadwal';
  return sesi.tanggal_kelas < hariIni ? 'belum-tercatat' : 'mendatang';
}

function buatRingkasanKehadiran(riwayat: RiwayatKehadiran[], hariIni: string): RingkasanKehadiran {
  const ringkasan: RingkasanKehadiran = {
    hadir: 0,
    telat: 0,
    izin: 0,
    alpha: 0,
    belumTercatat: 0,
    mendatang: 0,
    totalTerjadwal: 0,
    persentase: 0,
  };

  for (const sesi of riwayat) {
    if (sesi.status === 'hadir') ringkasan.hadir += 1;
    if (sesi.status === 'telat') ringkasan.telat += 1;
    if (sesi.status === 'izin') ringkasan.izin += 1;
    if (sesi.status === 'alpha') ringkasan.alpha += 1;
    if (sesi.status === 'belum-tercatat') ringkasan.belumTercatat += 1;
    if (sesi.status === 'mendatang') ringkasan.mendatang += 1;
    const sudahAdaAbsensi = sesi.status === 'hadir' || sesi.status === 'telat' || sesi.status === 'izin' || sesi.status === 'alpha';
    if ((sesi.tanggal && sesi.tanggal <= hariIni) || sudahAdaAbsensi) ringkasan.totalTerjadwal += 1;
  }

  const sudahHadir = ringkasan.hadir + ringkasan.telat;
  ringkasan.persentase = ringkasan.totalTerjadwal > 0
    ? Math.round((sudahHadir / ringkasan.totalTerjadwal) * 100)
    : 0;
  return ringkasan;
}

function urutRiwayat(riwayat: RiwayatKehadiran[]): RiwayatKehadiran[] {
  return [...riwayat].sort((a, b) => {
    const tanggalA = a.tanggal ?? '9999-12-31';
    const tanggalB = b.tanggal ?? '9999-12-31';
    if (tanggalA !== tanggalB) return tanggalA.localeCompare(tanggalB);
    const jamA = a.jamMulai ?? '';
    const jamB = b.jamMulai ?? '';
    if (jamA !== jamB) return jamA.localeCompare(jamB);
    return a.kode.localeCompare(b.kode);
  });
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

        const daftarAnak = ((pesertas ?? []) as Peserta[]);
        if (daftarAnak.length === 0) {
          setAnaks([]);
          return;
        }

        const hariIni = todayJakartaISO();
        const sesiPerAnak = await Promise.all(
          daftarAnak.map(async (child) => ({ child, sesi: await listSesiAssigned(child.id) })),
        );
        const semuaSesiPesertaId = sesiPerAnak.flatMap(({ sesi }) =>
          sesi.map((s) => s.sesi_peserta_id),
        );

        let absensiSemua: AbsensiAnak[] = [];
        let catatanSemua: Array<{ sesi_peserta_id: string; catatan_text: string | null }> = [];
        let pembayaranSemua: Pembayaran[] = [];
        if (semuaSesiPesertaId.length > 0) {
          const [absRes, catRes, bayarRes] = await Promise.all([
            supabase
              .from('absensi')
              .select('sesi_peserta_id, status_kehadiran, menit_telat')
              .in('sesi_peserta_id', semuaSesiPesertaId),
            supabase
              .from('catatan_ketik')
              .select('sesi_peserta_id, catatan_text')
              .in('sesi_peserta_id', semuaSesiPesertaId),
            supabase
              .from('pembayaran')
              .select('*')
              .in('peserta_id', daftarAnak.map((child) => child.id))
              .order('created_at', { ascending: false }),
          ]);
          if (absRes.error) throw new Error(absRes.error.message);
          if (catRes.error) throw new Error(catRes.error.message);
          if (bayarRes.error) throw new Error(bayarRes.error.message);
          absensiSemua = (absRes.data ?? []) as AbsensiAnak[];
          catatanSemua = (catRes.data ?? []) as Array<{ sesi_peserta_id: string; catatan_text: string | null }>;
          pembayaranSemua = (bayarRes.data ?? []) as Pembayaran[];
        }

        const absensiBySesi = new Map(absensiSemua.map((a) => [a.sesi_peserta_id, a]));
        const catatanBySesi = new Map(
          catatanSemua.map((c) => [c.sesi_peserta_id, Boolean(c.catatan_text?.trim())]),
        );
        const pembayaranByPeserta = new Map<string, Pembayaran>();
        for (const bayar of pembayaranSemua) {
          if (!pembayaranByPeserta.has(bayar.peserta_id)) pembayaranByPeserta.set(bayar.peserta_id, bayar);
        }

        const mapped: AnakWithLink[] = sesiPerAnak.map(({ child, sesi }) => {
          const riwayat = urutRiwayat(
            sesi.map((s) => {
              const absensi = absensiBySesi.get(s.sesi_peserta_id);
              return {
                sesiPesertaId: s.sesi_peserta_id,
                kode: s.kode_sesi_friendly,
                judul: s.judul_sesi,
                tanggal: s.tanggal_kelas,
                jamMulai: s.jam_mulai,
                jamAkhir: s.jam_akhir,
                status: tentukanStatusSesi(s, absensi, hariIni),
                menitTelat: absensi?.menit_telat ?? 0,
                adaCatatan: catatanBySesi.get(s.sesi_peserta_id) ?? false,
              };
            }),
          );
          const sesiCatatan = sesi.filter((s) => catatanBySesi.get(s.sesi_peserta_id)).length;

          return {
            linkId: links?.find((l: { child_id: string }) => l.child_id === child.id)?.id ?? '',
            childId: child.id,
            nama_lengkap: child.nama_lengkap,
            nama_panggil: child.nama_panggil,
            kelas_id: child.kelas_id,
            kelas_nama: child.kelas?.nama ?? null,
            riwayat,
            ringkasan: buatRingkasanKehadiran(riwayat, hariIni),
            jumlahCatatan: sesiCatatan,
            pembayaran: pembayaranByPeserta.get(child.id) ?? null,
          };
        });

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

  const isLocked = (anak: AnakWithLink) => anak.pembayaran?.lock_status === 'terkunci';

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-fg">Dashboard Orang Tua</h1>
      <p className="text-body text-fg-muted">Pantau kapan anak hadir, sesi berikutnya, dan catatan yang sudah dikumpulkan.</p>

      <div className="grid gap-6">
        {anaks.map((anak) => {
          const perluPerhatian = anak.ringkasan.alpha + anak.ringkasan.belumTercatat;
          const riwayatSelesai = anak.riwayat
            .filter((sesi) => sesi.status !== 'mendatang' && sesi.status !== 'tanpa-jadwal')
            .reverse();
          const sesiMendatang = anak.riwayat.filter((sesi) => sesi.status === 'mendatang');
          const tanpaJadwal = anak.riwayat.filter((sesi) => sesi.status === 'tanpa-jadwal');
          return (
            <Card key={anak.childId}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-subhead font-bold text-fg">
                    {anak.nama_panggil ?? anak.nama_lengkap}
                  </h2>
                  <p className="text-sm text-fg-muted">Kelas: {anak.kelas_nama ?? '—'}</p>
                </div>
                {perluPerhatian > 0 && (
                  <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-700">
                    {perluPerhatian} sesi perlu perhatian
                  </Badge>
                )}
              </div>

              {isLocked(anak) && (
                <div className="mb-4 rounded-[4px] border border-[destructive]/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  <strong>Akses terkunci.</strong>{' '}
                  {anak.pembayaran?.due_date
                    ? `Lunaskan pembayaran sebelum ${formatJakarta(anak.pembayaran.due_date)}.`
                    : 'Hubungi admin untuk info pembayaran.'}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat value={`${anak.ringkasan.persentase}%`} label="Kehadiran" accent="text-primary-text" />
                <Stat
                  value={`${anak.ringkasan.hadir + anak.ringkasan.telat}/${anak.ringkasan.totalTerjadwal}`}
                  label="Sesi dihadiri"
                  accent="text-accent"
                />
                <Stat value={anak.ringkasan.izin} label="Izin" accent="text-success" />
                <Stat value={perluPerhatian} label="Perlu perhatian" accent="text-destructive" />
              </div>
              <ProgressBar value={anak.ringkasan.persentase} className="mt-3" />
              <p className="mt-1.5 text-xs text-fg-subtle">
                Persentase dihitung dari {anak.ringkasan.totalTerjadwal} sesi yang tanggalnya sudah lewat.
                Tugas catatan yang sudah dikumpulkan: {anak.jumlahCatatan}.
              </p>

              <div className="mt-5 space-y-5">
                <section aria-label={`Riwayat kehadiran ${anak.nama_panggil ?? anak.nama_lengkap}`}>
                  <h3 className="mb-1 text-caption font-semibold text-fg-muted uppercase">Riwayat kehadiran</h3>
                  <p className="mb-2 text-xs text-fg-subtle">Tanggal, jam, dan status setiap sesi yang sudah berlangsung.</p>
                  {riwayatSelesai.length === 0 ? (
                    <p className="text-sm text-fg-subtle">Belum ada sesi yang sudah berlangsung.</p>
                  ) : (
                    <ul className="space-y-2">
                      {riwayatSelesai.map((sesi) => (
                        <li key={sesi.sesiPesertaId} className="rounded-lg border border-border-2 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-fg">
                                <span className="font-mono text-xs text-primary-text">{sesi.kode}</span>{' '}
                                {sesi.judul}
                              </p>
                              <p className="mt-0.5 text-xs text-fg-muted">
                                <time dateTime={sesi.tanggal ?? undefined}>{formatWaktuSesi(sesi)}</time>
                              </p>
                              <p className="mt-0.5 text-xs text-fg-subtle">
                                {sesi.status === 'telat' && sesi.menitTelat > 0
                                  ? `Terlambat ${sesi.menitTelat} menit • `
                                  : ''}
                                {sesi.status === 'belum-tercatat'
                                  ? 'Belum ada data absensi. Hubungi instruktur atau admin bila sesi ini sudah berlangsung.'
                                  : `Catatan: ${sesi.adaCatatan ? 'sudah dikumpulkan' : 'belum dikumpulkan'}`}
                              </p>
                            </div>
                            <Badge className={GAYA_STATUS_KEHADIRAN[sesi.status]}>
                              {LABEL_STATUS_KEHADIRAN[sesi.status]}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-label={`Sesi berikutnya ${anak.nama_panggil ?? anak.nama_lengkap}`}>
                  <h3 className="mb-1 text-caption font-semibold text-fg-muted uppercase">Sesi berikutnya</h3>
                  {sesiMendatang.length === 0 ? (
                    <p className="text-sm text-fg-subtle">Tidak ada sesi mendatang.</p>
                  ) : (
                    <ul className="space-y-1">
                      {sesiMendatang.map((sesi) => (
                        <li key={sesi.sesiPesertaId} className="flex justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-medium text-fg">
                            <span className="font-mono text-xs text-primary-text">{sesi.kode}</span>{' '}
                            {sesi.judul}
                          </span>
                          <span className="shrink-0 text-fg-subtle">
                            <time dateTime={sesi.tanggal ?? undefined}>{formatWaktuSesi(sesi)}</time>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tanpaJadwal.length > 0 && (
                    <p className="mt-1 text-xs text-fg-subtle">
                      {tanpaJadwal.length} sesi lain belum memiliki tanggal.
                    </p>
                  )}
                </section>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}