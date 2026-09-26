-- Paham AI — migration 0009_split_materi_peserta.sql
-- Pisah konten guru (content_md) vs konten peserta (materi_peserta_md).
-- content_md = lesson plan instruktur lengkap (tetap).
-- materi_peserta_md = materi bersih untuk peserta (tanpa tabel timing, troubleshooting).

alter table if exists public.modul
  add column if not exists materi_peserta_md text;

create index if not exists idx_modul_has_materi on public.modul((materi_peserta_md is not null));
