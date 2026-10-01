/**
 * Parser Input Soal Bulk.
 *
 * Dua format didukung.
 *
 * 1. Blok (disarankan) — satu soal beberapa baris, nomor soal otomatis:
 *
 *    ```
 *    Soal
 *    Pertanyaan: Apa kepanjangan AI?
 *    A. Artificial Intelligence
 *    B. Automated Interaction
 *    C. Analytical Integration
 *    D. Applied Interface
 *    Kunci: A
 *    Pembahasan: Artificial Intelligence berarti kecerdasan buatan.
 *    ```
 *
 * 2. Satu baris (format lama, tetap didukung):
 *
 *    ```
 *    Apa kepanjangan AI? | Artificial Intelligence | Automated Interaction | Analytical Integration | Applied Interface | A | Artificial Intelligence berarti kecerdasan buatan.
 *    ```
 *
 * Format blok jauh lebih mudah ditulis daripada menghitung tanda `|`
 * secara manual: pertanyaan dan pembahasan boleh memuat tanda `|` atau titik
 * dua sesuka hati, pilihan boleh diisi berurutan tanpa mengetik ulang label,
 * dan nomor soal tidak perlu diketik.
 *
 * Setiap baris yang tidak dikenali dikembalikan di `masalah`, bukan dilewati
 * diam-diam. Sebelumnya baris yang gagal dicocokkan diabaikan begitu saja,
 * lalu soal tersimpan lebih sedikit dari yang dikira penulis.
 */

export interface SoalBulk {
  no_soal: number;
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  kunci: string;
  pembahasan: string;
}

export interface MasalahBulk {
  /** Nomor baris di textarea, 1-indexed. */
  baris: number;
  pesan: string;
}

export interface HasilParseBulk {
  soal: SoalBulk[];
  masalah: MasalahBulk[];
}

const HURUF_KUNCI = ['A', 'B', 'C', 'D'] as const;
const OPSI_SEBELUM = 'ABCD';

/** `Pertanyaan:`, `Soal:`, `Q:`, `Tanya:` — memulai isi pertanyaan. */
const RE_PERTANYAAN = /^(?:pertanyaan|soal|q|tanya)\s*[:-]\s*(.+)$/i;
/** `Soal`, `Soal 3`, `#3`, `---` — memulai butir baru. */
const RE_SOAL_BARU = /^(?:soal(?:\s*#?\s*\d+)?|#\d+|---+|===+)\s*$/i;
/** Baris pilihan: `A.`, `A)`, `A:`, `a -`, atau `[A] teks`. */
const RE_PILIHAN = /^(?:\[([A-Ea-e])\]\s*|([A-Ea-e])\s*[.):-]\s*)(.+)$/;
const RE_KUNCI = /^(?:kunci|jawaban|jwbn|ans)\s*[:-]?\s*([A-Ea-e])\b/i;
const RE_PEMBAHASAN = /^(?:pembahasan|alasan|catatan|note)\s*[:-]\s*(.*)$/i;
/** Pemisahan kolom satu-baris: `|`, tab, atau `;`. */
const RE_PEMBATAS = /\s*[|;\t]\s*/;

interface BlokMentah {
  barisMulai: number;
  pertanyaan: string;
  opsi: Partial<Record<string, string>>;
  kunci: string;
  barisKunci: number;
  pembahasan: string;
}

function blokKosong(barisMulai: number): BlokMentah {
  return { barisMulai, pertanyaan: '', opsi: {}, kunci: '', barisKunci: 0, pembahasan: '' };
}

function kunciValid(k: string): boolean {
  return (HURUF_KUNCI as readonly string[]).includes(k.toUpperCase());
}

/**
 * Apakah blok sudah punya isi?
 *
 * Penting karena `Soal` (atau `---`) adalah header kosong. Kalau baris
 * `Pertanyaan:` berikutnya ikut menutup blok itu, blok kosong ikut dihitung
 * sebagai butir gagal dan nomor soal melompat.
 */
function blokAdaIsi(blok: BlokMentah): boolean {
  return Boolean(
    blok.pertanyaan ||
      blok.kunci ||
      blok.pembahasan ||
      Object.keys(blok.opsi).length > 0,
  );
}

/** Ubah satu blok mentah menjadi soal, atau laporkan kenapa tidak bisa. */
function selesaikanBlok(blok: BlokMentah, noTeks: number, noSoal: number, masalah: MasalahBulk[]): SoalBulk | null {
  const label = `Soal ke-${noTeks} (baris ${blok.barisMulai})`;

  if (!blok.pertanyaan) {
    masalah.push({ baris: blok.barisMulai, pesan: `${label}: pertanyaan kosong` });
    return null;
  }
  const kosong = OPSI_SEBELUM.split('').filter((h) => !blok.opsi[h]);
  if (kosong.length > 0) {
    masalah.push({ baris: blok.barisMulai, pesan: `${label}: pilihan ${kosong.join(', ')} belum diisi` });
    return null;
  }
  if (!blok.kunci) {
    masalah.push({ baris: blok.barisKunci || blok.barisMulai, pesan: `${label}: kunci belum diisi` });
    return null;
  }
  const kunci = blok.kunci.toUpperCase();
  if (!kunciValid(kunci)) {
    masalah.push({ baris: blok.barisKunci, pesan: `${label}: kunci "${blok.kunci}" harus A/B/C/D` });
    return null;
  }
  if (!blok.opsi[kunci]) {
    masalah.push({ baris: blok.barisKunci, pesan: `${label}: kunci ${kunci} tapi pilihan ${kunci} kosong` });
    return null;
  }

  return {
    no_soal: noSoal,
    pertanyaan: blok.pertanyaan,
    pilihan_a: blok.opsi.A ?? '',
    pilihan_b: blok.opsi.B ?? '',
    pilihan_c: blok.opsi.C ?? '',
    pilihan_d: blok.opsi.D ?? '',
    kunci,
    pembahasan: blok.pembahasan,
  };
}

/** Parse teks bulk. Nomor soal diurutkan ulang 1..n sesuai urutan di teks. */
export function parseSoalBulk(teks: string): HasilParseBulk {
  const baris = teks.replace(/\r\n?/g, '\n').split('\n');
  const soal: SoalBulk[] = [];
  const masalah: MasalahBulk[] = [];

  let blok: BlokMentah | null = null;
  // `noTeks` = posisi butir di dalam teks, dipakai untuk pesan error supaya
  // penulis tahu butir yang bermasalah yang ke-n. `noSoal` = nomor yang
  // disimpan, hanya naik untuk butir yang benar-benar valid supaya
  // `no_soal` di database selalu 1..n tanpa bolong.
  let noTeks = 0;
  let noSoal = 0;

  const tutupBlok = () => {
    if (!blok) return;
    noTeks += 1;
    const jadi = selesaikanBlok(blok, noTeks, noSoal + 1, masalah);
    if (jadi) {
      noSoal += 1;
      soal.push(jadi);
    }
    blok = null;
  };

  for (let i = 0; i < baris.length; i += 1) {
    const teksBaris = baris[i].trim();
    const noBaris = i + 1;
    if (!teksBaris || teksBaris.startsWith('//')) continue;

    const mKunci = RE_KUNCI.exec(teksBaris);
    const mOpsi = RE_PILIHAN.exec(teksBaris);
    const mTanya = RE_PERTANYAAN.exec(teksBaris);
    const mBahas = RE_PEMBAHASAN.exec(teksBaris);
    const adaLabel = Boolean(mKunci || mOpsi || mTanya || mBahas || RE_SOAL_BARU.test(teksBaris));

    // ── Format satu-baris ───────────────────────────────────────────────
    // Baris tanpa label apa pun yang bisa dipecah jadi >= 6 kolom dianggap
    // satu butir. Pemisahnya `|`, `;`, atau tab.
    const kolomSatuBaris = !adaLabel ? teksBaris.split(RE_PEMBATAS) : [];
    if (kolomSatuBaris.length >= 6) {
      if (blok && blokAdaIsi(blok)) tutupBlok();
      noTeks += 1;
      const kolom = kolomSatuBaris.map((x) => x.trim());
      // `| Pertanyaan | A | ...` → kolom pertama kosong, geser satu.
      const geser = kolom[0] === '' ? 1 : 0;
      const [pertanyaan, a, b, c, d, kunci, ...sisa] = kolom.slice(geser);
      const jumlah = kolom.length - geser;
      const label = `Soal ke-${noTeks} (baris ${noBaris})`;
      if (!pertanyaan || !a || !b || !c || !d || !kunci) {
        masalah.push({
          baris: noBaris,
          pesan: `${label}: butuh 6 kolom (pertanyaan | A | B | C | D | kunci), ditemukan ${jumlah}`,
        });
        continue;
      }
      if (!kunciValid(kunci)) {
        masalah.push({ baris: noBaris, pesan: `${label}: kunci "${kunci}" harus A/B/C/D` });
        continue;
      }
      noSoal += 1;
      soal.push({
        no_soal: noSoal,
        pertanyaan,
        pilihan_a: a,
        pilihan_b: b,
        pilihan_c: c,
        pilihan_d: d,
        kunci: kunci.toUpperCase(),
        pembahasan: sisa.join(' | ').trim(),
      });
      continue;
    }

    // ── Format blok ─────────────────────────────────────────────────────
    // `Soal` atau `Pertanyaan:` memulai butir baru. Blok kosong dari header
    // `Soal` tidak ikut ditutup, jadi `Soal` lalu `Pertanyaan:` di baris
    // berikutnya tetap satu butir, bukan dua. Nomor soal baru naik saat blok
    // ditutup, bukan saat dibuka, supaya tidak ada nomor yang terlewat.
    if (RE_SOAL_BARU.test(teksBaris) || mTanya) {
      if (blok && blokAdaIsi(blok)) tutupBlok();
      if (!blok) blok = blokKosong(noBaris);
      if (mTanya && !blok.pertanyaan) blok.pertanyaan = mTanya[1].trim();
      continue;
    }

    // Teks tanpa label: lanjutkan pertanyaan, atau lanjutkan pembahasan.
    if (!adaLabel) {
      if (!blok) {
        blok = blokKosong(noBaris);
        blok.pertanyaan = teksBaris;
        continue;
      }
      if (!blok.pertanyaan) blok.pertanyaan = teksBaris;
      else blok.pembahasan = (blok.pembahasan ? `${blok.pembahasan} ` : '') + teksBaris;
      continue;
    }

    if (!blok) blok = blokKosong(noBaris);

    if (mOpsi) {
      const huruf = (mOpsi[1] ?? mOpsi[2]).toUpperCase();
      if (huruf === 'E') {
        masalah.push({ baris: noBaris, pesan: `Baris ${noBaris}: kolom pilihan hanya A-D, pilihan E tidak bisa disimpan` });
        continue;
      }
      blok.opsi[huruf] = mOpsi[3].trim();
      continue;
    }
    if (mKunci) {
      blok.kunci = mKunci[1];
      blok.barisKunci = noBaris;
      continue;
    }
    if (mBahas) {
      blok.pembahasan = (blok.pembahasan ? `${blok.pembahasan} ` : '') + mBahas[1].trim();
      continue;
    }

    // Baris `---` yang tidak tertangkap RE_SOAL_BARU tetap diabaikan diam-diam
    // karena murni dekoratif; sisanya benar-benar tidak dipahami.
    if (!/^[-=_]+$/.test(teksBaris)) {
      masalah.push({ baris: noBaris, pesan: `Baris ${noBaris}: tidak dikenali — "${teksBaris.slice(0, 40)}"` });
    }
  }
  tutupBlok();

  return { soal, masalah };
}

/** Template siap pakai untuk ditempel ke textarea. */
export const TEMPLATE_SOAL_BULK = `Soal
Pertanyaan: Apa kepanjangan AI?
A. Artificial Intelligence
B. Automated Interaction
C. Analytical Integration
D. Applied Interface
Kunci: A
Pembahasan: Artificial Intelligence berarti kecerdasan buatan; AI bekerja dari pola data, bukan berpikir seperti manusia.

Soal
Pertanyaan: Manakah yang termasuk contoh AI?
A. Mesin cuci
B. Kipas angin
C. Asisten virtual
D. Sepeda motor
Kunci: C
Pembahasan: Asisten virtual memproses bahasa dan memberi jawaban, jadi masuk kategori AI.

// Nomor soal dibuat otomatis. Baris "//" diabaikan.`;

/** Template versi satu-baris untuk yang lebih suka format lama. */
export const TEMPLATE_SOAL_SATUBARIS = `Apa kepanjangan AI? | Artificial Intelligence | Automated Interaction | Analytical Integration | Applied Interface | A | Artificial Intelligence berarti kecerdasan buatan.
Manakah yang termasuk contoh AI? | Mesin cuci | Kipas angin | Asisten virtual | Sepeda motor | C | Asisten virtual memproses bahasa dan memberi jawaban.`;

/** Soal yang sudah ada → teks bulk format blok, supaya bisa diedit ulang. */
export function soalKeTeks(butir: Array<Partial<Record<keyof SoalBulk, string | null>>>): string {
  return butir
    .map((s, i) => {
      const baris = [`Soal ${i + 1}`];
      if (s.pertanyaan) baris.push(`Pertanyaan: ${s.pertanyaan}`);
      for (const h of OPSI_SEBELUM.split('')) {
        const v = s[`pilihan_${h.toLowerCase() as 'a' | 'b' | 'c' | 'd'}`];
        if (v) baris.push(`${h}. ${v}`);
      }
      if (s.kunci) baris.push(`Kunci: ${s.kunci.toUpperCase()}`);
      if (s.pembahasan) baris.push(`Pembahasan: ${s.pembahasan}`);
      return baris.join('\n');
    })
    .join('\n\n');
}