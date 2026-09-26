import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const r = await supabase.rpc('graphql', { query: '{__typename}' });
console.log('graphql err:', r.error?.message ?? 'ok', JSON.stringify(r.data).slice(0, 200));
