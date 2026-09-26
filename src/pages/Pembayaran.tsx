import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Combobox, Loading, EmptyState, Button, Field, TextInput, SelectInput } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import type { Pembayaran, Peserta } from '../types';

const STATUS_LABELS: Record<string, string> = {
  belum_bayar: 'Belum Bayar',
  cicilan: 'Cicilan',
  lunas: 'Lunas',
};

const LOCK_LABELS: Record<string, string> = {
  terbuka: 'Terbuka',
  terkunci: 'Terkunci',
};

interface Row {
  pembayaran: Pembayaran;
  peserta: Peserta | null;
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function PembayaranPage() {
  const { push: toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [allPeserta, setAllPeserta] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ peserta_id: '', biaya_total: '', dibayar: '', due_date: '', status_bayar: 'belum_bayar' });

  const load = async () => {
    const { data, error } = await supabase
      .from('pembayaran')
      .select('*, peserta(*)')
      .order('created_at', { ascending: false });
    if (error) {
      toast(error.message, 'error');
      return;
    }
    const list = (data as (Pembayaran & { peserta: Peserta | null })[]) ?? [];
    setRows(list.map((p) => ({ pembayaran: p, peserta: p.peserta ?? null })));
  };

  const loadPeserta = async () => {
    const { data } = await supabase.from('peserta').select('*').order('nama_lengkap', { ascending: true });
    setAllPeserta((data as Peserta[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([load(), loadPeserta()]);
      setLoading(false);
    })();
  }, []);

  const pesertaOptions = useMemo(
    () =>
      allPeserta.map((p) => ({
        value: p.id,
        label: p.nama_lengkap,
        sublabel: [p.email, p.no_wa].filter(Boolean).join(' · ') || 'Tanpa kontak',
        badge: p.jalur ?? undefined,
      })),
    [allPeserta]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('pembayaran').insert({
      peserta_id: form.peserta_id,
      biaya_total: parseFloat(form.biaya_total) || 0,
      dibayar: parseFloat(form.dibayar) || 0,
      due_date: form.due_date || null,
      status_bayar: form.status_bayar,
    });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Data pembayaran dibuat', 'success');
    setShowForm(false);
    setForm({ peserta_id: '', biaya_total: '', dibayar: '', due_date: '', status_bayar: 'belum_bayar' });
    await load();
  };

  const setStatus = async (row: Row, status: string) => {
    const { error } = await supabase.from('pembayaran').update({ status_bayar: status }).eq('id', row.pembayaran.id);
    if (error) toast(error.message, 'error');
    else {
      toast(`Status → ${STATUS_LABELS[status] ?? status}`, 'success');
      await load();
    }
  };

  const setLock = async (row: Row, lock: string) => {
    const { error } = await supabase.from('pembayaran').update({ lock_status: lock }).eq('id', row.pembayaran.id);
    if (error) toast(error.message, 'error');
    else {
      toast(`Akses ${LOCK_LABELS[lock] ?? lock}`, 'success');
      await load();
    }
  };

  if (loading) return <Loading text="Memuat pembayaran..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-fg">Pembayaran &amp; Akses</h1>
          <p className="text-sm text-fg-muted">Status bayar + kunci akses sesi untuk peserta.</p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}>+ Tagihan</Button>}
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-fg">Tagihan Baru</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Peserta" hint="Pilih dari daftar, bukan ketik UUID.">
                <Combobox
                  value={form.peserta_id}
                  onChange={(v) => setForm({ ...form, peserta_id: v })}
                  placeholder="Ketik nama atau email peserta..."
                  searchPlaceholder="Cari peserta..."
                  emptyLabel="Tidak ada peserta"
                  options={pesertaOptions}
                  allowEmpty={false}
                />
              </Field>
              <Field label="Status Bayar">
                <SelectInput value={form.status_bayar} onChange={(e) => setForm({ ...form, status_bayar: e.target.value })}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className="bg-surface">{v}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Biaya Total">
                <TextInput type="number" min={0} value={form.biaya_total} onChange={(e) => setForm({ ...form, biaya_total: e.target.value })} required />
              </Field>
              <Field label="Sudah Dibayar">
                <TextInput type="number" min={0} value={form.dibayar} onChange={(e) => setForm({ ...form, dibayar: e.target.value })} />
              </Field>
              <Field label="Jatuh Tempo">
                <TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Batal</Button>
            </div>
          </form>
        </Card>
      )}

      {rows.length === 0 && <EmptyState title="Belum ada tagihan" desc="Buat tagihan pertama untuk mulai melacak pembayaran." />}

      <div className="grid gap-4">
        {rows.map((row) => {
          const p = row.pembayaran;
          const belum = p.biaya_total - p.dibayar;
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-fg">
                    {row.peserta?.nama_lengkap ?? p.peserta_id.slice(0, 8)}
                  </p>
                  <p className="mt-1 font-mono text-sm text-primary-text">{rupiah(p.biaya_total)}</p>
                  <p className="text-xs text-fg-muted">
                    Dibayar {rupiah(p.dibayar)}
                    {belum > 0 && <span className="text-destructive"> · sisa {rupiah(belum)}</span>}
                  </p>
                  {p.due_date && <p className="text-xs text-fg-subtle">Jatuh tempo {formatJakarta(p.due_date)}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(STATUS_LABELS).map((s) => (
                      <Button key={s} size="sm" variant={p.status_bayar === s ? 'primary' : 'secondary'} onClick={() => setStatus(row, s)}>
                        {STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(LOCK_LABELS).map(([k, v]) => (
                      <Button key={k} size="sm" variant={p.lock_status === k ? 'destructive' : 'ghost'} onClick={() => setLock(row, k)}>
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}