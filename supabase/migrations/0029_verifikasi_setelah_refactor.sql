-- Paham AI — query verifikasi setelah 0028_kelas_dan_modul.sql
-- Jalankan sebagai query TERPISAH setelah 0028 sukses.
-- Semua kolom "harus" harus bernilai 0.

-- ============ 1. Tidak ada yang menunjuk kelas yang tidak ada ============
select 'jadwal_sesi tanpa kelas' as cek, count(*) as harus
  from public.jadwal_sesi j
  left join public.kelas k on k.id = j.kelas_id
 where k.id is null
union all
select 'peserta tanpa kelas', count(*)
  from public.peserta p
  left join public.kelas k on k.id = p.kelas_id
 where p.kelas_id is not null and k.id is null
union all
select 'sesi_peserta tanpa sesi', count(*)
  from public.sesi_peserta sp
  left join public.jadwal_sesi j on j.id = sp.sesi_id
 where j.id is null
union all
select 'sesi_peserta tanpa peserta', count(*)
  from public.sesi_peserta sp
  left join public.peserta p on p.id = sp.peserta_id
 where p.id is null;

-- ============ 2. Penugasan harus sinkron dengan kelas peserta ============
select 'penugasan lintas kelas' as cek, count(*) as harus
  from public.sesi_peserta sp
  join public.peserta p on p.id = sp.peserta_id
  join public.jadwal_sesi j on j.id = sp.sesi_id
 where p.kelas_id is not null
   and j.kelas_id is distinct from p.kelas_id
union all
select 'anggota kelas tanpa sesi sama sekali', count(*)
  from public.peserta p
  join public.kelas k on k.id = p.kelas_id
 where not exists (
   select 1 from public.sesi_peserta sp
    where sp.peserta_id = p.id
 );

-- ============ 3. Sisa kolom jalur / batch harus nihil ============
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and column_name in ('jalur', 'batch_id');

select 'tabel batch masih ada' as cek,
       case when to_regclass('public.batch') is null then 0 else 1 end as harus;

select 'fungsi my_batch_ids masih ada' as cek,
       case when to_regprocedure('public.my_batch_ids()') is null then 0 else 1 end as harus;

-- ============ 4. Jumlah data tidak boleh berubah ============
select
  (select count(*) from public.kelas)        as kelas,
  (select count(*) from public.modul)        as modul,
  (select count(*) from public.peserta)      as peserta,
  (select count(*) from public.jadwal_sesi)  as jadwal,
  (select count(*) from public.sesi_peserta) as penugasan,
  (select count(*) from public.soal_paket)   as paket_soal,
  (select count(*) from public.rubrik)       as rubrik,
  (select count(*) from public.pendaftar)    as pendaftar;

-- Bandingkan dengan backup:
select 'selisih jadwal vs backup' as cek,
       (select count(*) from public.jadwal_sesi) - (select count(*) from private.bak_jadwal_sesi_0027)
  as selisih,
  'sebelumnya 20 jadwal, 2 duplikat dihapus, 1 penugasan nyasar dihapus, 1 ditambahkan'
  as catatan;

-- ============ 5. Jam dan kode sesi sudah rapi ============
select 'jam selesai <= jam mulai' as cek, count(*) as harus
  from public.jadwal_sesi
 where jam_mulai is not null and jam_akhir is not null
   and jam_akhir <= jam_mulai
union all
select 'kode sesi beda dari kode modul', count(*)
  from public.jadwal_sesi j
  join public.modul m on m.id = j.modul_id
 where j.kode_sesi_friendly is distinct from m.kode
union all
select 'jadwal duplikat per kelas', count(*)
  from (
    select kode_sesi_friendly, kelas_id
      from public.jadwal_sesi
     group by kode_sesi_friendly, kelas_id
    having count(*) > 1
  ) d;

-- ============ 6. Backup utuh ============
select 'peserta' as tabel, (select count(*) from private.bak_peserta_0027) as baris
union all select 'batch',        (select count(*) from private.bak_batch_0027)
union all select 'jadwal_sesi',  (select count(*) from private.bak_jadwal_sesi_0027)
union all select 'sesi_peserta', (select count(*) from private.bak_sesi_peserta_0027)
union all select 'modul',        (select count(*) from private.bak_modul_0027)
union all select 'soal_paket',   (select count(*) from private.bak_soal_paket_0027);
