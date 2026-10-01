import { supabase } from '../lib/supabaseClient';
import type { SoalButir } from '../types';

export type RincianButir = {
  no_soal: number;
  benar: boolean | null;
  kunci: string | null;
  pembahasan: string | null;
  perlu_tinjau: boolean;
};

export type HasilKuis = {
  kode_paket: string;
  attempt_no: number;
  skor: number | null;
  kkm: number;
  lulus: boolean | null;
  benar: number;
  salah: number;
  kosong: number;
  perlu_tinjau: number;
  total: number;
  total_dinilai: number;
  rincian: RincianButir[];
};

const OPSI = ['A', 'B', 'C', 'D'] as const;

export function opsiSoal(s: SoalButir) {
  return OPSI
    .map((pil) => ({ pil, val: s[`pilihan_${pil.toLowerCase()}` as 'pilihan_a'] as string | null }))
    .filter((o) => o.val);
}

// Penilaian terjadi di server: kunci jawaban tidak pernah masuk ke browser.
export async function submitKuis(
  pesertaId: string,
  kodePaket: string,
  soalList: SoalButir[],
  jawaban: Record<number, string>,
): Promise<HasilKuis> {
  const { data, error } = await supabase.rpc('nilai_kuis', {
    p_peserta: pesertaId,
    p_kode_paket: kodePaket,
    p_jawaban: soalList.map((s) => ({ no_soal: s.no_soal, jawaban: jawaban[s.no_soal] ?? null })),
  });
  if (error) {
    if (error.code === 'PGRST202' || /nilai_kuis/.test(error.message)) {
      throw new Error('Penilaian kuis belum tersedia di server. Jalankan migration 0022_penilaian_kuis_server_side.sql di Supabase SQL Editor.');
    }
    throw error;
  }
  return data as unknown as HasilKuis;
}

export function OpsiSoal({
  soal,
  value,
  onPick,
}: {
  soal: SoalButir;
  value: string | undefined;
  onPick: (v: string) => void;
}) {
  const opsi = opsiSoal(soal);
  if (opsi.length === 0) {
    return (
      <p className="mt-3 rounded-[4px] border border-warning/40 bg-warning/10 p-2 text-xs text-fg-muted">
        Soal ini belum punya pilihan jawaban. Nilainya menunggu diperbaiki instruktur.
      </p>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {opsi.map(({ pil, val }) => (
        <label key={pil} className="flex items-start gap-3 cursor-pointer p-2 rounded-[4px] hover:bg-surface transition">
          <input
            type="radio"
            name={`soal-${soal.no_soal}`}
            value={pil}
            checked={value === pil}
            onChange={() => onPick(pil)}
            className="mt-1 accent-[primary]"
          />
          <span className="text-body text-fg"><span className="font-mono text-fg-muted mr-2">{pil}.</span>{val}</span>
        </label>
      ))}
    </div>
  );
}

export function HasilKuisPanel({
  result,
  soalList,
  jawaban,
}: {
  result: HasilKuis;
  soalList: SoalButir[];
  jawaban: Record<number, string>;
}) {
  const byNo = new Map(soalList.map((s) => [s.no_soal, s]));
  const teksOpsi = (s: SoalButir | undefined, pil: string) =>
    pil ? `${pil}. ${s?.[`pilihan_${pil.toLowerCase()}` as 'pilihan_a'] ?? ''}` : '';

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-[8px] border border-border-2 p-4 text-center">
        <p className="text-2xl font-bold text-primary-text">
          {result.skor === null ? 'Menunggu penilaian' : `${result.skor}/100`}
        </p>
        <p className="text-sm text-fg-muted">
          {result.skor === null
            ? `${result.total} soal dikirim, ${result.perlu_tinjau} soal perlu dinilai instruktur`
            : `${result.benar} benar · ${result.salah} salah · ${result.kosong} tidak dijawab (dari ${result.total_dinilai} soal dinilai)`}
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          {result.skor === null
            ? `KKM ${result.kkm}`
            : result.lulus
              ? `Lulus · KKM ${result.kkm}`
              : `Belum lulus · KKM ${result.kkm}`}
          {' · '}Percobaan ke-{result.attempt_no}
        </p>
      </div>

      <div className="space-y-2">
        {result.rincian.map((r) => {
          const soal = byNo.get(r.no_soal);
          return (
            <div
              key={r.no_soal}
              className={`rounded-[8px] border p-3 text-sm ${
                r.perlu_tinjau
                  ? 'border-warning/40 bg-warning/5'
                  : r.benar
                    ? 'border-success/40 bg-success/5'
                    : 'border-danger/40 bg-danger/5'
              }`}
            >
              <p className="font-medium text-fg">
                <span className="font-mono text-fg-muted mr-2">{r.no_soal}.</span>
                {soal?.pertanyaan}
              </p>
              <p className="mt-1 text-xs">
                {r.perlu_tinjau ? (
                  <span className="text-warning">Menunggu penilaian instruktur</span>
                ) : r.benar ? (
                  <span className="text-success">Benar</span>
                ) : (
                  <span className="text-danger">
                    Jawabanmu: {teksOpsi(soal, jawaban[r.no_soal]) || 'tidak dijawab'}
                    {' — '}kunci: {teksOpsi(soal, r.kunci ?? '')}
                  </span>
                )}
              </p>
              {r.pembahasan && <p className="mt-1 text-xs text-fg-muted">{r.pembahasan}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
