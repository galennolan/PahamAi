-- Migration 0021: instruktur (tutor) boleh tulis soal_paket & soal_butir
--
-- Sebelumnya write policy kedua tabel hanya is_admin(), sehingga tutor yang
-- membuka /kelola-soal bisa membaca tapi gagal menyimpan (RLS menolak).
-- modul_write sudah is_staff() sejak 0002, jadi tidak diubah.
-- is_staff() sendiri sudah aman (0012): cek tabel user_roles dulu.

-- ============ RLS: soal_paket write untuk staff ============
drop policy if exists "soal_paket_write_admin" on public.soal_paket;
drop policy if exists "soal_paket_write_staff" on public.soal_paket;
create policy "soal_paket_write_staff" on public.soal_paket
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============ RLS: soal_butir write untuk staff ============
drop policy if exists "soal_butir_write_admin" on public.soal_butir;
drop policy if exists "soal_butir_write_staff" on public.soal_butir;
create policy "soal_butir_write_staff" on public.soal_butir
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
