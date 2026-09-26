import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Need SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(url, key);

const USERS = [
  { email: 'admin@paham.ai', password: 'Admin123!', role: 'admin' },
  { email: 'tutor@paham.ai', password: 'Tutor123!', role: 'instruktur' },
  { email: 'murid@paham.ai', password: 'Murid123!', role: 'peserta' },
  { email: 'ortu@paham.ai', password: 'Ortu1234!', role: 'parent' },
];

const ids = {};
for (const u of USERS) {
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { role: u.role },
  });
  if (error) { console.error(`ERR ${u.email}:`, error.message); continue; }
  ids[u.role] = data.user.id;
  console.log(`OK ${u.email} (${u.role}) id=${data.user.id}`);
}

// peserta row untuk murid
if (ids.peserta) {
  const { data: exist } = await sb.from('peserta').select('id').eq('user_id', ids.peserta).maybeSingle();
  if (!exist) {
    const { error } = await sb.from('peserta').insert({
      user_id: ids.peserta,
      nama_lengkap: 'Budi Santoso',
      nama_panggil: 'Budi',
      jalur: 'B1',
    });
    if (error) console.error('ERR peserta row:', error.message);
    else console.log('OK peserta row (Budi Santoso, B1)');
  } else console.log('OK peserta row sudah ada');
}

// parent_user + link ke Budi
if (ids.parent) {
  let p = (await sb.from('parent_user').select('id').eq('user_id', ids.parent).maybeSingle()).data;
  if (!p) {
    const { data: ins, error: e1 } = await sb.from('parent_user').insert({
      user_id: ids.parent, hubungan_anak: 'ayah',
      no_wa_notifikasi: '081298765433', email_notifikasi: 'ortu@paham.ai',
    }).select().single();
    if (e1) { console.error('ERR parent_user:', e1.message); p = null; }
    else { p = ins; console.log(`OK parent_user id=${p.id}`); }
  } else console.log(`OK parent_user sudah ada id=${p.id}`);
  if (p) {
    const { data: budi } = await sb.from('peserta').select('id').eq('user_id', ids.peserta).single();
    if (budi) {
      const { data: link } = await sb.from('parent_child_link')
        .select('id').eq('parent_id', p.id).eq('child_id', budi.id).maybeSingle();
      if (!link) {
        const { error: e2 } = await sb.from('parent_child_link').insert(
          { parent_id: p.id, child_id: budi.id, can_read: true },
        );
        if (e2) console.error('ERR link:', e2.message);
        else console.log('OK parent_child_link (ortu -> Budi)');
      } else console.log('OK parent_child_link sudah ada');
    }
  }
}
console.log('Done.');
