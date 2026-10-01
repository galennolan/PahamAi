-- Paham AI — migration 0030_catatan_tldraw.sql
-- Jalankan di Supabase SQL Editor. Aman dijalankan berulang kali (idempotent).
--
-- Latar belakang:
-- Frontend sudah memakai catatan manual + link tldraw, tapi migration
-- 0006_catatan_tldraw.sql belum pernah diterapkan ke database. Akibatnya
-- halaman Catatan dan panel tldraw di Sesi gagal dengan:
--
--   Could not find the 'tldraw_url' column of 'catatan_ketik' in the schema cache
--
-- Selain kolom yang belum ada, dua hal lain juga belum sesuai dengan cara
-- frontend menulis:
--   1. catatan_text masih NOT NULL, padahal frontend menyimpan null saat
--      murid hanya menempel link tldraw tanpa teks
--      (src/services/catatan.ts, src/pages/Catatan.tsx).
--   2. belum ada unique constraint sesi_peserta_id, padahal kedua tempat
--      memakai .upsert(..., { onConflict: 'sesi_peserta_id' }).

-- 1. Kolom link tldraw (tanpa NOT NULL, boleh kosong)
alter table public.catatan_ketik
  add column if not exists tldraw_url text;

-- 2. Catatan boleh kosong (hanya link tldraw), jadi longgarkan NOT NULL.
--    alter_column sudah idempotent, aman dijalankan berulang kali.
alter table public.catatan_ketik
  alter column catatan_text drop not null;

-- 3. Unique constraint untuk upsert per sesi_peserta.
--    Dicek lewat pg_index, bukan pg_constraint, supaya tetap terdeteksi
--    kalau unique-nya dibuat sebagai index (bukan constraint) atau
--    Constraint-nya bernama lain hasil auto-generated PostgreSQL.
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = 'public.catatan_ketik'::regclass
      and i.indisunique
      and i.indnatts = 1
      and a.attname = 'sesi_peserta_id'
  ) then
    alter table public.catatan_ketik
      add constraint catatan_ketik_sesi_peserta_id_key unique (sesi_peserta_id);
  end if;
end $$;

-- 4. Trigger updated_at
drop trigger if exists trg_catatan_updated on public.catatan_ketik;
create trigger trg_catatan_updated
  before update on public.catatan_ketik
  for each row execute function public.handle_updated_at();

-- 5. Index untuk query catatan peserta
create index if not exists idx_catatan_sesi_peserta
  on public.catatan_ketik(sesi_peserta_id);

-- =====================================================================
-- Verifikasi (boleh dihapus, hanya untuk eyeball di SQL Editor)
-- =====================================================================
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'catatan_ketik'
-- order by ordinal_position;
