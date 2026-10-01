-- Paham AI — migration 0024 (pembenahan data penugasan & jadwal)
-- Jalankan di Supabase SQL Editor SETELAH 0023.
--
-- Menjelaskan alasan "/belajar menampilkan modul yang belum diberikan tutor":
-- penugasan tutor dicatat di `sesi_peserta` (dibuat otomatis saat tutor membuat
-- sesi di KelolaSesi), sementara penugasan itu tidak sinkron dengan
-- `peserta.batch_id` dan `peserta.jalur`. Migration ini merapikan tanpa
-- menghapus data peserta.

-- ============ 1. Jalur peserta harus sama dengan jalur batchnya ============
-- Aturan umum, bukan kasus per kasus. Batch AEFS-01 jalur G, tapi joko masih
-- berjalur A dan prabowo masih B1 padahal di batch B3.
update public.peserta p
   set jalur = b.jalur,
       updated_at = now()
  from public.batch b
 where p.batch_id = b.id
   and p.jalur is distinct from b.jalur;

-- ============ 2. Buang penugasan yang menunjuk sesi batch lain ============
-- joko masih punya 2 sesi_peserta ke sesi B201/B202 milik batch PAHAI-B2-2601,
-- padahal batch-nya AEFS-01. Sesi-nya sendiri tidak dihapus, hanya penugasannya.
delete from public.sesi_peserta
 where id in (
   select sp.id
     from public.sesi_peserta sp
     join public.peserta p on p.id = sp.peserta_id
     join public.jadwal_sesi j on j.id = sp.sesi_id
    where p.batch_id is not null
      and j.batch_id is distinct from p.batch_id
 );

-- ============ 3. Buang jadwal duplikat dalam satu batch ============
-- Batch GAFB-01 punya G01 dan G02 masing-masing 2 baris. Yang dipertahankan
-- adalah yang tanggalnya paling awal (sesuai rentang batch 2026-01-09 s/d
-- 2026-03-13). Baris yang sudah punya peserta tidak pernah dihapus.
delete from public.jadwal_sesi j
 where j.id in (
   select dup.id
     from (
       select id,
              row_number() over (
                partition by kode_sesi_friendly, batch_id
                order by tanggal_kelas nulls last, created_at
              ) as rn
         from public.jadwal_sesi
     ) dup
    where dup.rn > 1
      and not exists (select 1 from public.sesi_peserta sp where sp.sesi_id = dup.id)
 );

-- ============ 4. Kode sesi ikut kode modul ============
-- Ada sesi ber-kode "wadada" padahal mod-nya A01. Nama sesi di tabel lain sudah
-- memakai kode modul (A01, B201, G01, ...).
update public.jadwal_sesi j
   set kode_sesi_friendly = m.kode
  from public.modul m
 where j.modul_id = m.id
   and j.kode_sesi_friendly is distinct from m.kode
   and not exists (
     select 1 from public.jadwal_sesi o
      where o.batch_id = j.batch_id
        and o.kode_sesi_friendly = m.kode
   );

-- ============ 5. Jam selesai harus setelah jam mulai ============
-- Kolom jam berupa `time` (tanpa tanggal), jadi sesi malam tetap bisa ditulis
-- sebagai jam saja. Tiga sesi Bermasalah: "wadada" 22:18-22:18 (nol menit),
-- B201 19:29-18:29, dan B301 23:00-05:00. Jam selesai dihitung ulang dari
-- durasi modul.
with perbaiki as (
  select j.id,
         (j.jam_mulai + make_interval(mins => m.durasi_menit))::time as jam_akhir_baru
    from public.jadwal_sesi j
    join public.modul m on m.id = j.modul_id
   where j.jam_mulai is not null
     and j.jam_akhir is not null
     and j.jam_akhir <= j.jam_mulai
)
update public.jadwal_sesi j
   set jam_akhir = p.jam_akhir_baru
  from perbaiki p
 where j.id = p.id;

-- ============ 6. Lengkapi penugasan peserta yang tertinggal ============
-- Sesi A01 di batch PAHAI-A-2601 dibuat sebelum Siti Rahma masuk ke batch itu,
-- sehingga dia punya batch tapi tidak punya satu pun sesi_peserta.
-- KelolaSesi sudah otomatis memberi sesi ke semua anggota batch saat sesi dibuat,
-- jadi langkah ini hanya menyusul kasus yang tertinggal, bukan mengubah aturan.
-- Hapus blok ini kalau memang ada peserta yang hanya boleh di-assign sebagian sesi.
insert into public.sesi_peserta (sesi_id, peserta_id)
select j.id, p.id
  from public.jadwal_sesi j
  join public.peserta p on p.batch_id = j.batch_id
 where not exists (
   select 1 from public.sesi_peserta sp
    where sp.sesi_id = j.id and sp.peserta_id = p.id
 );

-- ============ Verifikasi ============
notify pgrst, 'reload schema';
