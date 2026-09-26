-- Paham AI — migration 0005 (seed data lengkap: batch, jadwal, pendaftar, pembayaran, sertifikat)
-- Jalankan SETELAH 0001, 0002, 0003 di Supabase SQL Editor.
-- CATATAN: Jalankan import-modul.mjs & import-soal.mjs via Node.js DULU sebelum migration ini
-- supaya id modul dan kode_paket sudah tersedia.

-- ============ Seed Batch (4 jalur) ============
insert into public.batch (id, kode_batch, jalur, nama_batch, status, tanggal_mulai, tanggal_akhir, kapasitas_maks, terdaftar)
values
  ('11111111-1111-1111-1111-111111111111', 'PAHAI-A-2601', 'A', 'Anak Batch 1 Solo', 'berjalan', '2026-10-01', '2026-11-30', 15, 10),
  ('22222222-2222-2222-2222-222222222222', 'PAHAI-B1-2601', 'B1', 'Pemula Batch 1 Solo', 'berjalan', '2026-10-01', '2026-11-30', 15, 12),
  ('33333333-3333-3333-3333-333333333333', 'PAHAI-B2-2601', 'B2', 'Menengah Batch 1 Solo', 'berjalan', '2026-10-01', '2026-11-30', 15, 8),
  ('44444444-4444-4444-4444-444444444444', 'PAHAI-B3-2601', 'B3', 'Expert Batch 1 Solo', 'terbuka', '2026-11-01', '2026-12-31', 15, 6)
on conflict (kode_batch) do nothing;

-- ============ Seed Jadwal S00-S03 per batch (contoh) ============
-- S00 = Setup Akun & Pre-Test, S01 = Sesi 1, S02 = Sesi 2, S03 = Sesi 3
-- Pakai SELECT agar id modul diambil otomatis dari kode

-- BATCH A: S00 + A01 + A02 + A03
insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '11111111-1111-1111-1111-111111111111', 'S00', 'Setup Akun & Pre-Test', '2026-10-01', '14:00', '15:00', 'Ruang Kelas Solo', 'selesai'
from public.modul m where m.kode = 'A01' limit 1;

insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '11111111-1111-1111-1111-111111111111', 'A01', m.judul, '2026-10-05', '14:00', '15:00', 'Ruang Kelas Solo', 'selesai'
from public.modul m where m.kode = 'A01' limit 1;

insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '11111111-1111-1111-1111-111111111111', 'A02', m.judul, '2026-10-12', '14:00', '15:00', 'Ruang Kelas Solo', 'belum'
from public.modul m where m.kode = 'A02' limit 1;

insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '11111111-1111-1111-1111-111111111111', 'A03', m.judul, '2026-10-19', '14:00', '15:00', 'Ruang Kelas Solo', 'belum'
from public.modul m where m.kode = 'A03' limit 1;

-- BATCH B1: S00 + B101 + B102 + B103
insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '22222222-2222-2222-2222-222222222222', 'S00', 'Setup Akun & Pre-Test', '2026-10-01', '18:30', '20:00', 'Ruang Kelas Solo', 'selesai'
from public.modul m where m.kode = 'B101' limit 1;

insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '22222222-2222-2222-2222-222222222222', 'B101', m.judul, '2026-10-06', '18:30', '20:00', 'Ruang Kelas Solo', 'selesai'
from public.modul m where m.kode = 'B101' limit 1;

insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '22222222-2222-2222-2222-222222222222', 'B102', m.judul, '2026-10-13', '18:30', '20:00', 'Ruang Kelas Solo', 'belum'
from public.modul m where m.kode = 'B102' limit 1;

insert into public.jadwal_sesi (modul_id, batch_id, kode_sesi_friendly, judul_sesi, tanggal_kelas, jam_mulai, jam_akhir, lokasi, status_sesi)
select m.id, '22222222-2222-2222-2222-222222222222', 'B103', m.judul, '2026-10-20', '18:30', '20:00', 'Ruang Kelas Solo', 'belum'
from public.modul m where m.kode = 'B103' limit 1;

-- ============ Seed Pendaftar (6 entry) ============
insert into public.pendaftar (id, nama_lengkap, email, no_wa, jalur, usia, status, nik, consent_privasi, consent_etika, no_wa_ortu)
values
  ('aaaa0001-0000-0000-0000-000000000001', 'Budi Santoso', 'budi@contoh.com', '081234567890', 'B1', 28, 'approved', '3273010101280001', true, true, NULL),
  ('aaaa0002-0000-0000-0000-000000000002', 'Siti Rahma', 'siti@contoh.com', '081298765432', 'A', 10, 'approved', '3273010505120002', true, true, '081298765433'),
  ('aaaa0003-0000-0000-0000-000000000003', 'Andi Wijaya', 'andi@contoh.com', '081111222333', 'B2', 25, 'verifying', '3273010303150003', true, false, NULL),
  ('aaaa0004-0000-0000-0000-000000000004', 'Dewi Lestari', 'dewi@contoh.com', '081222333444', 'B1', 32, 'verifying', '3273010707190004', true, true, NULL),
  ('aaaa0005-0000-0000-0000-000000000005', 'Rina Marlina', 'rina@contoh.com', '081333444555', 'A', 8, 'pending', '3273010909230005', false, false, '081333444556'),
  ('aaaa0006-0000-0000-0000-000000000006', 'Agus Salim', 'agus@contoh.com', '081444555666', 'B3', 22, 'pending', NULL, false, false, NULL)
on conflict do nothing;

-- ============ Seed Pembayaran (3 entry) ============
-- Note: peserta_id di sini perlu user_id dari auth.users — belum bisa di-insert sebelum akun dibuat.
-- Seed ini hanya placeholder; admin akan input manual setelah peserta daftar.

-- ============ Seed Rubrik (contoh — akan di-overwrite oleh import-konten.mjs) ============
insert into public.rubrik (jalur, aspek, level_1, level_2, level_3, level_4, bobot, kritis)
values
  ('A', 'Pemahaman konsep AI', 'Belum bisa menjelaskan apa itu AI', ' Bisa menjelaskan dengan bantuan', 'Bisa menjelaskan sendiri', 'Penjelasan mendalam dengan analogi lokal', 30, true),
  ('A', 'Kreativitas output', 'Output tidak(original)', 'Output kurang_original', 'Output original dan sesuai tema', 'Output sangat kreatif dan menarik', 40, false),
  ('A', 'Presentasi', 'Tidak berani tampil', 'Presentasi dengan bantuan teman', 'Presentasi mandiri 2-3 menit', 'Presentasi percaya diri dan memukau', 30, false),
  ('B1', 'Kualitas prompt', 'Prompt tidak jelas', 'Prompt kurang spesifik', 'Prompt jelas dan terstruktur', 'Prompt sangat presisi dengan konteks lengkap', 35, true),
  ('B1', 'Kegunaan output', 'Output tidak relevan', 'Output sebagian relevan', 'Output relevan dan bisa dipakai', 'Output sangat bernilai untuk pekerjaan nyata', 40, false),
  ('B1', 'Etika & verifikasi', 'Tidak tahu cara verifikasi', 'Verifikasi masih rudimentary', 'Verifikasi nama baik dan tidak paste data sensitif', 'Verifikasi teliti dan adversarial terhadap risiko data', 25, true),
  ('B2', 'Kualitas solusi coding', 'Script error', 'Script jalan tapi output salah', 'Script jalan dengan output benar', 'Script optimal dan well-documented', 40, true),
  ('B2', 'Integrasi API', 'Tidak berhasil integrasi', 'Integrasi parsing', 'Integrasi berfungsi penuh', 'Integrasi dengan error handling yang baik', 35, true),
  ('B3', 'Arsitektur RAG', 'Retrieval tidak akurat', 'Retrieval partially accurate', 'Retrieval akurat dan Relevance tinggi', 'Arsitektur RAG yang optimal dan scalable', 45, true),
  ('B3', 'Kualitas agent', 'Agent tidak berfungsi', 'Agent berfungsi sebagian', 'Agent berfungsi untuk multi-step task', 'Agent autonomously plan dan eksekusi dengan baik', 55, true)
on conflict do nothing;