-- Migration 0012: Tabel user_roles untuk verifikasi role server-side
-- Masalah: is_admin()/is_staff() baca dari JWT user_metadata yang bisa di-set user sendiri
-- Solusi: simpan role di tabel user_roles, cek via security definer function

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','instruktur','peserta','parent','marketing')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Index untuk lookup cepat
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);

-- RLS: user hanya bisa lihat role sendiri; admin bisa lihat semua
alter table public.user_roles enable row level security;
drop policy if exists "user_roles_read_self" on public.user_roles;
create policy "user_roles_read_self" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_roles_write_admin" on public.user_roles;
create policy "user_roles_write_admin" on public.user_roles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Update is_admin() untuk cek tabel user_roles dulu, fallback ke JWT metadata
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )),
    (select (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'),
    false
  );
$$;

-- Update is_staff() untuk cek tabel user_roles dulu, fallback ke JWT metadata
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('instruktur','admin')
    )),
    (select (auth.jwt() -> 'user_metadata' ->> 'role') in ('instruktur','admin')),
    false
  );
$$;

-- Migrasi data existing: copy role dari user_metadata ke user_roles
insert into public.user_roles (user_id, role)
select id, user_metadata->>'role'
from auth.users
where user_metadata->>'role' in ('admin','instruktur','peserta','parent','marketing')
on conflict (user_id, role) do nothing;
