import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, ConfirmDialog } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import type { Peserta, Kelas } from '../types';

const POSISI_LABELS: Record<string, string> = {
  'baru-kenal-hp': 'Baru Kenal HP',
  kantoran: 'Kantoran',
  'digital-savvy': 'Digital Savvy',
};

const EMPTY_FORM = {
  nama_lengkap: '',
  nama_panggil: '',
  email: '',
  password: '',
  no_wa: '',
  no_wa_ortu: '',
  email_ortu: '',
  usia: '',
  kelas_penempatan: 'baru-kenal-hp',
  kelas_id: '',
};

export default function KelolaPesertaPage() {
  const { push: toast } = useToast();
  const { role } = useAuth();
  //_policy `peserta_write_admin` hanya mengizinkan admin. Perubahan & hapus
  // peserta oleh instruktur ditolak RLS tanpa error, jadi harus dicegah di UI.
  const isAdmin = role === 'admin';
  const [pesertas, setPesertas] = useState<Peserta[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<Peserta | null>(null);
  const [deleting, setDeleting] = useState<Peserta | null>(null);
  const [bayarMap, setBayarMap] = useState<Record<string, string>>({});
  const [resettingPw, setResettingPw] = useState<{ peserta: Peserta; show: boolean } | null>(null);
  const [newPw, setNewPw] = useState('');

const load = async () => {
    const errors: string[] = [];

    const [{ data: k, error: ke }, { data: p, error: pe }] = await Promise.all([
      supabase.from('kelas').select('*').order('tanggal_mulai', { ascending: false }),
      supabase.from('peserta').select('*').order('created_at', { ascending: false }),
    ]);
    if (ke) errors.push(`Kelas: ${ke.message}`);
    else setKelasList((k as Kelas[]) ?? []);
    if (pe) errors.push(`Peserta: ${pe.message}`);
    else {
      const list = (p as Peserta[]) ?? [];
      setPesertas(list);
      const ids = list.map((x) => x.id);
      if (ids.length > 0) {
        const { data: bayar, error: be2 } = await supabase
          .from('pembayaran')
          .select('peserta_id, status_bayar')
          .in('peserta_id', ids);
        if (be2) errors.push(`Pembayaran: ${be2.message}`);
        else if (bayar) {
          const map: Record<string, string> = {};
          (bayar as Array<{ peserta_id: string; status_bayar: string }>).forEach((r) => {
            map[r.peserta_id] = r.status_bayar;
          });
          setBayarMap(map);
        }
      }
    }
    if (errors.length > 0) toast(errors.join(' | '), 'error');
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (p: Peserta) => {
    setEditing(p);
    setForm({
      nama_lengkap: p.nama_lengkap,
      nama_panggil: p.nama_panggil ?? '',
      email: p.email ?? '',
      password: '',
      no_wa: p.no_wa ?? '',
      no_wa_ortu: p.no_wa_ortu ?? '',
      email_ortu: p.email_ortu ?? '',
      usia: p.usia?.toString() ?? '',
      kelas_penempatan: p.kelas_penempatan ?? 'baru-kenal-hp',
      kelas_id: p.kelas_id ?? '',
    });
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_lengkap.trim()) {
      toast('Nama lengkap wajib diisi', 'error');
      return;
    }
    if (!editing && (!form.email.trim() || !form.password.trim())) {
      toast('Email dan password wajib diisi untuk peserta baru', 'error');
      return;
    }
    if (editing ? form.password && form.password.length < 8 : form.password.length < 8) {
      toast('Password minimal 8 karakter', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase.from('peserta').update({
          nama_lengkap: form.nama_lengkap.trim(),
          nama_panggil: form.nama_panggil.trim() || null,
          email: form.email.trim() || null,
          no_wa: form.no_wa.trim() || null,
          no_wa_ortu: form.no_wa_ortu.trim() || null,
          email_ortu: form.email_ortu.trim() || null,
          usia: form.usia ? parseInt(form.usia) : null,
          kelas_penempatan: form.kelas_penempatan,
          kelas_id: form.kelas_id || null,
        }).eq('id', editing.id).select('id');
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) throw new Error('Data peserta tidak berubah. Hanya Admin yang bisa mengubah data peserta.');

        const pwChanged = form.password.length > 0;
        if (pwChanged) {
          if (!editing.user_id) throw new Error('Peserta ini tidak terhubung ke akun auth, tidak bisa ganti password');
          const { error: pwErr } = await supabase.rpc('admin_reset_password', {
            p_user_id: editing.user_id,
            p_new_password: form.password,
          });
          if (pwErr) throw new Error(`Data tersimpan, tapi gagal ganti password: ${pwErr.message}`);
        }
        toast(pwChanged ? 'Peserta & password diperbarui' : 'Peserta diperbarui', 'success');
      } else {
        const { error: rpcErr } = await supabase.rpc('admin_create_peserta', {
          p_email: form.email.trim(),
          p_password: form.password,
          p_nama: form.nama_lengkap.trim(),
          p_no_wa: form.no_wa.trim() || null,
          p_no_wa_ortu: form.no_wa_ortu.trim() || null,
          p_email_ortu: form.email_ortu.trim() || null,
          p_usia: form.usia ? parseInt(form.usia) : null,
          p_kelas_id: form.kelas_id || null,
          p_kelas_penempatan: form.kelas_penempatan,
        });
        if (rpcErr) throw new Error(rpcErr.message);
        toast('Peserta & akun login dibuat', 'success');
      }
      resetForm();
      await load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('delete_peserta_with_auth', { p_peserta_id: deleting.id });
      if (error) throw new Error(error.message);
      toast(`Peserta ${deleting.nama_lengkap} & akun login dihapus`, 'success');
      setDeleting(null);
      await load();
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const setKelasPeserta = async (id: string, kelasId: string) => {
    const { data, error } = await supabase
      .from('peserta')
      .update({ kelas_id: kelasId || null })
      .eq('id', id)
      .select('id');
    if (error) toast(error.message, 'error');
    else if (!data || data.length === 0) {
      toast('Kelas peserta tidak berubah. Hanya Admin yang bisa memindahkan peserta kelas.', 'error');
    } else {
      toast('Kelas peserta diperbarui', 'success');
      await load();
    }
  };

  const toggleBayar = async (p: Peserta) => {
    const cur = bayarMap[p.id] ?? 'belum_bayar';
    const next = cur === 'lunas' ? 'belum_bayar' : 'lunas';
    const { data: exist } = await supabase
      .from('pembayaran')
      .select('id')
      .eq('peserta_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    let err: { message: string } | null = null;
    if (exist) {
      const res = await supabase.from('pembayaran').update({ status_bayar: next }).eq('id', (exist as { id: string }).id);
      err = res.error;
    } else {
      const res = await supabase.from('pembayaran').insert({
        peserta_id: p.id,
        status_bayar: next,
        biaya_total: 0,
        dibayar: 0,
        jumlah: 0,
        refund_status: 'tidak_ajukan',
      });
      err = res.error;
    }
    if (err) toast(err.message, 'error');
    else {
      toast(next === 'lunas' ? 'Ditandai sudah bayar' : 'Ditandai belum bayar', 'success');
      await load();
    }
  };

  const handleResetPassword = async () => {
    if (!resettingPw || !resettingPw.peserta.user_id) return;
    if (newPw.length < 8) {
      toast('Password minimal 8 karakter', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_reset_password', {
        p_user_id: resettingPw.peserta.user_id,
        p_new_password: newPw,
      });
      if (error) throw new Error(error.message);
      toast(`Password untuk ${resettingPw.peserta.nama_lengkap} berhasil direset`, 'success');
      setResettingPw(null);
      setNewPw('');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading text="Memuat data..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Peserta</h1>
          <p className="mt-0.5 text-sm text-fg-muted">{pesertas.length} peserta terdaftar</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>+ Tambah Peserta</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-fg">
            {editing ? `Edit ${editing.nama_lengkap}` : 'Peserta Baru'}
          </h2>
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
              <Field label="Email" hint={editing ? 'Email login (tidak mengubah akun auth).' : 'Untuk login akun peserta.'}>
                <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={!editing} />
              </Field>
              <Field
                label="Password"
                hint={editing
                  ? 'Password lama tidak bisa dibaca (tersimpan sebagai hash). Isi untuk mengganti.'
                  : 'Minimal 8 karakter. Dibuat admin.'}
              >
                <TextInput
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                  minLength={editing ? 0 : 8}
                  placeholder={editing ? 'Kosongkan jika tidak diubah' : ''}
                />
              </Field>
              <Field label="No. WhatsApp">
                <TextInput placeholder="0812xxxxxxx" value={form.no_wa} onChange={(e) => setForm({ ...form, no_wa: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="No. WA Orang Tua" hint="Khusus anak / peserta usia sekolah.">
                <TextInput placeholder="0812xxxxxxx" value={form.no_wa_ortu} onChange={(e) => setForm({ ...form, no_wa_ortu: e.target.value })} />
              </Field>
              <Field label="Email Orang Tua" hint="Untuk notifikasi ke ortu.">
                <TextInput type="email" placeholder="ortu@email.com" value={form.email_ortu} onChange={(e) => setForm({ ...form, email_ortu: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Usia">
                <TextInput type="number" min={6} value={form.usia} onChange={(e) => setForm({ ...form, usia: e.target.value })} />
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
              <Field label="Kelas">
                <SelectInput value={form.kelas_id} onChange={(e) => setForm({ ...form, kelas_id: e.target.value })}>
                  <option value="" className="bg-surface">— Belum —</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id} className="bg-surface">{k.kode} — {k.nama}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Batal</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-subhead font-semibold text-fg">Daftar Peserta ({pesertas.length})</h2>
        {pesertas.length === 0 ? (
          <EmptyState title="Belum ada peserta" desc="Tambahkan peserta manual dengan tombol di atas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-2">
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Nama</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Penempatan</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Kontak</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Bayar</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Kelas</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pesertas.map((p) => {
                  const status = bayarMap[p.id] ?? 'belum_bayar';
                  const lunas = status === 'lunas';
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                      <td className="px-3 py-2 text-fg">
                        <div className="flex flex-col">
                          <span>{p.nama_lengkap}</span>
                          <span className="text-[10px] text-fg-subtle">
                            {p.nama_panggil && `"${p.nama_panggil}" · `}
                            WA Ort: {p.no_wa_ortu ?? '—'}
                            {p.email_ortu && ` · Email: ${p.email_ortu}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-primary-text">{p.kelas_penempatan ?? '-'}</td>
                      <td className="px-3 py-2 text-xs text-fg-muted">
                        <div className="flex flex-col">
                          <span>Email: {p.email ?? '-'}</span>
                          <span>WA: {p.no_wa ?? '-'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleBayar(p)}
                          title="Klik untuk ubah status"
                          className={`rounded-[4px] border px-2 py-1 font-mono text-[11px] transition ${
                            lunas
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {lunas ? 'lunas' : 'belum'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {isAdmin ? (
                          <select
                            value={p.kelas_id ?? ''}
                            onChange={(e) => setKelasPeserta(p.id, e.target.value)}
                            className="rounded-[4px] border border-border-2 bg-bg px-2 py-1 text-xs text-fg outline-none focus:border-primary"
                          >
                            <option value="" className="bg-surface">— Belum —</option>
                            {kelasList.map((k) => (
                              <option key={k.id} value={k.id} className="bg-surface">{k.kode} — {k.nama}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-mono text-xs text-fg-subtle">
                            {p.kelas_id ? kelasList.find((k) => k.id === p.kelas_id)?.nama ?? p.kelas_id : '— Belum —'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setResettingPw({ peserta: p, show: true }); setNewPw(''); }}>Reset Pw</Button>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}>Hapus</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deleting && (
        <ConfirmDialog
          title="Hapus Peserta?"
          message={`Hapus ${deleting.nama_lengkap}? Data absensi & catatan terkait ikut terpengaruh.`}
          confirmLabel="Hapus"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={saving}
        />
      )}

      {resettingPw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md space-y-4">
            <h3 className="text-subhead font-semibold text-fg">Reset Password — {resettingPw.peserta.nama_lengkap}</h3>
            <Field label="Password Baru" hint="Minimal 8 karakter.">
              <TextInput
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </Field>
            <div className="flex gap-2">
              <Button onClick={handleResetPassword} disabled={saving} className="flex-1">
                {saving ? 'Menyimpan...' : 'Reset Password'}
              </Button>
              <Button variant="secondary" onClick={() => { setResettingPw(null); setNewPw(''); }} className="flex-1">
                Batal
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
