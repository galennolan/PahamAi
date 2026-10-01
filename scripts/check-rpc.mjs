// Cek fungsi RPC mana yang benar-benar ada di database
// node scripts/check-rpc.mjs

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

//oretical: PostgREST exposes function existence via OpenAPI
const res = await fetch(`${URL_}/rest/v1/`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const spec = await res.json();

const rpcs = Object.keys(spec.paths ?? {})
  .filter((p) => p.startsWith('/rpc/'))
  .map((p) => p.slice(5));

console.log(`\nRPC terdaftar di PostgREST (${rpcs.length}):`);
for (const r of rpcs.sort()) {
  const post = spec.paths['/rpc/' + r]?.post ?? {};
  const params = (post.parameters ?? []).map((p) => p.name).join(',');
  const ret = post.extensions?.['pggetresult'] ?? '';
  console.log(`  ${r}(${params})${ret ? ' -> ' + ret : ''}`);
}

const svcRes = await fetch(`${URL_}/rest/v1/`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
const svcSpec = await svcRes.json();
const svcRpcs = new Set(Object.keys(svcSpec.paths ?? {}).filter((p) => p.startsWith('/rpc/')).map((p) => p.slice(5)));
console.log('\nHanya terlihat oleh service_role (belum GRANT ke anon/authenticated):');
for (const r of [...svcRpcs].filter((x) => !rpcs.includes(x)).sort()) console.log('  ' + r);

const probe = [
  ['admin_create_peserta', { p_email: 'x@y.z', p_password: 'aaaaaaaa', p_nama: 'X' }],
  ['admin_create_ortu', { p_email: 'x@y.z', p_password: 'aaaaaaaa' }],
  ['admin_reset_password', { p_user_id: '00000000-0000-0000-0000-000000000000', p_new_password: 'aaaaaaaa' }],
  ['admin_link_anak', { p_parent_id: '00000000-0000-0000-0000-000000000000', p_peserta_id: '00000000-0000-0000-0000-000000000000' }],
];
console.log('\nProbe langsung ke PostgREST (tanpa login):');
for (const [name, body] of probe) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  console.log(`  ${name}: HTTP ${r.status} ${t.replace(/\s+/g, ' ').slice(0, 150)}`);
}
