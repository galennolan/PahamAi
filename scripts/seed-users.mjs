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

const KELAS = {
  A: '11111111-1111-1111-1111-111111111111',
  B1: '22222222-2222-2222-2222-222222222222',
  B2: '33333333-3333-3333-3333-333333333333',
  B3: '44444444-4444-4444-4444-444444444444',
};

// Baris kelas harus ada sebelum peserta menunjuk kelas_id.
const classes = [
  { id: KELAS.A, kode: 'PAHAI-A-2601', nama: 'Anak Batch 1 Solo', status: 'berjalan' },
  { id: KELAS.B1, kode: 'PAHAI-B1-2601', nama: 'Menengah Batch 1 Solo', status: 'berjalan' },
  { id: KELAS.B2, kode: 'PAHAI-B2-2601', nama: 'Menengah Batch 1 Solo', status: 'berjalan' },
  { id: KELAS.B3, kode: 'PAHAI-B3-2601', nama: 'Expert Batch 1 Solo', status: 'terbuka' },
];

// Password demo ini BUKAN rahasia — tapi tetap tidak boleh jadi literal di
// repo. Ambil dari env, default hanya untuk developer lokal.
const demoPw = (key, fallback) => {
  const v = process.env[key];
  if (v) return v;
  console.warn(`[seed-users] ${key} belum di-set, memakai password demo default. Jangan pakai di produksi.`);
  return fallback;
};

const users = [
  { email: 'admin@paham.ai', password: demoPw('SEED_ADMIN_PASSWORD', 'Admin123!'), role: 'admin', name: 'Admin Paham AI' },
  { email: 'tutor@paham.ai', password: demoPw('SEED_TUTOR_PASSWORD', 'Tutor123!'), role: 'instruktur', name: 'Budi Instruktur' },
  { email: 'murid@paham.ai', password: demoPw('SEED_MURID_PASSWORD', 'Murid123!'), role: 'peserta', name: 'Budi Santoso', kelasId: KELAS.B1 },
  { email: 'murid2@paham.ai', password: demoPw('SEED_MURID_PASSWORD', 'Murid123!'), role: 'peserta', name: 'Siti Rahma', kelasId: KELAS.A },
  { email: 'ortu@paham.ai', password: demoPw('SEED_ORTU_PASSWORD', 'Ortu1234!'), role: 'parent', name: 'Bapak Budi' },
  { email: 'marketing@paham.ai', password: demoPw('SEED_MARKETING_PASSWORD', 'Marketing123!'), role: 'marketing', name: 'Marketing Paham AI' },
];

async function upsertUser(u) {
  const { data: list } = await sb.auth.admin.listUsers();
  const found = (list?.users ?? []).find((x) => x.email === u.email);

  if (found) {
    await sb.auth.admin.updateUserById(found.id, {
      password: u.password,
      user_metadata: { role: u.role, nama: u.name },
    });
    console.log(`↻ update  ${u.email}`);
    return found.id;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { role: u.role, nama: u.name },
  });
  if (error) {
    console.error(`✗ ${u.email}: ${error.message}`);
    return null;
  }
  console.log(`✓ create  ${u.email}`);
  return data.user.id;
}

async function main() {
  const authIds = {};

  for (const c of classes) {
    const { data: exist } = await sb.from('kelas').select('id').eq('id', c.id).maybeSingle();
    if (exist) continue;
    const { error } = await sb.from('kelas').insert({ ...c, kapasitas_maks: 20 });
    if (error) console.error(`✗ kelas ${c.kode}: ${error.message}`);
    else console.log(`✓ kelas ${c.kode}`);
  }

  for (const u of users) {
    const id = await upsertUser(u);
    if (id) {
      authIds[u.email] = id;
      // Sinkronkan ke public.user_roles jika belum ada
      const { data: roleExist } = await sb.from('user_roles').select('id').eq('user_id', id).maybeSingle();
      if (!roleExist) {
        await sb.from('user_roles').insert({ user_id: id, role: u.role });
      }
    }
  }

  // Peserta rows
  for (const u of users.filter((x) => x.role === 'peserta')) {
    const userId = authIds[u.email];
    if (!userId) continue;
    const { data: exist } = await sb.from('peserta').select('id').eq('user_id', userId).maybeSingle();
    if (exist) {
      await sb.from('peserta').update({ kelas_id: u.kelasId }).eq('id', exist.id);
      console.log(`↻ peserta ${u.name} (update kelas)`);
      continue;
    }
    const { error } = await sb.from('peserta').insert({
      user_id: userId,
      nama_lengkap: u.name,
      nama_panggil: u.name.split(' ')[0],
      email: u.email,
      kelas_id: u.kelasId,
      usia: u.kelasId === KELAS.A ? 10 : 28,
      consent_privasi: true,
      consent_etika: true,
      byod: true,
    });
    if (error) console.error(`✗ peserta ${u.name}: ${error.message}`);
    else console.log(`✓ peserta ${u.name}`);
  }

  // Parent user + link ke anak pertama
  const ortuId = authIds['ortu@paham.ai'];
  const anakId = authIds['murid@paham.ai'];
  if (ortuId && anakId) {
    const { data: p } = await sb.from('parent_user').select('id').eq('user_id', ortuId).maybeSingle();
    let parentId = p?.id;
    if (!parentId) {
      const { data: ins } = await sb.from('parent_user')
        .insert({ user_id: ortuId, hubungan_anak: 'ayah', no_wa_notifikasi: '081200000001' })
        .select('id').single();
      parentId = ins?.id;
      console.log('✓ parent_user');
    }
    if (parentId) {
      const { data: anakRow } = await sb.from('peserta').select('id').eq('user_id', anakId).maybeSingle();
      if (anakRow) {
        const { data: link } = await sb.from('parent_child_link')
          .select('id').eq('parent_id', parentId).eq('child_id', anakRow.id).maybeSingle();
        if (!link) {
          await sb.from('parent_child_link').insert({ parent_id: parentId, child_id: anakRow.id, can_read: true });
          console.log('✓ parent_child_link');
        }
      }
    }
  }

  console.log('\nSelesai. Kredensial demo:');
  for (const u of users) console.log(`  ${u.role.padEnd(11)} ${u.email.padEnd(20)} ${u.password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
