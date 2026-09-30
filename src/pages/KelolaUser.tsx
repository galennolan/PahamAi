import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput, Badge, ConfirmDialog } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { Plus, Trash2, Pencil, Search } from 'lucide-react';

type UserRole = 'peserta' | 'parent' | 'instruktur' | 'marketing';

const ROLE_LABELS: Record<UserRole, string> = {
  peserta: 'Peserta',
  parent: 'Orang Tua',
  instruktur: 'Instruktur',
  marketing: 'Marketing',
};

const EMPTY_FORM = {
  email: '',
  password: '',
  nama_lengkap: '',
  role: 'peserta' as UserRole,
  no_wa: '',
  no_wa_ortu: '',
  usia: '',
  jalur: 'A',
  kelas_penempatan: 'baru-kenal-hp',
  batch_id: '',
};

interface UserRow {
  id: string;
  email: string;
  role: string;
  nama_lengkap: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
  no_wa?: string;
  no_wa_ortu?: string;
  usia?: number;
  jalur?: string;
  kelas_penempatan?: string;
  batch_id?: string;
  batch_nama?: string;
}

const JALUR_OPTIONS = ['A', 'B1', 'B2', 'B3', 'G'];

const POSISI_LABELS: Record<string, string> = {
  'baru-kenal-hp': 'Baru Kenal HP',
  kantoran: 'Kantoran',
  'digital-savvy': 'Digital Savvy',
};

export default function KelolaUserPage() {
  const { push: toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('semua');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
      if (authErr) throw authErr;

      const [{ data: peserta }, { data: batches }] = await Promise.all([
        supabase.from('peserta').select('*'),
        supabase.from('batch').select('id, kode_batch, nama_batch'),
      ]);

      const pesertaMap = new Map((peserta ?? []).map((p) => [p.user_id, p]));
      const batchMap = new Map((batches ?? []).map((b) => [b.id, b]));

      const merged: UserRow[] = (authUsers.users ?? []).map((u) => {
        const metadata = u.user_metadata ?? {};
        const role = (metadata.role as UserRole) ?? 'peserta';
        const profile = pesertaMap.get(u.id);
        const batch = profile?.batch_id ? batchMap.get(profile.batch_id) : null;

        return {
          id: u.id,
          email: u.email ?? '',
          role,
          nama_lengkap: (metadata.nama_lengkap as string) ?? u.email?.split('@')[0] ?? '',
          status: (u as { banned_until?: string | null }).banned_until ? 'inactive' : (u.email_confirmed_at ? 'active' : 'pending'),
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          no_wa: profile?.no_wa ?? '',
          no_wa_ortu: profile?.no_wa_ortu ?? '',
          usia: profile?.usia ?? undefined,
          jalur: profile?.jalur ?? '',
          kelas_penempatan: profile?.kelas_penempatan ?? '',
          batch_id: profile?.batch_id ?? '',
          batch_nama: batch?.nama_batch ?? batch?.kode_batch ?? '-',
        };
      });

      setUsers(merged);
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.nama_lengkap) {
      toast('Email, password, nama lengkap wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
        user_metadata: { role: form.role, nama_lengkap: form.nama_lengkap },
      });
      if (authErr || !authData.user) throw new Error(authErr?.message ?? 'Gagal buat auth user');
      const userId = authData.user.id;

      if (form.role === 'peserta') {
        const { error } = await supabase.from('peserta').insert({
          user_id: userId,
          nama_lengkap: form.nama_lengkap,
          email: form.email,
          no_wa: form.no_wa || null,
          no_wa_ortu: form.no_wa_ortu || null,
          usia: form.usia ? parseInt(form.usia) : null,
          jalur: form.jalur,
          kelas_penempatan: form.kelas_penempatan,
          batch_id: form.batch_id || null,
        });
        if (error) throw new Error(error.message);
      } else if (form.role === 'instruktur' || form.role === 'marketing') {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: form.role, nama_lengkap: form.nama_lengkap },
        });
      }

      toast('User dibuat', 'success');
      setShowForm(false);
      setForm(EMPTY_FORM);
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
    const { error } = await supabase.auth.admin.deleteUser(deleting.id);
    setSaving(false);
    setDeleting(null);
    if (error) toast(error.message, 'error');
    else {
      toast('User dihapus', 'success');
      await load();
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== 'semua' && u.role !== roleFilter) return false;
    if (search && !`${u.email} ${u.nama_lengkap}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Loading text="Memuat user..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola User</h1>
          <p className="mt-0.5 text-sm text-fg-muted">{users.length} user terdaftar</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah User
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <TextInput placeholder="Cari email / nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <SelectInput value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="semua">Semua Role</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </SelectInput>
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-fg">{editing ? 'Edit User' : 'User Baru'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </Field>
              <Field label="Password">
                <TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nama Lengkap">
                <TextInput value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} required />
              </Field>
              <Field label="Role">
                <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            {form.role === 'peserta' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="No. WhatsApp">
                    <TextInput value={form.no_wa} onChange={(e) => setForm({ ...form, no_wa: e.target.value })} />
                  </Field>
                  <Field label="No. WA Orang Tua">
                    <TextInput value={form.no_wa_ortu} onChange={(e) => setForm({ ...form, no_wa_ortu: e.target.value })} />
                  </Field>
                  <Field label="Usia">
                    <TextInput type="number" min={6} value={form.usia} onChange={(e) => setForm({ ...form, usia: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Jalur">
                    <SelectInput value={form.jalur} onChange={(e) => setForm({ ...form, jalur: e.target.value })}>
                      {JALUR_OPTIONS.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Penempatan">
                    <SelectInput value={form.kelas_penempatan} onChange={(e) => setForm({ ...form, kelas_penempatan: e.target.value })}>
                      {Object.entries(POSISI_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Batch">
                    <SelectInput value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                      <option value="">— Belum —</option>
                    </SelectInput>
                  </Field>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowForm(false); setEditing(null); }}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="Tidak ada user" desc="Coba ubah filter atau tambah user baru." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-2">
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Nama</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Email</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Role</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Status</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Jalur</th>
                  <th className="px-3 py-2 text-left font-mono text-overline uppercase text-fg-muted">Batch</th>
                  <th className="px-3 py-2 text-right font-mono text-overline uppercase text-fg-muted">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-3 py-2 text-fg">{u.nama_lengkap}</td>
                    <td className="px-3 py-2 text-xs text-fg-muted">{u.email}</td>
                    <td className="px-3 py-2">
                      <Badge className="font-mono">{ROLE_LABELS[u.role as UserRole] ?? u.role}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={u.status === 'active' ? 'border-success/30 bg-success/10 text-success' : u.status === 'inactive' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border-2 bg-surface text-fg-muted'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-primary-text">{u.jalur || '-'}</td>
                    <td className="px-3 py-2 text-xs text-fg-muted">{u.batch_nama || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(u); setForm({ ...EMPTY_FORM, email: u.email, nama_lengkap: u.nama_lengkap, role: u.role as UserRole, jalur: u.jalur ?? 'A', kelas_penempatan: u.kelas_penempatan ?? 'baru-kenal-hp' }); setShowForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleting(u)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {deleting && (
        <ConfirmDialog
          title="Hapus User?"
          message={`User "${deleting.nama_lengkap}" (${deleting.email}) akan dihapus permanen.`}
          confirmLabel="Hapus"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={saving}
        />
      )}
    </div>
  );
}
