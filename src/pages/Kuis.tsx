import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, SelectInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import type { SoalPaket, SoalButir } from '../types';

type SoalWithPaket = SoalButir & { soal_paket?: SoalPaket };

export default function KuisPage() {
  const { user } = useAuth();
  const { push: toast } = useToast();
  const [paketList, setPaketList] = useState<SoalPaket[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [soal, setSoal] = useState<SoalWithPaket[]>([]);
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasil, setHasil] = useState<{ skor: number; benar: number; total: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('soal_paket').select('*').order('kode_paket');
      setPaketList((data as SoalPaket[]) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selected) { setSoal([]); setHasil(null); setJawaban({}); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('soal_butir_view')
        .select('*')
        .eq('kode_paket', selected)
        .order('no_soal');
      setSoal((data as SoalWithPaket[]) ?? []);
      setJawaban({});
      setHasil(null);
      setLoading(false);
    })();
  }, [selected]);

  const handleSubmit = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    try {
      // Ambil kunci dari tabel penuh (hanya staff yang bisa, tapi untuk demo kita hitung client-side)
      const { data: full } = await supabase.from('soal_butir').select('*').eq('kode_paket', selected);
      const kunciMap = new Map((full as SoalButir[] ?? []).map(s => [s.no_soal, s.kunci]));

      let benar = 0;
      let totalSkor = 0;
      const totalBobot = soal.reduce((a, s) => a + s.bobot_skor, 0);

      for (const s of soal) {
        const jwb = jawaban[s.no_soal];
        const kunci = kunciMap.get(s.no_soal);
        const isBenar = jwb === kunci;
        if (isBenar) benar++;
        const poin = (jwb ? s.bobot_skor : 0);
        totalSkor += poin;
      }

      const skor = totalBobot > 0 ? Math.round((totalSkor / totalBobot) * 100) : 0;
      setHasil({ skor, benar, total: soal.length });

      // Simpan attempt
      const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
      if (profil) {
        const rows = soal.map(s => ({
          id_peserta_fk: profil.id,
          kode_paket: selected,
          no_soal: s.no_soal,
          attempt_no: 1,
          jawaban: jawaban[s.no_soal] ?? null,
          benar: jawaban[s.no_soal] === kunciMap.get(s.no_soal),
          skor: s.bobot_skor,
        }));
        await supabase.from('quiz_attempt').upsert(rows, { onConflict: 'id_peserta_fk,kode_paket,no_soal,attempt_no' });
      }

      toast(`Skor: ${skor}/100`, skor >= 70 ? 'success' : 'error');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSubmitting(false);
  };

  if (loading) return <Loading text="Memuat kuis..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-fg">Kuis & Ujian</h1>

      <Card>
        <Field label="Pilih Paket Soal">
          <SelectInput value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">— Pilih paket —</option>
            {paketList.map(p => (
              <option key={p.kode_paket} value={p.kode_paket}>
                {p.kode_paket} ({p.tipe} · {p.jalur})
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      {!selected && <EmptyState title="Pilih paket soal" desc="Pilih kuis atau pre/post-test yang ingin dikerjakan." />}

      {selected && soal.length > 0 && !hasil && (
        <>
          <Card>
            <p className="font-mono text-sm text-fg-muted">{soal.length} soal · Jawab semua, lalu submit</p>
          </Card>
          {soal.map(s => (
            <Card key={s.id}>
              <p className="mb-3 font-medium text-fg">
                <span className="font-mono text-primary-text">{s.no_soal}.</span> {s.pertanyaan}
              </p>
              <div className="space-y-2">
                {(['A', 'B', 'C', 'D'] as const).map(pil => {
                  const val = s[`pilihan_${pil.toLowerCase()}` as 'pilihan_a'];
                  if (!val) return null;
                  return (
                    <label key={pil} className="flex items-start gap-3 cursor-pointer p-2 rounded-[4px] hover:bg-surface transition">
                      <input
                        type="radio"
                        name={`soal-${s.no_soal}`}
                        value={pil}
                        checked={jawaban[s.no_soal] === pil}
                        onChange={() => setJawaban({ ...jawaban, [s.no_soal]: pil })}
                        className="mt-1 accent-[primary]"
                      />
                      <span className="text-body text-fg"><span className="font-mono text-fg-muted mr-2">{pil}.</span>{val}</span>
                    </label>
                  );
                })}
              </div>
            </Card>
          ))}
          <Card>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? 'Memproses...' : 'Submit Jawaban'}
            </Button>
          </Card>
        </>
      )}

      {hasil && (
        <Card>
          <h2 className="text-subhead font-semibold text-fg mb-4">Hasil Kuis</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-primary-text font-display">{hasil.skor}</p>
              <p className="text-caption text-fg-muted">Skor</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-success font-display">{hasil.benar}</p>
              <p className="text-caption text-fg-muted">Benar</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-fg font-display">{hasil.total}</p>
              <p className="text-caption text-fg-muted">Total</p>
            </div>
          </div>
          <p className="mt-4 text-center text-body text-fg-muted">
            {hasil.skor >= 70 ? 'Selamat, Anda lulus (KKM 70)!' : 'Belum mencapai KKM 70. Coba lagi atau pelajari ulang modul.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => { setHasil(null); setJawaban({}); }} className="flex-1">
              Ulangi
            </Button>
            <Button variant="ghost" onClick={() => setSelected('')} className="flex-1">
              Pilih Paket Lain
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}