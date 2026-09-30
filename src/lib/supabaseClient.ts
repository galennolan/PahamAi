import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const REQUEST_TIMEOUT_MS = 15000;

export const supabaseEnvMissing = !supabaseUrl || !supabaseAnonKey;

if (supabaseEnvMissing) {
  console.warn(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset. Salin .env.example menjadi .env lalu isi nilainya.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    global: {
      // supabase-js tidak punya timeout bawaan. Tanpa ini, satu request yang
      // stalled (mis. proyek Supabase cold-start) menggantung promise selamanya
      // dan halaman yang menunggunya tidak pernah keluar dari spinner.
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
    },
  },
);
