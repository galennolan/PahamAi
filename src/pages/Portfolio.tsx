import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import type { PortfolioItem } from '../types';

const TYPE_LABELS: Record<string, string> = {
  image: 'Gambar',
  file: 'File',
  github: 'GitHub',
  google_colab: 'Google Colab',
  tldraw: 'tldraw',
};

export default function PortfolioPage() {
  const { user } = useAuth();
  const { push: toast } = useToast();
  const [rows, setRows] = useState<PortfolioItem[]>([]);
  const [pesertaId, setPesertaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ kode_sesi: '', item_url: '', item_type: 'image', tanggal: todayISO(), deskripsi: '' });

  const load = async (pid: string) => {
    const { data } = await supabase.from('portfolio_item').select('*').eq('id_peserta_fk', pid).order('created_at', { ascending: false });
    setRows((data as PortfolioItem[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
      const pid = (profil as { id: string } | null)?.id ?? null;
      setPesertaId(pid);
      if (pid) await load(pid);
      setLoading(false);
    })();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pesertaId) return;
    setSaving(true);
    const { error } = await supabase.from('portfolio_item').insert({
      id_peserta_fk: pesertaId,
      kode_sesi: form.kode_sesi,
      item_url: form.item_url || null,
      item_type: form.item_type,
      tanggal: form.tanggal || null,
      deskripsi: form.deskripsi || null,
    });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Karya ditambahkan', 'success');
    setShowForm(false);
    setForm({ kode_sesi: '', item_url: '', item_type: 'image', tanggal: todayISO(), deskripsi: '' });
    await load(pesertaId);
  };

  if (loading) return <Loading text="Memuat portfolio..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold text-fg">Portfolio Saya</h1>
          <p className="mt-1 text-sm text-fg-muted">Kumpulkan karya: gambar, file, link GitHub / Colab / tldraw.</p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}>+ Tambah Karya</Button>}
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-fg">Karya Baru</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Kode Sesi" hint="Contoh: A05, B211">
                <TextInput value={form.kode_sesi} onChange={(e) => setForm({ ...form, kode_sesi: e.target.value })} required maxLength={10} />
              </Field>
              <Field label="Tipe Karya">
                <SelectInput value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className="bg-surface">{v}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Link Karya" hint="URL gambar, GitHub, Colab, file, atau tldraw.">
              <TextInput value={form.item_url} onChange={(e) => setForm({ ...form, item_url: e.target.value })} placeholder="https://..." />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tanggal">
                <TextInput type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
              </Field>
              <Field label="Deskripsi">
                <TextInput value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Cerita pendek + gambar AI..." />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Batal</Button>
            </div>
          </form>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Belum ada karya" desc="Tambahkan karya proyek / tugas Anda untuk dinilai instruktur." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((p) => (
            <Card key={p.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-primary-text">{p.kode_sesi}</span>
                <span className="text-xs text-fg-muted">{TYPE_LABELS[p.item_type ?? ''] ?? p.item_type}</span>
              </div>
              {p.deskripsi && <p className="text-sm text-fg">{p.deskripsi}</p>}
              <p className="mt-1 text-xs text-fg-subtle">{p.tanggal ? formatJakarta(p.tanggal) : ''}</p>
              {p.item_url && (
                <a href={p.item_url} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-[4px] border border-border-2 px-3 py-2 text-center text-sm text-accent hover:border-[accent]">
                  Lihat Karya
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function todayISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return parts;
}