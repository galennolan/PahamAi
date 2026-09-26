-- Paham AI — migration 0002 (RLS policies LENGKAP + fix is_staff scope + tabel baru)
-- Jalankan SETELAH 0001_paham_ai.sql di Supabase SQL Editor.

-- Helper: cek apakah user adalah admin
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'),
    false
  );
$$;

-- Helper: cek apakah user adalah instruktur ATAU admin
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select (auth.jwt() -> 'user_metadata' ->> 'role') in ('instruktur','admin')),
    false
  );
$$;

-- Helper: list peserta id milik parent_user saat ini
create or replace function public.my_child_ids()
returns setof uuid language sql security definer stable as $$
  select l.child_id
  from public.parent_child_link l
  join public.parent_user p on p.id = l.parent_id
  where p.user_id = auth.uid();
$$;

-- Helper: list peserta id milik user saat ini (jika user adalah peserta)
create or replace function public.my_peserta_ids()
returns setof uuid language sql security definer stable as $$
  select p.id from public.peserta p where p.user_id = auth.uid()
  union
  select public.my_child_ids();
$$;

-- Helper: list batch id yang diajar instruktur saat ini
create or replace function public.my_batch_ids()
returns setof uuid language sql security definer stable as $$
  select b.id from public.batch b
  where b.instruktur_utama_fk = auth.uid()
     or b.asisten_fk = auth.uid()
     or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
$$;

-- ============ RLS: batch (admin + instruktur sendiri + semua read) ============
alter table public.batch enable row level security;
drop policy if exists "batch_read" on public.batch;
create policy "batch_read" on public.batch for select to authenticated using (true);
drop policy if exists "batch_write_admin" on public.batch;
create policy "batch_write_admin" on public.batch for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "batch_write_instruktur" on public.batch;
create policy "batch_write_instruktur" on public.batch for all to authenticated using (id in (select public.my_batch_ids())) with check (id in (select public.my_batch_ids()));

-- ============ RLS: modul ============
alter table public.modul enable row level security;
drop policy if exists "modul_read" on public.modul;
create policy "modul_read" on public.modul for select to authenticated using (true);
drop policy if exists "modul_write" on public.modul;
create policy "modul_write" on public.modul for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============ RLS: jadwal_sesi ============
alter table public.jadwal_sesi enable row level security;
drop policy if exists "jadwal_read" on public.jadwal_sesi;
create policy "jadwal_read" on public.jadwal_sesi for select to authenticated using (true);
drop policy if exists "jadwal_write_staff" on public.jadwal_sesi;
create policy "jadwal_write_staff" on public.jadwal_sesi for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============ RLS: peserta ============
alter table public.peserta enable row level security;
drop policy if exists "peserta_read_self" on public.peserta;
create policy "peserta_read_self" on public.peserta
  for select to authenticated
  using (user_id = auth.uid() or id in (select public.my_child_ids()) or public.is_staff());

drop policy if exists "peserta_write_admin" on public.peserta;
create policy "peserta_write_admin" on public.peserta
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ RLS: parent_user ============
alter table public.parent_user enable row level security;
drop policy if exists "parent_read_self" on public.parent_user;
create policy "parent_read_self" on public.parent_user
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists "parent_write_admin" on public.parent_user;
create policy "parent_write_admin" on public.parent_user
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "parent_insert_self" on public.parent_user;
create policy "parent_insert_self" on public.parent_user
  for insert to authenticated
  with check (user_id = auth.uid());

-- ============ RLS: parent_child_link ============
alter table public.parent_child_link enable row level security;
drop policy if exists "pcl_read" on public.parent_child_link;
create policy "pcl_read" on public.parent_child_link
  for select to authenticated
  using (
    public.is_staff()
    or parent_id in (select id from public.parent_user where user_id = auth.uid())
  );

drop policy if exists "pcl_write_admin" on public.parent_child_link;
create policy "pcl_write_admin" on public.parent_child_link
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ RLS: sesi_peserta ============
alter table public.sesi_peserta enable row level security;
drop policy if exists "sp_read" on public.sesi_peserta;
create policy "sp_read" on public.sesi_peserta
  for select to authenticated
  using (
    peserta_id in (select public.my_peserta_ids())
    or public.is_staff()
  );

drop policy if exists "sp_write_staff" on public.sesi_peserta;
create policy "sp_write_staff" on public.sesi_peserta
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============ RLS: absensi ============
alter table public.absensi enable row level security;
drop policy if exists "absensi_read" on public.absensi;
create policy "absensi_read" on public.absensi
  for select to authenticated
  using (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  );

drop policy if exists "absensi_insert_peserta" on public.absensi;
create policy "absensi_insert_peserta" on public.absensi
  for insert to authenticated
  with check (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  );

drop policy if exists "absensi_update_staff" on public.absensi;
create policy "absensi_update_staff" on public.absensi
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============ RLS: catatan_ketik ============
alter table public.catatan_ketik enable row level security;
drop policy if exists "catatan_read" on public.catatan_ketik;
create policy "catatan_read" on public.catatan_ketik
  for select to authenticated
  using (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  );

drop policy if exists "catatan_write_peserta" on public.catatan_ketik;
create policy "catatan_write_peserta" on public.catatan_ketik
  for all to authenticated
  using (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  )
  with check (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  );

-- ============ RLS: learning_sketches ============
alter table public.learning_sketches enable row level security;
drop policy if exists "sketches_read" on public.learning_sketches;
create policy "sketches_read" on public.learning_sketches
  for select to authenticated
  using (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  );

drop policy if exists "sketches_write_peserta" on public.learning_sketches;
create policy "sketches_write_peserta" on public.learning_sketches
  for all to authenticated
  using (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  )
  with check (
    public.is_staff()
    or sesi_peserta_id in (
      select sp.id from public.sesi_peserta sp
      where sp.peserta_id in (select public.my_peserta_ids())
    )
  );

-- ============ RLS: pembayaran ============
alter table public.pembayaran enable row level security;
drop policy if exists "pembayaran_read" on public.pembayaran;
create policy "pembayaran_read" on public.pembayaran
  for select to authenticated
  using (
    peserta_id in (select public.my_peserta_ids())
    or public.is_staff()
  );

drop policy if exists "pembayaran_write_admin" on public.pembayaran;
create policy "pembayaran_write_admin" on public.pembayaran
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ RLS: pendaftar ============
alter table public.pendaftar enable row level security;
drop policy if exists "pendaftar_public_insert" on public.pendaftar;
create policy "pendaftar_public_insert" on public.pendaftar
  for insert to anon, authenticated
  with check (true);

drop policy if exists "pendaftar_admin_read" on public.pendaftar;
create policy "pendaftar_admin_read" on public.pendaftar
  for select to authenticated
  using (public.is_admin());

drop policy if exists "pendaftar_admin_write" on public.pendaftar;
create policy "pendaftar_admin_write" on public.pendaftar
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ RLS: soal_paket ============
alter table public.soal_paket enable row level security;
drop policy if exists "soal_paket_read" on public.soal_paket;
create policy "soal_paket_read" on public.soal_paket for select to authenticated using (true);
drop policy if exists "soal_paket_write_admin" on public.soal_paket;
create policy "soal_paket_write_admin" on public.soal_paket for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ RLS: soal_butir (full hanya staff) ============
alter table public.soal_butir enable row level security;
drop policy if exists "soal_butir_read_staff" on public.soal_butir;
create policy "soal_butir_read_staff" on public.soal_butir
  for select to authenticated
  using (public.is_staff());
drop policy if exists "soal_butir_write_admin" on public.soal_butir;
create policy "soal_butir_write_admin" on public.soal_butir for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ RLS: quiz_attempt ============
alter table public.quiz_attempt enable row level security;
drop policy if exists "quiz_attempt_read" on public.quiz_attempt;
create policy "quiz_attempt_read" on public.quiz_attempt
  for select to authenticated
  using (
    id_peserta_fk in (select public.my_peserta_ids())
    or public.is_staff()
  );

drop policy if exists "quiz_attempt_insert" on public.quiz_attempt;
create policy "quiz_attempt_insert" on public.quiz_attempt
  for insert to authenticated
  with check (
    id_peserta_fk in (select public.my_peserta_ids())
    or public.is_staff()
  );

-- ============ RLS: lesson_plan_segmen ============
alter table public.lesson_plan_segmen enable row level security;
drop policy if exists "lesson_plan_read" on public.lesson_plan_segmen;
create policy "lesson_plan_read" on public.lesson_plan_segmen for select to authenticated using (true);
drop policy if exists "lesson_plan_write_staff" on public.lesson_plan_segmen;
create policy "lesson_plan_write_staff" on public.lesson_plan_segmen for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============ RLS: rubrik ============
alter table public.rubrik enable row level security;
drop policy if exists "rubrik_read" on public.rubrik;
create policy "rubrik_read" on public.rubrik for select to authenticated using (true);
drop policy if exists "rubrik_write_staff" on public.rubrik;
create policy "rubrik_write_staff" on public.rubrik for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============ RLS: studi_kasus ============
alter table public.studi_kasus enable row level security;
drop policy if exists "studi_kasus_read" on public.studi_kasus;
create policy "studi_kasus_read" on public.studi_kasus for select to authenticated using (true);
drop policy if exists "studi_kasus_write_staff" on public.studi_kasus;
create policy "studi_kasus_write_staff" on public.studi_kasus for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============ RLS: portfolio_item ============
alter table public.portfolio_item enable row level security;
drop policy if exists "portfolio_read" on public.portfolio_item;
create policy "portfolio_read" on public.portfolio_item
  for select to authenticated
  using (
    id_peserta_fk in (select public.my_peserta_ids())
    or public.is_staff()
  );

drop policy if exists "portfolio_write_peserta" on public.portfolio_item;
create policy "portfolio_write_peserta" on public.portfolio_item
  for all to authenticated
  using (
    id_peserta_fk in (select public.my_peserta_ids())
    or public.is_staff()
  )
  with check (
    id_peserta_fk in (select public.my_peserta_ids())
    or public.is_staff()
  );

-- ============ RLS: sertifikat ============
alter table public.sertifikat enable row level security;
drop policy if exists "sertifikat_read" on public.sertifikat;
create policy "sertifikat_read" on public.sertifikat
  for select to authenticated
  using (
    id_peserta_fk in (select public.my_peserta_ids())
    or public.is_staff()
  );

drop policy if exists "sertifikat_write_admin" on public.sertifikat;
create policy "sertifikat_write_admin" on public.sertifikat
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ RLS: placement_respons ============
alter table public.placement_respons enable row level security;
drop policy if exists "placement_read" on public.placement_respons;
create policy "placement_read" on public.placement_respons
  for select to authenticated
  using (
    id_pendaftar_fk in (select id from public.pendaftar where email = auth.email())
    or public.is_admin()
  );

drop policy if exists "placement_insert" on public.placement_respons;
create policy "placement_insert" on public.placement_respons
  for insert to authenticated
  with check (
    id_pendaftar_fk in (select id from public.pendaftar where email = auth.email())
    or public.is_admin()
  );

-- ============ RLS: survei_respons ============
alter table public.survei_respons enable row level security;
drop policy if exists "survei_insert_peserta" on public.survei_respons;
create policy "survei_insert_peserta" on public.survei_respons
  for insert to authenticated
  with check (
    id_peserta_fk in (select public.my_peserta_ids())
    or id_parent_fk in (select id from public.parent_user where user_id = auth.uid())
  );

drop policy if exists "survei_read_admin" on public.survei_respons;
create policy "survei_read_admin" on public.survei_respons
  for select to authenticated
  using (public.is_admin());