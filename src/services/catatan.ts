import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';
import type { Catatan } from '../types';

export async function saveCatatan(
  sesiPesertaId: string,
  text: string,
  tldrawUrl?: string | null
) {
  const payload = {
    sesi_peserta_id: sesiPesertaId,
    catatan_text: text || null,
    tldraw_url: tldrawUrl ?? null,
    status_pengumpulan: Boolean(text || tldrawUrl),
    sync_status: 'pending' as const,
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

  const { error } = await supabase
    .from('catatan_ketik')
    .upsert(payload, { onConflict: 'sesi_peserta_id' });
  if (error) throw new Error(error.message);
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
