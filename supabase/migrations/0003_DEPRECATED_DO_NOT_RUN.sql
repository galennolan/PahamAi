-- Paham AI — migration 0003 (Seed Data)
-- Jalankan SETELAH 0001 dan 0002 di Supabase SQL Editor.

-- ============ Seed Batch ============
insert into public.batch (id, kode_batch, jalur, nama_batch, status, tanggal_mulai, tanggal_akhir, kapasitas_maks, terdaftar)
values
  ('11111111-1111-1111-1111-111111111111', 'PAHAI-A-2601', 'A', 'Anak Batch 1 Solo', 'berjalan', '2026-10-01', '2026-11-30', 15, 10),
  ('22222222-2222-2222-2222-222222222222', 'PAHAI-B1-2601', 'B1', 'Pemula Batch 1 Solo', 'berjalan', '2026-10-01', '2026-11-30', 15, 12),
  ('33333333-3333-3333-3333-333333333333', 'PAHAI-B2-2601', 'B2', 'Menengah Batch 1 Solo', 'berjalan', '2026-10-01', '2026-11-30', 15, 8),
  ('44444444-4444-4444-4444-444444444444', 'PAHAI-B3-2601', 'B3', 'Expert Batch 1 Solo', 'terbuka', '2026-11-01', '2026-12-31', 15, 6)
on conflict (kode_batch) do nothing;

-- ============ Seed Modul Jalur A (Anak 8-14 th) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md)
values
  ('a0000000-0000-0000-0000-000000000001', 'A01', 'Apa Itu AI dan Cara Bicara Dengannya', 'A', 1, 60, '# A01: Apa Itu AI?\n\nAI seperti asisten pintar yang bisa diajak ngobrol. Kita akan belajar cara memberi instruksi yang jelas.'),
  ('a0000000-0000-0000-0000-000000000002', 'A02', 'Membuat Cerita Bergambar dengan AI', 'A', 2, 60, '# A02: Cerita Bergambar\n\nMenggunakan AI untuk bantu susun alur cerita dan buat gambarnya.'),
  ('a0000000-0000-0000-0000-000000000003', 'A03', 'Mengenal Etika AI untuk Anak', 'A', 3, 60, '# A03: Etika AI\n\nKenapa tidak boleh pakai AI untuk menipu atau menyebar berita bohong.'),
  ('a0000000-0000-0000-0000-000000000004', 'A04', 'Proyek Cerita AI Kreatif', 'A', 4, 60, '# A04: Proyek Cerita\n\nPraktik mandiri membuat buku cerita digital buatanmu sendiri.')
on conflict (kode) do nothing;

-- ============ Seed Modul Jalur B1 (Pemula) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md)
values
  ('b1000000-0000-0000-0000-000000000001', 'B101', 'Pengenalan Literasi AI & AI Chatbot', 'B1', 1, 90, '# B101: Pengenalan AI\n\nMengenal dasar AI, ChatGPT/Claude/Gemini, dan cara pakainya untuk pekerjaan sehari-hari.'),
  ('b1000000-0000-0000-0000-000000000002', 'B102', 'Prompt Engineering Dasar (CLEAR Framework)', 'B1', 2, 90, '# B102: CLEAR Framework\n\nFramework menulis prompt: Context, Logical, Examples, Action, Restrict.'),
  ('b1000000-0000-0000-0000-000000000003', 'B103', 'Pembuatan Dokumen & Laporan Otomatis', 'B1', 3, 90, '# B103: Draft Laporan\n\nMeringkas laporan, membuat draft email bisnis, dan analisis teks cepat.')
on conflict (kode) do nothing;

-- ============ Seed Modul Jalur B2 (Menengah) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md)
values
  ('b2000000-0000-0000-0000-000000000001', 'B201', 'Dasar Otomasi & Python Script', 'B2', 1, 120, '# B201: Python dasar\n\nMengenal sintaks Python dasar untuk integrasi API AI.'),
  ('b2000000-0000-0000-0000-000000000002', 'B202', 'Integrasi API LLM (opencode)', 'B2', 2, 120, '# B202: API LLM\n\nMembuat request ke opencode API menggunakan script Python sederhana.')
on conflict (kode) do nothing;

-- ============ Seed Modul Jalur B3 (Expert) ============
insert into public.modul (id, kode, judul, jalur, urutan_sesi, durasi_menit, content_md)
values
  ('b3000000-0000-0000-0000-000000000001', 'B301', 'Arsitektur RAG & Vector Database', 'B3', 1, 150, '# B301: Dasar RAG\n\nRetrieval-Augmented Generation menggunakan Supabase Vector / pgvector.'),
  ('b3000000-0000-0000-0000-000000000002', 'B302', 'Membangun AI Agent & Capstone Project', 'B3', 2, 150, '# B302: AI Agent\n\nProyek akhir membangun AI agent interaktif.')
on conflict (kode) do nothing;

-- ============ Seed Jadwal Sesi Contoh ============
insert into public.jadwal_sesi (id, modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
values
  ('j1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A01', 'Apa Itu AI dan Cara Bicara Dengannya', '2026-10-05', '14:00:00', '15:00:00', 'Ruang Kelas Solo', 'selesai'),
  ('j2222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B101', 'Pengenalan Literasi AI & AI Chatbot', '2026-10-06', '18:30:00', '20:00:00', 'Ruang Kelas Solo', 'berlangsung')
on conflict do nothing;

-- ============ Seed Pendaftar Queue ============
insert into public.pendaftar (nama_lengkap, email, no_wa, jalur, usia, status)
values
  ('Budi Santoso', 'budi@contoh.com', '081234567890', 'B1', 28, 'pending'),
  ('Siti Rahma', 'siti@contoh.com', '081298765432', 'A', 10, 'pending')
on conflict do nothing;
