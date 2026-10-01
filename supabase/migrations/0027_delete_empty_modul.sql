-- Migration 0027: hapus modul "kosong"
--
-- Kriteria kosong (harus memenuhi SEMUA):
--   1. Tidak ada jadwal_sesi yang mereferensikan modul_id
--   2. Tidak ada materi: content_md kosong DAN slide_url kosong
--   3. Tidak ada soal_paket yang menargetkan modul ini (via sesi_target)
--   4. Tidak ada soal_butir yang menempel pada paket milik modul ini
--
-- Catatan: `soal_butir` tidak punya kolom modul_id — butir menempel pada
-- `soal_paket` lewat `kode_paket`. Jadi lewat di kode paket yang targeting
-- modul ini. Syarat 3 sudah menutup jalur itu secara tidak langsung, tapi
-- dicek eksplisit supaya modul yang somehow punya paket tanpa sesi_target
-- ikut terlindungi.
--
-- Migration ini aman dijalankan berulang kali dan tidak menyentuh modul yang
-- masih dipakai. Verifikasi 2026-10-01: kandidat hapus = 0 modul.

with empty_modul as (
  select m.id
  from public.modul m
  where not exists (
    select 1 from public.jadwal_sesi js where js.modul_id = m.id
  )
  and (m.content_md is null or m.content_md = '')
  and (m.slide_url is null or m.slide_url = '')
  and not exists (
    select 1 from public.soal_paket sp where sp.sesi_target = m.kode
  )
  and not exists (
    select 1
      from public.soal_paket sp
      join public.soal_butir sb on sb.kode_paket = sp.kode_paket
     where sp.sesi_target = m.kode
  )
)
delete from public.modul
where id in (select id from empty_modul);