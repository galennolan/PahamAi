import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';
import type { SesiPeserta, Kehadiran } from '../types';

export async function getSesiPeserta(sesiId: string, pesertaId: string): Promise<SesiPeserta | null> {
  const { data, error } = await supabase
    .from('sesi_peserta')
    .select('*')
    .eq('sesi_id', sesiId)
    .eq('peserta_id', pesertaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SesiPeserta | null;
}

export async function createSesiPeserta(sesiId: string, pesertaId: string): Promise<SesiPeserta> {
  const { data, error } = await supabase
    .from('sesi_peserta')
    .insert({ sesi_id: sesiId, peserta_id: pesertaId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SesiPeserta;
}

export async function markAttendance(sesiPesertaId: string, status: Kehadiran, menitTelat = 0) {
  const payload = {
    sesi_peserta_id: sesiPesertaId,
    status_kehadiran: status,
    menit_telat: menitTelat,
    sync_status: 'pending' as const,
    at: new Date().toISOString(),
  };

  if (!navigator.onLine) {
    await offline.enqueuePending({
      id: crypto.randomUUID(),
      table: 'absensi',
      action: 'insert',
      payload,
      at: new Date().toISOString(),
    });
    return;
  }

  const { error } = await supabase.from('absensi').insert(payload);
  if (error) throw new Error(error.message);
}

export async function listAbsensiForSesi(sesiId: string) {
  const { data, error } = await supabase
    .from('absensi')
    .select('*, sesi_peserta!inner(*,peserta(*))')
    .eq('sesi_peserta.sesi_id', sesiId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
