import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';
import type { Catatan } from '../types';

export async function saveCatatan(sesiPesertaId: string, text: string) {
  const payload = {
    sesi_peserta_id: sesiPesertaId,
    catatan_text: text,
    status_pengumpulan: true,
    sync_status: 'pending' as const,
    at: new Date().toISOString(),
  };

  if (!navigator.onLine) {
    await offline.enqueuePending({
      id: crypto.randomUUID(),
      table: 'catatan_ketik',
      action: 'insert',
      payload,
      at: new Date().toISOString(),
    });
    return;
  }

  const { data: existing } = await supabase
    .from('catatan_ketik')
    .select('id')
    .eq('sesi_peserta_id', sesiPesertaId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('catatan_ketik')
      .update({ catatan_text: text, status_pengumpulan: true })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('catatan_ketik').insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function getCatatanBySesi(sesiPesertaId: string): Promise<Catatan | null> {
  const cached = await offline.cacheGet<Catatan>(`catatan-${sesiPesertaId}`);
  const { data, error } = await supabase
    .from('catatan_ketik')
    .select('*')
    .eq('sesi_peserta_id', sesiPesertaId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  if (data) {
    await offline.cacheSet(`catatan-${sesiPesertaId}`, data as Catatan);
    return data as Catatan;
  }
  return cached;
}
