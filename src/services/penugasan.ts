import { supabase } from '../lib/supabaseClient';
import type { JadwalSesi, Modul } from '../types';

/** Sesi milik peserta, lengkap dengan id baris `sesi_peserta` sebagai kunci. */
export interface SesiAssigned extends JadwalSesi {
  sesi_peserta_id: string;
}

export interface ProgresSesi {
  selesai: boolean;
  absen: string | null;
  adaCatatan: boolean;
}

/**
 * Sesi yang benar-benar di-assign tutor ke seorang peserta.
 *
 * Sumber kebenaran adalah `sesi_peserta` (baris dibuat tutor saat peserta
 * dimasukkan ke kelas), bukan `peserta.kelas_id`: satu kelas bisa punya
 * jadwal yang belum ditujukan untuk peserta tertentu, dan satu modul bisa
 * dijadwalkan di beberapa kelas sekaligus.
 */
export async function listSesiAssigned(pesertaId: string): Promise<SesiAssigned[]> {
  const { data: sp, error: spErr } = await supabase
    .from('sesi_peserta')
    .select('id, sesi_id')
    .eq('peserta_id', pesertaId);
  if (spErr) throw new Error(spErr.message);

  const rows = (sp ?? []) as Array<{ id: string; sesi_id: string }>;
  if (rows.length === 0) return [];

  const { data: js, error: jErr } = await supabase
    .from('jadwal_sesi')
    .select('*, modul(*)')
    .in('id', rows.map((r) => r.sesi_id))
    .order('tanggal_kelas', { ascending: true });
  if (jErr) throw new Error(jErr.message);

  const spBySesi = new Map(rows.map((r) => [r.sesi_id, r.id]));
  return ((js ?? []) as JadwalSesi[])
    .filter((j) => j.status_sesi !== 'dibatalkan' && spBySesi.has(j.id))
    .map((j) => ({ ...j, sesi_peserta_id: spBySesi.get(j.id) as string }));
}

/** Modul unik dari daftar sesi, diurutkan sesuai urutan materi jalur. */
export function urutModulDariSesi(sesi: SesiAssigned[]): Modul[] {
  const byId = new Map<string, Modul>();
  for (const s of sesi) {
    if (s.modul && !byId.has(s.modul.id)) byId.set(s.modul.id, s.modul);
  }
  // `urutan_sesi` diulang antar program, jadi `kode` jadi tiebreaker.
  return [...byId.values()].sort(
    (a, b) => a.urutan_sesi - b.urutan_sesi || a.kode.localeCompare(b.kode),
  );
}

/**
 * Progres tiap sesi, dibaca dari catatan dan absensi peserta.
 * Sesi dihitung selesai bila catatan terisi atau absensi bukan `alpha`.
 */
export async function getProgresSesi(spIds: string[]): Promise<Record<string, ProgresSesi>> {
  const out: Record<string, ProgresSesi> = {};
  if (spIds.length === 0) return out;

  const [catRes, absRes] = await Promise.all([
    supabase.from('catatan_ketik').select('sesi_peserta_id, catatan_text').in('sesi_peserta_id', spIds),
    supabase.from('absensi').select('sesi_peserta_id, status_kehadiran').in('sesi_peserta_id', spIds),
  ]);

  const catatan = new Map(
    ((catRes.data ?? []) as Array<{ sesi_peserta_id: string; catatan_text: string | null }>).map((c) => [
      c.sesi_peserta_id,
      Boolean(c.catatan_text?.trim()),
    ])
  );
  const absensi = new Map(
    ((absRes.data ?? []) as Array<{ sesi_peserta_id: string; status_kehadiran: string | null }>).map((a) => [
      a.sesi_peserta_id,
      a.status_kehadiran ?? null,
    ])
  );

  for (const id of spIds) {
    const absen = absensi.get(id) ?? null;
    out[id] = {
      selesai: catatan.get(id) === true || (absen !== null && absen !== 'alpha'),
      absen,
      adaCatatan: catatan.get(id) === true,
    };
  }
  return out;
}