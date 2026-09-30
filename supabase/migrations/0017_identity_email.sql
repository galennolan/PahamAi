-- Migration 0017: lengkapi identity_data pada auth.identities
--
-- TEMUAN: kolom auth.identities.email adalah GENERATED COLUMN, nilainya
-- diturunkan dari identity_data ->> 'email'. Jadi email TIDAK boleh ditulis
-- langsung (PostgreSQL menolak: 428C9 "can only be updated to DEFAULT").
--
-- Akun yang bisa login (murid2@paham.ai) punya identity_data yang memuat email.
-- Akun yang gagal punya identity_data yang tidak lengkap.
-- Perbaikan:normalkan provider_id + identity_data, biarkan kolom email
-- mengikuti sendiri sebagai generated column.

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

  -- Perbaiki baris yang sudah ada (kalau ada).
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

  -- Belum punya baris identity: buat baru. Kolom email sengaja tidak
  -- disebut karena itu generated column.
  INSERT INTO auth.identities (
    user_id, provider_id, identity_data, provider, created_at, updated_at
  ) VALUES (
    p_user_id, v_email, v_data, 'email', now(), now()
  )
  ON CONFLICT DO NOTHING;
END;
$func$;

-- Normalkan seluruh baris yang salah. Kolom email tidak disentuh.
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
