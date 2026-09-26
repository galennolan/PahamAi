import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = process.env.KURSUS_ROOT || 'C:/Users/Galih Setiawan/Downloads/KURSUS';
const BANK_DIR = join(ROOT, '01-kurikulum-dan-konten/bank-soal');

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || (!serviceKey && !anonKey)) { console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) first.'); process.exit(1); }
const supabase = createClient(url, serviceKey || anonKey);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += c;
  }
  result.push(current);
  return result.map(s => s.trim());
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

function inferJalurTipe(filename) {
  // PENTING: cek pretest/posttest DULU, karena "pretest-posttest-jalur-b2.csv" juga mengandung "jalur-b2"
  if (filename.includes('pretest-posttest')) {
    if (filename.includes('b1')) return { jalur: 'B1', tipe: 'pre_post' };
    if (filename.includes('b2')) return { jalur: 'B2', tipe: 'pre_post' };
    if (filename.includes('b3')) return { jalur: 'B3', tipe: 'pre_post' };
  }
  if (filename.includes('jalur-a')) return { jalur: 'A', tipe: 'kuis' };
  if (filename.includes('jalur-b1')) return { jalur: 'B1', tipe: 'kuis' };
  if (filename.includes('jalur-b2')) return { jalur: 'B2', tipe: 'kuis' };
  if (filename.includes('jalur-b3')) return { jalur: 'B3', tipe: 'kuis' };
  return null;
}

async function main() {
  const files = readdirSync(BANK_DIR).filter(f => f.endsWith('.csv'));
  console.log(`Found ${files.length} CSV files.`);
  for (const fname of files) {
    const meta = inferJalurTipe(fname);
    if (!meta) { console.warn(`  skip ${fname}`); continue; }
    const rows = parseCSV(readFileSync(join(BANK_DIR, fname), 'utf-8'));
    if (rows.length === 0) { console.warn(`  ${fname}: no rows`); continue; }
    const paketCodes = [...new Set(rows.map(r => r.kode_paket))];
    for (const kode of paketCodes) {
      // Deteksi tipe dari kode paket (lebih akurat daripada nama file)
      const upper = kode.toUpperCase();
      const isPre = upper.startsWith('PRE-TEST') || upper.startsWith('PRETEST');
      const isPost = upper.startsWith('POST-TEST') || upper.startsWith('POSTTEST');
      const tipe = isPre ? 'pre_test' : isPost ? 'post_test' : 'kuis';
      await supabase.from('soal_paket').upsert({ kode_paket: kode, jalur: meta.jalur, tipe }, { onConflict: 'kode_paket' });
      const butir = rows.filter(r => r.kode_paket === kode).map(r => ({
        kode_paket: kode,
        no_soal: parseInt(r.no_soal),
        pertanyaan: r.pertanyaan,
        pilihan_a: r.pilihan_a || null,
        pilihan_b: r.pilihan_b || null,
        pilihan_c: r.pilihan_c || null,
        pilihan_d: r.pilihan_d || null,
        kunci: r.kunci || null,
        pembahasan: r.pembahasan || null,
        bobot_skor: parseInt(r.bobot_skor) || 0,
      }));
      const { error } = await supabase.from('soal_butir').upsert(butir, { onConflict: 'kode_paket,no_soal' });
      if (error) console.error(`  ERROR ${kode}:`, error.message);
      else console.log(`  OK ${kode} (${meta.jalur}/${tipe}) — ${butir.length} butir`);
    }
  }
  console.log('Done.');
}

main().catch(console.error);