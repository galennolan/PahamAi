-- Migration 0021: registrasi akun peserta/ortu yang PASTI bisa login
--
-- Bukti kegagalan (dihitung langsung lewat API, bukan asumsi):
--   POST /auth/v1/token?grant_type=password  -> 500 "Database error querying schema"
--   GET  /auth/v1/admin/users/{id}          -> 500 "Database error loading user"
--   GET  /auth/v1/admin/users               -> 500 "Database error finding users"
--   POST /rest/v1/rpc/admin_reset_password   -> 200 sukses, tapi login tetap 500
--                                               (jadi auth.identities bukan penyebab)
--
-- Akar masalah: baris auth.users yang di-INSERT langsung (lewat RPC
-- admin_create_peserta / admin_create_ortu versi lama) menyisakan NULL di kolom
-- yang GoTrue baca sebagai string. GoTrue tidak bisa me-scan baris itu, dan
-- setiap permintaan login/daftar user oleh admin ikut gagal karena query yang
-- sama menabrak baris rusak tersebut.
--
-- Akun yang dibuat lewat GoTrue Admin API (seed / signup) aman karena GoTrue
-- sendiri sudah mengisi kolom-kolom itu dengan string kosong.
--
-- Isi migration ini:
--   1. Normalisasi ulang SEMUA baris auth.users yang rusak (idempoten).
--   2. Trigger BEFORE INSERT sebagai penjaga permanen: baris auth.users baru
--      selalu dinormalisasi, dari jalur mana pun (RPC, SQL manual, edge case
--      di masa depan). Ini yang membuat perbaikannya permanen, bukan sekali jalan.
--   3. ensure_auth_identity versi aman.
--   4. admin_create_peserta versi lengkap (ganti versi 0016).
--   5. admin_create_ortu versi lengkap (bug yang sama belum pernah diperbaiki).
--   6. Query verifikasi di akhir.
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> tempel seluruh isi file ini
-- -> Run. Aman dijalankan berulang kali.

-- ============ 1. normalisasi baris yang sudah rusak ============
-- Kolom phone SENGAJA tidak disentuh: kolom itu punya UNIQUE constraint
-- (users_phone_key) sehingga hanya satu user boleh memakai string kosong.
-- GoTrue juga bisa membaca phone = NULL tanpa masalah.
UPDATE auth.users SET
  instance_id                 = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'),
  aud                         = coalesce(aud, 'authenticated'),
  role                        = coalesce(role, 'authenticated'),
  confirmation_token          = coalesce(confirmation_token, ''),
  recovery_token              = coalesce(recovery_token, ''),
  email_change                = coalesce(email_change, ''),
  email_change_token_new      = coalesce(email_change_token_new, ''),
  email_change_token_current  = coalesce(email_change_token_current, ''),
  email_change_confirm_status = coalesce(email_change_confirm_status, 0),
  reauthentication_token      = coalesce(reauthentication_token, ''),
  phone_change                = coalesce(phone_change, ''),
  phone_change_token          = coalesce(phone_change_token, ''),
  is_sso_user                 = coalesce(is_sso_user, false),
  is_anonymous                = coalesce(is_anonymous, false),
  raw_app_meta_data           = coalesce(raw_app_meta_data, '{}'::jsonb),
  raw_user_meta_data          = coalesce(raw_user_meta_data, '{}'::jsonb)
WHERE instance_id IS NULL
   OR aud IS NULL
   OR role IS NULL
   OR confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR email_change_confirm_status IS NULL
   OR reauthentication_token IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR is_sso_user IS NULL
   OR is_anonymous IS NULL
   OR raw_app_meta_data IS NULL
   OR raw_user_meta_data IS NULL;

-- ============ 2. penjaga permanen: trigger BEFORE INSERT ============
-- Dipakai hanya saat INSERT, sehingga tidak mengganggu logika GoTrue saat login
-- maupun saat update token. Nilai yang diisi persis sama dengan yang diisi
-- GoTrue sendiri untuk user yang bisa login (string kosong, bukan NULL).
CREATE OR REPLACE FUNCTION public.normalize_auth_user_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
BEGIN
  NEW.instance_id                 := coalesce(NEW.instance_id, '00000000-0000-0000-0000-000000000000');
  NEW.aud                         := coalesce(NEW.aud, 'authenticated');
  NEW.role                        := coalesce(NEW.role, 'authenticated');
  NEW.confirmation_token          := coalesce(NEW.confirmation_token, '');
  NEW.recovery_token              := coalesce(NEW.recovery_token, '');
  NEW.email_change                := coalesce(NEW.email_change, '');
  NEW.email_change_token_new      := coalesce(NEW.email_change_token_new, '');
  NEW.email_change_token_current  := coalesce(NEW.email_change_token_current, '');
  NEW.email_change_confirm_status := coalesce(NEW.email_change_confirm_status, 0);
  NEW.reauthentication_token      := coalesce(NEW.reauthentication_token, '');
  NEW.phone_change                := coalesce(NEW.phone_change, '');
  NEW.phone_change_token          := coalesce(NEW.phone_change_token, '');
  NEW.is_sso_user                 := coalesce(NEW.is_sso_user, false);
  NEW.is_anonymous                := coalesce(NEW.is_anonymous, false);
  NEW.raw_app_meta_data           := coalesce(NEW.raw_app_meta_data, '{}'::jsonb);
  NEW.raw_user_meta_data          := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  -- phone dibiarkan: UNIQUE constraint, harus NULL supaya tidak bentrok.
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS normalize_auth_user_row_trg ON auth.users;
CREATE TRIGGER normalize_auth_user_row_trg
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.normalize_auth_user_row();

-- ============ 3. ensure_auth_identity: provider_id harus berisi email ============
-- auth.identities.email adalah GENERATED COLUMN diturunkan dari identity_data,
-- jadi kolom itu tidak boleh ditulis langsung.
CREATE OR REPLACE FUNCTION public.ensure_auth_identity(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
DECLARE
  v_email text := lower(trim(p_email));
  v_data jsonb;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email tidak boleh kosong';
  END IF;

  v_data := jsonb_build_object(
    'sub', p_user_id,
    'email', v_email,
    'email_verified', true,
    'phone_verified', false
  );

  UPDATE auth.identities
  SET provider_id = v_email,
      identity_data = v_data,
      updated_at = now()
  WHERE user_id = p_user_id
    AND provider = 'email'
    AND (provider_id IS DISTINCT FROM v_email
         OR identity_data IS DISTINCT FROM v_data);

  IF EXISTS (SELECT 1 FROM auth.identities WHERE user_id = p_user_id AND provider = 'email') THEN
    RETURN;
  END IF;

  INSERT INTO auth.identities (
    user_id, provider_id, identity_data, provider, created_at, updated_at
  ) VALUES (
    p_user_id, v_email, v_data, 'email', now(), now()
  )
  ON CONFLICT DO NOTHING;
END;
$func$;

-- Buang sisa identity duplikat per (user_id, provider) bila ada.
WITH duplikat AS (
  SELECT
    ctid,
    row_number() OVER (PARTITION BY user_id, provider ORDER BY created_at NULLS LAST) AS rn
  FROM auth.identities
)
DELETE FROM auth.identities i
USING duplikat d
WHERE i.ctid = d.ctid AND d.rn > 1;

-- Normalkan provider_id + identity_data seluruh baris yang masih salah.
UPDATE auth.identities i
SET provider_id = lower(u.email),
    identity_data = jsonb_build_object(
      'sub', i.user_id,
      'email', lower(u.email),
      'email_verified', true,
      'phone_verified', false
    ),
    updated_at = now()
FROM auth.users u
WHERE u.id = i.user_id
  AND i.provider = 'email'
  AND u.email IS NOT NULL
  AND (
    i.provider_id IS DISTINCT FROM lower(u.email)
    OR i.identity_data->>'email' IS DISTINCT FROM lower(u.email)
  );

-- ============ 4. admin_create_peserta: versi lengkap ============
DROP FUNCTION IF EXISTS public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text);
CREATE FUNCTION public.admin_create_peserta(
  p_email text,
  p_password text,
  p_nama text,
  p_jalur text DEFAULT 'A',
  p_no_wa text DEFAULT NULL,
  p_no_wa_ortu text DEFAULT NULL,
  p_email_ortu text DEFAULT NULL,
  p_usia int DEFAULT NULL,
  p_batch_id uuid DEFAULT NULL,
  p_kelas_penempatan text DEFAULT 'baru-kenal-hp'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
DECLARE
  v_user_id uuid;
  v_peserta_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh membuat peserta';
  END IF;

  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email tidak valid';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Password minimal 8 karakter';
  END IF;
  IF p_nama IS NULL OR trim(p_nama) = '' THEN
    RAISE EXCEPTION 'Nama wajib diisi';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'Email % sudah terdaftar. Gunakan menu Reset Password.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  -- Kolom auth.identities.email adalah GENERATED, jadi tidak boleh ditulis.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, invited_at,
    confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at,
    email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at,
    phone, phone_change, phone_confirmed_at, phone_change_token, phone_change_sent_at,
    is_sso_user, is_anonymous, deleted_at, banned_until, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(), NULL,
    '', NULL,
    '', NULL,
    '', '', NULL,
    '', 0,
    '', NULL,
    NULL, NULL, NULL, '', NULL,
    false, false, NULL, NULL, NULL,
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nama_lengkap', trim(p_nama), 'nama', trim(p_nama), 'role', 'peserta', 'email_verified', true),
    now(), now()
  );

  INSERT INTO auth.identities (
    user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id,
    v_email,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NULL, now(), now()
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.peserta (
    user_id, nama_lengkap, email, jalur, no_wa, no_wa_ortu,
    email_ortu, usia, batch_id, kelas_penempatan,
    consent_privasi, consent_etika, byod
  ) VALUES (
    v_user_id, trim(p_nama), v_email, p_jalur, p_no_wa, p_no_wa_ortu,
    p_email_ortu, p_usia, p_batch_id, p_kelas_penempatan,
    true, true, true
  )
  RETURNING id INTO v_peserta_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'peserta')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('user_id', v_user_id, 'peserta_id', v_peserta_id, 'email', v_email);
END;
$func$;

-- ============ 5. admin_create_ortu: versi lengkap ============
-- Versi lama (0015) hanya mengisi sebagian kolom auth.users, bug yang sama
-- dengan peserta: akun orang tua hasil pembuatan dari UI tidak bisa login.
DROP FUNCTION IF EXISTS public.admin_create_ortu(text, text, text, text, text);
CREATE FUNCTION public.admin_create_ortu(
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
    email_confirmed_at, invited_at,
    confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at,
    email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at,
    phone, phone_change, phone_confirmed_at, phone_change_token, phone_change_sent_at,
    is_sso_user, is_anonymous, deleted_at, banned_until, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(), NULL,
    '', NULL,
    '', NULL,
    '', '', NULL,
    '', 0,
    '', NULL,
    NULL, NULL, NULL, '', NULL,
    false, false, NULL, NULL, NULL,
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nama_lengkap', COALESCE(p_nama, v_email), 'nama', COALESCE(p_nama, v_email), 'role', 'parent', 'email_verified', true),
    now(), now()
  );

  INSERT INTO auth.identities (
    user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id,
    v_email,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NULL, now(), now()
  )
  ON CONFLICT DO NOTHING;

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

-- ============ 6. izin pemanggilan ============
REVOKE ALL ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_ortu(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_auth_identity(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_ortu(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_auth_identity(uuid, text) TO authenticated;

-- ============ 7. verifikasi ============
-- Harus mengembalikan 0 baris. Kalau masih ada baris, login masih akan 500.
SELECT count(*) AS masih_rusak
FROM auth.users
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR email_change_confirm_status IS NULL
   OR reauthentication_token IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR is_sso_user IS NULL
   OR is_anonymous IS NULL;

-- Trigger penjaga permanen harus aktif.
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
