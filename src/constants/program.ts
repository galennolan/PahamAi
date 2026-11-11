/**
 * Daftar Program Kurikulum Paham AI (Standar Pendidikan Tinggi / Perkuliahan)
 * Menggantikan sistem program lama (Anak/Pemula/Menengah/Expert).
 */

export type ProgramKode = 'MOD-AI-01' | 'MOD-AI-02' | 'MOD-AI-03' | string;

export interface ProgramDef {
  kode: string;
  /** Nama singkat untuk badge/kartu. */
  label: string;
  /** Nama lengkap untuk judul dan dropdown. */
  nama: string;
  /** Target pembelajaran. */
  targetUsia: string;
  /** Ringkasan durasi per pertemuan. */
  ringkas: string;
  /** Keterangan kurikulum. */
  deskripsi: string;
  /** Biaya / SKS. */
  harga: string;
  urutan: number;
  /** Kode-kode modul yang jadi program ini. */
  prefiksModul: string[];
}

export const PROGRAM: ProgramDef[] = [
  {
    kode: 'MOD-AI-01',
    label: 'Dasar AI',
    nama: 'Dasar AI & Prompting',
    targetUsia: 'Mahasiswa / Profesional',
    ringkas: '14 Pertemuan · 100 Menit (2 SKS)',
    deskripsi: 'Dasar Kecerdasan Buatan & Prompt Engineering Komprehensif (Pertemuan 1 - 14)',
    harga: 'Rp 650.000',
    urutan: 1,
    prefiksModul: ['AI01', 'MOD-AI-01'],
  },
  {
    kode: 'MOD-AI-02',
    label: 'Machine Learning',
    nama: 'Machine Learning & Deep Learning',
    targetUsia: 'Mahasiswa / Profesional',
    ringkas: '14 Pertemuan · 100 Menit (2 SKS)',
    deskripsi: 'Machine Learning & Deep Learning Terapan (Pertemuan 1 - 14)',
    harga: 'Rp 950.000',
    urutan: 2,
    prefiksModul: ['AI02', 'MOD-AI-02'],
  },
  {
    kode: 'MOD-AI-03',
    label: 'AI Engineering',
    nama: 'AI Engineering, RAG & Agents',
    targetUsia: 'Mahasiswa / Profesional',
    ringkas: '14 Pertemuan · 100 Menit (2 SKS)',
    deskripsi: 'AI Engineering, RAG & Autonomous Agents Tingkat Lanjut (Pertemuan 1 - 14)',
    harga: 'Rp 1.450.000',
    urutan: 3,
    prefiksModul: ['AI03', 'MOD-AI-03'],
  },
];

export const PROGRAM_LABELS: Record<string, string> = Object.fromEntries(
  PROGRAM.map((p) => [p.kode, `${p.kode} — ${p.nama}`]),
);

export function programLabel(kode: string | null | undefined): string {
  if (!kode) return '—';
  if (PROGRAM_LABELS[kode]) return PROGRAM_LABELS[kode];
  const found = PROGRAM.find((p) => p.kode === kode || p.prefiksModul.includes(kode));
  if (found) return `${found.kode} — ${found.nama}`;
  return kode;
}

/** Judul program dari prefiks kode modul: `AI01-P01` -> `MOD-AI-01`. */
export function programDariKodeModul(kodeModul: string): string | null {
  const kode = kodeModul.trim().toUpperCase();
  if (!kode) return null;

  if (kode.includes('AI01') || kode.includes('MOD-AI-01')) return 'MOD-AI-01';
  if (kode.includes('AI02') || kode.includes('MOD-AI-02')) return 'MOD-AI-02';
  if (kode.includes('AI03') || kode.includes('MOD-AI-03')) return 'MOD-AI-03';

  // Fallback prefix matching
  const sorted = [...PROGRAM].sort((a, b) => b.kode.length - a.kode.length);
  return sorted.find((p) => p.prefiksModul.some((pref) => kode.startsWith(pref)))?.kode ?? null;
}

/** Daftar kode program yang dipesan peserta, urut. */
export function programTerpilih(kodeModul: string[]): ProgramDef[] {
  const set = new Set(kodeModul.map(programDariKodeModul).filter(Boolean));
  return PROGRAM.filter((p) => set.has(p.kode));
}

export function kodePaketUji(program: string, sesiTarget: string): string {
  return `KUIS-${program}${sesiTarget ? `-${sesiTarget}` : ''}`;
}

export function programDariKodePaket(kodePaket: string): string | null {
  const k = kodePaket.trim().toUpperCase();
  if (k.includes('AI01') || k.includes('MOD-AI-01')) return 'MOD-AI-01';
  if (k.includes('AI02') || k.includes('MOD-AI-02')) return 'MOD-AI-02';
  if (k.includes('AI03') || k.includes('MOD-AI-03')) return 'MOD-AI-03';
  return null;
}

export function paketUntukSesi(kodePaket: string, kodeModul: string): boolean {
  return kodePaket.trim().toUpperCase().endsWith(kodeModul.trim().toUpperCase());
}

export function tipeDariKodePaket(kodePaket: string): 'pre_test' | 'post_test' | 'kuis' | null {
  if (/^PRE/i.test(kodePaket)) return 'pre_test';
  if (/^POST/i.test(kodePaket)) return 'post_test';
  if (/^KUIS/i.test(kodePaket)) return 'kuis';
  return 'kuis';
}
