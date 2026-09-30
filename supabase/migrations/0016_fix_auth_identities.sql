-- Migration 0016: perbaiki auth.identities yang rusak (provider_id salah)
--
-- Akar masalah login peserta:
--   GoTrue mencari user lewat auth.identities dengan kondisi
--   provider = 'email' AND provider_id = <email>.
--   Tapi baris yang dibuat migration 0013 dan hack di halaman KelolaUser
--   mengisi provider_id dengan user UUID, bukan email.
--   Akibatnya login mengembalikan HTTP 500 "Database error".
--
-- Yang dilakukan:
-- 1. Buang identity yang duplikat per (user_id, provider).
-- 2. Betulkan provider_id jadi email asli + lengkapi identity_data.
-- 3. Perbaiki ensure_auth_identity agar tidak mengulang kesalahan yang sama.
-- 4. Perbaiki admin_create_peserta (sekalian tambah proteksi email duplikat).

-- ============ 1. hapus identity duplikat ============
-- Pakai ctid karena beberapa skema auth.identities tidak punya kolom id.
WITH duplikat AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY user_id, provider
      ORDER BY created_at NULLS LAST
    ) AS rn
  FROM auth.identities
)
DELETE FROM auth.identities i
USING duplikat d
WHERE i.ctid = d.ctid AND d.rn > 1;

-- ============ 2. betulkan provider_id jadi email ============
UPDATE auth.identities i
SET
  provider_id = (SELECT lower(u.email) FROM auth.users u WHERE u.id = i.user_id),
  identity_data = jsonb_build_object(
    'sub', i.user_id,
    'email', (SELECT lower(u.email) FROM auth.users u WHERE u.id = i.user_id),
    'email_verified', true,
    'phone_verified', false
  ),
  updated_at = now()
WHERE i.provider = 'email'
  AND i.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id AND u.email IS NOT NULL)
  AND i.provider_id IS DISTINCT FROM (SELECT lower(u.email) FROM auth.users u WHERE u.id = i.user_id);

-- ============ 3. ensure_auth_identity diperbaiki ============
-- Tidak perlu drop: signature dan return type sama, jadi OR REPLACE aman.
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

  -- Kalau baris identity ada tapi provider_id-nya salah, betulkan.
  UPDATE auth.identities
  SET provider_id = v_email,
      identity_data = jsonb_build_object(
        'sub', p_user_id, 'email', v_email,
        'email_verified', true, 'phone_verified', false
      ),
      updated_at = now()
  WHERE user_id = p_user_id
    AND provider = 'email'
    AND provider_id IS DISTINCT FROM v_email;

  IF EXISTS (SELECT 1 FROM auth.identities WHERE user_id = p_user_id AND provider = 'email') THEN
    RETURN;
  END IF;

  v_data := jsonb_build_object(
    'sub', p_user_id, 'email', v_email,
    'email_verified', true, 'phone_verified', false
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id'
  ) THEN
    EXECUTE
      'INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, ''email'', now(), now())
       ON CONFLICT DO NOTHING'
      USING p_user_id, v_email, v_data;
  ELSE
    INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, created_at, updated_at)
    VALUES (p_user_id, v_email, v_data, 'email', now(), now())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$func$;

-- ============ 4. admin_create_peserta diperbaiki ============
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

  -- Cegah email duplikat: dua akun dengan email sama bikin login ambigu.
  IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email) THEN
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
    jsonb_build_object('role', 'peserta', 'nama_lengkap', p_nama),
    now(), now(), NULL, NULL
  );

  -- provider_id WAJIB berisi email, bukan user UUID.
  PERFORM public.ensure_auth_identity(v_user_id, v_email);

  INSERT INTO public.peserta (
    user_id, nama_lengkap, email, jalur, no_wa, no_wa_ortu,
    email_ortu, usia, batch_id, kelas_penempatan,
    consent_privasi, consent_etika, byod
  ) VALUES (
    v_user_id, p_nama, v_email, p_jalur, p_no_wa, p_no_wa_ortu,
    p_email_ortu, p_usia, p_batch_id, p_kelas_penempatan,
    true, true, true
  )
  RETURNING id INTO v_peserta_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'peserta')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('user_id', v_user_id, 'peserta_id', v_peserta_id);
END;
$func$;

-- ============ 5. izin ============
REVOKE ALL ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) TO authenticated;
