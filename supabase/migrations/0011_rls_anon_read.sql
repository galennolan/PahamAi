-- Migration 0011: Fix RLS — izinkan anon read untuk tabel publik
-- Masalah: policy "to authenticated" memblokir anon key (dipakai app untuk fetch modul/jadwal)
-- Solusi: tambah policy "to anon" untuk SELECT pada tabel publik

-- modul: anon boleh baca
drop policy if exists "modul_read_anon" on public.modul;
create policy "modul_read_anon" on public.modul for select to anon using (true);

-- jadwal_sesi: anon boleh baca
drop policy if exists "jadwal_read_anon" on public.jadwal_sesi;
create policy "jadwal_read_anon" on public.jadwal_sesi for select to anon using (true);

-- batch: anon boleh baca
drop policy if exists "batch_read_anon" on public.batch;
create policy "batch_read_anon" on public.batch for select to anon using (true);

-- soal_paket: anon boleh baca
drop policy if exists "soal_paket_read_anon" on public.soal_paket;
create policy "soal_paket_read_anon" on public.soal_paket for select to anon using (true);

-- lesson_plan_segmen: anon boleh baca
drop policy if exists "lesson_plan_read_anon" on public.lesson_plan_segmen;
create policy "lesson_plan_read_anon" on public.lesson_plan_segmen for select to anon using (true);

-- rubrik: anon boleh baca
drop policy if exists "rubrik_read_anon" on public.rubrik;
create policy "rubrik_read_anon" on public.rubrik for select to anon using (true);

-- studi_kasus: anon boleh baca
drop policy if exists "studi_kasus_read_anon" on public.studi_kasus;
create policy "studi_kasus_read_anon" on public.studi_kasus for select to anon using (true);
