-- Paham AI — migration 0008_kategori_modul.sql
-- Tambah kolom kategori pada tabel modul + index + backfill dari kode.

alter table if exists public.modul
  add column if not exists kategori text check (
    kategori in ('FND','TOOL','PRMP','PROD','ETHC','CODE','AUTO','ARCH','PROJ','PRES')
  );

create index if not exists idx_modul_kategori on public.modul(kategori);
create index if not exists idx_modul_jalur_kategori on public.modul(jalur, kategori, urutan_sesi);

-- Backfill: isi kategori otomatis dari kode modul yang sudah ada.
update public.modul set kategori = 'FND' where kode in ('A01','A02','B101');
update public.modul set kategori = 'TOOL' where kode in ('A03','A04','A05','B102');
update public.modul set kategori = 'PRMP' where kode in ('B103','B201','B202');
update public.modul set kategori = 'PROD' where kode in ('B104','B203');
update public.modul set kategori = 'ETHC' where kode in ('A06','A07','B105','B204','B307');
update public.modul set kategori = 'CODE' where kode in ('B205','B207','B208');
update public.modul set kategori = 'AUTO' where kode in ('B206','B303','B304');
update public.modul set kategori = 'ARCH' where kode in ('B301','B302','B305','B306');
update public.modul set kategori = 'PROJ' where kode in ('A08','B106','B209','B211','B308','B310','B311');
update public.modul set kategori = 'PRES' where kode in ('A09','B107','B210','B309');

-- Fallback: apabila kategori belum terisi, isi otomatis dari keyword judul.
update public.modul set kategori =
  case
    when kategori is null and (lower(judul) like '%etika%' or lower(judul) like '%keamanan%' or lower(judul) like '%bias%') then 'ETHC'
    when kategori is null and lower(judul) like '%prompt%' then 'PRMP'
    when kategori is null and lower(judul) like '%presentasi%' then 'PRES'
    when kategori is null and (lower(judul) like '%proyek%' or lower(judul) like '%capstone%') then 'PROJ'
    when kategori is null then 'FND'
    else kategori
  end
where kategori is null;
