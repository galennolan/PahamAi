import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta } from '../lib/time';
import type { Pembayaran } from '../types';

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const STATUS_STYLE: Record<string, string> = {
  belum_bayar: 'border-red-500/30 bg-red-500/10 text-red-400',
  cicilan: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  lunas: 'border-green-500/30 bg-green-500/10 text-green-400',
};

const STATUS_LABELS: Record<string, string> = {
  belum_bayar: 'Belum Bayar',
  cicilan: 'Cicilan',
  lunas: 'Lunas',
};

export default function PembayaranSayaPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const { data: profil } = await supabase
          .from('peserta')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!profil) {
          setRows([]);
          return;
        }
        const { data } = await supabase
          .from('pembayaran')
          .select('*')
          .eq('peserta_id', profil.id)
          .order('created_at', { ascending: false });
        setRows((data as Pembayaran[]) ?? []);
      } catch (e) {
        console.error('[PembayaranSaya] gagal memuat pembayaran:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <Loading text="Memuat pembayaran..." />;

  const totalTagihan = rows.reduce((a, r) => a + (r.biaya_total ?? 0), 0);
  const totalBayar = rows.reduce((a, r) => a + (r.dibayar ?? 0), 0);
  const sisa = totalTagihan - totalBayar;
  const terkunci = rows.some((r) => r.lock_status === 'terkunci');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-fg">Pembayaran Saya</h1>
        <p className="mt-1 text-sm text-fg-muted">Status tagihan & cicilan Anda. Pembayaran via transfer / tunai ke admin.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-xl font-bold text-primary-text font-display">{rupiah(totalTagihan)}</p>
          <p className="text-caption text-fg-subtle">Total Tagihan</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-bold text-success font-display">{rupiah(totalBayar)}</p>
          <p className="text-caption text-fg-subtle">Sudah Dibayar</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-bold text-destructive font-display">{rupiah(sisa)}</p>
          <p className="text-caption text-fg-subtle">Sisa</p>
        </Card>
      </div>

      {terkunci && (
        <div className="rounded-[4px] border border-[destructive]/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong>Akses terkunci.</strong> Selesaikan pembayaran sebelum H-1 Sesi 3 agar modul tetap terbuka. Hubungi admin.
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Belum ada tagihan" desc="Tagihan pembayaran akan dibuat admin setelah pendaftaran." />
      ) : (
        <div className="grid gap-4">
          {rows.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-lg font-bold text-fg">{rupiah(p.biaya_total)}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Dibayar {rupiah(p.dibayar)}
                    {p.biaya_total - p.dibayar > 0 && <span className="text-destructive"> · sisa {rupiah(p.biaya_total - p.dibayar)}</span>}
                  </p>
                  {p.due_date && <p className="mt-1 text-xs text-fg-subtle">Jatuh tempo {formatJakarta(p.due_date)}</p>}
                  {p.metode && <p className="text-xs text-fg-subtle">Metode: {p.metode}</p>}
                  {p.bukti_transfer_url && <a href={p.bukti_transfer_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Lihat Bukti</a>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={STATUS_STYLE[p.status_bayar] ?? ''}>{STATUS_LABELS[p.status_bayar] ?? p.status_bayar}</Badge>
                  <span className={`font-mono text-xs ${p.lock_status === 'terkunci' ? 'text-destructive' : 'text-success'}`}>
                    {p.lock_status === 'terkunci' ? 'Terkunci' : 'Terbuka'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}