-- Paham AI — migration 0052: tutup role escalation + hardening RPC
--
-- Jalankan SETELAH 0051. Idempotent, tidak menghapus data.
--
-- Latar belakang:
-- Tiga policy RLS membaca `auth.jwt() -> 'user_metadata' ->> 'role'`.
-- `user_metadata` diisi OLEH PENGGUNA saat signup dan bisa diubah sendiri
-- kapan saja lewat `PUT /auth/v1/user`. Artinya user biasa bisa berbohong
-- tentang role-nya lalu lolos policy `for all` (baca/tulis/hapus).
-- Sumber kebenaran role adalah tabel `public.user_roles`, yang hanya bisa
-- ditulis oleh admin. Semua pengecekan di bawah sekarang memakai
-- `public.is_admin()` / `public.is_staff()`, bukan JWT.


-- ============ 1. Tutup celah role escalation ============
-- 1a. my_kelas_ids(): hapus cabang JWT, andalkan user_roles saja.
create or replace function public.my_kelas_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select k.id
    from public.kelas k
   where k.instruktur_utama_fk = auth.uid()
      or k.asisten_fk = auth.uid()
      or public.is_admin();
$$;

-- 1b. Policy marketing: pakai user_roles, bukan metadata JWT.
drop policy if exists "marketing_campaign_write" on public.marketing_campaign;
drop policy if exists "mc_write_marketing" on public.marketing_campaign;

create policy "marketing_campaign_write" on public.marketing_campaign
  for all to authenticated
  using (public.is_admin() or public.has_role('marketing'))
  with check (public.is_admin() or public.has_role('marketing'));

-- Helper role generic supaya policy tidak perlu copy-paste query user_roles.
create or replace function public.has_role(p_role text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
     where user_id = auth.uid()
       and role = p_role
  );
$$;

grant execute on function public.has_role(text) to authenticated;


-- ============ 2. Hardening fungsi security definer ============
-- 2a. ensure_auth_identity(): WAJIB admin. Sebelumnya grant ke seluruh
-- `authenticated`, sehingga user biasa bisa menyuntik baris ke
-- auth.identities milik user lain — jalur take-over akun yang tidak diaudit.
create or replace function public.ensure_auth_identity(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_data jsonb := jsonb_build_object('sub', p_user_id, 'email', p_email);
begin
  -- Fungsi ini hanya supportive untuk admin_create_ortu / admin_link_anak.
  -- Dipanggil sebagai helper, jadi pemanggilnya sudah checked; tapi tetap
  -- dikunci agar tidak bisa diserialisasi langsung dari klien.
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menjalankan fungsi ini'
      using errcode = '42501';
  end if;

  if exists (select 1 from auth.identities where user_id = p_user_id) then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'identities' and column_name = 'id'
  ) then
    execute
      'insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
       values (gen_random_uuid(), $1, $1::text, $2, ''email'', now(), now())
       on conflict do nothing'
      using p_user_id, v_data;
  else
    insert into auth.identities (user_id, provider_id, identity_data, provider, created_at, updated_at)
    values (p_user_id, p_user_id::text, v_data, 'email', now(), now())
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.ensure_auth_identity(uuid, text) from public;
grant execute on function public.ensure_auth_identity(uuid, text) to authenticated;

-- 2b. search_path kosong untuk helper yang dipakai di dalam policy.
-- Tanpa ini, search_path bisa dimanipulasi lewat objek di schema lain.
alter function public.is_admin()            set search_path = '';
alter function public.is_staff()            set search_path = '';
alter function public.my_child_ids()        set search_path = '';
alter function public.my_peserta_ids()      set search_path = '';
alter function public.has_role(text)        set search_path = '';
alter function public.my_kelas_ids()        set search_path = '';
alter function public.my_own_sesi_peserta_ids() set search_path = '';

-- Fungsi-fungsi di atas sekarang resolve nama relatif terhadap ''.
-- Semua nama objek yang mereka pakai sudah di-qualify (public.*, auth.*),
-- jadi tidak ada perubahan perilaku.


-- ============ 3. Batasi hapus master data ke admin ============
-- Tutor (instruktur) boleh menulis soal & sesi, tapi tidak boleh menghapus
-- seluruh paket soal / modul / jadwal — itu keputusan kurikulum, bukan
-- keputusan operasional kelas. Ganti `for all` menjadi insert/update saja
-- untuk role non-admin.
drop policy if exists "soal_paket_write_staff" on public.soal_paket;
create policy "soal_paket_write_staff" on public.soal_paket
  for insert to authenticated with check (public.is_staff());
create policy "soal_paket_update_staff" on public.soal_paket
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "soal_paket_delete_admin" on public.soal_paket
  for delete to authenticated using (public.is_admin());

drop policy if exists "soal_butir_write_staff" on public.soal_butir;
create policy "soal_butir_write_staff" on public.soal_butir
  for insert to authenticated with check (public.is_staff());
create policy "soal_butir_update_staff" on public.soal_butir
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "soal_butir_delete_admin" on public.soal_butir
  for delete to authenticated using (public.is_admin());


-- ============ 4. Batasi pendaftaran publik ============
-- `pendaftar_public_insert` menerima insert dari anon tanpa batas, jadi
-- siapa pun bisa menyetor baris palsu. Tetap buka untuk form publik, tapi
-- batasi supaya tidak bisa menyamar sudah diverifikasi.
drop policy if exists "pendaftar_public_insert" on public.pendaftar;
create policy "pendaftar_public_insert" on public.pendaftar
  for insert to anon, authenticated
  with check (status = 'pending');

-- Halaman pendaftaran mencoba cek duplikat lewat select, tapi policy select
-- hanya mengizinkan admin — jadi pengecekan itu selalu gagal. Kasih policy
-- select terbatas supaya dedupe benar-benar bekerja.
create policy "pendaftar_public_dedupe_check" on public.pendaftar
  for select to anon, authenticated
  using (status = 'pending');