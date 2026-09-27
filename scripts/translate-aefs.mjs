import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const REPO_ROOT = 'C:/Users/GALIHS~1/AppData/Local/Temp/opencode/aefs/repo';
const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error('Set env vars first.'); process.exit(1); }
const supabase = createClient(url, serviceKey);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateToIndonesian(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data[0].map((s) => s[0]).join('');
  } catch {
    return text;
  }
}

async function main() {
  const phasesDir = join(REPO_ROOT, 'phases');
  const phases = readdirSync(phasesDir).filter(f => /^\d{2}-/.test(f));

  for (const phase of phases) {
    const phasePath = join(phasesDir, phase);
    const lessons = readdirSync(phasePath).filter(f => /^\d{2}-/.test(f));

    for (const lesson of lessons) {
      const lessonPath = join(phasePath, lesson);
      const docPath = join(lessonPath, 'docs', 'en.md');
      if (!existsSync(docPath)) continue;

      let content = readFileSync(docPath, 'utf-8');
      const kode = `${phase.split('-')[0]}${lesson.split('-')[0]}`;
      const judul = lesson.split('-').slice(1).join(' ').replace(/-/g, ' ');

      console.log(`Translating AEFS-${kode} ...`);
      content = await translateToIndonesian(content);
      await sleep(100);

      const row = {
        kode: `AEFS-${kode}`,
        judul: await translateToIndonesian(judul),
        jalur: 'G',
        urutan_sesi: parseInt(lesson.split('-')[0]),
        durasi_menit: 60,
        content_md: content,
      };

      const { error } = await supabase.from('modul').upsert(row, { onConflict: 'kode' });
      if (error) console.error(`  ERROR ${kode}: ${error.message}`);
      else console.log(`  OK AEFS-${kode}`);
    }
  }
  console.log('Done.');
}

main().catch(console.error);
