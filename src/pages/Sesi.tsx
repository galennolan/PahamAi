import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getModulByKode, getModulFromCache } from '../services/modul';
import { saveCatatan, getCatatanBySesi } from '../services/catatan';
import { markAttendance } from '../services/absensi';
import { Card, Loading, EmptyState, Badge, Field, TextArea, Button, ConfirmDialog } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import type { Modul, JadwalSesi, SesiPeserta, Kehadiran } from '../types';

export default function SesiPage() {
  const { kode } = useParams<{ kode: string }>();
  const { user, role } = useAuth();
  const { push: toast } = useToast();
  const [modul, setModul] = useState<Modul | null>(null);
  const [jadwal, setJadwal] = useState<JadwalSesi | null>(null);
  const [sesiPeserta, setSesiPeserta] = useState<SesiPeserta | null>(null);
  const [catatan, setCatatan] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Kehadiran | null>(null);

  useEffect(() => {
    if (!kode) return;
    (async () => {
      setLoading(true);
      try {
        const cached = await getModulFromCache(kode!);
        if (cached) setModul(cached);
        else {
          const fresh = await getModulByKode(kode!);
          if (fresh) setModul(fresh);
        }

        const { data: j, error: jErr } = await supabase
          .from('jadwal_sesi')
          .select('*, modul(*)')
          .eq('modul_id', (await supabase.from('modul').select('id').eq('kode', kode!).maybeSingle()).data?.id ?? '')
          .maybeSingle();
        if (!jErr && j) setJadwal(j as JadwalSesi);

        if (user && role === 'peserta') {
          const { data: profil } = await supabase
            .from('peserta')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profil && j) {
            const { data: sp, error: spErr } = await supabase
              .from('sesi_peserta')
              .select('*')
              .eq('sesi_id', (j as JadwalSesi).id)
              .eq('peserta_id', profil.id)
              .maybeSingle();
            if (!spErr && sp) setSesiPeserta(sp as SesiPeserta);
          }
        }
      } catch {
        // biarkan kosong, tampilkan empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [kode, user, role]);

  useEffect(() => {
    if (sesiPeserta?.id) {
      getCatatanBySesi(sesiPeserta.id).then((c) => c && setCatatan(c.catatan_text));
    }
  }, [sesiPeserta]);

  const doAbsen = async () => {
    if (!sesiPeserta || !pendingStatus) return;
    setSaving(true);
    try {
      await markAttendance(sesiPeserta.id, pendingStatus);
      toast('Absensi tersimpan', 'success');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
    setShowConfirm(false);
    setPendingStatus(null);
  };

  const handleSaveCatatan = async () => {
    if (!sesiPeserta) return;
    setSaving(true);
    try {
      await saveCatatan(sesiPeserta.id, catatan);
      toast('Catatan disimpan', 'success');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
  };

  if (loading) return <Loading text="Memuat sesi..." />;
  if (!modul) return <EmptyState title="Modul tidak ditemukan" desc={`Kode sesi "${kode}" tidak valid.`} />;

  const isPeserta = role === 'peserta';

  return (
    <div className="space-y-6">
      <Link to="/modul" className="inline-flex items-center gap-1 font-mono text-sm text-[#94A3B8] hover:text-[#4ADE80]">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kembali ke Modul
      </Link>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="border-[#4ADE80]/25 bg-[#4ADE80]/10 text-[#4ADE80]">{modul.kode}</Badge>
            <h1 className="mt-2 text-subhead font-bold text-[#F1F5F9]">{modul.judul}</h1>
            <p className="mt-1 font-mono text-sm text-[#94A3B8]">
              {jadwal?.tanggal_kelas ? formatJakarta(jadwal.tanggal_kelas) : '-'}
              {jadwal?.jam_mulai ? ` · ${jadwal.jam_mulai}–${jadwal.jam_akhir ?? ''}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-right font-mono text-xs text-[#64748B]">
            <p>Durasi: {modul.durasi_menit} menit</p>
            <p>Sesi ke-{modul.urutan_sesi}</p>
          </div>
        </div>
      </Card>

      {modul.slide_url && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Slide Sesi</h2>
          <iframe
            src={modul.slide_url}
            title={`Slide ${modul.kode}`}
            className="h-[480px] w-full rounded-[4px] border border-[#334155] bg-[#0F172A]"
          />
        </Card>
      )}

      {modul.content_md && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Materi Modul</h2>
          <div className="whitespace-pre-wrap text-body text-[#F1F5F9] leading-relaxed">{modul.content_md}</div>
        </Card>
      )}

      {isPeserta && sesiPeserta && (
        <Card>
          <h2 className="mb-4 text-subhead font-semibold text-[#F1F5F9]">Absensi & Catatan</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {(['hadir', 'telat', 'izin', 'alpha'] as Kehadiran[]).map((k) => (
              <Button key={k} variant={k === 'hadir' ? 'primary' : 'secondary'} onClick={() => { setPendingStatus(k); setShowConfirm(true); }} disabled={saving}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </Button>
            ))}
          </div>

          <Field label="Catatan Sesi" hint="Tersimpan otomatis, tetap bisa ditulis saat offline.">
            <TextArea
              rows={8}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tulis pemahaman, pertanyaan, ide, atau coretan di sini..."
            />
          </Field>
          <div className="mt-4">
            <Button onClick={handleSaveCatatan} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Catatan'}
            </Button>
          </div>
        </Card>
      )}

      {isPeserta && !sesiPeserta && (
        <EmptyState title="Belum terdaftar di sesi ini" desc="Hubungi instruktur untuk konfirmasi kehadiran." />
      )}

      {showConfirm && pendingStatus && (
        <ConfirmDialog
          title="Konfirmasi Absensi"
          message={`Tandai kehadiran sebagai "${pendingStatus}"?`}
          confirmLabel="Simpan"
          onConfirm={doAbsen}
          onCancel={() => setShowConfirm(false)}
          busy={saving}
        />
      )}
    </div>
  );
}