-- Paham AI — migration 0006 (catatan manual + link tldraw)
-- Jalankan SETELAH 0002_rls_policies.sql di Supabase SQL Editor.

-- 1. Tambah kolom link tldraw pada catatan_ketik
alter table public.catatan_ketik
  add column if not exists tldraw_url text;

-- 2. Pastikan ada unique constraint untuk upsert per sesi_peserta
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'catatan_ketik_sesi_peserta_id_key'
      and conrelid = 'public.catatan_ketik'::regclass
  ) then
    alter table public.catatan_ketik
      add constraint catatan_ketik_sesi_peserta_id_key unique (sesi_peserta_id);
  end if;
end $$;

-- 3. Catatan boleh kosong (hanya link tldraw), jadi longgarkan NOT NULL
alter table public.catatan_ketik
  alter column catatan_text drop not null;

-- 4. Trigger updated_at
drop trigger if exists trg_catatan_updated on public.catatan_ketik;
create trigger trg_catatan_updated
  before update on public.catatan_ketik
  for each row execute function public.handle_updated_at();

-- 5. Index untuk query catatan peserta
create index if not exists idx_catatan_sesi_peserta
  on public.catatan_ketik(sesi_peserta_id);
