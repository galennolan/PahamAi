import { readFileSync } from 'node:fs';

const f = process.argv[2];
const sql = readFileSync(f, 'utf8');

function splitTop(s) {
  const out = [];
  let depth = 0, cur = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      cur += ch;
      if (ch === "'") { if (s[i + 1] === "'") cur += s[++i]; else q = false; }
      continue;
    }
    if (ch === "'") { q = true; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Cari kurung penutup yang seimbang, abaikan tanda kutip.
function matchParen(s, open) {
  let depth = 0, q = false;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === "'") { if (s[i + 1] === "'") i++; else q = false; } continue; }
    if (ch === "'") { q = true; continue; }
    if (ch === '(') depth++;
    if (ch === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const re = /INSERT INTO\s+([\w.]+)\s*\(/g;

// Kolom GENERATED: nilainya dihitung database, tidak boleh ditulis.
const GENERATED = new Set(['confirmed_at', 'is_super_admin']);

// Tipe kolom yang tidak boleh diberi string kosong ''.
const TS_COLS = new Set([
  'email_confirmed_at', 'invited_at', 'confirmation_sent_at', 'recovery_sent_at',
  'email_change_sent_at', 'phone_confirmed_at', 'phone_change_sent_at',
  'confirmed_at', 'reauthentication_sent_at', 'created_at', 'updated_at',
  'deleted_at', 'banned_until', 'last_sign_in_at',
]);
// Kolom UNIQUE di auth.users: users_phone_key membuat '' hanya bisa dipakai satu user.
const UNIQUE_STRING_COLS = new Set(['phone']);
let bad = 0, n = 0;

for (const m of sql.matchAll(re)) {
  const table = m[1];
  const colsEnd = matchParen(sql, m.index + m[0].length - 1);
  if (colsEnd < 0) { console.log(`FAIL ${table}: tanda kurung tak berpasangan`); bad++; continue; }
  const cols = splitTop(sql.slice(m.index + m[0].length, colsEnd));

  const rest = sql.slice(colsEnd + 1);
  const vHead = rest.match(/^\s*VALUES\s*\(/);
  if (!vHead) { console.log(`FAIL ${table}: tidak ada VALUES setelah daftar kolom`); bad++; continue; }
  const vOpen = colsEnd + 1 + vHead[0].lastIndexOf('(');
  const valsEnd = matchParen(sql, vOpen);
  if (valsEnd < 0) { console.log(`FAIL ${table}: tanda kurung VALUES tak berpasangan`); bad++; continue; }
  const vals = splitTop(sql.slice(vOpen + 1, valsEnd));

  n++;
  const ok = cols.length === vals.length;
  const k = Math.min(cols.length, vals.length);
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${table}: ${cols.length} kolom vs ${vals.length} nilai`);
  if (!ok) {
    for (let i = 0; i < k; i++) console.log(`   ${String(i + 1).padStart(2)}. ${cols[i].padEnd(30)} = ${vals[i]}`);
    if (cols.length > k) console.log(`   kolom tanpa nilai : ${cols.slice(k).join(', ')}`);
    if (vals.length > k) console.log(`   nilai tanpa kolom : ${vals.slice(k).join(', ')}`);
  }

  // Cek generated column: tidak boleh ditulis sama sekali.
  for (const c of cols) {
    if (GENERATED.has(c) || (table === 'auth.identities' && c === 'email')) {
      console.log(`   GENERATED: ${c} di ${table} tidak boleh ditulis`);
      bad++;
    }
  }

  // Cek tipe: kolom timestamp tidak boleh menerima string kosong.
  for (let i = 0; i < k; i++) {
    const c = cols[i], v = vals[i];
    if (TS_COLS.has(c) && /^\s*'.*'\s*$/.test(v)) {
      console.log(`   TIPE SALAH: ${c} bertipe timestamp tapi diisi ${v}`);
      bad++;
    }
  }

  // Cek unique: kolom unique tidak boleh diisi string kosong berulang.
  for (let i = 0; i < k; i++) {
    const c = cols[i], v = vals[i];
    if (UNIQUE_STRING_COLS.has(c) && /^\s*''\s*$/.test(v)) {
      console.log(`   UNIQUE SALAH: ${c} punya unique constraint, string kosong hanya bisa dipakai sekali. Gunakan NULL.`);
      bad++;
    }
  }
}

console.log(bad === 0 ? `\nSemua ${n} INSERT seimbang.` : `\n${bad} dari ${n} INSERT tidak seimbang.`);
process.exit(bad === 0 ? 0 : 1);
