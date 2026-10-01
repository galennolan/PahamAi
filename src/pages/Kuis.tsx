import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, SelectInput, SectionHeader } from '../components/ui';
import { HasilKuisPanel, OpsiSoal, opsiSoal, submitKuis } from '../components/KuisPanel';
import type { HasilKuis } from '../components/KuisPanel';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import type { SoalPaket, SoalButir } from '../types';
import { programDariKodeModul } from '../constants/program';

/** Kode program dari seluruh modul yang ditugaskan ke peserta. */
async function programPeserta(pesertaId: string | null): Promise<Set<string> | null> {
  if (!pesertaId) return null;

  const { data, error } = await supabase
    .from('sesi_peserta')
    .select('sesi:jadwal_sesi(modul(kode))')
    .eq('peserta_id', pesertaId);
  if (error) throw new Error(error.message);

  const set = new Set<string>();
  for (const row of (data ?? []) as unknown as { sesi: { modul: { kode: string } | null } | null }[]) {
    const kode = row.sesi?.modul?.kode;
    if (!kode) continue;
    const p = programDariKodeModul(kode);
    if (p) set.add(p);
  }
  return set.size > 0 ? set : null;
}

export default function KuisPage() {
  const { user } = useAuth();
  const { push: toast } = useToast();
  const [paketList, setPaketList] = useState<SoalPaket[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [soal, setSoal] = useState<SoalButir[]>([]);
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasil, setHasil] = useState<HasilKuis | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data, error }, { data: profil }] = await Promise.all([
          supabase.from('soal_paket').select('*').order('kode_paket', { ascending: true }),
          user
            ? supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (error) throw error;
        const all = (data as SoalPaket[]) ?? [];

        // Program peserta diturunkan dari modul yang ditugaskan lewat
        // `sesi_peserta`; paket tanpa program tetap ditampilkan.
        const programSaya = await programPeserta((profil as { id?: string } | null)?.id ?? null);
        const list = programSaya
          ? all.filter((p) => !p.program || programSaya.has(p.program))
          : all;
        setPaketList(list);
        if (list.length > 0) setSelected(list[0].kode_paket);
      } catch (e: unknown) {
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, toast]);

  useEffect(() => {
    if (!selected) { setSoal([]); setHasil(null); setJawaban({}); return; }
    (async () => {
      setLoading(true);
      try {
        // View aman: tidak memuat kunci jawaban maupun pembahasan
        const { data, error } = await supabase
          .from('soal_butir_view')
          .select('*')
          .eq('kode_paket', selected)
          .order('no_soal', { ascending: true });
        if (error) throw error;
        setSoal((data as SoalButir[]) ?? []);
        setHasil(null);
        setJawaban({});
      } catch (e: unknown) {
        setSoal([]);
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [selected, toast]);

  const semuaTerisi = soal.length > 0
    && soal.every((s) => opsiSoal(s).length === 0 || Boolean(jawaban[s.no_soal]));

  const handleSubmit = async () => {
    if (!user || !selected) return;
    const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
    if (!profil) {
      toast('Profil peserta tidak ditemukan. Hubungi admin.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitKuis(profil.id, selected, soal, jawaban);
      setHasil(result);
      if (result.skor === null) {
        toast('Jawaban tersimpan, menunggu penilaian instruktur', 'success');
      } else {
        toast(`Skor ${result.skor}/100 · KKM ${result.kkm} · ${result.lulus ? 'lulus' : 'belum lulus'}`, result.lulus ? 'success' : 'error');
      }
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSubmitting(false);
  };

  if (loading && paketList.length === 0) return <Loading text="Memuat kuis..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-fg">Kuis & Ujian</h1>
        <p className="text-sm text-fg-muted">Latihan mandiri. Nilai dihitung otomatis dan Attempt kamu tersimpan.</p>
      </div>

      <Card>
        <Field label="Pilih Paket Soal">
          <SelectInput value={selected} onChange={(e) => { setSelected(e.target.value); setHasil(null); }} disabled={submitting}>
            <option value="">— Pilih paket —</option>
            {paketList.map(p => (
              <option key={p.kode_paket} value={p.kode_paket}>
                {p.kode_paket} ({p.tipe} · {p.program ?? 'umum'})       </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      {!selected && <EmptyState title="Pilih paket soal" desc="Pilih kuis atau pre/post-test yang ingin dikerjakan." />}

      {selected && !hasil && (
        <>
          {loading ? (
            <Card><p className="text-sm text-fg-muted">Memuat soal...</p></Card>
          ) : soal.length === 0 ? (
            <EmptyState title="Belum ada soal" desc={`Paket ${selected} belum memiliki butir soal.`} />
          ) : (
            <>
              <Card>
                <p className="font-mono text-sm text-fg-muted">{soal.length} soal · Jawab semua, lalu submit</p>
              </Card>
              {soal.map(s => (
                <Card key={s.id}>
                  <p className="mb-3 font-medium text-fg">
                    <span className="font-mono text-primary-text">{s.no_soal}.</span> {s.pertanyaan}
                  </p>
                  <OpsiSoal soal={s} value={jawaban[s.no_soal]} onPick={(v) => setJawaban({ ...jawaban, [s.no_soal]: v })} />
                </Card>
              ))}
              <Card>
                <Button onClick={handleSubmit} disabled={submitting || !semuaTerisi} className="w-full">
                  {submitting ? 'Memproses...' : 'Submit Jawaban'}
                </Button>
              </Card>
            </>
          )}
        </>
      )}

      {hasil && (
        <Card>
          <SectionHeader title="Hasil Kuis" />
          <HasilKuisPanel result={hasil} soalList={soal} jawaban={jawaban} />
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => { setHasil(null); setJawaban({}); }} className="flex-1">
              Ulangi
            </Button>
            <Button variant="ghost" onClick={() => { setSelected(''); setSoal([]); setHasil(null); }} className="flex-1">
              Pilih Paket Lain
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
