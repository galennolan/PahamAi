import { parseSoalBulk, soalKeTeks, TEMPLATE_SOAL_BULK, TEMPLATE_SOAL_SATUBARIS } from '../src/lib/parse-soal-bulk.ts';

let gagal = 0;
function cek(nama, kondisi, detail) {
  if (kondisi) {
    console.log('  OK   ' + nama);
  } else {
    gagal += 1;
    console.log('  FAIL ' + nama, detail === undefined ? '' : JSON.stringify(detail));
  }
}

console.log('1. Template blok bawaan harus valid');
{
  const r = parseSoalBulk(TEMPLATE_SOAL_BULK);
  cek('2 soal, 0 masalah', r.soal.length === 2 && r.masalah.length === 0, r);
  cek('nomor urut 1..2', r.soal[0].no_soal === 1 && r.soal[1].no_soal === 2, r.soal.map((s) => s.no_soal));
  cek('kunci benar', r.soal[0].kunci === 'A' && r.soal[1].kunci === 'C', r.soal.map((s) => s.kunci));
  cek('opsi terisi', r.soal[1].pilihan_c === 'Asisten virtual', r.soal[1]);
}

console.log('2. Template satu-baris bawaan harus valid');
{
  const r = parseSoalBulk(TEMPLATE_SOAL_SATUBARIS);
  cek('2 soal, 0 masalah', r.soal.length === 2 && r.masalah.length === 0, r);
  cek('pembahasan ikut', r.soal[0].pembahasan.includes('kecerdasan buatan'), r.soal[0].pembahasan);
}

console.log('3. Nomor tidak diketik penulis, dibuat otomatis');
{
  const r = parseSoalBulk('Pertanyaan: X?\nA. 1\nB. 2\nC. 3\nD. 4\nKunci: B');
  cek('1 soal no_soal=1', r.soal.length === 1 && r.soal[0].no_soal === 1, r);
}

console.log('4. Format lama dengan "1. " dan pipe tetap jalan');
{
  const r = parseSoalBulk(
    '1. Apa kepanjangan AI? | Artificial Intelligence | Automated Interaction | Analytical Integration | Applied Interface | A | Adalah kecerdasan buatan.\n' +
    '2. Contoh AI? | Mesin cuci | Kipas | Asisten | Sepeda | C | Asisten virtual.',
  );
  cek('2 soal, 0 masalah', r.soal.length === 2 && r.masalah.length === 0, r);
  cek('kunci', r.soal[1].kunci === 'C', r.soal[1]);
}

console.log('5. Gaya penulisan lain yang harus diterima');
{
  const gayaTulis = [
    ['kurung', 'Soal 3\nTanya: apa itu LLM?\nA) model\nB) server\nC) basis data\nD) kabel\nJawaban: A\nAlasan: Large Language Model.'],
    ['kurung siku', 'Q: apa itu LLM?\n[A] model\n[B] server\n[C] basis data\n[D] kabel\nKunci: A'],
    ['tanpa header Soal', 'Pertanyaan: apa itu LLM?\nA. model\nB. server\nC. basis data\nD. kabel\nKunci B'],
    ['pemisah tab', 'apa itu LLM?\tmodel\tserver\tbasis data\tkabel\tA\tLarge Language Model'],
    ['garis pemisah', 'Soal\nPertanyaan: apa itu LLM?\nA. model\nB. server\nC. basis data\nD. kabel\nKunci: A\n---\nSoal\nPertanyaan: lain?\nA. x\nB. y\nC. z\nD. w\nKunci: D'],
    ['kunci huruf kecil', 'Pertanyaan: q?\nA. 1\nB. 2\nC. 3\nD. 4\nkunci: c'],
    ['pembahasan mengandung pipe', 'Pertanyaan: q?\nA. 1\nB. 2\nC. 3\nD. 4\nKunci: A\nPembahasan: nilai a | b | c'],
  ];
  for (const [nama, teks] of gayaTulis) {
    const r = parseSoalBulk(teks);
    cek(nama + ': minimal 1 soal, 0 masalah', r.soal.length >= 1 && r.masalah.length === 0, r.masalah);
  }
}

console.log('6. Baris rusak dilaporkan, tidak dilewati diam-diam');
{
  const r = parseSoalBulk(
    'Pertanyaan: soal tanpa pilihan\nKunci: A\n\n' +
    'Pertanyaan: kurang satu pilihan\nA. 1\nB. 2\nC. 3\nKunci: A\n\n' +
    'Pertanyaan: kunci ngawur\nA. 1\nB. 2\nC. 3\nD. 4\nKunci: Z\n\n' +
    'Pertanyaan: pilihan E\nA. 1\nB. 2\nC. 3\nD. 4\nE. 5\nKunci: A\n\n' +
    'Pertanyaan: kunci ke pilihan kosong\nA. 1\nB. 2\nC. 3\nD. 4\nKunci: D\n\n' +
    'Pertanyaan: kolom kurang\nA. 1\nB. 2',
  );
  cek('0 soal tersimpan', r.soal.length === 0, r.soal.length);
  cek('6 masalah tercatat', r.masalah.length === 6, r.masalah.map((m) => m.pesan));
  cek('semua masalah punya nomor baris', r.masalah.every((m) => m.baris > 0));
}

console.log('7. Soal sah tetap tersimpan walau ada soal rusak di antaranya');
{
  const r = parseSoalBulk(
    'Pertanyaan: rusak\nA. 1\nKunci: A\n\n' +
    'Pertanyaan: q1\nA. 1\nB. 2\nC. 3\nD. 4\nKunci: A\n\n' +
    'Pertanyaan: q2\nA. 1\nB. 2\nC. 3\nD. 4\nKunci: B',
  );
  cek('2 soal valid', r.soal.length === 2, r.soal.length);
  cek('no_soal dirapatkan 1,2', r.soal[0].no_soal === 1 && r.soal[1].no_soal === 2, r.soal.map((s) => s.no_soal));
  cek('1 masalah', r.masalah.length === 1, r.masalah);
}

console.log('8. Round-trip: soal -> teks -> soal');
{
  const asli = [
    { pertanyaan: 'q1', pilihan_a: 'a1', pilihan_b: 'b1', pilihan_c: 'c1', pilihan_d: 'd1', kunci: 'c', pembahasan: 'pembahasan q1' },
    { pertanyaan: 'q2', pilihan_a: 'a2', pilihan_b: 'b2', pilihan_c: 'c2', pilihan_d: 'd2', kunci: 'a', pembahasan: '' },
  ];
  const teks = soalKeTeks(asli);
  const r = parseSoalBulk(teks);
  cek('2 soal, 0 masalah', r.soal.length === 2 && r.masalah.length === 0, r);
  const diharapkan = asli.map((s, i) => ({ ...s, no_soal: i + 1 }));
  cek('isi identik', JSON.stringify(r.soal) === JSON.stringify(diharapkan), { teks, hasil: r.soal });
}

console.log('9. Kasus batas');
{
  cek('input kosong', JSON.stringify(parseSoalBulk('')) === '{"soal":[],"masalah":[]}');
  cek('hanya whitespace', parseSoalBulk('   \n\n  \n').soal.length === 0);
  cek('CRLF ditangani', parseSoalBulk('Pertanyaan:q\r\nA.1\r\nB.2\r\nC.3\r\nD.4\r\nKunci:A').soal.length === 1);
  cek('pipe di depan ditoleransi', parseSoalBulk('| q | 1 | 2 | 3 | 4 | A | p').soal.length === 1);
  cek('komentar diabaikan', parseSoalBulk('// catatan\nPertanyaan:q\nA.1\nB.2\nC.3\nD.4\nKunci:A').masalah.length === 0);
}

console.log(gagal === 0 ? '\nSemua pemeriksaan lulus.' : '\n' + gagal + ' pemeriksaan GAGAL.');
process.exit(gagal === 0 ? 0 : 1);