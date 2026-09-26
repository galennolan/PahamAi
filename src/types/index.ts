export type UserRole = 'admin' | 'instruktur' | 'peserta' | 'parent';

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
  catatan_text: string;
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
  jumlah: number;
  due_date: string | null;
  status_bayar: PembayaranStatus;
  lock_status: LockStatus;
  sesi_lock_id: string | null;
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
  created_at: string;
  updated_at: string;
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
};
