import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ada di .env');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

const problems = [];
const notes = [];

function check(label, value, expected = 0) {
  const ok = Number(value) === Number(expected);
  if (!ok) problems.push(`${label}: ${value} (harus ${expected})`);
  console.log(`${ok ? 'OK  ' : 'GAGAL'} ${label} = ${value}${ok ? '' : `  (harus ${expected})`}`);
}

async function countOf(table) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count;
}

async function rowsOf(table, cols) {
  const { data, error } = await db.from(table).select(cols);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function main() {
  console.log('=== Koneksi ===');
  try {
    await countOf('kelas');
    console.log('Koneksi OK\n');
  } catch (e) {
    console.error('Koneksi gagal:', e.message);
    process.exit(1);
  }

  const kelas = await rowsOf('kelas', 'id,kode');
  const jadwal = await rowsOf('jadwal_sesi', 'id,kelas_id,modul_id,kode_sesi_friendly,jam_mulai,jam_akhir');
  const peserta = await rowsOf('peserta', 'id,kelas_id');
  const sesiPeserta = await rowsOf('sesi_peserta', 'sesi_id,peserta_id');
  const modul = await rowsOf('modul', 'id,kode');

  const kelasIds = new Set(kelas.map((k) => k.id));
  const jadwalIds = new Set(jadwal.map((j) => j.id));
  const pesertaIds = new Set(peserta.map((p) => p.id));
  const modulIds = new Set(modul.map((m) => m.id));

  console.log('=== Bagian 1: relasi tidak menggantung ===');
  check('jadwal_sesi tanpa kelas', jadwal.filter((j) => !kelasIds.has(j.kelas_id)).length);
  check('peserta tanpa kelas', peserta.filter((p) => p.kelas_id && !kelasIds.has(p.kelas_id)).length);
  check('sesi_peserta tanpa sesi', sesiPeserta.filter((s) => !jadwalIds.has(s.sesi_id)).length);
  check('sesi_peserta tanpa peserta', sesiPeserta.filter((s) => !pesertaIds.has(s.peserta_id)).length);

  console.log('\n=== Bagian 2: penugasan sinkron dengan kelas ===');
  const jadwalKelas = new Map(jadwal.map((j) => [j.id, j.kelas_id]));
  const pesertaKelas = new Map(peserta.map((p) => [p.id, p.kelas_id]));
  check(
    'penugasan lintas kelas',
    sesiPeserta.filter((s) => {
      const pk = pesertaKelas.get(s.peserta_id);
      return pk != null && jadwalKelas.get(s.sesi_id) !== pk;
    }).length,
  );
  const adaSesi = new Set(sesiPeserta.map((s) => s.peserta_id));
  check(
    'anggota kelas tanpa sesi',
    peserta.filter((p) => p.kelas_id && !adaSesi.has(p.id)).length,
  );

  console.log('\n=== Bagian 3: sisa jalur / batch harus nihil ===');
  const openapi = await fetch(`${URL}/rest/v1/`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/openapi+json' },
  }).then((r) => r.json());

  const schemas = openapi?.components?.schemas ?? {};
  const sisaKolom = [];
  for (const [table, def] of Object.entries(schemas)) {
    for (const col of Object.keys(def?.properties ?? {})) {
      if (col === 'jalur' || col === 'batch_id') sisaKolom.push(`${table}.${col}`);
    }
  }
  check('kolom jalur/batch_id tersisa', sisaKolom.length);
  if (sisaKolom.length) notes.push(`Kolom tersisa: ${sisaKolom.join(', ')}`);

  const { error: batchErr } = await db.from('batch').select('*').limit(1);
  check('tabel batch masih ada', batchErr ? 0 : 1);

  console.log('\n=== Bagian 4: jumlah data ===');
  const hasil = {};
  for (const t of ['kelas', 'modul', 'peserta', 'jadwal_sesi', 'sesi_peserta', 'soal_paket', 'rubrik', 'pendaftar']) {
    hasil[t] = await countOf(t);
    console.log(`     ${t.padEnd(12)} = ${hasil[t]}`);
  }
  const BACKUP = { modul: 48, soal_paket: 117, peserta: 4, kelas: 6, jadwal_sesi: 19, sesi_peserta: 6 };
  console.log('\n  Perbandingan vs backup:');
  for (const [t, bek] of Object.entries(BACKUP)) {
    const now = hasil[t];
    const delta = now - bek;
    const ok = t === 'jadwal_sesi' ? delta === -3 : t === 'sesi_peserta' ? delta === -1 : delta === 0;
    console.log(`  ${ok ? 'OK  ' : 'CEK '} ${t.padEnd(12)} ${now} vs backup ${bek}  (selisih ${delta > 0 ? '+' : ''}${delta})`);
    if (!ok) notes.push(`${t}: selisih ${delta},不该出现`);
  }

  console.log('\n=== Bagian 5: hygiene jadwal ===');
  check('jam_akhir <= jam_mulai', jadwal.filter((j) => j.jam_mulai && j.jam_akhir && j.jam_akhir <= j.jam_mulai).length);
  const kodeModul = new Map(modul.map((m) => [m.id, m.kode]));
  check(
    'kode_sesi_friendly beda dari modul',
    jadwal.filter((j) => modulIds.has(j.modul_id) && kodeModul.get(j.modul_id) !== j.kode_sesi_friendly).length,
  );
  const dup = new Map();
  for (const j of jadwal) {
    const k = `${j.kelas_id}|${j.kode_sesi_friendly}`;
    dup.set(k, (dup.get(k) ?? 0) + 1);
  }
  check('jadwal duplikat per kelas', [...dup.values()].filter((n) => n > 1).length);

  console.log('\n=== Ringkasan ===');
  if (problems.length === 0) {
    console.log('Semua cek wajib lolos.');
  } else {
    console.log(`${problems.length} masalah:`);
    problems.forEach((p) => console.log('  - ' + p));
  }
  if (notes.length) {
    console.log('\nPerlu ditinjau:');
    notes.forEach((n) => console.log('  - ' + n));
  }
}

main().catch((e) => {
  console.error('Gagal:', e.message);
  process.exit(1);
});