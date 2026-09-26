import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Combobox } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import type { Peserta, Batch, JadwalSesi, SesiPeserta } from '../types';
import { JALUR_LABELS } from '../types';

const POSISI_LABELS: Record<string, string> = {
  'baru-kenal-hp': 'Baru Kenal HP',
  kantoran: 'Kantoran',
  'digital-savvy': 'Digital Savvy',
};

export default function KelolaPesertaPage() {
  const { push: toast } = useToast();
  const [pesertas, setPesertas] = useState<Peserta[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nama_lengkap: '',
    nama_panggil: '',
    email: '',
    no_wa: '',
    no_wa_ortu: '',
    usia: '',
    jalur: 'A',
    kelas_penempatan: 'baru-kenal-hp',
    batch_id: '',
    user_id: '',
  });

  // assign state
  const [assignSesi, setAssignSesi] = useState<string>('');
  const [jadwals, setJadwals] = useState<JadwalSesi[]>([]);
  const [assignPeserta, setAssignPeserta] = useState<string[]>([]);
  const [assignBusy, setAssignBusy] = useState(false);
  const [sesiTerpilih, setSesiTerpilih] = useState<JadwalSesi | null>(null);
  const [terdaftar, setTerdaftar] = useState<SesiPeserta[]>([]);

  const load = async () => {
    const [{ data: p, error: pe }, { data: b, error: be }, { data: j, error: je }] = await Promise.all([
      supabase.from('peserta').select('*').order('created_at', { ascending: false }),
      supabase.from('batch').select('*').order('created_at', { ascending: false }),
      supabase.from('jadwal_sesi').select('*, modul(*)').order('tanggal_kelas', { ascending: true }),
    ]);
    if (!pe) setPesertas((p as Peserta[]) ?? []);
    if (!be) setBatches((b as Batch[]) ?? []);
    if (!je) setJadwals((j as JadwalSesi[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!assignSesi) {
      setSesiTerpilih(null);
      return;
    }
    (async () => {
      const { data: list } = await supabase.from('sesi_peserta').select('*').eq('sesi_id', assignSesi);
      const registered = (list as SesiPeserta[]) ?? [];
      setTerdaftar(registered);
      setAssignPeserta(registered.map((r) => r.peserta_id));
    })();
  }, [assignSesi, jadwals]);

  useEffect(() => {
    if (!assignSesi) return;
    const found = jadwals.find((j) => j.id === assignSesi) ?? null;
    setSesiTerpilih(found);
  }, [assignSesi, jadwals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama_lengkap: form.nama_lengkap,
      nama_panggil: form.nama_panggil || null,
      email: form.email || null,
      no_wa: form.no_wa || null,
      no_wa_ortu: form.no_wa_ortu || null,
      usia: form.usia ? parseInt(form.usia) : null,
      jalur: form.jalur,
      kelas_penempatan: form.kelas_penempatan,
      batch_id: form.batch_id || null,
      user_id: form.user_id || null,
    };
    const { error } = await supabase.from('peserta').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Peserta ditambahkan', 'success');
    setShowForm(false);
    setForm({ nama_lengkap: '', nama_panggil: '', email: '', no_wa: '', no_wa_ortu: '', usia: '', jalur: 'A', kelas_penempatan: 'baru-kenal-hp', batch_id: '', user_id: '' });
    await load();
  };

  const handleAssign = async () => {
    if (!sesiTerpilih) return;
    setAssignBusy(true);
    const existing = new Set(terdaftar.map((t) => t.peserta_id));
    const toAdd = assignPeserta.filter((id) => !existing.has(id));
    const toRemove = terdaftar.filter((t) => !assignPeserta.includes(t.peserta_id)).map((t) => t.id);

    if (toAdd.length > 0) {
      const { error } = await supabase.from('sesi_peserta').insert(toAdd.map((peserta_id) => ({ sesi_id: sesiTerpilih.id, peserta_id })));
      if (error) {
        setAssignBusy(false);
        toast(error.message, 'error');
        return;
      }
    }
    for (const id of toRemove) {
      await supabase.from('sesi_peserta').delete().eq('id', id);
    }

    const count = assignPeserta.length;
    const batchId = sesiTerpilih.batch_id;
    const batch = batches.find((b) => b.id === batchId);
    if (batch) {
      await supabase.from('batch').update({ terdaftar: count }).eq('id', batchId);
    }

    setAssignBusy(false);
    toast(`${count} peserta terdaftar di sesi`, 'success');
    await load();
    const { data: list } = await supabase.from('sesi_peserta').select('*').eq('sesi_id', assignSesi);
    setTerdaftar((list as SesiPeserta[]) ?? []);
  };

  const setBatchPeserta = async (id: string, batchId: string) => {
    const { error } = await supabase.from('peserta').update({ batch_id: batchId || null }).eq('id', id);
    if (error) toast(error.message, 'error');
    else {
      toast('Batch peserta diperbarui', 'success');
      await load();
    }
  };

  if (loading) return <Loading text="Memuat peserta..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-[#F1F5F9]">Kelola Peserta</h1>
          <p className="text-sm text-[#94A3B8]">Daftarkan peserta, assign ke batch, lalu daftarkan ke tiap sesi.</p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}>+ Tambah Peserta</Button>}
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Peserta Baru</h2>
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
                  {(['A', 'B1', 'B2', 'B3']).map((j) => (
                    <option key={j} value={j} className="bg-[#1E293B]">{JALUR_LABELS[j as 'A']}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Penempatan">
                <SelectInput value={form.kelas_penempatan} onChange={(e) => setForm({ ...form, kelas_penempatan: e.target.value })}>
                  {Object.entries(POSISI_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#1E293B]">{v}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Batch">
                <SelectInput value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                  <option value="" className="bg-[#1E293B]">— Belum —</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#1E293B]">{b.nama_batch ?? b.jalur}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="User ID (auth)" hint="UUID akun Supabase, opsional.">
                <TextInput value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} />
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
        <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Daftar Peserta ke Sesi</h2>
        <Field label="Pilih Sesi" hint="Ketik untuk mencari kode, judul, atau batch." className="max-w-lg">
          <Combobox
            value={assignSesi}
            onChange={setAssignSesi}
            placeholder="Cari sesi — mis. B101, Evaluasi..."
            searchPlaceholder="Ketik kode / judul sesi..."
            emptyLabel="Tidak ada sesi yang cocok"
            options={batches.flatMap((b) =>
              jadwals
                .filter((j) => j.batch_id === b.id)
                .map((j) => ({
                  value: j.id,
                  label: j.judul_sesi,
                  sublabel: `${j.tanggal_kelas ? formatJakarta(j.tanggal_kelas) : 'Belum dijadwalkan'}${j.jam_mulai ? ` · ${j.jam_mulai}` : ''}`,
                  badge: j.kode_sesi_friendly,
                  group: `${b.kode_batch}${b.nama_batch ? ` · ${b.nama_batch}` : ''}`,
                }))
            )}
            allowEmpty
            emptyText="Batal / kosongkan pilihan"
          />
        </Field>

        {sesiTerpilih && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-[#94A3B8]">
              Pilih peserta untuk sesi <span className="font-mono text-[#FBBF24]">{sesiTerpilih.kode_sesi_friendly}</span> ({sesiTerpilih.judul_sesi})
            </p>
            {pesertas.filter((p) => !p.batch_id || p.batch_id === sesiTerpilih.batch_id).length === 0 ? (
              <EmptyState title="Tidak ada peserta" desc="Assign peserta ke batch sesi ini dulu." />
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-[4px] border border-[#334155] p-3">
                {pesertas
                  .filter((p) => !p.batch_id || p.batch_id === sesiTerpilih.batch_id)
                  .map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-[4px] p-2 hover:bg-[#1E293B]">
                      <input
                        type="checkbox"
                        checked={assignPeserta.includes(p.id)}
                        onChange={(e) =>
                          setAssignPeserta(e.target.checked
                            ? [...assignPeserta, p.id]
                            : assignPeserta.filter((x) => x !== p.id))
                        }
                        className="h-4 w-4 rounded-[3px] border-[1.5px] border-[#475569] bg-[#0F172A] accent-[#FBBF24]"
                      />
                      <span className="text-sm text-[#F1F5F9]">
                        {p.nama_panggil ?? p.nama_lengkap}
                        <span className="ml-2 font-mono text-xs text-[#64748B]">{p.jalur}</span>
                      </span>
                    </label>
                  ))}
              </div>
            )}
            <div className="mt-3">
              <Button onClick={handleAssign} disabled={assignBusy}>
                {assignBusy ? 'Menyimpan...' : `Simpan (${assignPeserta.length} peserta)`}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Daftar Peserta ({pesertas.length})</h2>
        {pesertas.length === 0 ? (
          <EmptyState title="Belum ada peserta" desc="Tambahkan peserta pertama." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-[#94A3B8]">Nama</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-[#94A3B8]">Jalur</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-[#94A3B8]">Kontak</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-[#94A3B8]">Batch</th>
                </tr>
              </thead>
              <tbody>
                {pesertas.map((p) => (
                  <tr key={p.id} className="border-b border-[#1E293B] last:border-0 hover:bg-[#1E293B]">
                      <td className="px-3 py-2 text-[#F1F5F9]">
                        <div className="flex flex-col">
                          <span>{p.nama_lengkap}</span>
                          <span className="text-[10px] text-[#64748B]">
                            {p.nama_panggil && `"${p.nama_panggil}" · `}
                            Ortu: {p.no_wa_ortu ?? '—'}
                          </span>
                        </div>
                      </td>
                    <td className="px-3 py-2 font-mono text-xs text-[#FBBF24]">{p.jalur ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-[#94A3B8]">{p.no_wa ?? '-'}</td>
                    <td className="px-3 py-2">
                      <select
                        value={p.batch_id ?? ''}
                        onChange={(e) => setBatchPeserta(p.id, e.target.value)}
                        className="rounded-[4px] border border-[#334155] bg-[#0F172A] px-2 py-1 text-xs text-[#F1F5F9] outline-none focus:border-[#FBBF24]"
                      >
                        <option value="" className="bg-[#1E293B]">— Belum —</option>
                        {batches.map((b) => (
<option key={b.id} value={b.id} className="bg-[#1E293B]">{b.nama_batch ?? b.jalur}</option>
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
  );
}