-- Paham AI — migration 0027 (backup data sebelum refactor)
-- JALANKAN FILE INI DULUAN, terpisah, sebelum 0028_kelas_dan_modul.sql.
--
-- 0028 menghapus tabel `batch` dan kolom `jalur`. Setelah itu, satu-satunya
-- cara kembali adalah memulihkan seluruh database. Tabel backup ini adalah
-- jaring pengamannya.
--
-- Backup ditaruh di schema `private`, bukan `public`, supaya tidak ikut
-- terekspos lewat PostgREST REST API (tabel `public` bisa dibaca anybody
-- yang punya anon key, dan isinya berisi NIK/alamat peserta).

create schema if not exists private;

create table if not exists private.bak_peserta_0027      as table public.peserta;
create table if not exists private.bak_batch_0027        as table public.batch;
create table if not exists private.bak_jadwal_sesi_0027  as table public.jadwal_sesi;
create table if not exists private.bak_sesi_peserta_0027 as table public.sesi_peserta;
create table if not exists private.bak_modul_0027        as table public.modul;
create table if not exists private.bak_soal_paket_0027   as table public.soal_paket;
create table if not exists private.bak_rubrik_0027       as table public.rubrik;
create table if not exists private.bak_pendaftar_0027    as table public.pendaftar;
create table if not exists private.bak_survei_0027       as table public.survei_respons;

-- Tabel `kelas` belum ada saat file ini dijalankan, jadi tidak ikut di-backup.
-- Data-nya ada penuh di `private.bak_batch_0027`.

-- Backup dari setiap tabel harus terisi. Kalau ada yang 0, berhenti di sini.
do $$
declare
  r       record;
  v_total bigint;
begin
  for r in
    select * from (values
      ('bak_peserta_0027',      (select count(*) from public.peserta)),
      ('bak_batch_0027',        (select count(*) from public.batch)),
      ('bak_jadwal_sesi_0027',  (select count(*) from public.jadwal_sesi)),
      ('bak_sesi_peserta_0027', (select count(*) from public.sesi_peserta)),
      ('bak_modul_0027',        (select count(*) from public.modul)),
      ('bak_soal_paket_0027',   (select count(*) from public.soal_paket))
    ) as t(nama, jumlah)
  loop
    execute format('select count(*) from private.%I', r.nama) into v_total;
    if v_total <> r.jumlah then
      raise exception 'Backup % gagal: hope-nya %, tersimpan %',
        r.nama, r.jumlah, v_total;
    end if;
    raise notice 'OK  % = % baris', rpad(r.nama, 24), v_total;
  end loop;
end $$;

notify pgrst, 'reload schema';
