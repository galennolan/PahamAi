// Simulasikan apa yang terjadi setelah login: query yang dijalankan halaman Beranda
// node scripts/simulate-beranda.mjs <email> <password>

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
const email = process.argv[2] ?? 'galen.nolan1@gmail.com';
const password = process.argv[3] ?? 'galen.nolan1@gmail.com';

async function login(e, p) {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e, password: p }),
  });
  return { status: res.status, body: await res.text() };
}

async function q(path, token) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  const t = await res.text();
  let j = t;
  try { j = JSON.parse(t); } catch {}
  return { status: res.status, body: j };
}

const l = await login(email, password);
console.log(`\n=== SIMULASI SESI ${email} ===\n`);
console.log('login:', l.status, l.status === 200 ? 'OK' : l.body.slice(0, 200));
if (l.status !== 200) process.exit(1);

const { access_token: T, user } = JSON.parse(l.body);
console.log('user.id :', user.id);
console.log('metadata:', JSON.stringify(user.user_metadata));

// AuthContext.fetchRole
const r = await q('user_roles?select=role', T);
console.log('\n[AuthContext.fetchRole] user_roles ->', JSON.stringify(r.body).slice(0, 200));

const probes = [
  ['peserta (diri sendiri)', 'peserta?select=id,nama_lengkap,email,jalur,usia,batch_id&limit=5'],
  ['batch', 'batch?select=id,nama&limit=5'],
  ['jadwal_sesi', 'jadwal_sesi?select=id&limit=3'],
  ['progres/absensi', 'absensi?select=id&limit=3'],
  ['catatan_ketik', 'catatan_ketik?select=id&limit=3'],
  ['portfolio_item', 'portfolio_item?select=id&limit=3'],
  ['sertifikat', 'sertifikat?select=id&limit=3'],
  ['user_roles (halaman profil)', 'user_roles?select=role'],
];
for (const [label, path] of probes) {
  const res = await q(path, T);
  const n = Array.isArray(res.body) ? `${res.body.length} baris` : JSON.stringify(res.body).slice(0, 90);
  console.log(`  ${label.padEnd(28)} HTTP ${res.status}  ${n}`);
}
