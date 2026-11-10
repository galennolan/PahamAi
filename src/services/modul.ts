import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';
import type { Modul, JadwalSesi, Peserta, ModulKategori, Kelas, ModulInduk } from '../types';
import { resolveKategori, KATEGORI_MODUL } from '../types';
import { PROGRAM, programDariKodeModul } from '../constants/program';

const CACHE_KATALOG = 'modul-katalog';

export const DEFAULT_MODUL_INDUK: ModulInduk[] = [
  {
    id: 'MOD-AI-01',
    kode: 'MOD-AI-01',
    nama: 'Dasar Kecerdasan Buatan & Prompt Engineering',
    deskripsi: 'Fondasi komprehensif konsep AI, arsitektur Large Language Model (LLM), teknik prompt profesional, etika, dan produktivitas.',
    total_pertemuan: 14,
  },
  {
    id: 'MOD-AI-02',
    kode: 'MOD-AI-02',
    nama: 'Machine Learning & Deep Learning',
    deskripsi: 'Pembelajaran mesin teoritis dan praktis: Supervised/Unsupervised, Neural Networks, Computer Vision, dan NLP terapan.',
    total_pertemuan: 14,
  },
  {
    id: 'MOD-AI-03',
    kode: 'MOD-AI-03',
    nama: 'AI Engineering, RAG & Autonomous Agents',
    deskripsi: 'Arsitektur sistem cerdas tingkat lanjut: Integrasi API LLM, Vector Database, RAG, Tool-Use, Multi-Agent, dan Deployment Produksi.',
    total_pertemuan: 14,
  },
];

/** Ambil seluruh daftar modul induk (katalog modul). */
export async function listModulInduk(): Promise<ModulInduk[]> {
  const semua = await listModul();

  // Kelompokkan berdasarkan offline_material_path (ID modul induk)
  const map = new Map<string, { nama: string; count: number }>();
  for (const m of semua) {
    const parentId = m.offline_material_path || 'MOD-AI-01';
    const parentNama = m.slide_url || 'Modul Pembelajaran AI';
    const cur = map.get(parentId) || { nama: parentNama, count: 0 };
    cur.count++;
    map.set(parentId, cur);
  }

  if (map.size === 0) return DEFAULT_MODUL_INDUK;

  return Array.from(map.entries()).map(([id, info]) => {
    const defaultInfo = DEFAULT_MODUL_INDUK.find((d) => d.id === id);
    return {
      id,
      kode: id,
      nama: defaultInfo?.nama || info.nama,
      deskripsi: defaultInfo?.deskripsi || `Kurikulum komprehensif berstandar perkuliahan (${info.count} Pertemuan).`,
      total_pertemuan: info.count,
    };
  });
}

/** Ambil seluruh pertemuan (1 s/d 14) untuk satu modul tertentu. */
export async function listPertemuanByModul(modulId: string): Promise<Modul[]> {
  const semua = await listModul();
  const filtered = semua.filter((m) => (m.offline_material_path || 'MOD-AI-01') === modulId);
  return filtered.sort((a, b) => a.urutan_sesi - b.urutan_sesi);
}

/** Seluruh baris pertemuan, sudah terurut untuk tampilan katalog. */
export async function listModul(): Promise<Modul[]> {
  const { data, error } = await supabase
    .from('modul')
    .select('*')
    .order('urutan_sesi', { ascending: true })
    .order('kode', { ascending: true });
  if (error) throw new Error(error.message);

  const result = (data ?? []) as Modul[];
  await offline.cacheSet(CACHE_KATALOG, result);
  return result;
}

/** Modul untuk satu program. Jika modul menggunakan format perkuliahan (P01-P14), kembalikan seluruh silabus. */
export async function listModulByProgram(program: string): Promise<Modul[]> {
  const semua = await listModul();
  const filtered = semua.filter((m) => programDariKodeModul(m.kode) === program);
  return filtered.length > 0 ? filtered : semua;
}

/** Modul satu kategori, tetap diurutkan `urutan_sesi` lalu `kode`. */
export async function listModulByKategori(program: string, kategori: ModulKategori): Promise<Modul[]> {
  const semua = await listModulByProgram(program);
  return semua.filter((m) => resolveKategori(m) === kategori);
}

/** Kategori yang benar-benar punya modul di program ini, urut sesuai definisi. */
export async function listKategoriTerisi(program: string): Promise<ModulKategori[]> {
  const semua = await listModulByProgram(program);
  const ada = new Set(semua.map(resolveKategori));
  return KATEGORI_MODUL.map((k) => k.kode).filter((k) => ada.has(k));
}

/** Kode program apa saja yang punya modul — dipakai filter di katalog. */
export async function listProgramTerpakai(): Promise<string[]> {
  const semua = await listModul();
  const set = new Set(semua.map((m) => programDariKodeModul(m.kode)).filter(Boolean) as string[]);
  return PROGRAM.filter((p) => set.has(p.kode)).map((p) => p.kode);
}

export async function getModulByKode(kode: string): Promise<Modul | null> {
  const { data, error } = await supabase.from('modul').select('*').eq('kode', kode).maybeSingle();
  if (error) return null;
  return (data ?? null) as Modul | null;
}

export async function getModulFromCache(kode: string): Promise<Modul | null> {
  const arr = await offline.cacheGet<Modul[]>(CACHE_KATALOG);
  return arr?.find((m) => m.kode === kode) ?? null;
}

export async function listJadwalByKelas(kelasId: string): Promise<JadwalSesi[]> {
  const { data, error } = await supabase
    .from('jadwal_sesi')
    .select('*, modul(*), kelas(*)')
    .eq('kelas_id', kelasId)
    .order('tanggal_kelas');
  if (error) throw new Error(error.message);
  return data as JadwalSesi[];
}

/** Cek modul apa yang sedang dipelajari oleh kelas tertentu. */
export async function getModulForKelas(kelasId: string): Promise<ModulInduk | null> {
  const { data } = await supabase
    .from('jadwal_sesi')
    .select('modul(offline_material_path, slide_url)')
    .eq('kelas_id', kelasId)
    .limit(1);

  const modulRow = (data?.[0]?.modul as unknown as { offline_material_path?: string; slide_url?: string } | undefined);
  const parentId = modulRow?.offline_material_path || 'MOD-AI-01';
  const list = await listModulInduk();
  return list.find((m) => m.id === parentId) || DEFAULT_MODUL_INDUK[0];
}

/** Mengatur / mengganti modul yang dipelajari kelas tertentu, menjadwalkan ulang pertemuan 1-14. */
export async function assignModulKeKelas(kelasId: string, modulId: string, tanggalMulaiStr?: string): Promise<void> {
  const pertemuanList = await listPertemuanByModul(modulId);
  if (pertemuanList.length === 0) {
    throw new Error(`Modul ${modulId} belum memiliki pertemuan.`);
  }

  // 1. Hapus jadwal sesi lama kelas ini
  await supabase.from('jadwal_sesi').delete().eq('kelas_id', kelasId);

  // 2. Ambil data murid kelas ini
  const { data: pesertas } = await supabase.from('peserta').select('id').eq('kelas_id', kelasId);

  // 3. Buat jadwal baru untuk 14 pertemuan
  const startDate = tanggalMulaiStr ? new Date(tanggalMulaiStr) : new Date();
  const jadwalPayload = pertemuanList.map((p, idx) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (p.urutan_sesi - 1) * 7);
    return {
      kelas_id: kelasId,
      modul_id: p.id,
      kode_sesi_friendly: p.kode,
      judul_sesi: p.judul,
      tanggal_kelas: d.toISOString().slice(0, 10),
      jam_mulai: '09:00:00',
      jam_akhir: '10:40:00',
      lokasi: 'Ruang Perkuliahan AI',
      status_sesi: idx === 0 ? 'selesai' : idx === 1 ? 'berlangsung' : 'belum',
    };
  });

  const { data: insertedJadwal, error: errJadwal } = await supabase
    .from('jadwal_sesi')
    .insert(jadwalPayload)
    .select('id');

  if (errJadwal) throw new Error(errJadwal.message);

  // 4. Hubungkan ke sesi_peserta
  if (pesertas && pesertas.length > 0 && insertedJadwal && insertedJadwal.length > 0) {
    const spPayload = insertedJadwal.flatMap((j) =>
      pesertas.map((p) => ({
        sesi_id: j.id,
        peserta_id: p.id,
      }))
    );
    await supabase.from('sesi_peserta').insert(spPayload);
  }
}

/** Rename kelas dengan cepat dan aman. */
export async function renameKelas(kelasId: string, namaBaru: string): Promise<void> {
  if (!namaBaru.trim()) throw new Error('Nama kelas tidak boleh kosong');
  const { error } = await supabase.from('kelas').update({ nama: namaBaru.trim() }).eq('id', kelasId);
  if (error) throw new Error(error.message);
}

/** Jadwal milik peserta, diturunkan dari `sesi_peserta` (bukan dari kelas). */
export async function listJadwalPeserta(pesertaId: string): Promise<JadwalSesi[]> {
  const { data, error } = await supabase
    .from('sesi_peserta')
    .select('sesi:jadwal_sesi(*, modul(*), kelas(*))')
    .eq('peserta_id', pesertaId);
  if (error) throw new Error(error.message);

  const baris = (data ?? []) as unknown as { sesi: JadwalSesi | null }[];
  return baris
    .map((r) => r.sesi)
    .filter((s): s is JadwalSesi => s !== null)
    .sort((a, b) => {
      const t = (a.tanggal_kelas ?? '').localeCompare(b.tanggal_kelas ?? '');
      if (t !== 0) return t;
      return (a.modul?.urutan_sesi ?? 0) - (b.modul?.urutan_sesi ?? 0);
    });
}

export async function getPesertaByUser(userId: string): Promise<Peserta | null> {
  const { data, error } = await supabase
    .from('peserta')
    .select('*, kelas(*)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as Peserta | null;
}

/** Kelas yang diampu instruktur yang sedang login. */
export async function listKelasUntukInstruktur(userId: string): Promise<Kelas[]> {
  const { data, error } = await supabase
    .from('kelas')
    .select('*')
    .or(`instruktur_utama_fk.eq.${userId},asisten_fk.eq.${userId}`)
    .order('tanggal_mulai', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Kelas[];
}
