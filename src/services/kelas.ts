import { supabase } from '../lib/supabaseClient';
import type { Kelas, KelasStatus, Peserta, JadwalSesi, SesiPeserta } from '../types';

export interface KelasInput {
  kode: string;
  nama: string;
  status?: KelasStatus;
  tanggal_mulai?: string | null;
  tanggal_akhir?: string | null;
  kapasitas_maks?: number | null;
  instruktur_utama_fk?: string | null;
  asisten_fk?: string | null;
}

type KelasRow = Kelas & { peserta?: { count: number }[] };

/**
 * Daftar kelas. `terdaftar` dihitung dari `peserta` via view/aggregate
 * `peserta` di bawah, bukan disimpan di tabel `kelas`.
 */
export async function listKelas(): Promise<Kelas[]> {
  const { data, error } = await supabase
    .from('kelas')
    .select('*, peserta(count)')
    .order('tanggal_mulai', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as KelasRow[]).map((r) => ({
    ...r,
    terdaftar: r.peserta?.[0]?.count ?? 0,
  }));
}

export async function getKelas(id: string): Promise<Kelas | null> {
  const { data, error } = await supabase
    .from('kelas')
    .select('*, peserta(count)')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;

  const row = data as unknown as KelasRow | null;
  return row ? { ...row, terdaftar: row.peserta?.[0]?.count ?? 0 } : null;
}

export async function createKelas(input: KelasInput): Promise<Kelas> {
  const { data, error } = await supabase
    .from('kelas')
    .insert({
      kode: input.kode.trim().toUpperCase(),
      nama: input.nama.trim(),
      status: input.status ?? 'terbuka',
      tanggal_mulai: input.tanggal_mulai || null,
      tanggal_akhir: input.tanggal_akhir || null,
      kapasitas_maks: input.kapasitas_maks ?? null,
      instruktur_utama_fk: input.instruktur_utama_fk || null,
      asisten_fk: input.asisten_fk || null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Kelas;
}

export async function updateKelas(id: string, patch: Partial<KelasInput>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.kode !== undefined) payload.kode = patch.kode.trim().toUpperCase();
  if (patch.nama !== undefined) payload.nama = patch.nama.trim();
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.tanggal_mulai !== undefined) payload.tanggal_mulai = patch.tanggal_mulai || null;
  if (patch.tanggal_akhir !== undefined) payload.tanggal_akhir = patch.tanggal_akhir || null;
  if (patch.kapasitas_maks !== undefined) payload.kapasitas_maks = patch.kapasitas_maks;
  if (patch.instruktur_utama_fk !== undefined) payload.instruktur_utama_fk = patch.instruktur_utama_fk || null;
  if (patch.asisten_fk !== undefined) payload.asisten_fk = patch.asisten_fk || null;

  const { error } = await supabase.from('kelas').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteKelas(id: string): Promise<void> {
  const [{ count: nPeserta }, { count: nJadwal }] = await Promise.all([
    supabase.from('peserta').select('id', { count: 'exact', head: true }).eq('kelas_id', id),
    supabase.from('jadwal_sesi').select('id', { count: 'exact', head: true }).eq('kelas_id', id),
  ]);
  if ((nPeserta ?? 0) > 0) {
    throw new Error(`Kelas masih punya ${nPeserta} peserta. Pindahkan mereka dulu sebelum hapus.`);
  }
  if ((nJadwal ?? 0) > 0) {
    throw new Error(`Kelas masih punya ${nJadwal} sesi terjadwal. Hapus sesinya dulu.`);
  }
  const { error } = await supabase.from('kelas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listPesertaKelas(kelasId: string): Promise<Peserta[]> {
  const { data, error } = await supabase
    .from('peserta')
    .select('*')
    .eq('kelas_id', kelasId)
    .order('nama_lengkap');
  if (error) throw new Error(error.message);
  return data as Peserta[];
}

export async function getPesertaById(id: string): Promise<Peserta | null> {
  const { data, error } = await supabase.from('peserta').select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return (data ?? null) as Peserta | null;
}

export async function pindahkanPesertaKeKelas(pesertaIds: string[], kelasId: string | null): Promise<void> {
  if (pesertaIds.length === 0) return;
  const { error } = await supabase.from('peserta').update({ kelas_id: kelasId }).in('id', pesertaIds);
  if (error) throw new Error(error.message);
}

export async function listSesiKelas(kelasId: string): Promise<JadwalSesi[]> {
  const { data, error } = await supabase
    .from('jadwal_sesi')
    .select('*, modul(*)')
    .eq('kelas_id', kelasId)
    .order('tanggal_kelas');
  if (error) throw new Error(error.message);
  return data as JadwalSesi[];
}

export async function listPenugasanSesi(sesiId: string): Promise<SesiPeserta[]> {
  const { data, error } = await supabase.from('sesi_peserta').select('*').eq('sesi_id', sesiId);
  if (error) throw new Error(error.message);
  return data as SesiPeserta[];
}

export interface SebarSesiInput {
  sesiId: string;
  pesertaIds: string[];
  /** Timpa penugasan lama sesi ini bila true. */
  ganti?: boolean;
}

/** Checkerbox "pilih semua" di halaman penugasan sesi. */
export async function tandaiPesertaSesi(sesiId: string, pesertaIds: string[], tandai: boolean): Promise<void> {
  if (pesertaIds.length === 0) return;
  if (tandai) {
    await sebarkanSesi({ sesiId, pesertaIds });
  } else {
    const { error } = await supabase
      .from('sesi_peserta')
      .delete()
      .eq('sesi_id', sesiId)
      .in('peserta_id', pesertaIds);
    if (error) throw new Error(error.message);
  }
}

async function sebarkanSesi({ sesiId, pesertaIds }: SebarSesiInput): Promise<void> {
  const { data: ada, error: cErr } = await supabase
    .from('sesi_peserta')
    .select('peserta_id')
    .eq('sesi_id', sesiId)
    .in('peserta_id', pesertaIds);
  if (cErr) throw new Error(cErr.message);

  const sudah = new Set(((ada ?? []) as { peserta_id: string }[]).map((r) => r.peserta_id));
  const baru = pesertaIds.filter((id) => !sudah.has(id));
  if (baru.length === 0) return;

  const { error } = await supabase.from('sesi_peserta').insert(baru.map((peserta_id) => ({ sesi_id: sesiId, peserta_id })));
  if (error) throw new Error(error.message);
}

/** Batalkan satu penugasan. */
export async function hapusPenugasan(sesiId: string, pesertaId: string): Promise<void> {
  const { error } = await supabase
    .from('sesi_peserta')
    .delete()
    .eq('sesi_id', sesiId)
    .eq('peserta_id', pesertaId);
  if (error) throw new Error(error.message);
}

/** Beri penugasan satu sesi ke seluruh anggota sebuah kelas. */
export async function tugaskanKelasKeSesi(sesiId: string, kelasId: string): Promise<number> {
  const { data, error } = await supabase.from('peserta').select('id').eq('kelas_id', kelasId);
  if (error) throw new Error(error.message);

  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
  await sebarkanSesi({ sesiId, pesertaIds: ids });
  return ids.length;
}

/** Hapus semua penugasan sesi ini lalu isi ulang. */
export async function aturUlangPenugasanSesi(sesiId: string, pesertaIds: string[]): Promise<number> {
  const { error: dErr } = await supabase.from('sesi_peserta').delete().eq('sesi_id', sesiId);
  if (dErr) throw new Error(dErr.message);
  await sebarkanSesi({ sesiId, pesertaIds });
  return pesertaIds.length;
}
