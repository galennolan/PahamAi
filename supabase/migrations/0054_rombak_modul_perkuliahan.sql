-- Paham AI — migration 0054_rombak_modul_perkuliahan.sql
-- Merombak struktur modul kursus menjadi model perkuliahan perguruan tinggi:
-- Nama Mata Kuliah + Pertemuan 1 sampai 14 (Nama Modul & Isi Modul)

-- 1. Bersihkan modul lama (cascade ke jadwal_sesi dan sesi_peserta)
DELETE FROM public.modul;

-- Catatan: 14 Pertemuan perkuliahan dimasukkan via script `scripts/rombak-modul-perkuliahan.mjs`
-- dengan silabus komprehensif dari Pengantar AI hingga Capstone Project.
