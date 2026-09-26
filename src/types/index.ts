export type UserRole = 'admin' | 'instruktur' | 'peserta' | 'parent' | 'marketing';

export type Jalur = 'A' | 'B1' | 'B2' | 'B3';

export type SesiStatus = 'belum' | 'berlangsung' | 'selesai' | 'dibatalkan';

export type Kehadiran = 'hadir' | 'izin' | 'alpha' | 'telat';

export type SyncStatus = 'pending' | 'synced';

export type PembayaranStatus = 'belum_bayar' | 'cicilan' | 'lunas';

export type LockStatus = 'terbuka' | 'terkunci';

export type PendaftarStatus = 'pending' | 'verifying' | 'rejected' | 'approved';

export interface Peserta {
  id: string;
  user_id: string;
  nama_lengkap: string;
  nama_panggil: string | null;
  tanggal_lahir: string | null;
  usia: number | null;
  kelas_penempatan: string | null;
  jalur: Jalur | null;
  batch_id: string | null;
  nik: string | null;
  no_wa: string | null;
  email: string | null;
  alamat: string | null;
  pekerjaan_status: string | null;
  byod: boolean;
  consent_privasi: boolean;
  consent_etika: boolean;
  no_wa_ortu: string | null;
  created_at: string;
  updated_at: string;
}

export interface Modul {
  id: string;
  kode: string;
  judul: string;
  jalur: Jalur;
  urutan_sesi: number;
  durasi_menit: number;
  content_md: string | null;
  slide_url: string | null;
  kategori?: string | null;
  promo_ready: boolean;
  promo_angle: string | null;
  target_audience: string | null;
  created_at: string;
}

export interface Batch {
  id: string;
  kode_batch: string;
  jalur: Jalur;
  nama_batch: string | null;
  status: string;
  tanggal_mulai: string | null;
  tanggal_akhir: string | null;
  kapasitas_maks: number | null;
  terdaftar: number;
  created_at: string;
}

export interface JadwalSesi {
  id: string;
  modul_id: string;
  batch_id: string;
  kode_sesi_friendly: string;
  judul_sesi: string;
  tanggal_kelas: string | null;
  jam_mulai: string | null;
  jam_akhir: string | null;
  link_rapat: string | null;
  lokasi: string | null;
  status_sesi: SesiStatus;
  catatan_instruktur: string | null;
  modul?: Modul | null;
  created_at: string;
}

export interface SesiPeserta {
  id: string;
  sesi_id: string;
  peserta_id: string;
  created_at: string;
}

export interface Absensi {
  id: string;
  sesi_peserta_id: string;
  status_kehadiran: Kehadiran;
  menit_telat: number;
  verified_by: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface Penilaian {
  id: string;
  sesi_peserta_id: string;
  rubrik_item: string;
  skor: number;
  bobot_persen: number;
  status_kelulusan: string;
  verified_by: string | null;
  catatan_instruktur: string | null;
  created_at: string;
  updated_at: string;
}

export interface Catatan {
  id: string;
  sesi_peserta_id: string;
  catatan_text: string | null;
  tldraw_url: string | null;
  status_pengumpulan: boolean;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface Sketch {
  id: string;
  sesi_peserta_id: string;
  snapshot: Record<string, unknown>;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface Pembayaran {
  id: string;
  peserta_id: string;
  biaya_total: number;
  dibayar: number;
  jumlah: number;
  due_date: string | null;
  status_bayar: PembayaranStatus;
  lock_status: LockStatus;
  sesi_lock_id: string | null;
  metode: string | null;
  bukti_transfer_url: string | null;
  refund_status: string;
  rollover_count: number;
  created_at: string;
  updated_at: string;
}

export interface Pendaftar {
  id: string;
  nama_lengkap: string;
  email: string | null;
  no_wa: string | null;
  jalur: Jalur | null;
  usia: number | null;
  status: PendaftarStatus;
  catatan_admin: string | null;
  source: string | null;
  source_detail: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingContent {
  id: string;
  title: string;
  type: 'post_ig' | 'post_fb' | 'artikel_blog' | 'video_script' | 'whatsapp_blast' | 'email_template' | 'landing_copy';
  target_audience: string;
  topic: string;
  content: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  platforms: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechFeature {
  id: string;
  name: string;
  category: 'platform' | 'content' | 'analytics' | 'automation' | 'community';
  description: string;
  marketing_value: string;
  implementation_effort: 'rendah' | 'sedang' | 'tinggi';
  status: 'tersedia' | 'dalam_pengembangan' | 'direncanakan';
  created_at: string;
}

export interface Sertifikat {
  id: string;
  id_peserta_fk: string;
  nomor_seri: string;
  jalur: Jalur | null;
  level_lulus: string | null;
  tanggal_terbit: string | null;
  file_url: string | null;
  signed_by: string | null;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  id_peserta_fk: string;
  kode_sesi: string;
  item_url: string | null;
  item_type: 'tldraw' | 'github' | 'google_colab' | 'file' | 'image' | null;
  tanggal: string | null;
  deskripsi: string | null;
  created_at: string;
}

export interface SoalPaket {
  id: string;
  kode_paket: string;
  jalur: Jalur | null;
  tipe: 'kuis' | 'pre_test' | 'post_test';
  sesi_target: string | null;
  durasi_menit: number;
  created_at: string;
}

export interface SoalButir {
  id: string;
  kode_paket: string;
  no_soal: number;
  pertanyaan: string;
  pilihan_a: string | null;
  pilihan_b: string | null;
  pilihan_c: string | null;
  pilihan_d: string | null;
  kunci: string | null;
  pembahasan: string | null;
  bobot_skor: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  id_peserta_fk: string;
  kode_paket: string;
  no_soal: number;
  attempt_no: number;
  jawaban: string | null;
  benar: boolean | null;
  skor: number | null;
  waktu: string;
}

export interface LessonPlanSegmen {
  id: string;
  modul_id: string;
  segmen_ke: number;
  judul: string;
  durasi_menit: number;
  talking_points: string | null;
  antisipasi: string | null;
  plan_b: string | null;
  created_at: string;
}

export interface Rubrik {
  id: string;
  jalur: Jalur | null;
  aspek: string;
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  level_4: string | null;
  bobot: number;
  kritis: boolean;
  created_at: string;
}

export interface StudiKasus {
  id: string;
  kode: string;
  judul: string;
  konteks: string;
  bahan: string;
  diskusi: string[];
  kunci_instruktur: string | null;
  durasi_menit: number;
  sesi_target: string | null;
  created_at: string;
}

export interface PlacementRespons {
  id: string;
  id_pendaftar_fk: string;
  jawaban_json: Record<string, unknown>;
  skor_blok1: number | null;
  level_akhir: string | null;
  rekomendasi_kelas: string | null;
  tanggal: string;
}

export interface SurveiRespons {
  id: string;
  batch_id: string;
  id_peserta_fk: string | null;
  id_parent_fk: string | null;
  kelompok: 'peserta' | 'parent';
  nps: number | null;
  rating_materi: number | null;
  rating_instruktur: number | null;
  rating_nilai_uang: number | null;
  feedback: string | null;
  created_at: string;
}

export const JALUR_LABELS: Record<Jalur, string> = {
  A: 'A — Anak',
  B1: 'B1 — Pemula',
  B2: 'B2 — Menengah',
  B3: 'B3 — Expert',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  instruktur: 'Instruktur',
  peserta: 'Peserta',
  parent: 'Orang Tua',
  marketing: 'Marketing',
};

export type ModulKategori =
  | 'FND'
  | 'TOOL'
  | 'PRMP'
  | 'PROD'
  | 'ETHC'
  | 'CODE'
  | 'AUTO'
  | 'ARCH'
  | 'PROJ'
  | 'PRES';

export interface KategoriDef {
  kode: ModulKategori;
  label: string;
  color: string;
  warnaBadge: string;
}

export const KATEGORI_MODUL: KategoriDef[] = [
  { kode: 'FND',  label: 'Fondasi AI',               color: '#3B82F6', warnaBadge: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  { kode: 'TOOL', label: 'Tools & Platform',         color: '#8B5CF6', warnaBadge: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
  { kode: 'PRMP', label: 'Prompt Engineering',       color: '#EC4899', warnaBadge: 'border-pink-500/30 bg-pink-500/10 text-pink-400' },
  { kode: 'PROD', label: 'Produktivitas',            color: '#10B981', warnaBadge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  { kode: 'ETHC', label: 'Etika & Keamanan',         color: 'primary-hover', warnaBadge: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  { kode: 'CODE', label: 'Pemrograman & API',        color: '#06B6D4', warnaBadge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' },
  { kode: 'AUTO', label: 'Automasi & Agent',         color: '#84CC16', warnaBadge: 'border-lime-500/30 bg-lime-500/10 text-lime-400' },
  { kode: 'ARCH', label: 'Arsitektur Sistem',        color: '#F97316', warnaBadge: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  { kode: 'PROJ', label: 'Proyek & Capstone',        color: 'destructive-hover', warnaBadge: 'border-red-500/30 bg-red-500/10 text-red-400' },
  { kode: 'PRES', label: 'Presentasi Skills',        color: '#A78BFA', warnaBadge: 'border-violet-500/30 bg-violet-500/10 text-violet-400' },
];

export const KATEGORI_LABELS: Record<ModulKategori, string> = KATEGORI_MODUL.reduce(
  (acc, k) => {
    acc[k.kode] = k.label;
    return acc;
  },
  {} as Record<ModulKategori, string>,
);

const KODE_TO_KATEGORI: Record<string, ModulKategori> = {
  A01: 'FND', A02: 'FND', A03: 'TOOL', A04: 'TOOL', A05: 'TOOL',
  A06: 'ETHC', A07: 'ETHC', A08: 'PROJ', A09: 'PRES',
  B101: 'FND', B102: 'TOOL', B103: 'PRMP', B104: 'PROD', B105: 'ETHC',
  B106: 'PROJ', B107: 'PRES',
  B201: 'PRMP', B202: 'PRMP', B203: 'PROD', B204: 'ETHC', B205: 'CODE',
  B206: 'AUTO', B207: 'CODE', B208: 'CODE', B209: 'PROJ',
  B210: 'PRES', B211: 'PROJ',
  B301: 'ARCH', B302: 'ARCH', B303: 'AUTO', B304: 'AUTO', B305: 'ARCH',
  B306: 'ARCH', B307: 'ETHC', B308: 'PROJ', B309: 'PRES',
  B310: 'PROJ', B311: 'PROJ',
};

export function resolveKategori(modul: Modul): ModulKategori {
  if (modul.kategori && (KODE_TO_KATEGORI as Record<string, unknown>)[modul.kategori.toUpperCase()] !== undefined)
    return modul.kategori.toUpperCase() as ModulKategori;
  const k = KODE_TO_KATEGORI[modul.kode];
  if (k) return k;
  if (/etika|keamanan|bias/i.test(modul.judul)) return 'ETHC';
  if (/prompt/i.test(modul.judul)) return 'PRMP';
  if (/presentasi/i.test(modul.judul)) return 'PRES';
  if (/proyek|capstone/i.test(modul.judul)) return 'PROJ';
  return 'FND';
}
