-- Migration 0015: perbaikan login peserta + pengelolaan akun orang tua
--
-- Masalah yang diperbaiki:
-- 1. admin_reset_password lama selalu mengembalikan sukses walau user tidak ada
--    di auth.users, dan tidak pernah membuat baris auth.identities.
--    GoTrue menolak login bila baris identities tidak ada, sehingga password
--    "sudah direset" tapi peserta tetap tidak bisa masuk.
-- 2. Belum ada RPC untuk membuat akun orang tua, sehingga akun ortu hanya bisa
--    dibuat manual di database dan tidak ada UI untuk mengatur/reset password-nya.

-- ============ 0. helper: pastikan baris auth.identities ada ============
-- auth.identities pada schema berbeda butuh kolom id (uuid) atau tidak,
-- jadi insert-nya dibuat dinamis agar aman di kedua skema.
CREATE OR REPLACE FUNCTION public.ensure_auth_identity(p_user_id uuid, p_email text)
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

-- ============ 1. admin_reset_password (diperkuat) ============
-- Drop dulu supaya aman dijalankan berulang kali / setelah 0014.
DROP FUNCTION IF EXISTS public.admin_reset_password(uuid, text);
CREATE FUNCTION public.admin_reset_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
DECLARE
  v_email text;
  v_updated int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh reset password';
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password minimal 8 karakter';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User dengan id % tidak ada di auth.users. Akun belum pernah dibuat.', p_user_id;
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = p_user_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Gagal memperbarui password untuk %', p_email;
  END IF;

  -- Tanpa ini, GoTrue menolak login walau password benar.
  PERFORM public.ensure_auth_identity(p_user_id, v_email);

  -- Paksa pengguna login ulang dengan sesi lama.
  DELETE FROM auth.sessions WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password berhasil direset',
    'email', v_email
  );
END;
$func$;

-- ============ 2. admin_create_ortu: buat akun orang tua ============
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

  -- Cegah duplikat: kalau akunnya sudah ada, jangan buat ulang.
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

-- ============ 3. admin_link_anak: tautkan anak ke orang tua ============
DROP FUNCTION IF EXISTS public.admin_link_anak(uuid, uuid);
CREATE FUNCTION public.admin_link_anak(
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

-- ============ 4. admin_unlink_anak ============
DROP FUNCTION IF EXISTS public.admin_unlink_anak(uuid, uuid);
CREATE FUNCTION public.admin_unlink_anak(
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

-- ============ 5. izin pemanggilan ============
REVOKE ALL ON FUNCTION public.ensure_auth_identity(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_ortu(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_link_anak(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_unlink_anak(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_ortu(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_anak(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlink_anak(uuid, uuid) TO authenticated;

-- Helper dipakai oleh fungsi lain, tidak perlu dibuka ke user.
GRANT EXECUTE ON FUNCTION public.ensure_auth_identity(uuid, text) TO authenticated;
