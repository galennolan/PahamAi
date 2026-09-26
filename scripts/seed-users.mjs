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

const BATCH = {
  A: '11111111-1111-1111-1111-111111111111',
  B1: '22222222-2222-2222-2222-222222222222',
  B2: '33333333-3333-3333-3333-333333333333',
  B3: '44444444-4444-4444-4444-444444444444',
};

const users = [
  { email: 'admin@paham.ai', password: 'Admin123!', role: 'admin', name: 'Admin Paham AI' },
  { email: 'tutor@paham.ai', password: 'Tutor123!', role: 'instruktur', name: 'Budi Instruktur' },
  { email: 'murid@paham.ai', password: 'Murid123!', role: 'peserta', name: 'Budi Santoso', jalur: 'B1', batch: BATCH.B1 },
  { email: 'murid2@paham.ai', password: 'Murid123!', role: 'peserta', name: 'Siti Rahma', jalur: 'A', batch: BATCH.A },
  { email: 'ortu@paham.ai', password: 'Ortu1234!', role: 'parent', name: 'Bapak Budi' },
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

  for (const u of users) {
    const id = await upsertUser(u);
    if (id) authIds[u.email] = id;
  }

  // Peserta rows
  for (const u of users.filter((x) => x.role === 'peserta')) {
    const userId = authIds[u.email];
    if (!userId) continue;
    const { data: exist } = await sb.from('peserta').select('id').eq('user_id', userId).maybeSingle();
    if (exist) {
      await sb.from('peserta').update({ batch_id: u.batch, jalur: u.jalur }).eq('id', exist.id);
      console.log(`↻ peserta ${u.name} (update batch)`);
      continue;
    }
    const { error } = await sb.from('peserta').insert({
      user_id: userId,
      nama_lengkap: u.name,
      nama_panggil: u.name.split(' ')[0],
      email: u.email,
      jalur: u.jalur,
      batch_id: u.batch,
      usia: u.jalur === 'A' ? 10 : 28,
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
