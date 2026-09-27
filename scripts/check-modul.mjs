import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await s.from('modul').select('jalur,kode');
const { count, error: e2 } = await s.from('modul').select('id', { count: 'exact', head: true });
const counts = (data ?? []).reduce((a, c) => { a[c.jalur] = (a[c.jalur]||0)+1; return a; }, {});
console.log('Total:', count, 'Error:', error?.message ?? 'none');
console.log('By jalur:', counts);
