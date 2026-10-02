-- Paham AI — migration 0053: akses baca pendaftar untuk marketing
--
-- Jalankan SETELAH 0052 (atau mandiri — semua objek dibuat kondisional).
-- Idempotent, tidak menghapus data.
--
-- Latar belakang:
-- Dashboard marketing (/marketing) dan Beranda marketing membaca tabel
-- `pendaftar`, tetapi policy select-nya hanya mengizinkan admin
-- (`pendaftar_admin_read` dari 0002). Akibatnya role marketing selalu
-- mendapat hasil kosong. Migration ini memberi hak BACA (tanpa tulis)
-- kepada role marketing lewat tabel `user_roles` — bukan JWT metadata.

-- Helper has_role() dibuat di 0052; pastikan ada walau 0052 belum jalan.
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

revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated;

-- Baca pendaftar untuk marketing. Tulis tetap admin saja.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'pendaftar' and policyname = 'pendaftar_marketing_read'
  ) then
    execute $q$
      create policy "pendaftar_marketing_read" on public.pendaftar
        for select to authenticated
        using (public.is_admin() or public.has_role('marketing'))
    $q$;
  end if;
end $$;

-- Modul katalog memang untuk dibaca semua user login (sudah ada modul_read),
-- jadi tidak perlu policy tambahan di sini.
