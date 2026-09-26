import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Field, TextInput, SelectInput } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { JadwalSesi, Modul, Batch } from '../types';
import { formatJakarta } from '../lib/time';

export default function KelolaSesiPage() {
  const { push: toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [jadwals, setJadwals] = useState<JadwalSesi[]>([]);
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    modul_id: '',
    kode_sesi_friendly: '',
    judul_sesi: '',
    tanggal_kelas: '',
    jam_mulai: '',
    jam_akhir: '',
    link_rapat: '',
    lokasi: '',
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('batch').select('*').order('created_at', { ascending: false });
      if (!error) setBatches(data || []);
      setLoadingBatch(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedBatch) {
      setJadwals([]);
      return;
    }
    (async () => {
      setLoadingJadwal(true);
      const { data, error } = await supabase
        .from('jadwal_sesi')
        .select('*, modul(*)')
        .eq('batch_id', selectedBatch)
        .order('tanggal_kelas', { ascending: true });
      if (!error) setJadwals(data as JadwalSesi[]);
      setLoadingJadwal(false);
    })();
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedBatch) {
      (async () => {
        const { data: modulData, error } = await supabase
          .from('modul')
          .select('*')
          .eq('batch_id', selectedBatch)
          .order('urutan_sesi', { ascending: true });
        if (!error) setModuls(modulData || []);
      })();
    } else {
      setModuls([]);
    }
  }, [selectedBatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !form.modul_id) {
      toast('Pilih modul dan batch terlebih dahulu', 'error');
      return;
    }

    const { error } = await supabase.from('jadwal_sesi').insert({
      ...form,
      batch_id: selectedBatch,
    });
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Sesi berhasil dibuat', 'success');
      setShowForm(false);
      setForm({
        modul_id: '',
        kode_sesi_friendly: '',
        judul_sesi: '',
        tanggal_kelas: '',
        jam_mulai: '',
        jam_akhir: '',
        link_rapat: '',
        lokasi: '',
      });
      if (selectedBatch) {
        const { data } = await supabase.from('jadwal_sesi').select('*, modul(*)').eq('batch_id', selectedBatch).order('tanggal_kelas', { ascending: true });
        setJadwals(data as JadwalSesi[]);
      }
    }
  };

  if (loadingBatch) return <Loading text="Memuat batch..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-[#F1F5F9]">Kelola Sesi Kelas</h1>

      <Card>
        <Field label="Pilih Batch" className="max-w-md">
          <SelectInput value={selectedBatch ?? ''} onChange={(e) => setSelectedBatch(e.target.value)} disabled={loadingJadwal}>
            <option value="">— Pilih batch —</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id} className="bg-[#1E293B]">
                {b.kode_batch} — {b.nama_batch ?? b.jalur}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      {showForm && selectedBatch && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Buat Sesi Baru</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Modul">
                <select
                  value={form.modul_id}
                  onChange={(e) => setForm({ ...form, modul_id: e.target.value })}
                  className="w-full rounded-[4px] border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-[#F1F5F9] outline-none focus:border-[#4ADE80]"
                >
                  <option value="">— Pilih modul —</option>
                  {moduls.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#1E293B]">
                      {m.kode} — {m.judul}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kode Sesi">
                <TextInput
                  placeholder="A01, B101"
                  value={form.kode_sesi_friendly}
                  onChange={(e) => setForm({ ...form, kode_sesi_friendly: e.target.value })}
                  required
                />
              </Field>
            </div>
            <Field label="Judul Sesi">
              <TextInput
                placeholder="Membahas AI dasar..."
                value={form.judul_sesi}
                onChange={(e) => setForm({ ...form, judul_sesi: e.target.value })}
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tanggal Kelas">
                <TextInput
                  type="date"
                  value={form.tanggal_kelas}
                  onChange={(e) => setForm({ ...form, tanggal_kelas: e.target.value })}
                  required
                />
              </Field>
              <Field label="Jam Mulai">
                <TextInput
                  type="time"
                  value={form.jam_mulai}
                  onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Jam Akhir">
                <TextInput type="time" value={form.jam_akhir} onChange={(e) => setForm({ ...form, jam_akhir: e.target.value })} />
              </Field>
              <Field label="Link Rapat">
                <TextInput placeholder="https://meet..." value={form.link_rapat} onChange={(e) => setForm({ ...form, link_rapat: e.target.value })} />
              </Field>
            </div>
            <Field label="Lokasi">
              <TextInput placeholder="Ruang 1, Online, dll" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Simpan
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {selectedBatch && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-subhead font-semibold text-[#F1F5F9]">Daftar Sesi</h2>
              <Button onClick={() => { setForm({ ...form, modul_id: '', kode_sesi_friendly: '', judul_sesi: '', tanggal_kelas: '', jam_mulai: '', jam_akhir: '', link_rapat: '', lokasi: '' }); setShowForm(true); }}>
                + Tambah Sesi
              </Button>
            </div>
          </Card>

          {loadingJadwal ? (
            <Loading text="Memuat sesi..." />
          ) : !selectedBatch ? (
            <EmptyState title="Pilih batch" desc="Pilih batch untuk melihat daftar sesi kelas." />
          ) : jadwals.length === 0 ? (
            <EmptyState title="Belum ada sesi" desc="Buat sesi baru pertama untuk batch ini." />
          ) : (
            <div className="grid gap-4">
              {jadwals.map((j) => (
                <Card key={j.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-mono text-sm">
                      <span className="font-bold text-[#4ADE80]">{j.kode_sesi_friendly}</span>
                      <span className="text-[#94A3B8]"> — {j.judul_sesi}</span>
                      <div className="text-caption text-[#64748B]">
                        {j.tanggal_kelas ? formatJakarta(j.tanggal_kelas) : '-'} · {j.jam_mulai ?? '-'}–{j.jam_akhir ?? '-'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{j.status_sesi}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[9999px] bg-[#1E293B] border border-[#334155] px-2.5 py-0.5 text-xs font-medium text-[#94A3B8]">
      {children}
    </span>
  );
}