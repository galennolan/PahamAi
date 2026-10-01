-- Migration 0025: fungsi hapus peserta beserta auth.users
-- Dijalankan dengan service role (SECURITY DEFINER)
--
-- Keamanan: despite SECURITY DEFINER, fungsi ini memanggil auth.users, jadi
-- WAJIB dijaga sendiri. Hanya admin dan instruktur yang boleh memanggil;
-- execute TIDAK diberikan ke authenticated secara blanket karena role
-- `peserta` dan `parent` termasuk dalam role itu dan bisa mengarbir auth.users.

create or replace function public.delete_peserta_with_auth(p_peserta_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- 只有 staff (admin/instruktur) yang boleh menghapus akun peserta
  if not public.is_staff() then
    raise exception 'Hanya admin atau instruktur yang bisa menghapus peserta'
      using errcode = '42501';
  end if;

  -- Ambil user_id dari peserta
  select user_id into v_user_id
  from public.peserta
  where id = p_peserta_id;

  if v_user_id is null then
    raise exception 'Peserta tidak ditemukan';
  end if;

  -- Hapus auth.users (cascade ke peserta via FK ON DELETE CASCADE)
  delete from auth.users
  where id = v_user_id;

  if not found then
    raise exception 'User auth tidak ditemukan';
  end if;
end;
$$;

-- Revoke dulu, lalu Berikan hanya kepada yang memang boleh memanggil.
-- `authenticated` tetap diberi grant supaya PostgREST bisa menjangkau fungsi,
-- tetapi authorizesivi ditegakkan di dalam body (is_staff) di atas.
revoke all on function public.delete_peserta_with_auth(uuid) from public;
grant execute on function public.delete_peserta_with_auth(uuid) to authenticated;