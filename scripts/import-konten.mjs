import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = process.env.KURSUS_ROOT || 'C:/Users/Galih Setiawan/Downloads/KURSUS';
const LP_DIR = join(ROOT, '01-kurikulum-dan-konten/lesson-plan');

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || (!serviceKey && !anonKey)) { console.error('Set env first.'); process.exit(1); }
const supabase = createClient(url, serviceKey || anonKey);

const ORDER = {
  A: ['A01','A02','A03','A04','A05','A06','A07','A08','A09'],
  B1: ['B101','B102','B103','B104','B105','B106','B107'],
  B2: ['B201','B202','B203','B204','B205','B206','B207','B208','B209','B210','B211'],
  B3: ['B301','B302','B303','B304','B305','B306','B307','B308','B309','B310','B311'],
};
const JALUR_FROM_FILE = {
  'lesson-plan-jalur-a.md': 'A',
  'lesson-plan-jalur-b1.md': 'B1',
  'lesson-plan-jalur-b2.md': 'B2',
  'lesson-plan-jalur-b3.md': 'B3',
};

async function main() {
  // --- Lesson plan: heading "## N. Sesi K — Judul" + tabel "| Waktu | Segmen | ..." ---
  const lpFiles = readdirSync(LP_DIR).filter(f => f.endsWith('.md'));
  let grandTotal = 0;
  for (const fname of lpFiles) {
    const jalur = JALUR_FROM_FILE[fname];
    if (!jalur) { console.warn(`  skip ${fname}`); continue; }
    const text = readFileSync(join(LP_DIR, fname), 'utf-8');
    const kodeList = ORDER[jalur] || [];
    const { data: moduls } = await supabase.from('modul').select('id, kode').in('kode', kodeList);
    if (!moduls || moduls.length === 0) { console.warn(`  ${fname}: no moduls in DB`); continue; }

    const lines = text.split('\n');
    let sesiIdx = -1;
    let currentKode = null;
    let segKe = 0;

    for (const raw of lines) {
      const line = raw.trim();
      if (/^#{2,3}\s+\d+\.\s+Sesi\s+\d+/i.test(line)) {
        sesiIdx++;
        currentKode = kodeList[sesiIdx] || null;
        segKe = 0;
        continue;
      }
      if (!currentKode) continue;
      if (!line.startsWith('|')) continue;
      const cols = line.split('|').map(c => c.trim()).slice(1, -1);
      if (cols.length < 4) continue;
      const timeMatch = cols[0].match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})\s*$/);
      if (!timeMatch) continue;
      const mulai = parseInt(timeMatch[1]);
      const selesai = parseInt(timeMatch[2]);
      const durasi = selesai - mulai;
      if (!(durasi > 0 && durasi <= 180)) continue;
      if (/^waktu$/i.test(cols[0]) || /^[-—]+$/.test(cols[0])) continue;
      segKe++;
      const mod = moduls.find(m => m.kode === currentKode);
      if (!mod) continue;
      const judul = cols[1];
      const talking = cols[2];
      const aktivitas = cols[3];
      const waspada = cols[4] ?? '';
      const { error } = await supabase.from('lesson_plan_segmen').upsert({
        modul_id: mod.id, segmen_ke: segKe, judul,
        durasi_menit: durasi, talking_points: `${talking}\n\nAktivitas: ${aktivitas}`,
        antisipasi: waspada, plan_b: waspada,
      }, { onConflict: 'modul_id,segmen_ke' });
      if (error) console.error(`    ERR ${currentKode}#${segKe}: ${error.message}`);
      else grandTotal++;
    }
    console.log(`  OK ${fname} (${jalur})`);
  }
  console.log(`Total lesson_plan_segmen baru: ${grandTotal}`);
  const { count: lpCount } = await supabase.from('lesson_plan_segmen').select('id', { count: 'exact', head: true });
  console.log(`Total lesson_plan_segmen di DB: ${lpCount}`);

  // --- Studi kasus: SK-01..SK-08 (split by '# SK-') ---
  const skPath = join(ROOT, '01-kurikulum-dan-konten/panduan-studi-kasus.md');
  if (existsSync(skPath)) {
    const text = readFileSync(skPath, 'utf-8');
    const sections = text.split(/\n(?=#\s+SK-\d)/).filter(s => /#\s+SK-\d/.test(s));
    for (const sec of sections) {
      const kodeMatch = sec.match(/SK-\d+/);
      if (!kodeMatch) continue;
      const kode = kodeMatch[0];
      const titleMatch = sec.match(/#\s+SK-\d+\s*[-—:]?\s*(.+)$/m);
      const judul = titleMatch?.[1]?.trim().slice(0, 200) ?? kode;
      const instrukturIdx = sec.search(/^#+\s*(Tanda-tanda|Red flag|Fakta pembuka|Kunci)/m);
      const pesertaBagian = instrukturIdx > 0 ? sec.slice(0, instrukturIdx) : sec;
      const instrukturBagian = instrukturIdx > 0 ? sec.slice(instrukturIdx) : '';
      const paras = pesertaBagian.split(/\n\n+/).map(p => p.trim())
        .filter(p => p.length > 30 && !p.startsWith('|') && !p.startsWith('#'));
      await supabase.from('studi_kasus').upsert({
        kode, judul,
        konteks: paras[0]?.slice(0, 1000) ?? '',
        bahan: paras[1]?.slice(0, 1000) ?? '',
        diskusi: [],
        kunci_instruktur: instrukturBagian.slice(0, 3000),
      }, { onConflict: 'kode' });
    }
    const { count } = await supabase.from('studi_kasus').select('id', { count: 'exact', head: true });
    console.log(`  OK studi kasus — total di DB: ${count}`);
  }

  const { count: rubrikCount } = await supabase.from('rubrik').select('id', { count: 'exact', head: true });
  console.log(`  Rubrik di DB: ${rubrikCount} (dari seed 0005)`);

  console.log('Done.');
}

main().catch(console.error);
