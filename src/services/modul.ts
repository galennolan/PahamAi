import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';
import type { Modul, JadwalSesi, Peserta, ModulKategori, Kelas } from '../types';
import { resolveKategori, KATEGORI_MODUL } from '../types';
import { PROGRAM, programDariKodeModul } from '../constants/program';

const CACHE_KATALOG = 'modul-katalog';

/** Seluruh modul, sudah terurut untuk tampilan katalog. */
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

/** Modul untuk satu program, ditentukan dari prefiks kode modul (`B201` -> `B2`). */
export async function listModulByProgram(program: string): Promise<Modul[]> {
  const semua = await listModul();
  return semua.filter((m) => programDariKodeModul(m.kode) === program);
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
