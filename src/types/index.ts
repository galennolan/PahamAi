export type UserRole = 'admin' | 'instruktur' | 'peserta' | 'parent' | 'marketing';

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
  kelas_id: string | null;
  nik: string | null;
  no_wa: string | null;
  email: string | null;
  email_ortu?: string | null;
  alamat: string | null;
  pekerjaan_status: string | null;
  byod: boolean;
  consent_privasi: boolean;
  consent_etika: boolean;
  no_wa_ortu: string | null;
  /** Relasi opsional, hasil join `kelas(*)`. */
  kelas?: Kelas | null;
  created_at: string;
  updated_at: string;
}

export interface Modul {
  id: string;
  kode: string;
  judul: string;
  urutan_sesi: number;
  durasi_menit: number;
  content_md: string | null;
  slide_url: string | null;
  offline_material_path: string | null;
  /** Sekarang sumber utama pengelompokan katalog modul. */
  kategori: ModulKategori | null;
  materi_peserta_md?: string | null;
  created_at: string;
}

export type KelasStatus = 'terbuka' | 'berjalan' | 'selesai' | 'dibatalkan';

export interface Kelas {
  id: string;
  kode: string;
  nama: string;
  status: KelasStatus;
  tanggal_mulai: string | null;
  tanggal_akhir: string | null;
  kapasitas_maks: number | null;
  instruktur_utama_fk: string | null;
  asisten_fk: string | null;
  /** Hasil hitung dari `peserta`; tidak disimpan di database. */
  terdaftar?: number;
  created_at: string;
}

export interface JadwalSesi {
  id: string;
  modul_id: string;
  kelas_id: string;
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
  kelas?: Kelas | null;
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
  minat_program: string | null;
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
  level_lulus: string | null;
  tanggal_terbit: string | null;
  file_url: string | null;
  signed_by: string | null;
  created_at: string;
}



export interface SoalPaket {
  id: string;
  kode_paket: string;
  /** Diturunkan dari `kode_paket`; disimpan ulang saat migration 0028. */
  program: string | null;
  /** Diturunkan dari prefiks `kode_paket` di sisi klien bila kolom `program` kosong. */
  program_derived?: string | null;
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
  perlu_tinjau?: boolean;
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
  program: string | null;
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
  kelas_id: string;
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

const KATEGORI_VALID = new Set<string>(KATEGORI_MODUL.map((k) => k.kode));

/**
 * Kategori efektif sebuah modul.
 *
 * `modul.kategori` sudah di-backfill oleh migration 0008 dan dijaga CHECK
 * constraint-nya, jadi hampir selalu terisi. Pencocokan dari kode dan judul
 * hanya untuk modul yang lolos backfill manual.
 */
export function resolveKategori(modul: Modul): ModulKategori {
  if (modul.kategori && KATEGORI_VALID.has(modul.kategori)) return modul.kategori;
  const dariKode = KODE_TO_KATEGORI[modul.kode];
  if (dariKode) return dariKode;
  if (/etika|keamanan|bias/i.test(modul.judul)) return 'ETHC';
  if (/prompt/i.test(modul.judul)) return 'PRMP';
  if (/presentasi/i.test(modul.judul)) return 'PRES';
  if (/proyek|capstone/i.test(modul.judul)) return 'PROJ';
  if (/kode|api|python|sql/i.test(modul.judul)) return 'CODE';
  if (/otomasi|automasi|agent/i.test(modul.judul)) return 'AUTO';
  if (/arsitektur|rag|sistem/i.test(modul.judul)) return 'ARCH';
  if (/produktivitas|produk/i.test(modul.judul)) return 'PROD';
  if (/tool|aplikasi/i.test(modul.judul)) return 'TOOL';
  return 'FND';
}
