-- Migration 0013: admin_create_peserta RPC & email_ortu
-- RPC untuk admin membuat akun peserta dari frontend tanpa service role key

-- 1. Tambah kolom email_ortu
ALTER TABLE public.peserta
  ADD COLUMN IF NOT EXISTS email_ortu text;

-- 2. Buat fungsi RPC admin_create_peserta
CREATE OR REPLACE FUNCTION public.admin_create_peserta(
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
AS $$
DECLARE
  v_user_id uuid;
  v_peserta_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh membuat peserta';
  END IF;

  -- Hash password
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'peserta', 'nama_lengkap', p_nama),
    now(), now()
  )
  RETURNING id INTO v_user_id;

  -- Identity row
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email',
    now(), now(), now()
  );

  -- Session (optional, not needed for login but required by some GoTrue versions)
  INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '{}', now(), now())
  ON CONFLICT DO NOTHING;

  -- Insert identity for provider
  INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '{}', now(), now())
  ON CONFLICT DO NOTHING;

  -- Insert into peserta
  INSERT INTO public.peserta (
    user_id, nama_lengkap, email, jalur, no_wa, no_wa_ortu,
    email_ortu, usia, batch_id, kelas_penempatan,
    consent_privasi, consent_etika, byod
  ) VALUES (
    v_user_id, p_nama, p_email, p_jalur, p_no_wa, p_no_wa_ortu,
    p_email_ortu, p_usia, p_batch_id, p_kelas_penempatan,
    true, true, true
  )
  RETURNING id INTO v_peserta_id;

  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'peserta')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('user_id', v_user_id, 'peserta_id', v_peserta_id);
END;
$$;

-- 3. RLS: hanya admin bisa panggil
REVOKE ALL ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_peserta(text, text, text, text, text, text, text, int, uuid, text) TO authenticated;
