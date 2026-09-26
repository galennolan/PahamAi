import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Need SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(url, key);

async function main() {
  // Ambil user existing
  const { data: { users } } = await sb.auth.admin.listUsers();
  const admin = users.find(u => u.email === 'admin@paham.ai');
  const tutor = users.find(u => u.email === 'tutor@paham.ai');
  const murid = users.find(u => u.email === 'murid@paham.ai');
  const ortu = users.find(u => u.email === 'ortu@paham.ai');

  console.log('Found:', admin?.id, tutor?.id, murid?.id, ortu?.id);

  // peserta row
  if (murid) {
    const { data: exist } = await sb.from('peserta').select('id').eq('user_id', murid.id).maybeSingle();
    if (!exist) {
      const { error } = await sb.from('peserta').insert({
        user_id: murid.id, nama_lengkap: 'Budi Santoso', nama_panggil: 'Budi', jalur: 'B1',
      });
      console.log(error ? 'ERR peserta: ' + error.message : 'OK peserta row');
    } else console.log('OK peserta row exists');
  }

  // parent_user
  if (ortu) {
    let p = (await sb.from('parent_user').select('id').eq('user_id', ortu.id).maybeSingle()).data;
    if (!p) {
      const { data: ins, error } = await sb.from('parent_user').insert({
        user_id: ortu.id, hubungan_anak: 'ayah', no_wa_notifikasi: '081298765433', email_notifikasi: 'ortu@paham.ai',
      }).select().single();
      p = ins;
      console.log(error ? 'ERR parent_user: ' + error.message : 'OK parent_user');
    } else console.log('OK parent_user exists');
    // link
    if (p && murid) {
      const { data: budi } = await sb.from('peserta').select('id').eq('user_id', murid.id).maybeSingle();
      if (budi) {
        const { data: link } = await sb.from('parent_child_link')
          .select('id').eq('parent_id', p.id).eq('child_id', budi.id).maybeSingle();
        if (!link) {
          const { error } = await sb.from('parent_child_link').insert({ parent_id: p.id, child_id: budi.id, can_read: true });
          console.log(error ? 'ERR link: ' + error.message : 'OK parent_child_link');
        } else console.log('OK parent_child_link exists');
      }
    }
  }

  // set role metadata kalau belum
  for (const u of [admin, tutor, murid, ortu]) {
    if (!u) continue;
    const role = u.user_metadata?.role;
    if (!role) {
      const newRole = u.email.startsWith('admin') ? 'admin' : u.email.startsWith('tutor') ? 'instruktur' : u.email.startsWith('murid') ? 'peserta' : 'parent';
      await sb.auth.admin.updateUserById(u.id, { user_metadata: { role: newRole } });
      console.log(`Set role for ${u.email}: ${newRole}`);
    } else {
      console.log(`${u.email} already has role: ${role}`);
    }
  }
  console.log('Done.');
}
main().catch(console.error);