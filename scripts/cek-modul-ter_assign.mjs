import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Simulasikan persis alur frontend untuk kode modul B104.
const KODE = process.argv[2] ?? 'B104';

const p = await sb.from('peserta').select('id, kelas_id, nama_lengkap').eq('email', 'murid@paham.ai').single();
const sp = await sb.from('sesi_peserta').select('id, sesi_id').eq('peserta_id', p.data.id);
const js = await sb.from('jadwal_sesi').select('*,modul(*)').in('id', sp.data.map((r) => r.sesi_id)).order('tanggal_kelas');
const mine = js.data.filter((j) => j.modul?.kode === KODE);

console.log(`== peserta: ${p.data.nama_lengkap} (kelas ${p.data.kelas_id?.slice(0, 8)})`);
console.log(`== Sesi.tsx /modul/${KODE}:`, mine.length ? `OK -> ${mine[0].kode_sesi_friendly} ${mine[0].tanggal_kelas} ${mine[0].jam_mulai?.slice(0, 5)}` : 'GAGAL -> Modul belum ditugaskan');

// Belajar.tsx: modul unik dari sesi, diurutkan urutan_sesi lalu kode.
const mods = [...new Map(js.data.filter((j) => j.status_sesi !== 'dibatalkan').map((j) => [j.modul_id, j.modul])).values()]
  .sort((a, b) => a.urutan_sesi - b.urutan_sesi || a.kode.localeCompare(b.kode));
console.log(`== Belajar.tsx: ${mods.length} modul ->`, mods.map((x) => x.kode).join(', '));

const m = await sb.from('modul').select('kode, materi_peserta_md, content_md, slide_url').eq('kode', KODE).single();
console.log(`== materi_peserta_md: ${m.data.materi_peserta_md ? 'ada' : 'null (Sesi.tsx fallback ke content_md)'}`);
console.log(`== content_md: ${(m.data.content_md ?? '').length} karakter`);
console.log(`== slide_url: ${m.data.slide_url ?? 'null (tidak ada iframe slide)'}`);

for (const k of [`PRE-${KODE}`, `POST-${KODE}`]) {
  const q = await sb.from('soal_butir').select('no_soal', { count: 'exact', head: true }).eq('kode_paket', k);
  console.log(`== butir ${k}: ${q.count ?? 0}`);
}