import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Need SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(url, key);

async function main() {
  // Cek existing
  const { data: { users } } = await sb.auth.admin.listUsers();
  const existing = users.find(u => u.email === 'marketing@paham.ai');

  if (existing) {
    console.log('Marketing user sudah ada:', existing.id);
    // Update role kalau beda
    if (existing.user_metadata?.role !== 'marketing') {
      await sb.auth.admin.updateUserById(existing.id, { user_metadata: { role: 'marketing' } });
      console.log('Role diupdate ke marketing');
    }
    return;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email: 'marketing@paham.ai',
    password: 'Marketing123!',
    email_confirm: true,
    user_metadata: { role: 'marketing' },
  });
  if (error) { console.error('ERR:', error.message); process.exit(1); }
  console.log('OK marketing@paham.ai created:', data.user.id);
}
main().catch(console.error);