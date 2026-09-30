-- Migration 0019: admin_create_peserta mengisi auth.users selengkap GoTrue
--
-- Bukti dari diagnosa (user yang dibuat GoTrue via Admin API dan bisa login):
--   phone          = NULL    <- NULL, bukan ''. Kolom ini punya UNIQUE
--                              constraint (users_phone_key), jadi '' hanya bisa
--                              dipakai satu user. Postgres membolehkan banyak NULL.
--   is_anonymous   = false
--   is_sso_user    = false
--   aud            = 'authenticated'
--   role           = 'authenticated'
--   confirmation_token = ''   <- string kosong, bukan NULL
--   recovery_token      = ''
--   email_change_token_new      = ''
--   email_change_token_current  = ''
--   email_change_confirm_status = 0
--   phone_change     = ''
--   raw_user_meta_data berisi email_verified
--
-- Versi sebelumnya hanya mengisi sebagian kolom itu, sehingga GoTrue tidak
-- bisa membaca akunnya -> login balas HTTP 500 "Database error loading user".
--
-- Catatan: kolom auth.identities.email adalah GENERATED COLUMN (nilainya
-- diturunkan dari identity_data), jadi tidak boleh ditulis langsung.

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

  -- Hanya kolom yang benar-benar ada di skema auth.users project ini.
  -- Jangan menulis confirmed_at atau identities.email: keduanya GENERATED.
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
    jsonb_build_object('nama_lengkap', trim(p_nama), 'role', 'peserta', 'email_verified', true),
    now(), now()
  );

  -- auth.identities: kolom email itu generated, jadi hanya provider_id
  -- dan identity_data yang boleh ditulis.
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

REVOKE ALL ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) TO authenticated;
