-- Paham AI — migration 0028 (model disederhanakan: kelas + modul)
-- Jalankan SETELAH 0027_backup_data_sebelum_refactor.sql.
--
-- Menggantikan tabel `batch` dengan `kelas`, lalu menghapus kolom `jalur` dari
-- seluruh database. Konsep jalur (A / B1 / B2 / B3 / G) tidak lagi ada:
--   - pengelompokan katalog modul memakai `modul.kategori`
--   - penugasan modul ke peserta memakai `sesi_peserta`
--
-- Yang TIDAK berubah: nama tabel `modul`, `peserta`, `jadwal_sesi`,
-- `sesi_peserta` dan seluruh tabel pendukung (absensi, catatan_ketik,
-- learning_sketches, portfolio_item, pembayaran, quiz_attempt, dll).
-- Hanya 4 kolom yang berubah nama: `batch_id` -> `kelas_id` (3 tabel).


-- ============ 0. Penjaga: migration ini hanya jalan sekali ============
do $$
begin
  if to_regclass('public.batch') is null then
    raise exception
      'Tabel public.batch sudah tidak ada — migration 0028 pernah dijalankan. '
      'Jangan jalankan lagi; periksa dulu private.bak_batch_0027.';
  end if;
  if to_regclass('public.peserta') is null
     or to_regclass('public.jadwal_sesi') is null
     or to_regclass('public.survei_respons') is null then
    raise exception 'Tabel inti hilang. Jangan lanjutkan, restore dari backup dulu.';
  end if;
end $$;


-- ============ 1. Tabel kelas ============
create table if not exists public.kelas (
  id                   uuid primary key default gen_random_uuid(),
  kode                 text not null unique,
  nama                 text not null,
  status               text not null default 'terbuka'
                         check (status in ('terbuka','berjalan','selesai','dibatalkan')),
  tanggal_mulai        date,
  tanggal_akhir        date,
  kapasitas_maks       int,
  instruktur_utama_fk  uuid references auth.users(id) on delete set null,
  asisten_fk           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now()
);

comment on table public.kelas is
  'Kelas/angkatan belajar. Menggantikan tabel batch; tidak ada lagi konsep jalur di database.';

-- `terdaftar` sengaja tidak ikut. Itu penghitung yang ditulis UI dari sisi
-- klien sehingga bisa melenceng; jumlah peserta dihitung dari `peserta.kelas_id`.
insert into public.kelas (
  id, kode, nama, status, tanggal_mulai, tanggal_akhir,
  kapasitas_maks, instruktur_utama_fk, asisten_fk, created_at
)
select
  b.id,
  b.kode_batch,
  coalesce(nullif(btrim(b.nama_batch), ''), b.kode_batch),
  b.status,
  b.tanggal_mulai,
  b.tanggal_akhir,
  b.kapasitas_maks,
  b.instruktur_utama_fk,
  b.asisten_fk,
  b.created_at
from public.batch b
on conflict (kode) do nothing;


-- ============ 2. RLS kelas (setara policy batch di 0002 + anon read di 0011) ============
alter table public.kelas enable row level security;

drop policy if exists "kelas_read" on public.kelas;
create policy "kelas_read" on public.kelas
  for select to authenticated using (true);

drop policy if exists "kelas_read_anon" on public.kelas;
create policy "kelas_read_anon" on public.kelas
  for select to anon using (true);

drop policy if exists "kelas_write_admin" on public.kelas;
create policy "kelas_write_admin" on public.kelas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ 3. Helper: kelas yang diajar instruktur saat ini ============
create or replace function public.my_kelas_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select k.id
    from public.kelas k
   where k.instruktur_utama_fk = auth.uid()
      or k.asisten_fk = auth.uid()
      or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
$$;

drop policy if exists "kelas_write_instruktur" on public.kelas;
create policy "kelas_write_instruktur" on public.kelas
  for all to authenticated
  using (id in (select public.my_kelas_ids()))
  with check (id in (select public.my_kelas_ids()));


-- ============ 4. Lepas semua FK yang menunjuk public.batch ============
-- Nama constraint hasil `references` di 0001 tidak pernah ditulis eksplisit,
-- jadi cari lewat katalog pg_constraint. Yang kena: jadwal_sesi, peserta,
-- dan survei_respons.
do $$
declare
  r record;
begin
  for r in
    select conrelid::regclass as tbl, conname
      from pg_constraint
     where contype = 'f'
       and confrelid = 'public.batch'::regclass
  loop
    raise notice 'Lepas FK  %.% -> batch', r.tbl, r.conname;
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;


-- ============ 5. Rename kolom batch_id -> kelas_id ============
alter table public.jadwal_sesi  rename column batch_id to kelas_id;
alter table public.peserta     rename column batch_id to kelas_id;
alter table public.survei_respons rename column batch_id to kelas_id;


-- ============ 6. Pasang FK ke public.kelas ============
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.peserta'::regclass
       and conname  = 'peserta_kelas_id_fkey'
  ) then
    alter table public.peserta
      add constraint peserta_kelas_id_fkey
      foreign key (kelas_id) references public.kelas(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.jadwal_sesi'::regclass
       and conname  = 'jadwal_sesi_kelas_id_fkey'
  ) then
    alter table public.jadwal_sesi
      add constraint jadwal_sesi_kelas_id_fkey
      foreign key (kelas_id) references public.kelas(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.survei_respons'::regclass
       and conname  = 'survei_respons_kelas_id_fkey'
  ) then
    alter table public.survei_respons
      add constraint survei_respons_kelas_id_fkey
      foreign key (kelas_id) references public.kelas(id) on delete cascade;
  end if;
end $$;


-- ============ 7. Index ============
drop index if exists public.idx_jadwal_batch;
create index if not exists idx_jadwal_kelas on public.jadwal_sesi(kelas_id, tanggal_kelas);

create index if not exists idx_peserta_kelas on public.peserta(kelas_id);
create index if not exists idx_sesi_peserta_peserta on public.sesi_peserta(peserta_id);

-- módulos: `jalur` dihapus, jadi index gabungan jalur+kategori tidak berguna lagi
drop index if exists public.idx_modul_jalur;
drop index if exists public.idx_modul_jalur_kategori;
drop index if exists public.idx_modul_kategori_urutan;
create index if not exists idx_modul_kategori_urutan
  on public.modul(kategori, urutan_sesi, kode);


-- ============ 8. Jalur yang isinya data, bukan relasi -> kolom teks ============
-- `rubrik` isinya spesifik program ("Arsitektur RAG" untuk B3, "Kualitas
-- prompt" untuk B1). `pendaftar` menyimpan minat calon peserta. Keduanya
-- data, bukan taksonomi, jadi tidak hilang bersama kolom `jalur`.
alter table public.rubrik     add column if not exists program text;
update public.rubrik set program = jalur where program is null and jalur is not null;

alter table public.pendaftar add column if not exists minat_program text;
update public.pendaftar set minat_program = jalur where minat_program is null and jalur is not null;

-- 113 dari 117 paket soal bisa diturunkan kodenya (`PRE-B201`, `sesi_target
-- = 'B201'`). Sisanya paket uji generik tanpa modul, jadi butuh label.
alter table public.soal_paket add column if not exists program text;
update public.soal_paket
   set program = jalur
 where program is null and jalur is not null and kode_paket like '%TEST-JALUR%';


-- ============ 9. RPC pembuatan peserta: hapus p_jalur, p_batch_id -> p_kelas_id ============
drop function if exists public.admin_create_peserta(text,text,text,text,text,text,text,int,uuid,text);
drop function if exists public.admin_create_peserta(text,text,text,text,text,text,int,uuid,text);

create function public.admin_create_peserta(
  p_email             text,
  p_password          text,
  p_nama              text,
  p_no_wa             text default null,
  p_no_wa_ortu        text default null,
  p_email_ortu        text default null,
  p_usia              int  default null,
  p_kelas_id          uuid default null,
  p_kelas_penempatan  text default 'baru-kenal-hp'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $func$
declare
  v_user_id    uuid;
  v_peserta_id uuid;
  v_email      text := lower(trim(p_email));
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membuat peserta';
  end if;

  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email tidak valid';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'Password minimal 8 karakter';
  end if;
  if p_nama is null or trim(p_nama) = '' then
    raise exception 'Nama wajib diisi';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Email % sudah terdaftar. Gunakan menu Reset Password.', v_email;
  end if;

  v_user_id := gen_random_uuid();

  -- Kolom auth.identities.email adalah GENERATED, jadi tidak boleh ditulis.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, invited_at,
    confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at,
    email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at,
    phone, phone_change, phone_confirmed_at, phone_change_token, phone_change_sent_at,
    is_sso_user, is_anonymous, deleted_at, banned_until, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(), null,
    '', null,
    '', null,
    '', '', null,
    '', 0,
    '', null,
    null, null, null, '', null,
    false, false, null, null, null,
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nama_lengkap', trim(p_nama), 'nama', trim(p_nama),
                       'role', 'peserta', 'email_verified', true),
    now(), now()
  );

  insert into auth.identities (
    user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id,
    v_email,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    null, now(), now()
  )
  on conflict do nothing;

  insert into public.peserta (
    user_id, nama_lengkap, email, no_wa, no_wa_ortu,
    email_ortu, usia, kelas_id, kelas_penempatan,
    consent_privasi, consent_etika, byod
  ) values (
    v_user_id, trim(p_nama), v_email, p_no_wa, p_no_wa_ortu,
    p_email_ortu, p_usia, p_kelas_id, p_kelas_penempatan,
    true, true, true
  )
  returning id into v_peserta_id;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'peserta')
  on conflict (user_id, role) do nothing;

  return jsonb_build_object('user_id', v_user_id, 'peserta_id', v_peserta_id, 'email', v_email);
end;
$func$;

grant execute on function public.admin_create_peserta(text,text,text,text,text,text,int,uuid,text)
  to authenticated;


-- ============ 10. RPC nilai_kuis: buang pembacaan peserta.jalur ============
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

  if not exists (select 1 from public.peserta p where p.id = p_peserta) then
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
  -- Catatan: filter paket per peserta sengaja TIDAK di-hardcode di sini.
  -- Satu peserta bisa punya sesi dari beberapa kelas, jadi penentuannya
  -- dibuat dari `sesi_peserta` di sisi klien, bukan dari satu kolom profil.

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
drop function if exists public.kerjakan_kuis(uuid, text, jsonb);


-- ============ 11. Buang tabel batch dan helper lamanya ============
drop table if exists public.batch;
drop function if exists public.my_batch_ids();


-- ============ 12. Buang kolom jalur ============
drop index if exists public.idx_soal_paket_jalur;
drop index if exists public.idx_rubrik_jalur;

alter table public.modul       drop column if exists jalur;
alter table public.peserta      drop column if exists jalur;
alter table public.rubrik       drop column if exists jalur;
alter table public.pendaftar    drop column if exists jalur;
alter table public.sertifikat   drop column if exists jalur;
alter table public.soal_paket   drop column if exists jalur;


-- ============ 13. Perbaikan data penugasan (dari 0024, digabung ke sini) ============
-- 0024 tidak perlu dijalankan sendiri: langkah yang masih relevan sudah
-- ada di sini, dan migración ini aman dijalankan baik sesudah maupun
-- sebelum 0024.

-- Penugasan yang menunjuk sesi milik kelas lain. Sesi-nya tetap ada,
-- hanya penugasannya ke peserta yang dibuang.
delete from public.sesi_peserta
 where id in (
   select sp.id
     from public.sesi_peserta sp
     join public.peserta p on p.id = sp.peserta_id
     join public.jadwal_sesi j on j.id = sp.sesi_id
    where p.kelas_id is not null
      and j.kelas_id is distinct from p.kelas_id
 );

-- Jadwal duplikat dalam satu kelas. Yang dipertahankan yang tanggalnya
-- paling awal; baris yang sudah punya peserta tidak pernah dihapus.
delete from public.jadwal_sesi j
 where j.id in (
   select dup.id
     from (
       select id,
              row_number() over (
                partition by kode_sesi_friendly, kelas_id
                order by tanggal_kelas nulls last, created_at
              ) as rn
         from public.jadwal_sesi
     ) dup
    where dup.rn > 1
      and not exists (select 1 from public.sesi_peserta sp where sp.sesi_id = dup.id)
 );

-- Kode sesi harus sama dengan kode modulnya (ada satu sesi bernama "wadada").
update public.jadwal_sesi j
   set kode_sesi_friendly = m.kode
  from public.modul m
 where j.modul_id = m.id
   and j.kode_sesi_friendly is distinct from m.kode
   and not exists (
     select 1 from public.jadwal_sesi o
      where o.kelas_id = j.kelas_id
        and o.kode_sesi_friendly = m.kode
   );

-- Jam selesai harus setelah jam mulai. Kolom jam tidak menyimpan tanggal,
-- jadi sesi malam tetap ditulis sebagai jam saja (23:00 + 150 menit = 01:30).
with perbaiki as (
  select j.id,
         (j.jam_mulai + make_interval(mins => m.durasi_menit))::time as jam_akhir_baru
    from public.jadwal_sesi j
    join public.modul m on m.id = j.modul_id
   where j.jam_mulai is not null
     and j.jam_akhir is not null
     and j.jam_akhir <= j.jam_mulai
)
update public.jadwal_sesi j
   set jam_akhir = p.jam_akhir_baru
  from perbaiki p
 where j.id = p.id;

-- Peserta yang masuk kelas setelah sesi dibuat belum punya penugasan.
-- KelolaSesi sudah otomatis memberi sesi ke semua anggota kelas saat sesi
-- dibuat, jadi ini hanya menyusul kasus yang tertinggal.
insert into public.sesi_peserta (sesi_id, peserta_id)
select j.id, p.id
  from public.jadwal_sesi j
  join public.peserta p on p.kelas_id = j.kelas_id
 where not exists (
   select 1 from public.sesi_peserta sp
    where sp.sesi_id = j.id and sp.peserta_id = p.id
 );


-- ============ 14. Minta PostgREST memuat ulang cache skema ============
-- Tanpa ini /rest/v1/kelas masih 404 (PGRST205) awhile setelah migration.
notify pgrst, 'reload schema';
