import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Butuh VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env');
  process.exit(1);
}
const sb = createClient(url, key);

// Id tetap supaya seed-users.mjs memakai kelas yang sama.
const KELAS_B1 = '22222222-2222-2222-2222-222222222222';
const PESERTA_EMAIL = 'murid@paham.ai';

// Kelas B1 = program B1 = 7 modul penuh (B101..B107). Seluruhnya dijadwalkan
// supaya peserta punya materi utuh, bukan 3 modul pertama saja.
const MODUL_KODE = ['B101', 'B102', 'B103', 'B104', 'B105', 'B106', 'B107'];

// Jadwal tetap: tiap Rabu 19:00 WIB, 90 menit per sesi.
const JAM_MULAI = '19:00';
const TANGGAL_PERTAMA = '2026-09-16';
const INTERVAL_HARI = 7;

function tambahHari(iso, hari) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + hari);
  return dt.toISOString().slice(0, 10);
}

function tambahMenit(jam, menit) {
  const [h, m] = jam.split(':').map(Number);
  const total = h * 60 + m + menit;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function main() {
  const { data: kelas } = await sb.from('kelas').select('id').eq('id', KELAS_B1).maybeSingle();
  if (!kelas) {
    const { error } = await sb.from('kelas').insert({
      id: KELAS_B1,
      kode: 'PAHAI-B1-2601',
      nama: 'Menengah Batch 1 Solo',
      status: 'berjalan',
      tanggal_mulai: TANGGAL_PERTAMA,
      kapasitas_maks: 20,
    });
    if (error) throw new Error(`kelas: ${error.message}`);
    console.log('✓ kelas PAHAI-B1-2601');
  } else {
    console.log('↻ kelas PAHAI-B1-2601 (sudah ada)');
  }

  const { data: moduls, error: mErr } = await sb
    .from('modul')
    .select('id, kode, judul, urutan_sesi, durasi_menit')
    .in('kode', MODUL_KODE);
  if (mErr) throw new Error(`modul: ${mErr.message}`);
  const urut = (moduls ?? []).sort((a, b) => a.urutan_sesi - b.urutan_sesi);
  if (urut.length !== MODUL_KODE.length) {
    const ada = urut.map((m) => m.kode).join(', ');
    throw new Error(`modul hilang. Ada: ${ada || '(tidak ada)'}`);
  }

  const { data: peserta, error: pErr } = await sb
    .from('peserta')
    .select('id, nama_lengkap')
    .eq('email', PESERTA_EMAIL)
    .maybeSingle();
  if (pErr) throw new Error(`peserta: ${pErr.message}`);
  if (!peserta) throw new Error(`peserta ${PESERTA_EMAIL} tidak ada`);

  await sb.from('peserta').update({ kelas_id: KELAS_B1 }).eq('id', peserta.id);
  console.log(`↻ ${peserta.nama_lengkap} → kelas PAHAI-B1-2601`);

  // Tanggal dihitung dari tanggal_mulai kelas, bukan dari "hari ini", supaya
  // jadwalnya stabil setiap kali skrip dijalankan ulang.
  const sesiIds = [];
  for (const [i, m] of urut.entries()) {
    const tanggal = tambahHari(TANGGAL_PERTAMA, i * INTERVAL_HARI);

    const { data: existing } = await sb
      .from('jadwal_sesi')
      .select('id')
      .eq('kelas_id', KELAS_B1)
      .eq('modul_id', m.id)
      .maybeSingle();

    if (existing) {
      sesiIds.push({ sesiId: existing.id, kode: m.kode });
      console.log(`↻ jadwal ${m.kode}`);
      continue;
    }

    const { data: ins, error: jErr } = await sb
      .from('jadwal_sesi')
      .insert({
        kelas_id: KELAS_B1,
        modul_id: m.id,
        kode_sesi_friendly: m.kode,
        judul_sesi: m.judul,
        tanggal_kelas: tanggal,
        jam_mulai: JAM_MULAI,
        jam_akhir: tambahMenit(JAM_MULAI, m.durasi_menit || 60),
        status_sesi: 'belum',
      })
      .select('id')
      .single();
    if (jErr) throw new Error(`jadwal ${m.kode}: ${jErr.message}`);
    sesiIds.push({ sesiId: ins.id, kode: m.kode });
    console.log(`✓ jadwal ${m.kode} ${tanggal}`);
  }

  // Penugasan: inilah yang membuat modul terbuka untuk peserta.
  for (const { sesiId, kode } of sesiIds) {
    const { data: sp } = await sb
      .from('sesi_peserta')
      .select('id')
      .eq('sesi_id', sesiId)
      .eq('peserta_id', peserta.id)
      .maybeSingle();
    if (sp) {
      console.log(`↻ sesi_peserta ${kode}`);
      continue;
    }
    const { error: spErr } = await sb.from('sesi_peserta').insert({ sesi_id: sesiId, peserta_id: peserta.id });
    if (spErr) throw new Error(`sesi_peserta ${kode}: ${spErr.message}`);
    console.log(`✓ sesi_peserta ${kode}`);
  }

  // `kelas.tanggal_akhir` dihitung dari sesi terakhir yang benar-benar dijadwalkan.
  const tanggalAkhir = tambahHari(TANGGAL_PERTAMA, (sesiIds.length - 1) * INTERVAL_HARI);
  await sb.from('kelas').update({ tanggal_akhir: tanggalAkhir }).eq('id', KELAS_B1);
  console.log(`↻ kelas tanggal_akhir = ${tanggalAkhir}`);

  // Sesi pertama sudah diolah supaya progres tidak kosong.
  const pertama = sesiIds[0];
  const { data: sp1 } = await sb
    .from('sesi_peserta')
    .select('id')
    .eq('sesi_id', pertama.sesiId)
    .eq('peserta_id', peserta.id)
    .maybeSingle();
  if (sp1) {
    const { data: abs } = await sb.from('absensi').select('id').eq('sesi_peserta_id', sp1.id).maybeSingle();
    if (!abs) {
      await sb.from('absensi').insert({ sesi_peserta_id: sp1.id, status_kehadiran: 'hadir', sync_status: 'synced' });
      console.log('✓ absensi hadir (sesi 1)');
    }
  }

  console.log(`\nSelesai. ${peserta.nama_lengkap} melihat ${sesiIds.length} modul: ${sesiIds.map((s) => s.kode).join(', ')}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});