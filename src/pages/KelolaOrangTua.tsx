import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Card,
  Loading,
  EmptyState,
  Button,
  Field,
  TextInput,
  SelectInput,
  Badge,
  ConfirmDialog,
  SectionHeader,
} from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Peserta } from '../types';

interface ParentUser {
  id: string;
  user_id: string;
  hubungan_anak: string | null;
  no_wa_notifikasi: string | null;
  email_notifikasi: string | null;
  email: string | null;
  anak: Peserta[];
}

const HUBUNGAN_LABELS: Record<string, string> = {
  ayah: 'Ayah',
  ibu: 'Ibu',
  wali: 'Wali',
};

const EMPTY_FORM = {
  email: '',
  password: '',
  nama: '',
  hubungan: 'ibu',
  no_wa: '',
};

export default function KelolaOrangTuaPage() {
  const { push: toast } = useToast();
  const [rows, setRows] = useState<ParentUser[]>([]);
  const [pesertas, setPesertas] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [resetting, setResetting] = useState<{ row: ParentUser; password: string } | null>(null);
  const [linking, setLinking] = useState<{ row: ParentUser; pesertaId: string } | null>(null);
  const [unlinking, setUnlinking] = useState<{ row: ParentUser; peserta: Peserta } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // email & nama diambil dari auth.users lewat RPC; RLS parent_user hanya
      // menyimpan relasi, jadi email resmi ada di sisi auth.
      const { data: ortu, error: ortuErr } = await supabase
        .from('parent_user')
        .select('id, user_id, hubungan_anak, no_wa_notifikasi, email_notifikasi')
        .order('created_at', { ascending: false });
      if (ortuErr) throw ortuErr;

      const [{ data: p }, { data: link }] = await Promise.all([
        supabase.from('peserta').select('*').order('nama_lengkap'),
        supabase.from('parent_child_link').select('parent_id, child_id'),
      ]);
      const pesertaList = (p as Peserta[]) ?? [];
      const links = (link ?? []) as Array<{ parent_id: string; child_id: string }>;
      const byId = new Map(pesertaList.map((x) => [x.id, x]));

      setRows(
        ((ortu ?? []) as Omit<ParentUser, 'anak' | 'email'>[]).map((o) => ({
          ...o,
          email: o.email_notifikasi,
          anak: links
            .filter((l) => l.parent_id === o.id)
            .map((l) => byId.get(l.child_id))
            .filter((x): x is Peserta => Boolean(x)),
        })),
      );
      setPesertas(pesertaList);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password || !form.nama.trim()) {
      toast('Email, nama, dan password wajib diisi', 'error');
      return;
    }
    if (form.password.length < 8) {
      toast('Password minimal 8 karakter', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_ortu', {
        p_email: form.email.trim(),
        p_password: form.password,
        p_nama: form.nama.trim(),
        p_hubungan: form.hubungan,
        p_no_wa: form.no_wa.trim() || null,
      });
      if (error) throw new Error(error.message);
      const info = data as { email?: string } | null;
      toast(`Akun orang tua ${info?.email ?? form.email} dibuat. Password: ${form.password}`, 'success');
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetting) return;
    if (resetting.password.length < 8) {
      toast('Password minimal 8 karakter', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_reset_password', {
        p_user_id: resetting.row.user_id,
        p_new_password: resetting.password,
      });
      if (error) throw new Error(error.message);
      toast(`Password ${resetting.row.email_notifikasi} berhasil direset`, 'success');
      setResetting(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLink = async () => {
    if (!linking) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_link_anak', {
        p_parent_id: linking.row.id,
        p_peserta_id: linking.pesertaId,
      });
      if (error) throw new Error(error.message);
      toast('Anak berhasil ditautkan', 'success');
      setLinking(null);
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!unlinking) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_unlink_anak', {
        p_parent_id: unlinking.row.id,
        p_peserta_id: unlinking.peserta.id,
      });
      if (error) throw new Error(error.message);
      toast('Tautan anak dilepas', 'success');
      setUnlinking(null);
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading text="Memuat data orang tua..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Orang Tua</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Akun orang tua + tautan ke anak. Password diatur di sini, bukan disimpan di tabel peserta.
          </p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}>+ Akun Orang Tua</Button>}
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-fg">Buat Akun Orang Tua</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nama Lengkap">
                <TextInput
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Budi Santoso"
                  required
                />
              </Field>
              <Field label="Hubungan">
                <SelectInput
                  value={form.hubungan}
                  onChange={(e) => setForm({ ...form, hubungan: e.target.value })}
                >
                  <option value="ayah">Ayah</option>
                  <option value="ibu">Ibu</option>
                  <option value="wali">Wali</option>
                </SelectInput>
              </Field>
              <Field label="Email Login" hint="Dipakai untuk masuk ke aplikasi">
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ortu@email.com"
                  required
                />
              </Field>
              <Field label="Password" hint="Minimal 8 karakter. Beri tahu orang tuanya.">
                <TextInput
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="pahamai2026"
                  required
                  minLength={8}
                />
              </Field>
              <Field label="No. WA (notifikasi)">
                <TextInput
                  value={form.no_wa}
                  onChange={(e) => setForm({ ...form, no_wa: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Membuat...' : 'Buat Akun'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <SectionHeader
        title={`Daftar Orang Tua (${rows.length})`}
        desc="Tautkan anak agar orang tua bisa melihat progres di menu Anak."
      />

      {rows.length === 0 ? (
        <EmptyState title="Belum ada akun orang tua" desc="Buat akun lewat tombol di atas." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{r.email_notifikasi ?? '(tanpa email)'}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {r.hubungan_anak ? HUBUNGAN_LABELS[r.hubungan_anak] ?? r.hubungan_anak : 'Orang tua'}
                    {r.no_wa_notifikasi ? ` · ${r.no_wa_notifikasi}` : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">user_id: {r.user_id}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setResetting({ row: r, password: '' })}
                  >
                    Reset Password
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setLinking({ row: r, pesertaId: '' })}
                  >
                    + Tautkan Anak
                  </Button>
                </div>
              </div>

              <div className="mt-3 border-t border-border-2 pt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Anak tertaut ({r.anak.length})
                </p>
                {r.anak.length === 0 ? (
                  <p className="text-xs text-fg-muted">Belum ada anak yang ditautkan.</p>
                ) : (
                  <ul className="space-y-1">
                    {r.anak.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border-2 px-2.5 py-1.5"
                      >
                        <span className="min-w-0 truncate text-xs text-fg">
                          {a.nama_lengkap}
                          <span className="ml-1.5 text-fg-subtle">{a.jalur ?? '-'}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setUnlinking({ row: r, peserta: a })}
                        >
                          Lepas
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {resetting && (
        <Card>
          <h2 className="mb-3 text-subhead font-semibold text-fg">
            Reset Password — {resetting.row.email_notifikasi}
          </h2>
          <Field label="Password Baru" hint="Minimal 8 karakter.">
            <TextInput
              type="text"
              value={resetting.password}
              onChange={(e) => setResetting({ ...resetting, password: e.target.value })}
              placeholder="pahamai2026"
            />
          </Field>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleResetPassword} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Reset Password'}
            </Button>
            <Button variant="secondary" onClick={() => setResetting(null)}>
              Batal
            </Button>
          </div>
        </Card>
      )}

      {linking && (
        <Card>
          <h2 className="mb-3 text-subhead font-semibold text-fg">
            Tautkan Anak — {linking.row.email_notifikasi}
          </h2>
          <Field label="Pilih Peserta">
            <SelectInput
              value={linking.pesertaId}
              onChange={(e) => setLinking({ ...linking, pesertaId: e.target.value })}
            >
              <option value="">— pilih peserta —</option>
              {pesertas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_lengkap} {p.jalur ? `(${p.jalur})` : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleLink} disabled={saving || !linking.pesertaId}>
              {saving ? 'Menyimpan...' : 'Tautkan'}
            </Button>
            <Button variant="secondary" onClick={() => setLinking(null)}>
              Batal
            </Button>
          </div>
        </Card>
      )}

      {unlinking && (
        <ConfirmDialog
          title="Lepas tautan anak?"
          message={`${unlinking.peserta.nama_lengkap} tidak lagi bisa dilihat oleh ${unlinking.row.email_notifikasi}.`}
          confirmLabel="Lepas"
          busy={saving}
          onCancel={() => setUnlinking(null)}
          onConfirm={handleUnlink}
        />
      )}

      <Card className="p-4">
        <p className="text-xs text-fg-muted">
          <Badge className="mr-1 text-[10px]">Info</Badge>
          Password orang tua tidak ada di tabel mana pun — disimpan di Supabase Auth
          (<code className="font-mono">auth.users</code>). Karena itu reset harus lewat tombol di atas,
          bukan mengedit tabel.
        </p>
      </Card>
    </div>
  );
}
