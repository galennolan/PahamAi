-- Migration 0010_jalur_gafb.sql
-- Tambah jalur G (Generative AI for Beginners) ke check constraint.
-- Jalankan di Supabase SQL Editor setelah 0001_paham_ai.sql.

-- Drop & recreate constraint pada modul (karena kolom jalur CHECK di 0001)
alter table public.modul drop constraint if exists modul_jalur_check;
alter table public.modul add constraint modul_jalur_check check (jalur in ('A','B1','B2','B3','G'));

-- Batch
alter table public.batch drop constraint if exists batch_jalur_check;
alter table public.batch add constraint batch_jalur_check check (jalur in ('A','B1','B2','B3','G'));

-- Peserta
alter table public.peserta drop constraint if exists peserta_jalur_check;
alter table public.peserta add constraint peserta_jalur_check check (jalur in ('A','B1','B2','B3','G'));

-- Pendaftar
alter table public.pendaftar drop constraint if exists pendaftar_jalur_check;
alter table public.pendaftar add constraint pendaftar_jalur_check check (jalur in ('A','B1','B2','B3','G'));

-- Tambah batch GAFB (jika belum ada)
insert into public.batch (kode_batch, jalur, nama_batch, kapasitas_maks, status)
values ('GAFB-01', 'G', 'Generative AI for Beginners — Batch 01', 20, 'terbuka')
on conflict (kode_batch) do nothing;
