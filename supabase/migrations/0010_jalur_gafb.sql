-- Migration: GAFB
-- 1. Tambah jalur G (Generative AI for Beginners)
-- Jalankan di SQL Editor: ALTER TYPE jalur ADD VALUE 'G'; -- Tapi ini butuh penanganan khusus di PG,
-- Alternatif: Ubah kolom ke text atau buat tabel baru/data dengan check constraint manual.
-- Mengingat schema saat ini pakai check (jalur in ('A','B1','B2','B3')), 
-- cara termudah tanpa merombak semua adalah buat migrasi DDL untuk alter constraint.

alter table public.modul drop constraint modul_jalur_check;
alter table public.modul add constraint modul_jalur_check check (jalur in ('A','B1','B2','B3','G'));

alter table public.batch drop constraint batch_jalur_check;
alter table public.batch add constraint batch_jalur_check check (jalur in ('A','B1','B2','B3','G'));

alter table public.peserta drop constraint peserta_jalur_check;
alter table public.peserta add constraint peserta_jalur_check check (jalur in ('A','B1','B2','B3','G'));

alter table public.pendaftar drop constraint pendaftar_jalur_check;
alter table public.pendaftar add constraint pendaftar_jalur_check check (jalur in ('A','B1','B2','B3','G'));

-- 2. Tambah Modul GAFB (G01-G10)
-- Saya akan buat batch GAFB (GAFB-1) sekalian.

insert into public.modul (kode, judul, jalur, urutan_sesi, durasi_menit, content_md) values
  ('G01', 'Pengantar Generative AI', 'G', 1, 90, 'Konten: Pengantar AI Generatif dan LLM...'),
  ('G02', 'Membandingkan LLM', 'G', 2, 90, 'Konten: Analisis LLM...'),
  ('G03', 'Prompt Engineering Dasar', 'G', 3, 90, 'Konten: Dasar Prompt Engineering...'),
  ('G04', 'Prompt Engineering Lanjut', 'G', 4, 90, 'Konten: Strategi Lanjut...'),
  ('G05', 'Dasar Generasi Teks', 'G', 5, 90, 'Konten: Gemini & Text Gen...'),
  ('G06', 'Dasar Chatbot', 'G', 6, 90, 'Konten: Membangun Chatbot...'),
  ('G07', 'Dasar Embedding', 'G', 7, 90, 'Konten: Vektor & Embedding...'),
  ('G08', 'Aplikasi RAG Dasar', 'G', 8, 90, 'Konten: Dasar RAG...'),
  ('G09', 'Presentasi Skills', 'G', 9, 90, 'Konten: Presentasi Proyek...'),
  ('G10', 'Post-Test GAFB', 'G', 10, 90, 'Konten: Evaluasi Akhir...');

insert into public.batch (kode_batch, jalur, nama_batch, kapasitas_maks, status) values
  ('GAFB-01', 'G', 'Batch Perdana GAFB', 20, 'terbuka');
