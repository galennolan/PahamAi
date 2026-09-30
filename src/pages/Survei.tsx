import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, SelectInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import type { Batch } from '../types';

export default function SurveiPage() {
  const { user } = useAuth();
  const { push: toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState({ batch_id: '', nps: '', materi: '', instruktur: '', nilai: '', feedback: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('batch')
          .select('*')
          .order('created_at', { ascending: false });
        setBatches((data as Batch[]) ?? []);
      } catch (e) {
        console.error('[Survei] gagal memuat batch:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user?.id).maybeSingle();
      const payload = {
        batch_id: form.batch_id,
        id_peserta_fk: (profil as { id: string } | null)?.id ?? null,
        kelompok: 'peserta',
        nps: form.nps ? parseInt(form.nps) : null,
        rating_materi: form.materi ? parseInt(form.materi) : null,
        rating_instruktur: form.instruktur ? parseInt(form.instruktur) : null,
        rating_nilai_uang: form.nilai ? parseInt(form.nilai) : null,
        feedback: form.feedback || null,
      };
      const { error } = await supabase.from('survei_respons').insert(payload);
      if (error) throw error;
      toast('Survei terkirim. Terima kasih!', 'success');
      setDone(true);
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
    setSaving(false);
  };

  if (loading) return <Loading text="Memuat survei..." />;
  if (done) return <EmptyState title="Terima kasih!" desc="Masukan Anda membantu meningkatkan kualitas kursus." />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-headline font-bold text-fg">Survei Kepuasan</h1>
        <p className="mt-1 text-sm text-fg-muted">NPS + rating materi, instruktur, dan nilai uang. Bersifat anonim untuk batch.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Batch">
            <SelectInput value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} required>
              <option value="" className="bg-surface">— Pilih batch —</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} className="bg-surface">{b.nama_batch ?? b.jalur}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Seberapa mungkin Anda merekomendasikan kursus ini? (0–10)" hint="NPS">
            <SelectInput value={form.nps} onChange={(e) => setForm({ ...form, nps: e.target.value })} required>
              <option value="" className="bg-surface">— Pilih —</option>
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <option key={n} value={n} className="bg-surface">{n}</option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {([
              ['materi', 'Materi (1–5)'],
              ['instruktur', 'Instruktur (1–5)'],
              ['nilai', 'Nilai Uang (1–5)'],
            ] as const).map(([key, label]) => (
              <Field key={key} label={label}>
                <SelectInput value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required>
                  <option value="" className="bg-surface">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n} className="bg-surface">{n}</option>
                  ))}
                </SelectInput>
              </Field>
            ))}
          </div>
          <Field label="Masukan Terbuka" hint="Saran, kritik, atau pengalaman belajar.">
            <textarea
              value={form.feedback}
              onChange={(e) => setForm({ ...form, feedback: e.target.value })}
              rows={4}
              placeholder="Tulis masukan Anda..."
              className="w-full rounded-[4px] border border-border-2 bg-bg px-3.5 py-2.5 text-sm text-fg placeholder-[fg-subtle] outline-none focus:border-primary"
            />
          </Field>
          <Button type="submit" disabled={saving} className="w-full">{saving ? 'Mengirim...' : 'Kirim Survei'}</Button>
        </form>
      </Card>
    </div>
  );
}