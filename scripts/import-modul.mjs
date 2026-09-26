import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = process.env.KURSUS_ROOT || 'C:/Users/Galih Setiawan/Downloads/KURSUS';
const MODUL_DIR = join(ROOT, '01-kurikulum-dan-konten/modul-ajar');

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || (!serviceKey && !anonKey)) { console.error('Set env vars first (copy .env.example to .env).'); process.exit(1); }
const supabase = createClient(url, serviceKey || anonKey);

const JALUR_MAP = { 'jalur-a-anak': 'A', 'jalur-b1-pemula': 'B1', 'jalur-b2-menengah': 'B2', 'jalur-b3-expert': 'B3' };
const DURASI = { A: 60, B1: 90, B2: 120, B3: 150 };

const JUDUL = {
  A01: 'Apa Itu AI?', A02: 'AI vs Manusia', A03: 'Ngobrol & Belajar Prompt',
  A04: 'AI untuk Cerita', A05: 'AI untuk Gambar', A06: 'Deteksi AI vs Asli',
  A07: 'Etika & Keamanan AI', A08: 'Proyek Akhir & Presentasi', A09: 'Presentasi Skills',
  B101: 'Konsep Dasar AI & LLM', B102: 'Mengenal Tools AI', B103: 'Dasar Prompt Engineering',
  B104: 'AI untuk Produktivitas Harian', B105: 'Etika, Bias & Halusinasi AI',
  B106: 'Evaluasi & Proyek Mini', B107: 'Presentasi Skills',
  B201: 'Prompt Engineering Lanjutan', B202: 'Optimasi Output AI', B203: 'AI untuk Dokumen & Data',
  B204: 'Etika, Bias & Prompt Injection', B205: 'Dasar Pemrograman untuk AI', B206: 'Pengantar Automasi',
  B207: 'Memanggil AI Lewat API', B208: 'Integrasi AI ke Produk', B209: 'Workshop Proyek Menengah',
  B210: 'Presentasi & Proyek Integrasi', B211: 'Post-Test & Evaluasi',
  B301: 'Arsitektur Sistem AI Modern', B302: 'RAG (Retrieval-Augmented Generation)',
  B303: 'Tool-Use & Function Calling', B304: 'Membangun AI Agent',
  B305: 'Fine-Tuning vs Prompting vs RAG', B306: 'Evaluasi & Testing Model AI',
  B307: 'Keamanan & Etika AI Lanjut', B308: 'Workshop Capstone', B309: 'Presentasi + Capstone',
  B310: 'Post-Test & Portfolio Review', B311: 'Capstone Final & Sertifikasi',
};

function parseModulFile(filePath, jalur) {
  const fname = basename(filePath);
  if (/[A-Z]\d{3}X-/.test(fname)) return null;
  const match = fname.match(/^([A-Z]\d{2,3})-(.*)\.md$/);
  if (!match) return null;
  const kode = match[1];
  const judul = JUDUL[kode] ?? match[2].replace(/-/g, ' ');
  const content = readFileSync(filePath, 'utf-8');
  const seqMatch = kode.match(/([A-Z])(\d+)/);
  const urutan = seqMatch ? (parseInt(seqMatch[2]) % 100 || parseInt(seqMatch[2])) : 1;
  return { kode, judul, jalur, urutan, content };
}

// Ekstrak "## 4. Materi Inti" .. "## 5." untuk peserta (tanpa lesson-plan instruktur).
function extractMateriPeserta(md) {
  const lines = md.split('\n');
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## 4. Materi Inti')) start = i;
    else if (start !== -1 && /^## 5\./.test(lines[i])) { end = i; break; }
  }
  return start === -1 ? null : lines.slice(start + 1, end).join('\n').trim();
}

const KODE_TO_KATEGORI = {
  A01:'FND',A02:'FND',A03:'TOOL',A04:'TOOL',A05:'TOOL',A06:'ETHC',A07:'ETHC',A08:'PROJ',A09:'PRES',
  B101:'FND',B102:'TOOL',B103:'PRMP',B104:'PROD',B105:'ETHC',B106:'PROJ',B107:'PRES',
  B201:'PRMP',B202:'PRMP',B203:'PROD',B204:'ETHC',B205:'CODE',B206:'AUTO',B207:'CODE',B208:'CODE',B209:'PROJ',
  B210:'PRES',B211:'PROJ',
  B301:'ARCH',B302:'ARCH',B303:'AUTO',B304:'AUTO',B305:'ARCH',B306:'ARCH',B307:'ETHC',B308:'PROJ',B309:'PRES',
  B310:'PROJ',B311:'PROJ',
};

const hasCols = new Set();
async function colExists(name) {
  if (hasCols.has(name)) return true;
  if (hasCols.has('__known__' + name)) return false;
  const chk = await supabase.from('modul').select(name).limit(0);
  const ok = !chk.error;
  hasCols.add('__known__' + name);
  if (ok) hasCols.add(name);
  return ok;
}

async function main() {
  const files = [];
  for (const [dir, jalur] of Object.entries(JALUR_MAP)) {
    const dirPath = join(MODUL_DIR, dir);
    if (!existsSync(dirPath)) { console.warn(`Skip: ${dirPath} not found`); continue; }
    for (const fname of readdirSync(dirPath)) {
      if (!fname.endsWith('.md')) continue;
      const m = parseModulFile(join(dirPath, fname), jalur);
      if (m) files.push(m);
      else console.log(`  arsip/skip: ${fname}`);
    }
  }
  console.log(`Parsed ${files.length} modul valid.`);

  await supabase.from('modul').delete().in('kode', ['B204X', 'B307X']);

  const supKategori = await colExists('kategori');
  const supMateri = await colExists('materi_peserta_md');
  console.log(`Columns present -> kategori: ${supKategori}, materi_peserta_md: ${supMateri}`);
  if (!supMateri) console.warn('  ! Kolom materi_peserta_md belum ada — jalankan migration 0009 di SQL Editor dulu agar peserta lihat materi bersih.');

  for (const m of files) {
    const row = {
      kode: m.kode, judul: m.judul, jalur: m.jalur,
      urutan_sesi: m.urutan, durasi_menit: DURASI[m.jalur],
      content_md: m.content,
    };
    if (supKategori && KODE_TO_KATEGORI[m.kode]) row.kategori = KODE_TO_KATEGORI[m.kode];
    if (supMateri) row.materi_peserta_md = extractMateriPeserta(m.content);

    const { error } = await supabase.from('modul').upsert(row, { onConflict: 'kode' });
    if (error) console.error(`  ERROR ${m.kode}:`, error.message);
    else console.log(`  OK ${m.kode} — ${m.judul}`);
  }

  const { count } = await supabase.from('modul').select('id', { count: 'exact', head: true });
  console.log(`Done. Total modul di DB: ${count}`);
}

main().catch(console.error);
