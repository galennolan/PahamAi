// Diagnosa login: uji tiap akun via token endpoint + daftar user via Admin API
// Jalankan: node scripts/diagnose-auth.mjs [email] [password]

import { createClient } from '@supabase/supabase-js';
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

if (!URL_ || !ANON || !SVC) {
  console.error('Butuh VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY di .env');
  process.exit(1);
}

const svc = createClient(URL_, SVC, { auth: { persistSession: false } });

async function tryLogin(email, password) {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.text();
  return { status: res.status, body };
}

const all = [];
for (let page = 1; page <= 20; page++) {
  const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error('listUsers error:', error.message);
    process.exit(1);
  }
  all.push(...(data?.users ?? []));
  if (!data?.users?.length || all.length >= (data.total ?? 0)) break;
}

const pw = {
  'admin@paham.ai': 'Admin123!',
  'tutor@paham.ai': 'Tutor123!',
  'murid@paham.ai': 'Murid123!',
  'murid2@paham.ai': 'Murid123!',
  'ortu@paham.ai': 'Ortu1234!',
  'marketing@paham.ai': 'Marketing123!',
  'galen.nolan1@gmail.com': 'galen.nolan1@gmail.com',
};

const target = process.argv[2];
const targetPw = process.argv[3];

const { data: roles } = await svc.from('user_roles').select('user_id, role').limit(2000);
const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
const { data: pes } = await svc.from('peserta').select('user_id, nama_lengkap').limit(2000);
const pByUser = new Map((pes ?? []).map((r) => [r.user_id, r.nama_lengkap]));

console.log(`\nTotal auth.users: ${all.length}\n`);
const header = 'EMAIL | CONF | PHONE | META_ROLE | user_roles | peserta | LOGIN';
console.log(header);
console.log('-'.repeat(120));

for (const u of all) {
  if (target && u.email !== target) continue;
  const pwd = target && u.email === target ? (targetPw ?? pw[u.email]) : pw[u.email];
  let loginRes = 'n/a';
  if (pwd) {
    const r = await tryLogin(u.email, pwd);
    loginRes = r.status === 200 ? 'OK(200)' : `FAIL(${r.status}) ${r.body.replace(/\s+/g, ' ').slice(0, 110)}`;
  }
  console.log(
    [
      u.email,
      u.email_confirmed_at ? 'y' : 'N',
      u.phone === null ? 'NULL' : u.phone === '' ? "''" : 'set',
      u.user_metadata?.role ?? '-',
      roleByUser.get(u.id) ?? 'TIDAK ADA',
      pByUser.get(u.id) ?? '-',
      loginRes,
    ].join(' | '),
  );
}

if (target && !all.some((u) => u.email === target)) {
  console.log(`\n[auth.users TIDAK punya email ${target}]`);
}
if (target) {
  const u = all.find((x) => x.email === target);
  if (u) {
    console.log('\nDETAIL USER:\n' + JSON.stringify(u, null, 2));
    const pwd = targetPw ?? pw[target];
    const r = await tryLogin(target, pwd);
    console.log(`\nUji login "${target}" -> HTTP ${r.status}`);
    console.log(r.body.slice(0, 900));
  }
}
