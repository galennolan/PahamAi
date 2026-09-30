import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Button, Field, TextInput, SelectInput } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { listJalurs } from '../services/modul';
import type { Jalur } from '../types';
import { JALUR_LABELS } from '../types';

const POSISI_LABELS: Record<string, string> = {
  'baru-kenal-hp': 'Baru Kenal HP',
  kantoran: 'Kantoran',
  'digital-savvy': 'Digital Savvy',
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer_code'];

export default function PendaftaranPage() {
  const { push: toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [jalurOptions, setJalurOptions] = useState<Jalur[]>(['A', 'B1', 'B2', 'B3']);
  const [form, setForm] = useState({
    nama_lengkap: '',
    nama_panggil: '',
    email: '',
    no_wa: '',
    usia: '',
    jalur: 'B1',
    kelas_penempatan: 'baru-kenal-hp',
    consent_privasi: false,
    consent_etika: false,
    source: '',
    source_detail: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    referrer_code: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const j = await listJalurs();
        if (j.length > 0) {
          setJalurOptions(j);
          setForm((f) => ({ ...f, jalur: j[0] }));
        }
      } catch (e) {
        console.error('[Pendaftaran] gagal memuat jalur:', e);
      }
    })();
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) utm[k] = v;
    }
    if (Object.keys(utm).length > 0) setForm((f) => ({ ...f, ...utm }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('pendaftar')
        .select('id')
        .eq('email', form.email)
        .maybeSingle();
      if (existing) {
        toast('Email sudah terdaftar. Hubungi admin untuk info lebih lanjut.', 'error');
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('pendaftar').insert(form);
      if (error) throw error;
      toast('Pendaftaran berhasil! Admin akan menghubungi Anda.', 'success');
      navigate('/masuk');
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
    setSaving(false);
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-headline font-bold text-fg">Daftar Kursus Paham AI</h1>
          <p className="mt-2 text-body text-fg-muted">Isi formulir pre-registrasi. Admin akan verifikasi & kirim kredensial.</p>
        </div>
        <div className="surface-card p-6 glow-green">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nama Lengkap">
              <TextInput value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} required />
            </Field>
            <Field label="Nama Panggil">
              <TextInput value={form.nama_panggil} onChange={(e) => setForm({ ...form, nama_panggil: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </Field>
              <Field label="No. WhatsApp">
                <TextInput placeholder="0812xxxxxxx" value={form.no_wa} onChange={(e) => setForm({ ...form, no_wa: e.target.value })} required />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Usia">
                <TextInput type="number" min={6} value={form.usia} onChange={(e) => setForm({ ...form, usia: e.target.value })} required />
              </Field>
              <Field label="Jalur">
                <SelectInput value={form.jalur} onChange={(e) => setForm({ ...form, jalur: e.target.value })}>
                  {jalurOptions.map((j) => (
                    <option key={j} value={j} className="bg-surface">{JALUR_LABELS[j] ?? j}</option>
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent_privasi}
                  onChange={(e) => setForm({ ...form, consent_privasi: e.target.checked })}
                  className="h-4 w-4 rounded-[3px] border-[1.5px] border-border-3 bg-bg accent-[primary]"
                  required
                />
                <span className="text-sm text-fg">Setuju Kebijakan Privasi</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent_etika}
                  onChange={(e) => setForm({ ...form, consent_etika: e.target.checked })}
                  className="h-4 w-4 rounded-[3px] border-[1.5px] border-border-3 bg-bg accent-[primary]"
                  required
                />
                <span className="text-sm text-fg">Setuju Etika AI</span>
              </label>
            </div>
            <Button type="submit" disabled={saving} className="w-full min-h-[52px] text-base font-bold">
              {saving ? 'Mendaftarkan...' : 'Kirim Pendaftaran'}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-fg-subtle">
          Sudah punya akun? <Link to="/masuk" className="text-primary-text underline">Masuk di sini</Link>
        </p>
      </div>
    </main>
  );
}