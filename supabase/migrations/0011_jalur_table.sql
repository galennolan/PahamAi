-- Paham AI — migration 0011_jalur_table.sql
-- Jalankan di Supabase SQL Editor.
-- Tabel jalur menggantikan hardcode check constraint agar admin bisa tambah jalur baru dari UI.
-- Jalur valid = baris di tabel ini (bukan enum/check constraint).

create table if not exists public.jalur (
  kode text primary key,
  label text not null,
  deskripsi text,
  urutan int not null default 99,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.jalur (kode, label, deskripsi, urutan) values
  ('A',  'A — Anak',    'Anak 8–14 th · 9 sesi · 60 mnt',        1),
  ('B1', 'B1 — Pemula', 'Pemula · 7 sesi · 90 mnt',               2),
  ('B2', 'B2 — Menengah','Menengah · 11 sesi · 120 mnt',          3),
  ('B3', 'B3 — Expert', 'Expert · 11 sesi · 120–150 mnt',         4),
  ('G',  'G — GAFB',    'Generative AI for Beginners · 10 sesi · 90 mnt', 5)
on conflict (kode) do update set
  label = excluded.label,
  deskripsi = excluded.deskripsi,
  urutan = excluded.urutan;

-- Drop semua check constraint jalur yang menghalangi kode baru.
-- Nama constraint di PG auto-generated jika tidak diberi nama eksplisit,
-- jadi drop yang namanya diketahui dari migration sebelumnya.
alter table if exists public.modul drop constraint if exists modul_jalur_check;
alter table if exists public.batch drop constraint if exists batch_jalur_check;
alter table if exists public.peserta drop constraint if exists peserta_jalur_check;
alter table if exists public.pendaftar drop constraint if exists pendaftar_jalur_check;

do $$
declare r record;
begin
  for r in (
    select conname, conrelid::regclass as tbl
    from pg_constraint
    where contype = 'c' and conrelid in ('public.modul'::regclass,'public.batch'::regclass,'public.peserta'::regclass,'public.pendaftar'::regclass,'public.soal_paket'::regclass,'public.rubrik'::regclass,'public.sertifikat'::regclass)
      and pg_get_constraintdef(oid) like '%jalur%'
  ) loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- RLS untuk tabel jalur: semua authenticated bisa baca, hanya admin bisa tulis.
alter table public.jalur enable row level security;
drop policy if exists "jalur_read" on public.jalur;
create policy "jalur_read" on public.jalur for select to authenticated using (true);
drop policy if exists "jalur_write_admin" on public.jalur;
create policy "jalur_write_admin" on public.jalur for all to authenticated using (public.is_admin()) with check (public.is_admin());
