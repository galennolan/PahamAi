import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const migration = readFileSync(
  join(import.meta.dirname ?? '.', '..', '..', 'supabase', 'migrations', '0008_kategori_modul.sql'),
  'utf8',
);

const sql =
  'alter table if exists public.modul add column if not exists materi_peserta_md text; ' +
  'create index if not exists idx_modul_has_materi on public.modul((materi_peserta_md is not null));';

const { data, error } = await supabase.rpc('exec', { sql });
console.log('rpc exec error:', error?.message ?? 'none', 'data:', JSON.stringify(data));
