-- Paham AI — migration 0004_import_modul.sql
-- Jalankan di Supabase SQL Editor SETELAH 0001, 0002.
-- Bypass RLS karena dijalankan sebagai admin di SQL Editor.
-- Data diambil dari 01-kurikulum-dan-konten/modul-ajar/

-- Disable RLS sementara untuk import
alter table public.modul disable row level security;

-- ============ Jalur A (Anak 9 modul) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md) values
  ('a0000000-0000-0000-0000-000000000001', 'A01', 'Apa Itu AI', 'A', 1, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A01-apa-itu-ai.md'))),
  ('a0000000-0000-0000-0000-000000000002', 'A02', 'AI vs Manusia', 'A', 2, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A02-ai-vs-manusia.md'))),
  ('a0000000-0000-0000-0000-000000000003', 'A03', 'Ngobrol dengan Chatbot AI', 'A', 3, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A03-ngobrol-dengan-chatbot-ai.md'))),
  ('a0000000-0000-0000-0000-000000000004', 'A04', 'AI untuk Cerita', 'A', 4, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A04-ai-untuk-cerita.md'))),
  ('a0000000-0000-0000-0000-000000000005', 'A05', 'AI untuk Gambar', 'A', 5, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A05-ai-untuk-gambar.md'))),
  ('a0000000-0000-0000-0000-000000000006', 'A06', 'Deteksi AI vs Asli', 'A', 6, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A06-deteksi-ai-vs-asli.md'))),
  ('a0000000-0000-0000-0000-000000000007', 'A07', 'Etika dan Keamanan AI', 'A', 7, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A07-etika-dan-keamanan-ai.md'))),
  ('a0000000-0000-0000-0000-000000000008', 'A08', 'Proyek Akhir dan Presentasi', 'A', 8, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A08-proyek-akhir-dan-presentasi.md'))),
  ('a0000000-0000-0000-0000-000000000009', 'A09', 'Presentasi Skills', 'A', 9, 60, (select pg_read_file('modul-ajar/jalur-a-anak/A09-presentasi-skills.md')))
on conflict (kode) do update set judul = excluded.judul, content_md = excluded.content_md, urutan_sesi = excluded.urutan_sesi, durasi_menit = excluded.durasi_menit;

-- ============ Jalur B1 (Pemula 7 modul) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md) values
  ('b1000000-0000-0000-0000-000000000001', 'B101', 'Konsep Dasar AI dan LLM', 'B1', 1, 90, (select pg_read_file('modul-ajar/jalur-b1-pemula/B101-konsep-dasar-ai-dan-llm.md'))),
  ('b1000000-0000-0000-0000-000000000002', 'B102', 'Mengenal Tools AI', 'B1', 2, 90, (select pg_read_file('modul-ajar/jalur-b1-pemula/B102-mengenal-tools-ai.md'))),
  ('b1000000-0000-0000-0000-000000000003', 'B103', 'Dasar Prompt Engineering', 'B1', 3, 90, (select pg_read_file('modul-ajar/jalur-b1-pemula/B103-dasar-prompt-engineering.md'))),
  ('b1000000-0000-0000-0000-000000000004', 'B104', 'AI untuk Produktivitas Harian', 'B1', 4, 90, (select pg_read_file('modul-ajar/jalur-b1-pemula/B104-ai-untuk-produktivitas-harian.md'))),
  ('b1000000-0000-0000-0000-000000000005', 'B105', 'Etika, Bias dan Halusinasi AI', 'B1', 5, 90, (select pg_read_file('modul-ajar/jalur-b1-pemula/B105-etika-bias-dan-halusinasi-ai.md'))),
  ('b1000000-0000-0000-0000-000000000006', 'B106', 'Evaluasi dan Proyek Mini', 'B1', 6, 90, (select pg_read_file('modul-ajar/jalur-b1-pemula/B106-evaluasi-dan-proyek-mini.md'))),
  ('b1000000-0000-0000-0000-000000000007', 'B107', 'Presentasi Skills', 'B1', 7, 90, (select pg_read_file('modul-ajar/jalur-b1-pemula/B107-presentasi-skills.md')))
on conflict (kode) do update set judul = excluded.judul, content_md = excluded.content_md, urutan_sesi = excluded.urutan_sesi, durasi_menit = excluded.durasi_menit;

-- ============ Jalur B2 (Menengah 11 modul) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md) values
  ('b2000000-0000-0000-0000-000000000001', 'B201', 'Prompt Engineering Lanjutan', 'B2', 1, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B201-prompt-engineering-lanjutan.md'))),
  ('b2000000-0000-0000-0000-000000000002', 'B202', 'Optimasi Output AI', 'B2', 2, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B202-optimasi-output-ai.md'))),
  ('b2000000-0000-0000-0000-000000000003', 'B203', 'AI untuk Dokumen dan Data', 'B2', 3, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B203-ai-untuk-dokumen-dan-data.md'))),
  ('b2000000-0000-0000-0000-000000000004', 'B204', 'Etika, Bias dan Prompt Injection', 'B2', 4, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B204-etika-bias-dan-prompt-injection.md'))),
  ('b2000000-0000-0000-0000-000000000005', 'B205', 'Dasar Pemrograman untuk AI', 'B2', 5, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B205-dasar-pemrograman-untuk-ai.md'))),
  ('b2000000-0000-0000-0000-000000000006', 'B206', 'Pengantar Automasi', 'B2', 6, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B206-pengantar-automasi.md'))),
  ('b2000000-0000-0000-0000-000000000007', 'B207', 'Memanggil AI Lewat API', 'B2', 7, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B207-memanggil-ai-lewat-api.md'))),
  ('b2000000-0000-0000-0000-000000000008', 'B208', 'Integrasi AI ke Produk', 'B2', 8, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B208-integrasi-ai-ke-produk.md'))),
  ('b2000000-0000-0000-0000-000000000009', 'B209', 'Workshop Proyek Menengah', 'B2', 9, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B209-workshop-proyek-menengah.md'))),
  ('b2000000-0000-0000-0000-000000000010', 'B210', 'Presentasi dan Proyek Integrasi', 'B2', 10, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B210-presentasi-dan-proyek-integrasi.md'))),
  ('b2000000-0000-0000-0000-000000000011', 'B211', 'Post-Test dan Evaluasi', 'B2', 11, 120, (select pg_read_file('modul-ajar/jalur-b2-menengah/B211-post-test-dan-evaluasi.md')))
on conflict (kode) do update set judul = excluded.judul, content_md = excluded.content_md, urutan_sesi = excluded.urutan_sesi, durasi_menit = excluded.durasi_menit;

-- ============ Jalur B3 (Expert 11 modul) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md) values
  ('b3000000-0000-0000-0000-000000000001', 'B301', 'Arsitektur Sistem AI Modern', 'B3', 1, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B301-arsitektur-sistem-ai-modern.md'))),
  ('b3000000-0000-0000-0000-000000000002', 'B302', 'RAG Retrieval Augmented Generation', 'B3', 2, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B302-rag-retrieval-augmented-generation.md'))),
  ('b3000000-0000-0000-0000-000000000003', 'B303', 'Tool Use dan Function Calling', 'B3', 3, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B303-tool-use-dan-function-calling.md'))),
  ('b3000000-0000-0000-0000-000000000004', 'B304', 'Membangun AI Agent', 'B3', 4, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B304-membangun-ai-agent.md'))),
  ('b3000000-0000-0000-0000-000000000005', 'B305', 'Fine-Tuning vs Prompting vs RAG', 'B3', 5, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B305-fine-tuning-vs-prompting-vs-rag.md'))),
  ('b3000000-0000-0000-0000-000000000006', 'B306', 'Evaluasi dan Testing Model AI', 'B3', 6, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B306-evaluasi-dan-testing-model-ai.md'))),
  ('b3000000-0000-0000-0000-000000000007', 'B307', 'Keamanan dan Etika AI Tingkat Lanjut', 'B3', 7, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B307-keamanan-dan-etika-ai-tingkat-lanjut.md'))),
  ('b3000000-0000-0000-0000-000000000008', 'B308', 'Workshop Capstone', 'B3', 8, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B308-workshop-capstone.md'))),
  ('b3000000-0000-0000-0000-000000000009', 'B309', 'Presentasi Capstone', 'B3', 9, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B309-presentasi-capstone.md'))),
  ('b3000000-0000-0000-0000-000000000010', 'B310', 'Post-Test dan Portfolio Review', 'B3', 10, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B310-post-test-dan-portfolio-review.md'))),
  ('b3000000-0000-0000-0000-000000000011', 'B311', 'Capstone dan Sertifikasi', 'B3', 11, 150, (select pg_read_file('modul-ajar/jalur-b3-expert/B311-capstone-dan-sertifikasi.md')))
on conflict (kode) do update set judul = excluded.judul, content_md = excluded.content_md, urutan_sesi = excluded.urutan_sesi, durasi_menit = excluded.durasi_menit;

-- Re-enable RLS
alter table public.modul enable row level security;