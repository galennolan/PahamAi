-- Migration 0014: admin_reset_password RPC
-- RPC untuk admin reset password peserta

-- 1. Buat fungsi RPC admin_reset_password
CREATE FUNCTION public.admin_reset_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $func$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh reset password';
  END IF;

  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password minimal 8 karakter';
  END IF;

  -- Update password di auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Password berhasil direset');
END;
$func$;

-- Izin panggil: hanya admin
REVOKE ALL ON FUNCTION public.admin_reset_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated;