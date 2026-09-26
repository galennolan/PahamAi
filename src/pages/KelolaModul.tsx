import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Modul, Jalur } from '../types';
import { JALUR_LABELS } from '../types';

export default function KelolaModulPage() {
  const { push: toast } = useToast();
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kode: '',
    judul: '',
    jalur: 'A' as Jalur,
    urutan_sesi: 1,
    durasi_menit: 60,
    content_md: '',
    slide_url: '',
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('modul').select('*').order('jalur', { ascending: true });
      if (!error) setModuls(data as Modul[]);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('modul').insert(form);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Modul berhasil dibuat', 'success');
      setShowForm(false);
      const { data } = await supabase.from('modul').select('*').order('jalur', { ascending: true });
      setModuls(data as Modul[]);
    }
  };

  if (loading) return <Loading text="Memuat modul..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline font-bold text-[#F1F5F9]">Kelola Modul</h1>
        <Button onClick={() => setShowForm(true)}>+ Tambah Modul</Button>
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Buat Modul Baru</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Kode Modul">
                <TextInput placeholder="A01, B101" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} required />
              </Field>
              <Field label="Judul">
                <TextInput placeholder="Membahas AI dasar..." value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Jalur">
                <SelectInput value={form.jalur} onChange={(e) => setForm({ ...form, jalur: e.target.value as Jalur })}>
                  {(['A', 'B1', 'B2', 'B3'] as Jalur[]).map((j) => (
                    <option key={j} value={j} className="bg-[#1E293B]">
                      {JALUR_LABELS[j]}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Urutan">
                <TextInput type="number" min={1} value={form.urutan_sesi} onChange={(e) => setForm({ ...form, urutan_sesi: parseInt(e.target.value) || 1 })} />
              </Field>
              <Field label="Durasi (menit)">
                <TextInput type="number" min={1} value={form.durasi_menit} onChange={(e) => setForm({ ...form, durasi_menit: parseInt(e.target.value) || 60 })} />
              </Field>
            </div>
            <Field label="Link Slide">
              <TextInput placeholder="https://docs.google.com/presentation/..." value={form.slide_url} onChange={(e) => setForm({ ...form, slide_url: e.target.value })} />
            </Field>
            <Field label="Konten Modul (Markdown)">
              <textarea
                value={form.content_md}
                onChange={(e) => setForm({ ...form, content_md: e.target.value })}
                className="h-40 w-full rounded-[4px] border border-[#334155] bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#F1F5F9] font-mono outline-none focus:border-[#F1F5F9] focus:shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                placeholder="# Judul&#10;&#10;Konten modul..."
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Simpan
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && moduls.length === 0 && <EmptyState title="Belum ada modul" desc="Buat modul baru untuk memulai." />}

      {!showForm && moduls.length > 0 && (
        <div className="grid gap-4">
          {moduls.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="font-mono text-sm">
                  <span className="font-bold text-[#F1F5F9]">{m.kode}</span>
                  <span className="text-[#94A3B8]"> — {m.judul}</span>
                  <span className="text-caption text-[#64748B] block">
                    Jalur {m.jalur} · {m.durasi_menit} menit
                  </span>
                </div>
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}