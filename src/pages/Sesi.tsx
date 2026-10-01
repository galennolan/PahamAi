import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getModulByKode, getModulFromCache } from '../services/modul';
import { saveCatatan, getCatatanBySesi } from '../services/catatan';
import { markAttendance } from '../services/absensi';
import { getProgresSesi, listSesiAssigned, type SesiAssigned } from '../services/penugasan';
import { Card, EmptyState, Badge, Field, TextArea, TextInput, SelectInput, Button, ConfirmDialog, Skeleton, SectionHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { renderMarkdown } from '../lib/markdown';
import { HasilKuisPanel, OpsiSoal, opsiSoal, submitKuis } from '../components/KuisPanel';
import type { HasilKuis } from '../components/KuisPanel';
import type { Modul, JadwalSesi, SesiPeserta, Kehadiran, SoalButir } from '../types';

type TestPhase = 'pre' | 'post' | null;

export default function SesiPage() {
  const { kode } = useParams<{ kode: string }>();
  const { user, role } = useAuth();
  const { push: toast } = useToast();
  const navigate = useNavigate();
  const [modul, setModul] = useState<Modul | null>(null);
  const [jadwal, setJadwal] = useState<JadwalSesi | null>(null);
  const [sesiPeserta, setSesiPeserta] = useState<SesiPeserta | null>(null);
  const [catatan, setCatatan] = useState<string>('');
  const [tldrawUrl, setTldrawUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Kehadiran | null>(null);
  const [myStatus, setMyStatus] = useState<Kehadiran | null>(null);
  const [wantChange, setWantChange] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  const [belumDiassign, setBelumDiassign] = useState<string | null>(null);

  // Pre-test / Post-test
  const [testPhase, setTestPhase] = useState<TestPhase>(null);
  const [soalList, setSoalList] = useState<SoalButir[]>([]);
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [testResult, setTestResult] = useState<HasilKuis | null>(null);
  const [preDone, setPreDone] = useState(false);
  const [postDone, setPostDone] = useState(false);

  // Portfolio form
  const [showPortForm, setShowPortForm] = useState(false);
  const [portForm, setPortForm] = useState({ item_url: '', item_type: 'image', deskripsi: '' });

const load = useCallback(async () => {
    if (!kode) return;
    try {
      setLockedMsg(null);
      setBelumDiassign(null);

      const { data: profil, error: pErr } = user
        ? await supabase
            .from('peserta')
            .select('id, kelas_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
        : { data: null, error: null };
      if (pErr) throw pErr;
      const peserta = (profil as { id: string; kelas_id: string | null }[] | null)?.[0] ?? null;

      const isPeserta = role === 'peserta';

      // Untuk peserta, sesi yang valid adalah sesi yang di-assign tutor lewat
      // `sesi_peserta`. Modul lain di luar penugasan itu tidak boleh dibuka.
      // Staff tidak punya penugasan, jadi mereka memakai jadwal pertama saja.
      let sesiList: SesiAssigned[] = [];
      if (isPeserta && peserta) {
        sesiList = await listSesiAssigned(peserta.id);
        const mine = sesiList.find((s) => s.modul?.kode === kode);
        if (!mine) {
          setBelumDiassign('Modul ini belum ditugaskan oleh tutor untuk kelas Anda.');
          setLoading(false);
          return;
        }
        setJadwal(mine);
      } else {
        const { data: js, error: jErr } = await supabase
          .from('jadwal_sesi')
          .select('*, modul!inner(*)')
          .eq('modul.kode', kode)
          .order('tanggal_kelas', { ascending: true })
          .limit(1);
        if (jErr) throw jErr;
        if (js && js.length > 0) setJadwal(js[0] as JadwalSesi);
      }

      const cached = await getModulFromCache(kode);
      if (cached) setModul(cached);
      else {
        const fresh = await getModulByKode(kode);
        if (fresh) setModul(fresh);
      }

      if (isPeserta && peserta && sesiList.length > 0) {
        const j = sesiList.find((s) => s.modul?.kode === kode);
        if (j) {
          const sp = { id: j.sesi_peserta_id, sesi_id: j.id, peserta_id: peserta.id } as SesiPeserta;
          setSesiPeserta(sp);
          setWantChange(false);
          const [{ data: myAbs }, c, { data: preAtt }, { data: postAtt }] = await Promise.all([
            supabase.from('absensi').select('status_kehadiran').eq('sesi_peserta_id', sp.id).maybeSingle(),
            getCatatanBySesi(sp.id),
            supabase.from('quiz_attempt').select('id').eq('id_peserta_fk', peserta.id).eq('kode_paket', `PRE-${kode}`).limit(1),
            supabase.from('quiz_attempt').select('id').eq('id_peserta_fk', peserta.id).eq('kode_paket', `POST-${kode}`).limit(1),
          ]);
          setMyStatus((myAbs as { status_kehadiran: Kehadiran } | null)?.status_kehadiran ?? null);
          if (c) {
            setCatatan(c.catatan_text ?? '');
            setTldrawUrl(c.tldraw_url ?? '');
          }
          setPreDone((preAtt?.length ?? 0) > 0);
          setPostDone((postAtt?.length ?? 0) > 0);

          // Kunci berurutan hanya menghitung sesi yang memang ditugaskan ke
          // peserta ini; modul yang tidak ditugaskan tidak menghalangi.
          const urutanIni = j.modul?.urutan_sesi ?? 0;
          const prev = sesiList.filter((s) => (s.modul?.urutan_sesi ?? 0) < urutanIni);
          if (prev.length > 0) {
            const progres = await getProgresSesi(prev.map((s) => s.sesi_peserta_id));
            if (prev.some((s) => progres[s.sesi_peserta_id]?.selesai !== true)) {
              setLockedMsg('Modul ini terkunci. Selesaikan modul sebelumnya (isi catatan atau absen hadir/telat/izin) untuk membukanya.');
            }
          }
        }
      }
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [kode, user, role]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const doAbsen = async () => {
    if (!sesiPeserta || !pendingStatus) return;
    setSaving(true);
    try {
      await markAttendance(sesiPeserta.id, pendingStatus);
      toast(pendingStatus === 'hadir' ? 'Terima kasih sudah hadir. Selamat belajar!' : 'Absensi tersimpan', 'success');
      setMyStatus(pendingStatus);
      setWantChange(false);
    } catch (e: unknown) { toast((e as Error).message, 'error'); }
    setSaving(false);
    setShowConfirm(false);
    setPendingStatus(null);
  };

  const handleSaveCatatan = async () => {
    if (!sesiPeserta) return;
    setSaving(true);
    try {
      await saveCatatan(sesiPeserta.id, catatan, tldrawUrl);
      toast('Catatan & link tldraw disimpan', 'success');
    } catch (e: unknown) { toast((e as Error).message, 'error'); }
    setSaving(false);
  };

  const handleSubmitPort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesiPeserta) return;
    const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user?.id).maybeSingle();
    if (!profil) return;
    setSaving(true);
    const { error: pErr } = await supabase.from('portfolio_item').insert({
      id_peserta_fk: profil.id,
      kode_sesi: kode!,
      item_url: portForm.item_url || null,
      item_type: portForm.item_type,
      tanggal: todayJakartaISO(),
      deskripsi: portForm.deskripsi || null,
    });
    setSaving(false);
    if (pErr) { toast(pErr.message, 'error'); return; }
    toast('Karya berhasil dikirim!', 'success');
    setShowPortForm(false);
    setPortForm({ item_url: '', item_type: 'image', deskripsi: '' });
  };

  const startTest = async (phase: 'pre' | 'post') => {
    const paketKode = phase === 'pre' ? `PRE-${kode}` : `POST-${kode}`;
    const { data: paket } = await supabase.from('soal_paket').select('kode_paket').eq('kode_paket', paketKode).maybeSingle();
    if (!paket) {
      toast('Soal tidak ditemukan untuk modul ini', 'error');
      return;
    }
    const { data: soal } = await supabase.from('soal_butir_view').select('*').eq('kode_paket', paketKode).order('no_soal');
    if (!soal || soal.length === 0) {
      toast('Soal belum tersedia', 'error');
      return;
    }
    setSoalList(soal as SoalButir[]);
    setJawaban({});
    setTestResult(null);
    setTestPhase(phase);
  };

  const resetTest = () => {
    setJawaban({});
    setTestResult(null);
  };

  // Soal tanpa pilihan jawaban tidak bisa dijawab, jadi tidak ikut menghitung
  const semuaTerisi = soalList.length > 0
    && soalList.every((s) => opsiSoal(s).length === 0 || Boolean(jawaban[s.no_soal]));

  const submitTest = async () => {
    if (!user || !testPhase || soalList.length === 0) return;
    const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
    if (!profil) {
      toast('Profil peserta tidak ditemukan. Hubungi admin.', 'error');
      return;
    }

    const paketKode = testPhase === 'pre' ? `PRE-${kode}` : `POST-${kode}`;
    setSaving(true);
    try {
      const hasil = await submitKuis(profil.id, paketKode, soalList, jawaban);
      setTestResult(hasil);
      if (testPhase === 'pre') setPreDone(true);
      else setPostDone(true);

      if (hasil.skor === null) {
        toast('Jawaban tersimpan, menunggu penilaian instruktur', 'success');
      } else {
        toast(`Skor ${hasil.skor}/100 · KKM ${hasil.kkm} · ${hasil.lulus ? 'lulus' : 'belum lulus'}`, hasil.lulus ? 'success' : 'error');
      }
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
  };

    const isPeserta = role === 'peserta';
    const isStaff = role === 'admin' || role === 'instruktur';
    const materiPeserta = modul?.materi_peserta_md?.trim() || modul?.content_md;
    const materiStaff = modul?.content_md?.trim();


  if (loading) return <div className="space-y-4 pt-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  if (error) return <EmptyState title="Gagal memuat" desc={error} />;
  if (!modul) return <EmptyState title="Modul tidak ditemukan" desc={`Kode sesi "${kode}" tidak valid.`} />;
  if (isPeserta && (lockedMsg || belumDiassign)) {
    return (
      <div className="space-y-5 pt-2 pb-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 font-mono text-sm text-fg-muted hover:text-primary-text">
            ← Kembali
          </button>
        </div>
        <EmptyState
          title={belumDiassign ? 'Modul belum ditugaskan' : 'Modul terkunci'}
          desc={belumDiassign ?? lockedMsg ?? ''}
        />
        {belumDiassign && (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => navigate('/belajar')}>Lihat modul saya</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 font-mono text-sm text-fg-muted hover:text-primary-text">
          ← Kembali
        </button>
        {jadwal && <Badge>{jadwal.status_sesi}</Badge>}
      </div>

      <Card className="border-primary/20 !p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <Badge className="border-primary/25 bg-primary/10 text-primary-text font-mono">{modul.kode}</Badge>
            <h1 className="mt-1.5 text-xl font-bold text-fg">{modul.judul}</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {jadwal?.tanggal_kelas ? formatJakarta(jadwal.tanggal_kelas) : 'Belum dijadwalkan'}
              {jadwal?.jam_mulai && ` · ${jadwal.jam_mulai}–${jadwal.jam_akhir ?? ''}`}
            </p>
          </div>
          <div className="shrink-0 text-left md:text-right font-mono text-xs text-fg-subtle">
            <p>Durasi: {modul.durasi_menit} mnt</p>
            <p>Sesi ke-{modul.urutan_sesi}</p>
          </div>
        </div>
      </Card>

      {isPeserta && !sesiPeserta && (
        <Card className="border-[destructive]/30 bg-destructive/5">
          <SectionHeader title="Belum Terdaftar" desc="Kamu belum terdaftar di sesi ini. Hubungi instruktur untuk konfirmasi kehadiran." />
        </Card>
      )}

      {isPeserta && sesiPeserta && !testPhase && (
        <Card className="border-primary/20 bg-primary/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-subhead font-semibold text-fg">Pre-Test</h2>
              <p className="text-sm text-fg-muted">Jawab 5 pertanyaan sebelum memulai materi</p>
            </div>
            <Button onClick={() => startTest('pre')} disabled={preDone} className="shrink-0">
              {preDone ? 'Pre-Test Selesai' : 'Mulai Pre-Test'}
            </Button>
          </div>
        </Card>
      )}

      {isPeserta && sesiPeserta && testPhase === 'pre' && (
        <Card>
          <SectionHeader title="Pre-Test" desc={`${soalList.length} soal · Pilih jawaban yang benar`} />
          <div className="mt-4 space-y-4">
            {soalList.map((s) => (
              <div key={s.id} className="rounded-[8px] border border-border-2 p-4">
                <p className="font-medium text-fg">
                  <span className="font-mono text-primary-text">{s.no_soal}.</span> {s.pertanyaan}
                </p>
                <OpsiSoal soal={s} value={jawaban[s.no_soal]} onPick={(v) => setJawaban({ ...jawaban, [s.no_soal]: v })} />
              </div>
            ))}
          </div>
          {testResult ? (
            <HasilKuisPanel result={testResult} soalList={soalList} jawaban={jawaban} />
          ) : (
            <div className="mt-4 flex gap-2">
              <Button onClick={submitTest} disabled={saving || !semuaTerisi} className="flex-1">
                {saving ? 'Memproses...' : 'Submit Pre-Test'}
              </Button>
            </div>
          )}
          {testResult && (
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={resetTest} className="flex-1">Coba Lagi</Button>
              <Button onClick={() => setTestPhase(null)} className="flex-1">Lanjut ke Materi</Button>
            </div>
          )}
        </Card>
      )}

      {isPeserta && sesiPeserta && !testPhase && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {modul.slide_url && (
              <Card className="!p-0 overflow-hidden border-border-2">
                <iframe src={modul.slide_url} title="Slide" className="aspect-video w-full border-none bg-bg" />
              </Card>
            )}

            {materiPeserta && (
              <Card>
                <SectionHeader title="Materi" />
                <div className="prose-md mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(materiPeserta) }} />
              </Card>
            )}

            <Card className="border-accent/20 bg-accent/5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-subhead font-semibold text-fg">Post-Test</h2>
                  <p className="text-sm text-fg-muted">Jawab 5 pertanyaan setelah selesai membaca materi</p>
                </div>
                <Button onClick={() => startTest('post')} disabled={postDone} className="shrink-0">
                  {postDone ? 'Post-Test Selesai' : 'Mulai Post-Test'}
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="sticky top-20">
              <SectionHeader title="Kehadiran" desc={myStatus ? `Status: ${myStatus}` : 'Belum absen'} />
              {myStatus === null ? (
                <div className="mt-4 space-y-2">
                  <Button onClick={() => { setPendingStatus('hadir'); setShowConfirm(true); }} disabled={saving} className="w-full">
                    Ya, Saya Hadir
                  </Button>
                  <button type="button" onClick={() => setWantChange((v) => !v)} disabled={saving} className="w-full text-center text-xs text-fg-subtle hover:text-primary-text py-1">
                    Pilih izin / telat →
                  </button>
                  {wantChange && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {(['telat', 'izin'] as Kehadiran[]).map((k) => (
                        <Button key={k} variant="secondary" size="sm" onClick={() => { setPendingStatus(k); setShowConfirm(true); }} disabled={saving} className="capitalize">
                          {k}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="rounded-[8px] border border-[success]/40 bg-success/10 p-3 text-center text-sm font-semibold text-success">
                    ✓ {myStatus === 'hadir' ? 'Terima kasih sudah hadir. Selamat belajar!' : `Absensi: ${myStatus}`}
                  </div>
                  {!wantChange ? (
                    <button type="button" onClick={() => setWantChange(true)} disabled={saving} className="w-full text-center text-xs text-fg-subtle hover:text-primary-text py-1">
                      Ubah status →
                    </button>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {(['hadir', 'telat', 'izin', 'alpha'] as Kehadiran[]).map((k) => (
                        <Button key={k} variant={myStatus === k ? 'primary' : 'secondary'} size="sm" onClick={() => { setPendingStatus(k); setShowConfirm(true); }} disabled={saving} className="capitalize">
                          {k}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6">
                <SectionHeader title="Catatan Belajar" desc="Tersimpan otomatis" />
                <Field label="Catatan Teks">
                  <TextArea rows={5} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tulis pemahamanmu di sini..." className="mt-2 text-sm" />
                </Field>
                <Field label="Link Tldraw (Kanvas Visual)" hint="Tempelkan URL tldraw.com board Anda di sini.">
                  <TextInput type="url" value={tldrawUrl} onChange={(e) => setTldrawUrl(e.target.value)} placeholder="https://tldraw.com/r/..." className="mt-2 text-sm" />
                </Field>
                {tldrawUrl && (
                  <a href={tldrawUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-accent hover:underline">
                    ↗ Buka Board Tldraw
                  </a>
                )}
                <Button onClick={handleSaveCatatan} disabled={saving} size="sm" className="mt-3 w-full">
                  Simpan Catatan & Tldraw
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-border-2">
                <SectionHeader title="Kirim Tugas" desc="Portfolio sesi ini" />
                {!showPortForm ? (
                  <Button variant="secondary" size="sm" onClick={() => setShowPortForm(true)} className="mt-2 w-full">+ Tambah Karya</Button>
                ) : (
                  <form onSubmit={handleSubmitPort} className="mt-3 space-y-3">
                    <Field label="Tipe">
                      <SelectInput value={portForm.item_type} onChange={(e) => setPortForm({ ...portForm, item_type: e.target.value })}>
                        <option value="image">Gambar</option><option value="tldraw">tldraw</option><option value="google_colab">Colab</option><option value="github">GitHub</option>
                      </SelectInput>
                    </Field>
                    <Field label="Link">
                      <TextInput value={portForm.item_url} onChange={(e) => setPortForm({ ...portForm, item_url: e.target.value })} placeholder="https://..." required />
                    </Field>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={saving} className="flex-1">Kirim</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowPortForm(false)}>Batal</Button>
                    </div>
                  </form>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {isPeserta && sesiPeserta && testPhase === 'post' && (
        <Card>
          <SectionHeader title="Post-Test" desc={`${soalList.length} soal · Pilih jawaban yang benar`} />
          <div className="mt-4 space-y-4">
            {soalList.map((s) => (
              <div key={s.id} className="rounded-[8px] border border-border-2 p-4">
                <p className="font-medium text-fg">
                  <span className="font-mono text-primary-text">{s.no_soal}.</span> {s.pertanyaan}
                </p>
                <OpsiSoal soal={s} value={jawaban[s.no_soal]} onPick={(v) => setJawaban({ ...jawaban, [s.no_soal]: v })} />
              </div>
            ))}
          </div>
          {testResult ? (
            <HasilKuisPanel result={testResult} soalList={soalList} jawaban={jawaban} />
          ) : (
            <div className="mt-4 flex gap-2">
              <Button onClick={submitTest} disabled={saving || !semuaTerisi} className="flex-1">
                {saving ? 'Memproses...' : 'Submit Post-Test'}
              </Button>
            </div>
          )}
          {testResult && (
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={resetTest} className="flex-1">Coba Lagi</Button>
              <Button onClick={() => setTestPhase(null)} className="flex-1">Selesai</Button>
            </div>
          )}
        </Card>
      )}

      {isStaff && materiStaff && (
        <Card className="border-primary/20">
          <SectionHeader title="Materi Lengkap (Staff)" desc="Versi instruktur/admin" />
          <div className="prose-md mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(materiStaff) }} />
        </Card>
      )}

      {showConfirm && pendingStatus && (
        <ConfirmDialog title="Konfirmasi Absensi" message={`Tandai kehadiran sebagai "${pendingStatus}"?`} confirmLabel="Simpan" onConfirm={doAbsen} onCancel={() => setShowConfirm(false)} busy={saving} />
      )}
    </div>
  );
}
