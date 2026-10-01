// Cek: apakah "Confirm email" aktif di project? (berpisah dari login)
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

const stamp = Date.now().toString().slice(-8);
const email = `cek.${stamp}@paham.ai`;

const res = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'CekPassword123!', data: { role: 'peserta' } }),
});
const t = await res.text();
let j = {};
try { j = JSON.parse(t); } catch {}
console.log(`\nPOST /auth/v1/signup -> HTTP ${res.status}`);
if (j.access_token) {
  console.log('  Sesilangsung diberikan  -> Confirm email NON-AKTIF. /daftar bisa langsung login.');
} else if (j.access_token === undefined && j.id) {
  console.log('  User dibuat, TAPI tanpa sesi -> Confirm email AKTIF.');
  console.log('  Dampak: /daftar membuat akun yang LANGSUNG GAGAL login ("Email not confirmed").');
  console.log('  User id:', j.id);
} else {
  console.log('  ' + t.slice(0, 400));
}
console.log('\n  raw:', t.slice(0, 300));

// bersihkan user uji
if (j.id) {
  const del = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/admin/users/${j.id}`, {
    method: 'DELETE',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  console.log('\n  cleanup user uji:', del.status);
}
