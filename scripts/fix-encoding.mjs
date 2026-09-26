import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = 'C:/Users/Galih Setiawan/Downloads/KURSUS';
const files = [
  '01-kurikulum-dan-konten/modul-ajar/jalur-a-anak/A03-ngobrol-dengan-chatbot-ai.md',
  '01-kurikulum-dan-konten/modul-ajar/jalur-a-anak/A06-deteksi-ai-vs-asli.md',
  '01-kurikulum-dan-konten/modul-ajar/jalur-a-anak/A07-etika-dan-keamanan-ai.md',
];

const R = String.raw`\uFFFD`;
const FFD = '�';
const pairs = [
  ['2 emoji: ' + FFD + FFD + ' vs ' + FFD + FFD, '2 emoji: (benar) vs (salah)'],
  ['Ikon ' + FFD + FFD + ' + ' + FFD + FFD + FFD + FFD, 'Ikon (jari) + (teks, bayangan, latar)'],
  [FFD + FFD + ' teks aneh', '(teks) teks aneh'],
  [FFD + FFD + '️ latar blur', '(gambar) latar blur'],
  ['> ' + FFD + FFD + ' **AI bilang:**', '> **AI bilang:**'],
  ['(✋ berhenti, ' + FFD + FFD + ' jangan sebar, ' + FFD + FFD + ' lapor)', '(berhenti, jangan sebar, lapor)'],
];

for (const rel of files) {
  const p = join(ROOT, rel);
  let t = readFileSync(p, 'utf8');
  let n = 0;
  for (const [a, b] of pairs) {
    const c = t.split(a).length - 1;
    if (c > 0) { t = t.split(a).join(b); n += c; }
  }
  const rest = (t.match(new RegExp(R, 'g')) || []).length;
  t = t.replace(new RegExp(R, 'g'), '');
  writeFileSync(p, t, 'utf8');
  console.log(basename(p) + ': fixed=' + n + ' stray_removed=' + rest);
}
void R;
