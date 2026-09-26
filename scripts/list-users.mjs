import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Need SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(url, key);

const { data, error } = await sb.auth.admin.listUsers();
if (error) { console.error('ERR:', error.message); process.exit(1); }
console.log('Total users:', data.users.length);
for (const u of data.users) {
  console.log(`- ${u.email} | role=${u.user_metadata?.role ?? '-'} | id=${u.id}`);
}
