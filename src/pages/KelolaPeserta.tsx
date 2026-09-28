import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, Tabs, ConfirmDialog } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Pendaftar, Peserta, Batch } from '../types';
import { JALUR_FALLBACK, jalurLabel } from '../types';
import { listJalurInfo } from '../services/modul';

const POSISI_LABELS: Record<string, string> = {
  'baru-kenal-hp': 'Baru Kenal HP',
  kantoran: 'Kantoran',
  'digital-savvy': 'Digital Savvy',
};

const EMPTY_FORM = {
  nama_lengkap: '',
  nama_panggil: '',
  email: '',
  no_wa: '',
  no_wa_ortu: '',
  usia: '',
  jalur: 'A',
  kelas_penempatan: 'baru-kenal-hp',
  batch_id: '',
};

type OrangTab = 'pendaftar' | 'peserta';

export default function KelolaPesertaPage() {
  const { push: toast } = useToast();
  const [activeTab, setActiveTab] = useState<OrangTab>('pendaftar');
  const [pesertas, setPesertas] = useState<Peserta[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pendaftars, setPendaftars] = useState<Pendaftar[]>([]);
  const [jalurOptions, setJalurOptions] = useState<string[]>(['A', 'B1', 'B2', 'B3']);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    const [{ data: pa, error: pae }, { data: b, error: be }, { data: p, error: pe }] = await Promise.all([
      supabase.from('pendaftar').select('*').order('created_at', { ascending: false }),
      supabase.from('batch').select('*').order('created_at', { ascending: false }),
      supabase.from('peserta').select('*').order('created_at', { ascending: false }),
    ]);
    if (!pae) setPendaftars((pa as Pendaftar[]) ?? []);
    if (!be) setBatches((b as Batch[]) ?? []);
    if (!pe) setPesertas((p as Peserta[]) ?? []);
    try {
      const jal = await listJalurInfo(false);
      const aktif = (jal.length > 0 ? jal : JALUR_FALLBACK).filter((j) => j.aktif);
      setJalurOptions(aktif.map((j) => j.kode));
    } catch {
      setJalurOptions(JALUR_FALLBACK.map((j) => j.kode));
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  const handleApprove = async (p: Pendaftar) => {
    setSaving(true);
    try {
      const { data: row, error: insErr } = await supabase.from('peserta').insert({
        user_id: null,
        nama_lengkap: p.nama_lengkap,
        nama_panggil: null,
        email: p.email || null,
        no_wa: p.no_wa || null,
        no_wa_ortu: null,
        usia: p.usia,
        jalur: p.jalur,
        kelas_penempatan: null,
        batch_id: null,
      }).select('id').single();
      if (insErr || !row) throw new Error(insErr?.message ?? 'Gagal membuat peserta');

      const { error: upErr } = await supabase
        .from('pendaftar')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', p.id);
      if (upErr) throw new Error(upErr.message);

      toast('Pendaftar disetujui. Peserta dibuat.', 'success');
      await load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pendaftar')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', rejectId);
      if (error) throw new Error(error.message);
      toast('Pendaftar ditolak', 'success');
      setRejectId(null);
      await load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_lengkap.trim()) {
      toast('Nama lengkap wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      user_id: null,
      nama_lengkap: form.nama_lengkap.trim(),
      nama_panggil: form.nama_panggil.trim() || null,
      email: form.email.trim() || null,
      no_wa: form.no_wa.trim() || null,
      no_wa_ortu: form.no_wa_ortu.trim() || null,
      usia: form.usia ? parseInt(form.usia) : null,
      jalur: form.jalur,
      kelas_penempatan: form.kelas_penempatan,
      batch_id: form.batch_id || null,
    };
    const { error } = await supabase.from('peserta').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Peserta ditambahkan', 'success');
    setShowForm(false);
    setForm(EMPTY_FORM);
    await load();
  };

  const setBatchPeserta = async (id: string, batchId: string) => {
    const { error } = await supabase.from('peserta').update({ batch_id: batchId || null }).eq('id', id);
    if (error) toast(error.message, 'error');
    else {
      toast('Batch peserta diperbarui', 'success');
      await load();
    }
  };

  if (loading) return <Loading text="Memuat data..." />;

  const pendingCount = pendaftars.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Peserta</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {pendingCount > 0 ? `${pendingCount} pendaftar menunggu persetujuan` : 'Tidak ada pendaftar menunggu'} · {pesertas.length} peserta terdaftar
          </p>
        </div>
        {activeTab === 'peserta' && !showForm && (
          <Button onClick={() => setShowForm(true)}>+ Tambah Peserta</Button>
        )}
      </div>

      <Tabs
        label="Pilih tampilan"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { key: 'pendaftar', label: `Pendaftar${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'peserta', label: `Peserta (${pesertas.length})` },
        ]}
      />

      {activeTab === 'pendaftar' && (
        <div className="space-y-4">
          {pendaftars.length === 0 ? (
            <EmptyState title="Belum ada pendaftar" desc="Formulir pendaftaran publik akan mengisi daftar ini." />
          ) : (
            pendaftars.map((p) => (
              <Card key={p.id} className="hover:shadow-subtle">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{p.nama_lengkap}</p>
                    <p className="text-sm text-fg-subtle">{p.email ?? p.no_wa ?? '-'}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge className={
                        p.status === 'pending' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : p.status === 'approved' ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : p.status === 'rejected' ? 'border-red-500/30 bg-red-500/10 text-red-400'
                          : ''
                      }>{p.status}</Badge>
                      <Badge className="font-mono text-primary-text">{p.jalur ?? '-'}</Badge>
                      {p.usia != null && <Badge className="font-mono">{p.usia} th</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(p)} disabled={saving}>
                          Setujui
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setRejectId(p.id)} disabled={saving}>
                          Tolak
                        </Button>
                      </>
                    )}
                    {p.status === 'approved' && (
                      <span className="font-mono text-xs text-green-400">sudah jadi peserta</span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'peserta' && (
        <div className="space-y-4">
          {showForm && (
            <Card>
              <h2 className="mb-4 text-subhead font-semibold text-fg">Peserta Baru</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nama Lengkap">
                    <TextInput value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} required />
                  </Field>
                  <Field label="Nama Panggil">
                    <TextInput value={form.nama_panggil} onChange={(e) => setForm({ ...form, nama_panggil: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Email" hint="Untuk invite akun.">
                    <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </Field>
                  <Field label="No. WhatsApp">
                    <TextInput placeholder="0812xxxxxxx" value={form.no_wa} onChange={(e) => setForm({ ...form, no_wa: e.target.value })} />
                  </Field>
                  <Field label="No. WA Orang Tua" hint="Khusus anak / peserta usia sekolah.">
                    <TextInput placeholder="0812xxxxxxx" value={form.no_wa_ortu} onChange={(e) => setForm({ ...form, no_wa_ortu: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Usia">
                    <TextInput type="number" min={6} value={form.usia} onChange={(e) => setForm({ ...form, usia: e.target.value })} />
                  </Field>
                  <Field label="Jalur">
                    <SelectInput value={form.jalur} onChange={(e) => setForm({ ...form, jalur: e.target.value })}>
                      {jalurOptions.map((j) => (
                        <option key={j} value={j} className="bg-surface">{jalurLabel(undefined, j) ?? j}</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Penempatan">
                    <SelectInput value={form.kelas_penempatan} onChange={(e) => setForm({ ...form, kelas_penempatan: e.target.value })}>
                      {Object.entries(POSISI_LABELS).map(([k, v]) => (
                        <option key={k} value={k} className="bg-surface">{v}</option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Batch">
                    <SelectInput value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                      <option value="" className="bg-surface">— Belum —</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id} className="bg-surface">{b.nama_batch ?? b.jalur}</option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Batal</Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-subhead font-semibold text-fg">Daftar Peserta ({pesertas.length})</h2>
            {pesertas.length === 0 ? (
              <EmptyState title="Belum ada peserta" desc="Setujui pendaftar atau tambahkan peserta manual." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-2">
                      <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Nama</th>
                      <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Jalur</th>
                      <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Kontak</th>
                      <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pesertas.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                        <td className="px-3 py-2 text-fg">
                          <div className="flex flex-col">
                            <span>{p.nama_lengkap}</span>
                            <span className="text-[10px] text-fg-subtle">
                              {p.nama_panggil && `"${p.nama_panggil}" · `}
                              Ortu: {p.no_wa_ortu ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-primary-text">{p.jalur ?? '-'}</td>
                        <td className="px-3 py-2 text-xs text-fg-muted">
                          <div className="flex flex-col">
                            <span>{p.email ?? '-'}</span>
                            <span>WA: {p.no_wa ?? '-'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={p.batch_id ?? ''}
                            onChange={(e) => setBatchPeserta(p.id, e.target.value)}
                            className="rounded-[4px] border border-border-2 bg-bg px-2 py-1 text-xs text-fg outline-none focus:border-primary"
                          >
                            <option value="" className="bg-surface">— Belum —</option>
                            {batches.map((b) => (
                              <option key={b.id} value={b.id} className="bg-surface">{b.nama_batch ?? b.jalur}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {rejectId && (
        <ConfirmDialog
          title="Tolak Pendaftar?"
          message="Tindakan ini tidak bisa dibatalkan."
          onConfirm={handleReject}
          onCancel={() => setRejectId(null)}
          busy={saving}
        />
      )}
    </div>
  );
}

