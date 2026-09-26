-- Paham AI — migration 0009 (fix RLS absensi untuk peserta)
-- Jalankan di Supabase SQL Editor SETELAH 0002_rls_policies.sql.
--
-- MASALAH:
--   markAttendance() memakai upsert(onConflict: 'sesi_peserta_id').
--   Kalau baris absensi sudah ada, PostgREST menjalankan
--   ON CONFLICT DO UPDATE. Policy "absensi_update_staff" hanya
--   mengizinkan public.is_staff(), sehingga peserta yang tries
--   mengubah statusnya sendiri kena error:
--     new row violates row-level security policy (USING expression)
--     for table "absensi"
--
-- PERBAIKAN:
--   1. UPDATE absensi boleh untuk staff ATAU baris milik peserta sendiri.
--   2. DELETE absensi untuk rollback (khusus peserta, sebelum diverifikasi staff).
--   3. Helper my_own_sesi_peserta_ids() supaya policy ringkas & konsisten.

-- ============ Helper: sesi_peserta yang dimiliki peserta saat ini ============
create or replace function public.my_own_sesi_peserta_ids()
returns setof uuid language sql security definer stable as $$
  select sp.id
  from public.sesi_peserta sp
  where sp.peserta_id in (select public.my_peserta_ids());
$$;

-- ============ UPDATE: staff atau peserta sendiri ============
drop policy if exists "absensi_update_staff" on public.absensi;
create policy "absensi_update_staff" on public.absensi
  for update to authenticated
  using (
    public.is_staff()
    or sesi_peserta_id in (select public.my_own_sesi_peserta_ids())
  )
  with check (
    public.is_staff()
    or sesi_peserta_id in (select public.my_own_sesi_peserta_ids())
  );

-- ============ DELETE: staff atau peserta sendiri (rollback sebelum verifikasi) ============
drop policy if exists "absensi_delete_own" on public.absensi;
create policy "absensi_delete_own" on public.absensi
  for delete to authenticated
  using (
    public.is_staff()
    or (
      sesi_peserta_id in (select public.my_own_sesi_peserta_ids())
      and verified_by is null
    )
  );

-- ============ Grantee ============
grant execute on function public.my_own_sesi_peserta_ids() to authenticated;
