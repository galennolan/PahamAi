/**
 * Daftar program Paham AI.
 *
 * Sebelumnya ini hidup di dua tempat sekaligus: tabel `jalur` (yang tidak
 * pernah ada di database, lihat migration 0011) dan konstanta `JALUR_*` di
 * `types/index.ts`. Sekarang `jalur` dihapus dari database, jadi daftar
 * program ini adalah satu-satunya sumber kebenaran di sisi frontend.
 *
 * Kode program TIDAK disimpan di tabel `modul` lagi. Modul dikelompokkan lewat
 * `modul.kategori`, dan penugasan peserta lewat `sesi_peserta`. Kode program
 * hanya dipakai untuk:
 *   - labelarketing / pendaftaran / pendaftar
 *   - `soal_paket.program` dan `rubrik.program` (diturunkan dari `kode_paket`)
 */

export type ProgramKode = 'A' | 'B1' | 'B2' | 'B3' | 'G';

export interface ProgramDef {
  kode: ProgramKode;
  /** Nama singkat untuk badge/kartu. */
  label: string;
  /** Nama lengkap untuk judul dan dropdown. */
  nama: string;
  /** Target usia, dipakai di halaman orang tua. */
  targetUsia: string;
  /** Ringkasan durasi, dipakai di kartu katalog. */
  ringkas: string;
  /** Keterangan panjang, dipakai di header katalog modul. */
  deskripsi: string;
  /** Harga publik di halaman marketing; tidak selalu sama dengan `pembayaran`. */
  harga: string;
  urutan: number;
  /** Kode-kode modul yang jadi program ini (dipakai filter katalog). */
  prefiksModul: string[];
}

export const PROGRAM: ProgramDef[] = [
  {
    kode: 'A',
    label: 'Anak',
    nama: 'Anak 8–14 th',
    targetUsia: 'Anak (8–14 th)',
    ringkas: '9 sesi · 60 menit',
    deskripsi: 'Anak 8–14 th · 9 sesi · 60 mnt',
    harga: 'Rp 450.000',
    urutan: 1,
    prefiksModul: ['A'],
  },
  {
    kode: 'B1',
    label: 'Pemula',
    nama: 'Pemula',
    targetUsia: 'Pemula',
    ringkas: '7 sesi · 90 menit',
    deskripsi: 'Pemula · 7 sesi · 90 mnt',
    harga: 'Rp 450.000',
    urutan: 2,
    prefiksModul: ['B1'],
  },
  {
    kode: 'B2',
    label: 'Menengah',
    nama: 'Menengah',
    targetUsia: 'Menengah',
    ringkas: '11 sesi · 120 menit',
    deskripsi: 'Menengah · 11 sesi · 120 mnt',
    harga: 'Rp 750.000',
    urutan: 3,
    prefiksModul: ['B2'],
  },
  {
    kode: 'B3',
    label: 'Expert',
    nama: 'Expert',
    targetUsia: 'Expert',
    ringkas: '11 sesi · 150 menit',
    deskripsi: 'Expert · 11 sesi · 120–150 mnt',
    harga: 'Rp 2.250.000',
    urutan: 4,
    prefiksModul: ['B3'],
  },
  {
    kode: 'G',
    label: 'GAFB',
    nama: 'GAFB',
    targetUsia: 'GAFB',
    ringkas: '10 sesi · 90 menit',
    deskripsi: 'Generative AI for Beginners · 10 sesi · 90 mnt',
    harga: 'Rp 450.000',
    urutan: 5,
    prefiksModul: ['G'],
  },
];

export const PROGRAM_LABELS: Record<string, string> = Object.fromEntries(
  PROGRAM.map((p) => [p.kode, `${p.kode} — ${p.label}`]),
);

export function programLabel(kode: string | null | undefined): string {
  if (!kode) return '—';
  return PROGRAM_LABELS[kode] ?? kode;
}

/** Judul program dari prefiks kode modul: `B201` -> `B2`, `A01` -> `A`. */
export function programDariKodeModul(kodeModul: string): ProgramKode | null {
  const kode = kodeModul.trim().toUpperCase();
  if (!kode) return null;
  // Cocokkan prefiks terpanjang dulu supaya `B104` -> `B1`, bukan `B`.
  const sorted = [...PROGRAM].sort((a, b) => b.kode.length - a.kode.length);
  return sorted.find((p) => kode.startsWith(p.kode))?.kode ?? null;
}

/** Daftar kode program yang dipesan peserta, urut. */
export function programTerpilih(kodeModul: string[]): ProgramDef[] {
  const set = new Set(kodeModul.map(programDariKodeModul).filter(Boolean) as ProgramKode[]);
  return PROGRAM.filter((p) => set.has(p.kode));
}

/**
 * Nama paket uji untuk program tertentu.
 *
 * Empat paket generik ini dipertahankan dari skema lama karena `soal_paket`
 * masih memakai `kode_paket` untuk menautkan ke modul. Prefix program
 * ditambahkan di migration 0028 supaya tidak lagi bertabrakan antar program.
 */
export function kodePaketUji(program: string, sesiTarget: string): string {
  return `PRE/POST-TEST-JALUR-${program}${sesiTarget ? `-${sesiTarget}` : ''}`;
}

/**
 * Program dari kode paket uji.
 *
 * Dua bentuk yang ada di database:
 *   - paket lama per sesi: `PRE-B201` / `POST-B201`
 *   - paket generik per program: `PRE/POST-TEST-JALUR-B1`
 */
export function programDariKodePaket(kodePaket: string): ProgramKode | null {
  const k = kodePaket.trim().toUpperCase();
  const generic = /JALUR-([A-Z]+\d?)/.exec(k);
  if (generic) return PROGRAM.find((p) => p.kode === generic[1])?.kode ?? null;

  const sesi = /(?:PRE|POST|KUIS)[/_-]?([A-Z]+\d{2,3})\b/.exec(k);
  if (sesi) return programDariKodeModul(sesi[1]);
  return null;
}

/** Paket uji ini milik satu modul sesi tertentu? */
export function paketUntukSesi(kodePaket: string, kodeModul: string): boolean {
  return kodePaket.trim().toUpperCase().endsWith(kodeModul.trim().toUpperCase());
}

export function tipeDariKodePaket(kodePaket: string): 'pre_test' | 'post_test' | 'kuis' | null {
  if (/^PRE/i.test(kodePaket)) return 'pre_test';
  if (/^POST/i.test(kodePaket)) return 'post_test';
  if (/^KUIS/i.test(kodePaket)) return 'kuis';
  return null;
}
