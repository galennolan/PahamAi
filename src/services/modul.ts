import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';
import type { Modul, JadwalSesi, Peserta, Jalur } from '../types';

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
