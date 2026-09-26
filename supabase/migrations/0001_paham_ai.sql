-- Paham AI — migration 0001 (schema inti LENGKAP + fix unique + kolom tambahan)
-- Jalankan di Supabase Dashboard > SQL Editor (copy-paste seluruh file ini).

create extension if not exists "pgcrypto";

-- ============ updated_at trigger ============
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ batch (tambah instruktur FK) ============
create table if not exists public.batch (
  id uuid primary key default gen_random_uuid(),
  kode_batch text not null unique,
  jalur text not null check (jalur in ('A','B1','B2','B3')),
  nama_batch text,
  status text not null default 'terbuka' check (status in ('terbuka','berjalan','selesai','dibatalkan')),
  tanggal_mulai date,
  tanggal_akhir date,
  kapasitas_maks int,
  terdaftar int not null default 0,
  instruktur_utama_fk uuid references auth.users(id) on delete set null,
  asisten_fk uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ modul ============
create table if not exists public.modul (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  judul text not null,
  jalur text not null check (jalur in ('A','B1','B2','B3')),
  urutan_sesi int not null default 1,
  durasi_menit int not null default 60,
  content_md text,
  slide_url text,
  offline_material_path text,
  created_at timestamptz not null default now()
);

-- ============ jadwal_sesi ============
create table if not exists public.jadwal_sesi (
  id uuid primary key default gen_random_uuid(),
  modul_id uuid not null references public.modul(id) on delete cascade,
  batch_id uuid not null references public.batch(id) on delete cascade,
  kode_sesi_friendly text not null,
  judul_sesi text not null,
  tanggal_kelas date,
  jam_mulai time,
  jam_akhir time,
  link_rapat text,
  lokasi text,
  status_sesi text not null default 'belum' check (status_sesi in ('belum','berlangsung','selesai','dibatalkan')),
  catatan_instruktur text,
  created_at timestamptz not null default now()
);

-- ============ peserta ============
create table if not exists public.peserta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama_lengkap text not null,
  nama_panggil text,
  tanggal_lahir date,
  usia int,
  kelas_penempatan text,
  jalur text check (jalur in ('A','B1','B2','B3')),
  batch_id uuid references public.batch(id) on delete set null,
  nik text,
  no_wa text,
  email text,
  alamat text,
  pekerjaan_status text,
  byod boolean default true,
  consent_privasi boolean default false,
  consent_etika boolean default false,
  no_wa_ortu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ parent_user + parent_child_link ============
create table if not exists public.parent_user (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hubungan_anak text check (hubungan_anak in ('ayah','ibu','wali')),
  no_wa_notifikasi text,
  email_notifikasi text,
  created_at timestamptz not null default now()
);

create table if not exists public.parent_child_link (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parent_user(id) on delete cascade,
  child_id uuid not null references public.peserta(id) on delete cascade,
  can_read boolean not null default true,
  created_at timestamptz not null default now(),
  unique (parent_id, child_id)
);

-- ============ sesi_peserta ============
create table if not exists public.sesi_peserta (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references public.jadwal_sesi(id) on delete cascade,
  peserta_id uuid not null references public.peserta(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (sesi_id, peserta_id)
);

-- ============ absensi ============
create table if not exists public.absensi (
  id uuid primary key default gen_random_uuid(),
  sesi_peserta_id uuid not null references public.sesi_peserta(id) on delete cascade,
  status_kehadiran text not null check (status_kehadiran in ('hadir','izin','alpha','telat')),
  menit_telat int not null default 0,
  verified_by uuid references auth.users(id) on delete set null,
  latitude numeric,
  longitude numeric,
  device_info text,
  sync_status text not null default 'pending' check (sync_status in ('pending','synced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesi_peserta_id)
);

-- ============ catatan_ketik ============
create table if not exists public.catatan_ketik (
  id uuid primary key default gen_random_uuid(),
  sesi_peserta_id uuid not null references public.sesi_peserta(id) on delete cascade,
  catatan_text text not null,
  status_pengumpulan boolean not null default false,
  sync_status text not null default 'pending' check (sync_status in ('pending','synced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesi_peserta_id)
);

-- ============ learning_sketches (tldraw) ============
create table if not exists public.learning_sketches (
  id uuid primary key default gen_random_uuid(),
  sesi_peserta_id uuid not null references public.sesi_peserta(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  sync_status text not null default 'pending' check (sync_status in ('pending','synced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesi_peserta_id)
);

-- ============ pembayaran ============
create table if not exists public.pembayaran (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid not null references public.peserta(id) on delete cascade,
  biaya_total numeric(12,2) not null,
  dibayar numeric(12,2) not null default 0,
  due_date date,
  status_bayar text not null default 'belum_bayar' check (status_bayar in ('belum_bayar','cicilan','lunas')),
  lock_status text not null default 'terbuka' check (lock_status in ('terbuka','terkunci')),
  sesi_lock_id uuid references public.jadwal_sesi(id) on delete set null,
  metode text,
  bukti_transfer_url text,
  refund_status text default 'tidak_ajukan' check (refund_status in ('tidak_ajukan','diajukan','disetujui','ditolak')),
  rollover_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ pendaftar ============
create table if not exists public.pendaftar (
  id uuid primary key default gen_random_uuid(),
  nama_lengkap text not null,
  email text,
  no_wa text,
  jalur text check (jalur in ('A','B1','B2','B3')),
  usia int,
  status text not null default 'pending' check (status in ('pending','verifying','rejected','approved')),
  catatan_admin text,
  nik text,
  alamat text,
  pekerjaan_status text,
  consent_privasi boolean default false,
  consent_etika boolean default false,
  no_wa_ortu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ BARU: soal_paket & soal_butir ============
create table if not exists public.soal_paket (
  id uuid primary key default gen_random_uuid(),
  kode_paket varchar not null unique,
  jalur text check (jalur in ('A','B1','B2','B3')),
  tipe text check (tipe in ('kuis','pre_test','post_test')),
  sesi_target varchar(20),
  durasi_menit int default 15,
  created_at timestamptz not null default now()
);

create table if not exists public.soal_butir (
  id uuid primary key default gen_random_uuid(),
  kode_paket varchar not null references public.soal_paket(kode_paket) on delete cascade,
  no_soal int not null,
  pertanyaan text not null,
  pilihan_a text,
  pilihan_b text,
  pilihan_c text,
  pilihan_d text,
  kunci text,
  pembahasan text,
  bobot_skor decimal not null,
  created_at timestamptz not null default now(),
  unique (kode_paket, no_soal)
);

-- View aman untuk peserta (tanpa kunci & pembahasan)
create or replace view public.soal_butir_view as
select id, kode_paket, no_soal, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, bobot_skor, created_at
from public.soal_butir;

-- ============ BARU: quiz_attempt (support remedial/attempt_no) ============
create table if not exists public.quiz_attempt (
  id uuid primary key default gen_random_uuid(),
  id_peserta_fk uuid not null references public.peserta(id) on delete cascade,
  kode_paket varchar not null references public.soal_paket(kode_paket) on delete cascade,
  no_soal int not null,
  attempt_no int not null default 1,
  jawaban text,
  benar boolean,
  skor decimal,
  waktu timestamptz not null default now(),
  unique (id_peserta_fk, kode_paket, no_soal, attempt_no)
);

-- ============ BARU: lesson_plan_segmen ============
create table if not exists public.lesson_plan_segmen (
  id uuid primary key default gen_random_uuid(),
  modul_id uuid not null references public.modul(id) on delete cascade,
  segmen_ke int not null,
  judul text not null,
  durasi_menit int not null,
  talking_points text,
  antisipasi text,
  plan_b text,
  created_at timestamptz not null default now(),
  unique (modul_id, segmen_ke)
);

-- ============ BARU: rubrik ============
create table if not exists public.rubrik (
  id uuid primary key default gen_random_uuid(),
  jalur text check (jalur in ('A','B1','B2','B3')),
  aspek text not null,
  level_1 text,
  level_2 text,
  level_3 text,
  level_4 text,
  bobot decimal not null default 0,
  kritis boolean default false,
  created_at timestamptz not null default now()
);

-- ============ BARU: studi_kasus ============
create table if not exists public.studi_kasus (
  id uuid primary key default gen_random_uuid(),
  kode varchar not null unique,
  judul text not null,
  konteks text not null,
  bahan text not null,
  diskusi text[] not null,
  kunci_instruktur text,
  durasi_menit int default 15,
  sesi_target varchar(20),
  created_at timestamptz not null default now()
);

-- ============ BARU: portfolio_item ============
create table if not exists public.portfolio_item (
  id uuid primary key default gen_random_uuid(),
  id_peserta_fk uuid not null references public.peserta(id) on delete cascade,
  kode_sesi varchar(10) not null,
  item_url text,
  item_type text check (item_type in ('tldraw','github','google_colab','file','image')),
  tanggal date,
  deskripsi text,
  created_at timestamptz not null default now()
);

-- ============ BARU: sertifikat ============
create table if not exists public.sertifikat (
  id uuid primary key default gen_random_uuid(),
  id_peserta_fk uuid not null references public.peserta(id) on delete cascade,
  nomor_seri varchar not null unique,
  jalur text check (jalur in ('A','B1','B2','B3')),
  level_lulus varchar,
  tanggal_terbit date,
  file_url text,
  signed_by varchar,
  created_at timestamptz not null default now()
);

-- ============ BARU: placement_respons ============
create table if not exists public.placement_respons (
  id uuid primary key default gen_random_uuid(),
  id_pendaftar_fk uuid not null references public.pendaftar(id) on delete cascade,
  jawaban_json jsonb not null,
  skor_blok1 int,
  level_akhir text check (level_akhir in ('0-1','2','3','4','5')),
  rekomendasi_kelas varchar,
  tanggal timestamptz not null default now()
);

-- ============ BARU: survei_respons ============
create table if not exists public.survei_respons (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batch(id) on delete cascade,
  id_peserta_fk uuid references public.peserta(id) on delete cascade,
  id_parent_fk uuid references public.parent_user(id) on delete cascade,
  kelompok text check (kelompok in ('peserta','parent')),
  nps int,
  rating_materi int,
  rating_instruktur int,
  rating_nilai_uang int,
  feedback text,
  created_at timestamptz not null default now()
);

-- ============ triggers updated_at ============
drop trigger if exists trg_peserta_updated on public.peserta;
create trigger trg_peserta_updated before update on public.peserta for each row execute function public.handle_updated_at();

drop trigger if exists trg_absensi_updated on public.absensi;
create trigger trg_absensi_updated before update on public.absensi for each row execute function public.handle_updated_at();

drop trigger if exists trg_catatan_updated on public.catatan_ketik;
create trigger trg_catatan_updated before update on public.catatan_ketik for each row execute function public.handle_updated_at();

drop trigger if exists trg_sketches_updated on public.learning_sketches;
create trigger trg_sketches_updated before update on public.learning_sketches for each row execute function public.handle_updated_at();

drop trigger if exists trg_pembayaran_updated on public.pembayaran;
create trigger trg_pembayaran_updated before update on public.pembayaran for each row execute function public.handle_updated_at();

drop trigger if exists trg_pendaftar_updated on public.pendaftar;
create trigger trg_pendaftar_updated before update on public.pendaftar for each row execute function public.handle_updated_at();

-- ============ indexes ============
create index if not exists idx_modul_jalur on public.modul(jalur, urutan_sesi);
create index if not exists idx_jadwal_batch on public.jadwal_sesi(batch_id, tanggal_kelas);
create index if not exists idx_peserta_user on public.peserta(user_id);
create index if not exists idx_sesi_peserta_peserta on public.sesi_peserta(peserta_id);
create index if not exists idx_absensi_sesi on public.absensi(sesi_peserta_id);
create index if not exists idx_pembayaran_peserta on public.pembayaran(peserta_id);
create index if not exists idx_soal_paket_jalur on public.soal_paket(jalur, tipe);
create index if not exists idx_soal_butir_paket on public.soal_butir(kode_paket, no_soal);
create index if not exists idx_quiz_attempt_peserta on public.quiz_attempt(id_peserta_fk, kode_paket);
create index if not exists idx_lesson_plan_modul on public.lesson_plan_segmen(modul_id);
create index if not exists idx_rubrik_jalur on public.rubrik(jalur);
create index if not exists idx_portfolio_peserta on public.portfolio_item(id_peserta_fk);
create index if not exists idx_sertifikat_peserta on public.sertifikat(id_peserta_fk);
create index if not exists idx_placement_pendaftar on public.placement_respons(id_pendaftar_fk);