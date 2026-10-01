-- Migration 0026: unique constraint peserta.user_id
-- Dedup existing: keep oldest row per user_id, delete rest (cascade removes related data)

-- 1. Hapus duplikat (simpan yang created_at paling awal)
delete from public.peserta p
where exists (
  select 1 from public.peserta p2
  where p2.user_id = p.user_id
    and p2.created_at < p.created_at
);

-- 2. Buat unique index
create unique index if not exists ux_peserta_user_id on public.peserta(user_id);