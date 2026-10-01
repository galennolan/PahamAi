// Uji end-to-end: admin login -> buat peserta via RPC -> peserta login
// node scripts/test-create-peserta.mjs

import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const URL_ = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const stamp = Date.now().toString().slice(-8);
const EMAIL = `uji.${stamp}@paham.ai`;
const PASS = 'UjiPassword123!';
const NAMA = `Uji Peserta ${stamp}`;

async function rest(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  let parsed = t;
  try {
    parsed = JSON.parse(t);
  } catch {}
  return { status: res.status, body: parsed };
}

async function login(email, password) {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const t = await res.text();
  return { status: res.status, body: t };
}

console.log(`\n=== UJI BUAT PESERTA (${EMAIL}) ===\n`);

const admin = await login('admin@paham.ai', 'Admin123!');
if (admin.status !== 200) {
  console.error('Login admin GAGAL:', admin.status, admin.body.slice(0, 300));
  process.exit(1);
}
const at = JSON.parse(admin.body).access_token;
console.log('1. Login admin            : OK');

const me = await rest('user_roles?select=role', { token: at });
console.log('2. Role admin (user_roles):', JSON.stringify(me.body));

const create = await rest('rpc/admin_create_peserta', {
  method: 'POST',
  token: at,
  body: {
    p_email: EMAIL,
    p_password: PASS,
    p_nama: NAMA,
    p_jalur: 'A',
    p_no_wa: '081200000999',
    p_usia: 15,
    p_kelas_penempatan: 'baru-kenal-hp',
  },
});
console.log('3. admin_create_peserta   : HTTP', create.status, JSON.stringify(create.body).slice(0, 300));

if (create.status !== 200) {
  console.log('\nGAGAT membuat peserta. Berhenti.');
  process.exit(1);
}
const uid = create.body?.user_id;

const plogin = await login(EMAIL, PASS);
console.log('4. Login peserta baru     : HTTP', plogin.status, plogin.status === 200 ? 'OK' : plogin.body.slice(0, 300));

const proles = await rest(`user_roles?user_id=eq.${uid}&select=role`, { token: at });
console.log('5. user_roles peserta     :', JSON.stringify(proles.body));

const ppes = await rest(`peserta?user_id=eq.${uid}&select=nama_lengkap,email,jalur,usia`, { token: at });
console.log('6. Baris peserta          :', JSON.stringify(ppes.body));

if (plogin.status === 200) {
  const pt = JSON.parse(plogin.body).access_token;
  const self = await rest('peserta?select=nama_lengkap&limit=3', { token: pt });
  console.log('7. Peserta baca datanya   :', JSON.stringify(self.body).slice(0, 200));
}

console.log('\n--- CLEANUP ---');
const du = await fetch(`${URL_}/auth/v1/admin/users`, {
  method: 'GET',
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, apikey: SVC },
});
const list = await du.json();
const victim = list.users?.find((u) => u.email === EMAIL);
if (victim) {
  const del = await fetch(`${URL_}/auth/v1/admin/users/${victim.id}`, {
    method: 'DELETE',
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
  console.log('Hapus auth user:', del.status);
} else {
  console.log('Auth user tidak ditemukan untuk dihapus');
}
console.log('Sisa: peserta + user_roles + parent_child_link akan hilang via cascade auth.users');
