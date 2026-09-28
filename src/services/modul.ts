import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';
import type { Modul, JadwalSesi, Peserta, Jalur, JalurInfo } from '../types';
import { JALUR_FALLBACK } from '../types';

export async function listModulByJalur(jalur: Jalur): Promise<Modul[]> {
  const { data, error } = await supabase
    .from('modul')
    .select('*')
    .eq('jalur', jalur)
    .order('urutan_sesi', { ascending: true });
  if (error) throw new Error(error.message);

  const result = data as Modul[];
  await offline.cacheSet(`modul-${jalur}`, result);
  return result;
}

export async function listModulByKategori(jalur: Jalur, kategori: string): Promise<Modul[]> {
  const { data, error } = await supabase
    .from('modul')
    .select('*')
    .eq('jalur', jalur)
    .eq('kategori', kategori)
    .order('urutan_sesi', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Modul[];
}

export async function getModulByKode(kode: string): Promise<Modul | null> {
  const { data, error } = await supabase.from('modul').select('*').eq('kode', kode).maybeSingle();
  if (error) return null;
  return (data ?? null) as Modul | null;
}

/**
 * Daftar jalur dari tabel `jalur` (migration 0011).
 * Fallback ke JALUR_FALLBACK bila tabel belum ada / query gagal,
 * supaya UI tetap jalan sebelum migration dijalankan.
 */
export async function listJalurInfo(onlyAktif = true): Promise<JalurInfo[]> {
  const { data, error } = await supabase
    .from('jalur')
    .select('*')
    .order('urutan', { ascending: true });
  if (error || !data) return [...JALUR_FALLBACK];
  const rows = (data as JalurInfo[]).filter((j) => !onlyAktif || j.aktif);
  return rows.length > 0 ? rows : [...JALUR_FALLBACK];
}

export async function listJalurs(): Promise<Jalur[]> {
  return (await listJalurInfo()).map((j) => j.kode as Jalur);
}

export async function createJalur(input: { kode: string; label: string; deskripsi?: string | null; urutan?: number }): Promise<void> {
  const { error } = await supabase.from('jalur').insert({
    kode: input.kode.trim().toUpperCase(),
    label: input.label.trim(),
    deskripsi: input.deskripsi?.trim() || null,
    urutan: input.urutan ?? 99,
    aktif: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateJalur(kode: string, patch: { label?: string; deskripsi?: string | null; urutan?: number; aktif?: boolean }): Promise<void> {
  const { error } = await supabase.from('jalur').update(patch).eq('kode', kode);
  if (error) throw new Error(error.message);
}

export async function deleteJalur(kode: string): Promise<void> {
  const { count, error: cErr } = await supabase.from('modul').select('id', { count: 'exact', head: true }).eq('jalur', kode);
  if (cErr) throw new Error(cErr.message);
  if ((count ?? 0) > 0) throw new Error(`Jalur ${kode} masih dipakai ${count} modul — pindahkan dulu sebelum hapus.`);
  const { error } = await supabase.from('jalur').delete().eq('kode', kode);
  if (error) throw new Error(error.message);
}


export async function getModulFromCache(kode: string): Promise<Modul | null> {
  for (const jalur of ['A', 'B1', 'B2', 'B3', 'G'] as Jalur[]) {
    const arr = await offline.cacheGet<Modul[]>(`modul-${jalur}`);
    const found = arr?.find((m) => m.kode === kode);
    if (found) return found;
  }
  return null;
}

export async function listJadwalByBatch(batchId: string): Promise<JadwalSesi[]> {
  const { data, error } = await supabase
    .from('jadwal_sesi')
    .select('*, modul(*)')
    .eq('batch_id', batchId)
    .order('tanggal_kelas');
  if (error) throw new Error(error.message);
  return data as JadwalSesi[];
}

export async function getPesertaByUser(userId: string): Promise<Peserta | null> {
  const { data, error } = await supabase
    .from('peserta')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as Peserta | null;
}
