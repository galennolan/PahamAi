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

async function main() {
  const { data: existing } = await supabase.from('modul').select('kode');
  const existingSet = new Set((existing || []).map(r => r.kode));
  console.log(`Existing modul: ${existingSet.size}, skip those.`);

  const phasesDir = join(REPO_ROOT, 'phases');
  const phases = readdirSync(phasesDir).filter(f => /^\d{2}-/.test(f)).sort();
  let skipped = 0, inserted = 0, failed = 0;

  for (const phase of phases) {
    const phasePath = join(phasesDir, phase);
    const lessons = readdirSync(phasePath).filter(f => /^\d{2}-/.test(f)).sort();

    for (const lesson of lessons) {
      const kode = `AEFS-${phase.split('-')[0]}${lesson.split('-')[0]}`;
      if (existingSet.has(kode)) { skipped++; continue; }
      const docPath = join(phasePath, lesson, 'docs', 'en.md');
      if (!existsSync(docPath)) { console.log(`  no docs: ${kode}`); continue; }

      const content = readFileSync(docPath, 'utf-8');
      const judul = lesson.split('-').slice(1).join(' ');
      const row = {
        kode, judul,
        jalur: 'G',
        urutan_sesi: parseInt(lesson.split('-')[0], 10) || 1,
        durasi_menit: 60,
        content_md: content,
      };

      const { error } = await supabase.from('modul').upsert(row, { onConflict: 'kode' });
      if (error) { console.error(`  FAIL ${kode}:`, error.message); failed++; }
      else { console.log(`  OK ${kode}`); inserted++; existingSet.add(kode); }
    }
  }
  console.log(`Done. inserted=${inserted} skipped=${skipped} failed=${failed}`);

  await supabase.from('batch').upsert(
    { kode_batch: 'AEFS-01', jalur: 'G', nama_batch: 'AI Engineering From Scratch — Kelas Baru', kapasitas_maks: 30, status: 'terbuka' },
    { onConflict: 'kode_batch' }
  );
  console.log('Batch AEFS-01 ready.');
}

main().catch(console.error);
