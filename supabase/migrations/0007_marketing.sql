-- Paham AI — migration 0007 (marketing: source tracking + konten library + tech features)
-- Jalankan di Supabase SQL Editor SETELAH 0001, 0002.

-- 1. Kolom tracking di pendaftar
alter table public.pendaftar add column if not exists source text;
alter table public.pendaftar add column if not exists source_detail text;
alter table public.pendaftar add column if not exists utm_source text;
alter table public.pendaftar add column if not exists utm_medium text;
alter table public.pendaftar add column if not exists utm_campaign text;
alter table public.pendaftar add column if not exists referrer_code text;

create index if not exists idx_pendaftar_source on public.pendaftar(source);
create index if not exists idx_pendaftar_utm on public.pendaftar(utm_source, utm_campaign);

-- 2. Kolom promo di modul
alter table public.modul add column if not exists promo_ready boolean not null default false;
alter table public.modul add column if not exists promo_angle text;
alter table public.modul add column if not exists target_audience text;

create index if not exists idx_modul_promo on public.modul(promo_ready);

-- 3. Tabel marketing_content
create table if not exists public.marketing_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('post_ig','post_fb','artikel_blog','video_script','whatsapp_blast','email_template','landing_copy')),
  target_audience text not null default '',
  topic text not null default '',
  content text not null default '',
  status text not null default 'draft' check (status in ('draft','review','approved','published')),
  platforms text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_content_status on public.marketing_content(status);
create index if not exists idx_marketing_content_type on public.marketing_content(type);

drop trigger if exists trg_marketing_content_updated on public.marketing_content;
create trigger trg_marketing_content_updated
  before update on public.marketing_content
  for each row execute function public.handle_updated_at();

-- 4. Tabel tech_features
create table if not exists public.tech_features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('platform','content','analytics','automation','community')),
  description text not null default '',
  marketing_value text not null default '',
  implementation_effort text not null default 'sedang' check (implementation_effort in ('rendah','sedang','tinggi')),
  status text not null default 'direncanakan' check (status in ('tersedia','dalam_pengembangan','direncanakan')),
  created_at timestamptz not null default now()
);

create index if not exists idx_tech_features_category on public.tech_features(category);
create index if not exists idx_tech_features_status on public.tech_features(status);

-- 5. RLS
alter table public.marketing_content enable row level security;
drop policy if exists "mc_read_staff" on public.marketing_content;
create policy "mc_read_staff" on public.marketing_content
  for select to authenticated using (public.is_staff());
drop policy if exists "mc_write_marketing" on public.marketing_content;
create policy "mc_write_marketing" on public.marketing_content
  for all to authenticated
  using (public.is_admin() or (auth.jwt() -> 'user_metadata' ->> 'role') = 'marketing')
  with check (public.is_admin() or (auth.jwt() -> 'user_metadata' ->> 'role') = 'marketing');

alter table public.tech_features enable row level security;
drop policy if exists "tf_read_staff" on public.tech_features;
create policy "tf_read_staff" on public.tech_features
  for select to authenticated using (public.is_staff());
drop policy if exists "tf_write_admin" on public.tech_features;
create policy "tf_write_admin" on public.tech_features
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6. Seed tech features awal
insert into public.tech_features (name, category, description, marketing_value, implementation_effort, status) values
  ('PWA installable', 'platform', 'Aplikasi bisa di-install di HP tanpa Play Store', 'Jualan: tanpa install ribet, langsung pakai', 'rendah', 'tersedia'),
  ('Offline-first modul', 'platform', 'Baca modul & catat tanpa internet, sync otomatis', 'Jualan: belajar di desa/kota kecil tanpa sinyal', 'sedang', 'tersedia'),
  ('Dashboard orang tua read-only', 'platform', 'Wali pantau progres anak real-time', 'Jualan: transparansi ke orang tua, trust tinggi', 'rendah', 'tersedia'),
  ('Kuis auto-grade + KKM', 'content', '28 paket soal, nilai otomatis, remedial 1x', 'Jualan: hasil terukur, bukan sekadar ikut kelas', 'rendah', 'tersedia'),
  ('Sertifikat bernomor seri', 'content', 'PAHAI/TAHUN/JALUR/NOMOR, verifikasi online', 'Jualan: bukti kelulusan resmi untuk CV', 'rendah', 'tersedia'),
  ('Notifikasi WA otomatis', 'automation', 'Pengingat jadwal, tagihan, early warning via WA', 'Jualan: tidak ada peserta yang ketinggalan info', 'sedang', 'dalam_pengembangan'),
  ('Payment lock sesi 4+', 'automation', 'Kunci modul otomatis jika cicilan belum lunas', 'Operasional: cashflow aman tanpa nagih manual', 'sedang', 'dalam_pengembangan'),
  ('Analytics sumber pendaftar', 'analytics', 'UTM + referral tracking per pendaftar', 'Jualan: tahu iklan mana yang menghasilkan', 'rendah', 'tersedia')
on conflict do nothing;
