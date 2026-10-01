-- Paham AI — migration 0027_pulihkan_objek_yang_hilang.sql
-- Jalankan di Supabase SQL Editor. Aman dijalankan berulang kali (idempotent).
--
-- Latar belakang:
-- Saat audit 2026-09-30 ditemukan objek yang DIDEKLARASIKAN di repo tapi belum
-- pernah ada di database live. Frontend sudah memanggil dan menampilkan datanya,
-- jadi bagian-bagian ini diam-diam rusak:
--
--   1. public.penilaian            (0006) — TIDAK ADA. Tidak ada satu pun INSERT
--      di seluruh src/, dan /progres membaca tabel ini. Rubrik/karya murid tidak
--      pernah bisa dinilai.
--   2. public.jalur                (0011) — TIDAK ADA. /kelola-modul jatuh ke
--      daftar jalur hardcode, dan check constraint jalur masih membeku di
--      modul/batch/peserta/pendaftar sehingga admin tidak bisa menambah jalur.
--   3. public.marketing_content,
--      public.tech_features        (0007) — TIDAK ADA. Dasbor marketing error.
--   4. public.admin_link_anak,
--      public.admin_unlink_anak,
--      public.admin_create_ortu,
--      public.ensure_auth_identity (0015) — TIDAK ADA. /kelola-orang-tua tidak
--      bisa menautkan anak maupun membuat akun wali.
--
-- Yang TIDAK dibuat di sini (sudah ada di DB, sengaja):
--   - public.kerjakan_kuis  → dibuang oleh 0022, digantikan nilai_kuis.
--   - public.handle_updated_at, is_admin, is_staff → dari 0001/0012, sudah ada.

-- =====================================================================
-- 1. public.penilaian  (DML disalin dari 0006; policy RLS baru)
-- =====================================================================
create table if not exists public.penilaian (
  id uuid primary key default gen_random_uuid(),
  sesi_peserta_id uuid not null references public.sesi_peserta(id) on delete cascade,
  rubrik_item text not null,
  skor numeric(5,2),
  bobot_persen numeric(5,2) not null default 0,
  status_kelulusan text check (status_kelulusan in ('belum','revisi','lulus')),
  verified_by uuid references auth.users(id) on delete set null,
  catatan_instruktur text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesi_peserta_id, rubrik_item)
);

drop trigger if exists trg_penilaian_updated on public.penilaian;
create trigger trg_penilaian_updated
  before update on public.penilaian
  for each row execute function public.handle_updated_at();

create index if not exists idx_penilaian_sesi on public.penilaian(sesi_peserta_id);

-- 0006 tidak pernah menulis policy, jadi tabelnya akan terbuka untuk semua
-- kalau RLS tidak diaktifkan. Peserta hanya boleh melihat penilaiannya sendiri.
alter table public.penilaian enable row level security;

drop policy if exists "penilaian_read_own_or_staff" on public.penilaian;
create policy "penilaian_read_own_or_staff" on public.penilaian
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.sesi_peserta sp
      join public.peserta p on p.id = sp.peserta_id
      where sp.id = penilaian.sesi_peserta_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "penilaian_write_staff" on public.penilaian;
create policy "penilaian_write_staff" on public.penilaian
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists "penilaian_update_staff" on public.penilaian;
create policy "penilaian_update_staff" on public.penilaian
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "penilaian_delete_admin" on public.penilaian;
create policy "penilaian_delete_admin" on public.penilaian
  for delete to authenticated
  using (public.is_admin());

-- =====================================================================
-- 2. public.jalur  (DML + seed disalin dari 0011)
-- =====================================================================
create table if not exists public.jalur (
  kode text primary key,
  label text not null,
  deskripsi text,
  urutan int not null default 99,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.jalur (kode, label, deskripsi, urutan) values
  ('A',  'A — Anak',     'Anak 8–14 th · 9 sesi · 60 mnt',                  1),
  ('B1', 'B1 — Pemula',  'Pemula · 7 sesi · 90 mnt',                         2),
  ('B2', 'B2 — Menengah','Menengah · 11 sesi · 120 mnt',                     3),
  ('B3', 'B3 — Expert',  'Expert · 11 sesi · 120–150 mnt',                  4),
  ('G',  'G — GAFB',     'Generative AI for Beginners · 10 sesi · 90 mnt',  5)
on conflict (kode) do update set
  label = excluded.label,
  deskripsi = excluded.deskripsi,
  urutan = excluded.urutan;

-- Lepas check constraint jalur yang masih membeku (0011 belum pernah jalan).
-- Nama constraint di PG dibuat otomatis bila tidak diberi nama eksplisit,
-- jadi yang bernama jelas di-drop langsung, sisanya via pg_constraint.
alter table if exists public.modul     drop constraint if exists modul_jalur_check;
alter table if exists public.batch     drop constraint if exists batch_jalur_check;
alter table if exists public.peserta   drop constraint if exists peserta_jalur_check;
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

-- Setelah ini, jalur valid = baris di tabel ini.
alter table public.jalur enable row level security;
drop policy if exists "jalur_read" on public.jalur;
create policy "jalur_read" on public.jalur for select to authenticated using (true);
drop policy if exists "jalur_write_admin" on public.jalur;
create policy "jalur_write_admin" on public.jalur for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 3. public.marketing_content + public.tech_features  (dari 0007)
-- =====================================================================
create table if not exists public.marketing_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('post_ig','post_fb','artikel_blog','video_script','whatsapp_blast','email_template','landing_copy')),
  target_audience text not null default '',
  topic text not null default '',
  content text not null default '',
  status text not null default 'draft' check (status in ('draft','review','approved','published')),
  platforms text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_content_status on public.marketing_content(status);
create index if not exists idx_marketing_content_type on public.marketing_content(type);

drop trigger if exists trg_marketing_content_updated on public.marketing_content;
create trigger trg_marketing_content_updated
  before update on public.marketing_content
  for each row execute function public.handle_updated_at();

create table if not exists public.tech_features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('platform','content','analytics','automation','community')),
  description text not null default '',
  marketing_value text not null default '',
  implementation_effort text not null default 'sedang' check (implementation_effort in ('rendah','sedang','tinggi')),
  status text not null default 'direncanakan' check (status in ('tersedia','dalam_pengembangan','direncanakan')),
  created_at timestamptz not null default now()
);

create index if not exists idx_tech_features_category on public.tech_features(category);
create index if not exists idx_tech_features_status on public.tech_features(status);

alter table public.marketing_content enable row level security;
drop policy if exists "mc_read_staff" on public.marketing_content;
create policy "mc_read_staff" on public.marketing_content
  for select to authenticated using (public.is_staff());
drop policy if exists "mc_write_marketing" on public.marketing_content;
create policy "mc_write_marketing" on public.marketing_content
  for all to authenticated
  using (public.is_admin() or (auth.jwt() -> 'user_metadata' ->> 'role') = 'marketing')
  with check (public.is_admin() or (auth.jwt() -> 'user_metadata' ->> 'role') = 'marketing');

alter table public.tech_features enable row level security;
drop policy if exists "tf_read_staff" on public.tech_features;
create policy "tf_read_staff" on public.tech_features
  for select to authenticated using (public.is_staff());
drop policy if exists "tf_write_admin" on public.tech_features;
create policy "tf_write_admin" on public.tech_features
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.tech_features (name, category, description, marketing_value, implementation_effort, status) values
  ('PWA installable', 'platform', 'Aplikasi bisa di-install di HP tanpa Play Store', 'Jualan: tanpa install ribet, langsung pakai', 'rendah', 'tersedia'),
  ('Offline-first modul', 'platform', 'Baca modul & catat tanpa internet, sync otomatis', 'Jualan: belajar di desa/kota kecil tanpa sinyal', 'sedang', 'tersedia'),
  ('Dashboard orang tua read-only', 'platform', 'Wali pantau progres anak real-time', 'Jualan: transparansi ke orang tua, trust tinggi', 'rendah', 'tersedia'),
  ('Kuis auto-grade + KKM', 'content', '28 paket soal, nilai otomatis, remedial 1x', 'Jualan: hasil terukur, bukan sekadar ikut kelas', 'rendah', 'tersedia'),
  ('Sertifikat bernomor seri', 'content', 'PAHAI/TAHUN/JALUR/NOMOR, verifikasi online', 'Jualan: bukti kelulusan resmi untuk CV', 'rendah', 'tersedia'),
  ('Notifikasi WA otomatis', 'automation', 'Pengingat jadwal, tagihan, early warning via WA', 'Jualan: tidak ada peserta yang ketinggalan info', 'sedang', 'dalam_pengembangan'),
  ('Payment lock sesi 4+', 'automation', 'Kunci modul otomatis jika cicilan belum lunas', 'Operasional: cashflow aman tanpa nagih manual', 'sedang', 'dalam_pengembangan'),
  ('Analytics sumber pendaftar', 'analytics', 'UTM + referral tracking per pendaftar', 'Jualan: tahu iklan mana yang menghasilkan', 'rendah', 'tersedia')
on conflict do nothing;

-- =====================================================================
-- 4. Fungsi pengelolaan orang tua (dari 0015)
--    auth.identities ada di dua skema dengan bentuk kolom berbeda, jadi
--    insert-nya dibuat dinamis agar aman di keduanya.
-- =====================================================================
create or replace function public.ensure_auth_identity(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
DECLARE
  v_data jsonb := jsonb_build_object('sub', p_user_id, 'email', p_email);
BEGIN
  IF EXISTS (SELECT 1 FROM auth.identities WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id'
  ) THEN
    EXECUTE
      'INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $1::text, $2, ''email'', now(), now())
       ON CONFLICT DO NOTHING'
      USING p_user_id, v_data;
  ELSE
    INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, created_at, updated_at)
    VALUES (p_user_id, p_user_id::text, v_data, 'email', now(), now())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$func$;

drop function if exists public.admin_create_ortu(text, text, text, text, text);
create function public.admin_create_ortu(
  p_email text,
  p_password text,
  p_nama text DEFAULT NULL,
  p_hubungan text DEFAULT 'orang_tua',
  p_no_wa text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
DECLARE
  v_user_id uuid;
  v_parent_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh membuat akun orang tua';
  END IF;

  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email tidak valid';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Password minimal 8 karakter';
  END IF;

  SELECT u.id INTO v_user_id FROM auth.users u WHERE lower(u.email) = v_email;
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Email % sudah terdaftar. Gunakan menu Reset Password.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_sent_at, recovery_sent_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'parent', 'nama_lengkap', COALESCE(p_nama, v_email)),
    now(), now(), now(), now()
  );

  PERFORM public.ensure_auth_identity(v_user_id, v_email);

  INSERT INTO public.parent_user (user_id, hubungan_anak, no_wa_notifikasi, email_notifikasi)
  VALUES (
    v_user_id,
    CASE WHEN p_hubungan IN ('ayah', 'ibu', 'wali') THEN p_hubungan ELSE NULL END,
    p_no_wa,
    v_email
  )
  RETURNING id INTO v_parent_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'parent')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'parent_id', v_parent_id,
    'email', v_email
  );
END;
$func$;

drop function if exists public.admin_link_anak(uuid, uuid);
create function public.admin_link_anak(
  p_parent_id uuid,
  p_peserta_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh menautkan anak';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.parent_user WHERE id = p_parent_id) THEN
    RAISE EXCEPTION 'Akun orang tua tidak ditemukan';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.peserta WHERE id = p_peserta_id) THEN
    RAISE EXCEPTION 'Peserta tidak ditemukan';
  END IF;

  INSERT INTO public.parent_child_link (parent_id, child_id, can_read)
  VALUES (p_parent_id, p_peserta_id, true)
  ON CONFLICT (parent_id, child_id) DO UPDATE SET can_read = true;

  RETURN jsonb_build_object('success', true);
END;
$func$;

drop function if exists public.admin_unlink_anak(uuid, uuid);
create function public.admin_unlink_anak(
  p_parent_id uuid,
  p_peserta_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh melepas tautan anak';
  END IF;

  DELETE FROM public.parent_child_link
  WHERE parent_id = p_parent_id AND child_id = p_peserta_id;

  RETURN jsonb_build_object('success', true);
END;
$func$;

-- Izin pemanggilan. revoke dulu supaya tidak ada jalur open untuk role lain.
revoke all on function public.ensure_auth_identity(uuid, text) from public;
revoke all on function public.admin_create_ortu(text, text, text, text, text) from public;
revoke all on function public.admin_link_anak(uuid, uuid) from public;
revoke all on function public.admin_unlink_anak(uuid, uuid) from public;

grant execute on function public.ensure_auth_identity(uuid, text) to authenticated;
grant execute on function public.admin_create_ortu(text, text, text, text, text) to authenticated;
grant execute on function public.admin_link_anak(uuid, uuid) to authenticated;
grant execute on function public.admin_unlink_anak(uuid, uuid) to authenticated;

-- =====================================================================
-- Verifikasi (boleh dihapus, hanya untuk eyeball di SQL Editor)
-- =====================================================================
-- select 'penilaian' as objek, count(*) from public.penilaian
-- union all select 'jalur', count(*) from public.jalur
-- union all select 'tech_features', count(*) from public.tech_features
-- union all select 'marketing_content', count(*) from public.marketing_content;
