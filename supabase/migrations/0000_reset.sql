-- Paham AI — 0000 RESET (Opsi B: DROP total)
-- Jalankan SEKALI di Supabase SQL Editor SEBELUM rerun 0001.
-- PERINGATAN: semua data di tabel ini akan hilang permanen.

drop view if exists public.soal_butir_view;
drop table if exists
  public.survei_respons,
  public.placement_respons,
  public.sertifikat,
  public.portfolio_item,
  public.studi_kasus,
  public.rubrik,
  public.lesson_plan_segmen,
  public.quiz_attempt,
  public.soal_butir,
  public.soal_paket,
  public.pendaftar,
  public.pembayaran,
  public.learning_sketches,
  public.catatan_ketik,
  public.absensi,
  public.sesi_peserta,
  public.parent_child_link,
  public.parent_user,
  public.peserta,
  public.jadwal_sesi,
  public.modul,
  public.batch
  cascade;
