import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error('Set env vars first.'); process.exit(1); }
const supabase = createClient(url, serviceKey);

function extractQuestionsFromContent(contentMd, judul) {
  const questions = [];
  const lines = contentMd.split('\n');
  let currentSection = '';
  let currentItems = [];

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('### ')) {
      if (currentSection && currentItems.length >= 2) {
        const q = makeQuestion(currentSection, currentItems, judul);
        if (q) questions.push(q);
      }
      currentSection = line.replace(/^#+\s*/, '').trim();
      currentItems = [];
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      currentItems.push(line.trim().replace(/^[-*]\s*/, ''));
    } else if (line.trim().match(/^\d+\.\s/)) {
      currentItems.push(line.trim().replace(/^\d+\.\s*/, ''));
    }
  }
  if (currentSection && currentItems.length >= 2) {
    const q = makeQuestion(currentSection, currentItems, judul);
    if (q) questions.push(q);
  }
  return questions;
}

function makeQuestion(section, items, judul) {
  if (items.length < 2) return null;
  const correct = items[0];
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, 4);
  while (options.length < 4) {
    options.push(`Tidak ada jawaban yang benar`);
  }
  const kunci = String.fromCharCode(65 + options.indexOf(correct));
  return {
    pertanyaan: `Mengenai "${section}" dalam modul "${judul}", manakah yang benar?`,
    pilihan_a: options[0],
    pilihan_b: options[1],
    pilihan_c: options[2],
    pilihan_d: options[3],
    kunci,
    pembahasan: `Jawaban benar: ${kunci}. ${correct}`,
    bobot_skor: 1,
  };
}

async function main() {
  const { data: moduls, error } = await supabase
    .from('modul')
    .select('id, kode, judul, jalur, content_md, urutan_sesi')
    .order('jalur')
    .order('urutan_sesi');

  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${moduls.length} modul.`);

  for (const m of moduls) {
    if (!m.content_md) {
      console.log(`  SKIP ${m.kode}: no content`);
      continue;
    }

    const questions = extractQuestionsFromContent(m.content_md, m.judul);
    if (questions.length < 3) {
      console.log(`  SKIP ${m.kode}: only ${questions.length} questions generated`);
      continue;
    }

    const preKode = `PRE-${m.kode}`;
    const postKode = `POST-${m.kode}`;

    await supabase.from('soal_paket').upsert({
      kode_paket: preKode,
      jalur: m.jalur,
      tipe: 'pre_test',
      sesi_target: m.kode,
      durasi_menit: 5,
    }, { onConflict: 'kode_paket' });

    await supabase.from('soal_paket').upsert({
      kode_paket: postKode,
      jalur: m.jalur,
      tipe: 'post_test',
      sesi_target: m.kode,
      durasi_menit: 5,
    }, { onConflict: 'kode_paket' });

    const preButir = questions.slice(0, 5).map((q, i) => ({
      kode_paket: preKode,
      no_soal: i + 1,
      ...q,
    }));

    const postButir = questions.slice(0, 5).map((q, i) => ({
      kode_paket: postKode,
      no_soal: i + 1,
      ...q,
    }));

    await supabase.from('soal_butir').upsert(preButir, { onConflict: 'kode_paket,no_soal' });
    await supabase.from('soal_butir').upsert(postButir, { onConflict: 'kode_paket,no_soal' });

    console.log(`  OK ${m.kode}: ${preButir.length} pre + ${postButir.length} post soal`);
  }

  console.log('Done.');
}

main().catch(console.error);
