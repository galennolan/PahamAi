// Uji berulang: cari 500 intermiten pada login
// node --env-file=.env scripts/test-login.mjs <email> <password> [n]

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
const email = process.argv[2];
const password = process.argv[3];
const n = Number(process.argv[4] ?? 15);

if (!URL_ || !ANON || !email || !password) {
  console.error('Butuh VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY + <email> <password>');
  process.exit(1);
}

const tally = new Map();
for (let i = 0; i < n; i++) {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.text();
  const key = `${res.status} ${body.slice(0, 120).replace(/\s+/g, ' ')}`;
  tally.set(key, (tally.get(key) ?? 0) + 1);
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\n${n}x login "${email}"`);
for (const [k, v] of tally) console.log(`  ${v}x  ${k}`);
