-- Paham AI — migration 0006 (tabel penilaian + fungsi kuis)
-- Jalankan di Supabase SQL Editor SETELAH 0005.

-- ============ BARU: penilaian ============
create table if not exists public.penilaian (
  id uuid primary key default gen_random_uuid(),
  sesi_peserta_id uuid not null references public.sesi_peserta(id) on delete cascade,
  rubrik_item text not null,
  skor numeric(5,2),
  bobot_persen numeric(5,2) not null default 0,
  status_kelulusan text check (status_kelulusan in ('belum','revisi','lulus')),
  verified_by uuid references auth.users(id) on delete set null,
  catatan_instruktur text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesi_peserta_id, rubrik_item)
);

create trigger trg_penilaian_updated before update on public.penilaian
  for each row execute function public.handle_updated_at();

create index if not exists idx_penilaian_sesi on public.penilaian(sesi_peserta_id);

-- ============ FUNGSI: kerjakan_kuis ============
-- Peserta mengirimkan jawaban; fungsi menghitung skor server-side menggunakan kunci.
create or replace function public.kerjakan_kuis(
  p_peserta uuid,
  p_kode_paket text,
  p_jawaban jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jumlah_soal int;
  v_skor numeric := 0;
  v_benar int := 0;
  v_soal record;
  v_jawaban_item record;
begin
  -- Pastikan milik sendiri atau staff
  if not exists (
    select 1 from public.peserta p
    where p.id = p_peserta
      and (p.user_id = auth.uid() or public.is_staff())
  ) then
    raise exception 'Akses ditolak';
  end if;

  -- Hitung skor
  for v_jawaban_item in select * from jsonb_to_recordset(p_jawaban) as x(no_soal int, jawaban text)
  loop
    select sb.no_soal, sb.kunci, sb.bobot_skor
      into v_soal
      from public.soal_butir sb
      where sb.kode_paket = p_kode_paket and sb.no_soal = v_jawaban_item.no_soal;

    if found then
      if lower(trim(v_soal.kunci)) = lower(trim(v_jawaban_item.jawaban)) then
        v_skor := v_skor + v_soal.bobot_skor;
        v_benar := v_benar + 1;
      end if;
    end if;
  end loop;

  select count(*) into v_jumlah_soal from public.soal_butir where kode_paket = p_kode_paket;

  -- Tentukan attempt_no berikutnya
  -- Sederhana: selalu attempt 1 dulu; jika sudah ada, naikkan max+1
  insert into public.quiz_attempt (id_peserta_fk, kode_paket, no_soal, attempt_no, jawaban, benar, skor, waktu)
  select
    p_peserta,
    p_kode_paket,
    (j.no_soal)::int,
    coalesce((select max(attempt_no) from public.quiz_attempt qa where qa.id_peserta_fk = p_peserta and qa.kode_paket = p_kode_paket), 0) + 1,
    j.jawaban,
    lower(trim(j.jawaban)) = lower(trim(sb.kunci)),
    case when lower(trim(j.jawaban)) = lower(trim(sb.kunci)) then sb.bobot_skor else 0 end,
    now()
  from jsonb_to_recordset(p_jawaban) as j(no_soal int, jawaban text)
  join public.soal_butir sb on sb.kode_paket = p_kode_paket and sb.no_soal = j.no_soal;

  return jsonb_build_object('skor', v_skor, 'benar', v_benar, 'total_soal', v_jumlah_soal);
end;
$$;

grant execute on function public.kerjakan_kuis(uuid, text, jsonb) to authenticated;
