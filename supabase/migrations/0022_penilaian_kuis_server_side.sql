-- Paham AI — migration 0022 (penilaian kuis server-side)
-- Jalankan di Supabase SQL Editor SETELAH migration sebelumnya.
--
-- Menggantikan cara lama: frontend pernah membaca `soal_butir.kunci` langsung
-- (blocked RLS untuk peserta -> kunci kosong -> "benar" selalu 0) dan menghitung
-- skor sendiri dengan `if (jawaban) total += bobot` -> 100/100 untuk jawaban
-- apa pun. Sekarang penilaian dipusatkan di satu fungsi SECURITY DEFINER.

-- ============ 1. Tandai kunci yang tidak bisa dinilai otomatis ============
alter table public.soal_butir
  add column if not exists perlu_tinjau boolean not null default false;

-- Normalisasi huruf kecil sebelum pengecekan
update public.soal_butir
   set kunci = upper(btrim(kunci))
 where kunci is not null and kunci ~ '^[a-d]$';

-- Tandai dulu (kunci masih ada agar bisa diaudit), lalu kosongkan.
update public.soal_butir
   set perlu_tinjau = true
 where kunci is not null and kunci not in ('A', 'B', 'C', 'D');

update public.soal_butir
   set kunci = null
 where kunci is not null and kunci not in ('A', 'B', 'C', 'D');

-- ============ 2. RPC penilaian kuis ============
create or replace function public.nilai_kuis(
  p_peserta     uuid,
  p_kode_paket  text,
  p_jawaban     jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_kkm        constant int := 70;
  v_staff      boolean;
  v_jalur      text;
  v_paket_kode text;
  v_attempt    int;
  v_total      int := 0;
  v_dinilai    int := 0;
  v_benar      int := 0;
  v_salah      int := 0;
  v_kosong     int := 0;
  v_tinjau     int := 0;
  v_bobot_benar numeric := 0;
  v_bobot_auto numeric := 0;
  v_skor       int;
  v_rincian    jsonb;
begin
  if p_peserta is null or p_kode_paket is null then
    raise exception 'Parameter tidak lengkap';
  end if;

  v_staff := public.is_staff();

  select p.jalur into v_jalur from public.peserta p where p.id = p_peserta;
  if not found then
    raise exception 'Profil peserta tidak ditemukan';
  end if;
  if not v_staff and not exists (
    select 1 from public.peserta p where p.id = p_peserta and p.user_id = auth.uid()
  ) then
    raise exception 'Akses ditolak';
  end if;

  select sp.kode_paket into v_paket_kode
    from public.soal_paket sp where sp.kode_paket = p_kode_paket;
  if not found then
    raise exception 'Paket soal tidak ditemukan: %', p_kode_paket;
  end if;
  -- Catatan: filter per jalur sengaja TIDAK di-hardcode di sini. Data
  -- peserta.jalur belum konsisten (mis. peserta jalur A pada batch B2), jadi
  -- gating di sini akan memblokir siswa yang testemya sah. Pemfilteran
  -- dilakukan di halaman Kuis.

  -- Cegah dua submit bersamaan menghitung attempt_no yang sama
  perform pg_advisory_xact_lock(hashtext(p_peserta::text || '|' || p_kode_paket));

  -- Tabel kerja penilaian (dibuat per pemanggilan)
  drop table if exists pg_temp.kuis_nilai;
  create temp table kuis_nilai on commit drop as
  select
    sb.no_soal,
    sb.kunci,
    sb.pembahasan,
    sb.bobot_skor,
    j.jawaban,
    (j.jawaban is not null
      and sb.kunci is not null
      and upper(btrim(j.jawaban)) = sb.kunci) as is_benar
  from public.soal_butir sb
  left join (
    select distinct on (x.no_soal) x.no_soal, x.jawaban
      from jsonb_to_recordset(coalesce(p_jawaban, '[]'::jsonb))
        as x(no_soal int, jawaban text)
     order by x.no_soal
  ) j on j.no_soal = sb.no_soal
  where sb.kode_paket = p_kode_paket;

  select
    count(*),
    count(*) filter (where kunci is not null),
    coalesce(sum(bobot_skor) filter (where kunci is not null), 0)
  into v_total, v_dinilai, v_bobot_auto
  from kuis_nilai;

  if v_total = 0 then
    raise exception 'Paket soal % belum memiliki butir soal', p_kode_paket;
  end if;

  -- attempt_no berikutnya: retry tidak lagi menimpa attempt lama
  select coalesce(max(qa.attempt_no), 0) + 1 into v_attempt
    from public.quiz_attempt qa
   where qa.id_peserta_fk = p_peserta
     and qa.kode_paket = p_kode_paket;

  -- satu baris per butir soal, termasuk yang tidak dijawab
  insert into public.quiz_attempt
    (id_peserta_fk, kode_paket, no_soal, attempt_no, jawaban, benar, skor, waktu)
  select
    p_peserta,
    p_kode_paket,
    k.no_soal,
    v_attempt,
    k.jawaban,
    case when k.kunci is null then null else k.is_benar end,
    case when k.kunci is null then 0 when k.is_benar then k.bobot_skor else 0 end,
    now()
  from kuis_nilai k;

  select
    count(*) filter (where kunci is null),
    count(*) filter (where kunci is not null and is_benar),
    count(*) filter (where kunci is not null and not is_benar and jawaban is not null and btrim(jawaban) <> ''),
    count(*) filter (where kunci is not null and (jawaban is null or btrim(jawaban) = '')),
    coalesce(sum(bobot_skor) filter (where is_benar), 0)
  into v_tinjau, v_benar, v_salah, v_kosong, v_bobot_benar
  from kuis_nilai;

  v_skor := case
    when v_bobot_auto > 0 then round(v_bobot_benar / v_bobot_auto * 100)::int
    else null
  end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'no_soal',       k.no_soal,
           'benar',         case when k.kunci is null then null else k.is_benar end,
           'kunci',         k.kunci,
           'pembahasan',    k.pembahasan,
           'perlu_tinjau',  k.kunci is null
         ) order by k.no_soal), '[]'::jsonb)
  into v_rincian
  from kuis_nilai k;

  return jsonb_build_object(
    'kode_paket',    p_kode_paket,
    'attempt_no',    v_attempt,
    'skor',          v_skor,
    'kkm',           c_kkm,
    'lulus',         case when v_skor is null then null else v_skor >= c_kkm end,
    'benar',         v_benar,
    'salah',         v_salah,
    'kosong',        v_kosong,
    'perlu_tinjau',  v_tinjau,
    'total',         v_total,
    'total_dinilai', v_dinilai,
    'rincian',       v_rincian
  );
end;
$$;

grant execute on function public.nilai_kuis(uuid, text, jsonb) to authenticated;

-- Fungsi lama di 0006 tidak pernah ada di database dan cara penilaiannya salah.
-- Dibuang bila sempat terpasang, supaya tidak ada dua sumber kebenaran.
drop function if exists public.kerjakan_kuis(uuid, text, jsonb);

-- ============ 3. Akun demo murid@paham.ai belum punya profil peserta ============
insert into public.peserta (
  user_id, nama_lengkap, nama_panggil, email, jalur, batch_id, usia,
  consent_privasi, consent_etika, byod
)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'nama', ''), 'Budi Santoso'),
  'Budi',
  u.email,
  'B1',
  (select b.id from public.batch b where b.jalur = 'B1' order by b.tanggal_mulai limit 1),
  28,
  true, true, true
from auth.users u
where u.email = 'murid@paham.ai'
  and not exists (select 1 from public.peserta p where p.user_id = u.id);

-- ============ 4. Minta PostgREST memuat ulang cache skema ============
-- Tanpa ini /rest/v1/rpc/nilai_kuis bisa masih 404 (PGRST202) awhile setelah migration.
notify pgrst, 'reload schema';
