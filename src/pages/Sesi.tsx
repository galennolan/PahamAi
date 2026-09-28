import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getModulByKode, getModulFromCache } from '../services/modul';
import { saveCatatan, getCatatanBySesi } from '../services/catatan';
import { markAttendance } from '../services/absensi';
import { Card, EmptyState, Badge, Field, TextArea, TextInput, SelectInput, Button, ConfirmDialog, Skeleton, SectionHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { formatJakarta, todayJakartaISO } from '../lib/time';
import { renderMarkdown } from '../lib/markdown';
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

  // Pre-test / Post-test
  const [testPhase, setTestPhase] = useState<TestPhase>(null);
  const [soalList, setSoalList] = useState<SoalButir[]>([]);
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [testResult, setTestResult] = useState<{ skor: number; benar: number; total: number } | null>(null);
  const [preDone, setPreDone] = useState(false);
  const [postDone, setPostDone] = useState(false);

  // Portfolio form
  const [showPortForm, setShowPortForm] = useState(false);
  const [portForm, setPortForm] = useState({ item_url: '', item_type: 'image', deskripsi: '' });

  const load = useCallback(async () => {
    if (!kode) return;
    try {
      const cached = await getModulFromCache(kode!);
      if (cached) setModul(cached);
      else {
        const fresh = await getModulByKode(kode!);
        if (fresh) setModul(fresh);
      }

      const { data: j, error: jErr } = await supabase
        .from('jadwal_sesi')
        .select('*, modul!inner(*)')
        .eq('modul.kode', kode!)
        .maybeSingle();
      if (jErr) throw jErr;
      if (j) setJadwal(j as JadwalSesi);

      setLockedMsg(null);
      if (user && role === 'peserta' && j) {
        const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
        if (profil) {
          const { data: sp } = await supabase.from('sesi_peserta').select('*').eq('sesi_id', j.id).eq('peserta_id', profil.id).maybeSingle();
          if (sp) {
            setSesiPeserta(sp as SesiPeserta);
            setWantChange(false);
            const [{ data: myAbs }, c, { data: preAtt }, { data: postAtt }] = await Promise.all([
              supabase.from('absensi').select('status_kehadiran').eq('sesi_peserta_id', sp.id).maybeSingle(),
              getCatatanBySesi(sp.id),
              supabase.from('quiz_attempt').select('id').eq('id_peserta_fk', profil.id).eq('kode_paket', `PRE-${kode}`).limit(1),
              supabase.from('quiz_attempt').select('id').eq('id_peserta_fk', profil.id).eq('kode_paket', `POST-${kode}`).limit(1),
            ]);
            setMyStatus((myAbs as { status_kehadiran: Kehadiran } | null)?.status_kehadiran ?? null);
            if (c) {
              setCatatan(c.catatan_text ?? '');
              setTldrawUrl(c.tldraw_url ?? '');
            }
            setPreDone((preAtt?.length ?? 0) > 0);
            setPostDone((postAtt?.length ?? 0) > 0);

            const modulId = (j as JadwalSesi).modul_id;
            if (modulId) {
              const { data: prevModuls } = await supabase
                .from('modul')
                .select('id')
                .eq('jalur', (j as JadwalSesi).modul?.jalur ?? '')
                .lt('urutan_sesi', (j as JadwalSesi).modul?.urutan_sesi ?? 0);
              const prevIds = ((prevModuls ?? []) as Array<{ id: string }>).map((m) => m.id);
              if (prevIds.length > 0) {
                const { data: prevJadwal } = await supabase.from('jadwal_sesi').select('id').in('modul_id', prevIds);
                const prevSesiIds = ((prevJadwal ?? []) as Array<{ id: string }>).map((s) => s.id);
                const { data: prevSp } = await supabase.from('sesi_peserta').select('id').eq('peserta_id', profil.id).in('sesi_id', prevSesiIds);
                const prevSpIds = ((prevSp ?? []) as Array<{ id: string }>).map((s) => s.id);
                const [{ data: prevCat }, { data: prevAbs }] = await Promise.all([
                  prevSpIds.length > 0 ? supabase.from('catatan_ketik').select('sesi_peserta_id, catatan_text').in('sesi_peserta_id', prevSpIds) : Promise.resolve({ data: [] as Array<{ sesi_peserta_id: string; catatan_text: string | null }> }),
                  prevSpIds.length > 0 ? supabase.from('absensi').select('sesi_peserta_id, status_kehadiran').in('sesi_peserta_id', prevSpIds) : Promise.resolve({ data: [] as Array<{ sesi_peserta_id: string; status_kehadiran: string | null }> }),
                ]);
                const doneCount = prevSpIds.filter((id) =>
                  (prevCat as Array<{ sesi_peserta_id: string; catatan_text: string | null }> ?? []).some((c) => c.sesi_peserta_id === id && c.catatan_text?.trim()) ||
                  (prevAbs as Array<{ sesi_peserta_id: string; status_kehadiran: string | null }> ?? []).some((a) => a.sesi_peserta_id === id && a.status_kehadiran && a.status_kehadiran !== 'alpha')
                ).length;
                if (doneCount < prevSpIds.length) {
                  setLockedMsg('Modul ini terkunci. Selesaikan modul sebelumnya (isi catatan atau absen hadir/telat/izin) untuk membukanya.');
                }
              }
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

  const submitTest = async () => {
    if (!user || !testPhase || soalList.length === 0) return;
    const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
    if (!profil) return;

    const paketKode = testPhase === 'pre' ? `PRE-${kode}` : `POST-${kode}`;
    const { data: full } = await supabase.from('soal_butir').select('*').eq('kode_paket', paketKode);
    const kunciMap = new Map((full as SoalButir[] ?? []).map(s => [s.no_soal, s.kunci]));

    let benar = 0;
    let totalSkor = 0;
    const totalBobot = soalList.reduce((a, s) => a + s.bobot_skor, 0);

    for (const s of soalList) {
      const jwb = jawaban[s.no_soal];
      const kunci = kunciMap.get(s.no_soal);
      if (jwb === kunci) benar++;
      if (jwb) totalSkor += s.bobot_skor;
    }

    const skor = totalBobot > 0 ? Math.round((totalSkor / totalBobot) * 100) : 0;
    setTestResult({ skor, benar, total: soalList.length });

    const rows = soalList.map(s => ({
      id_peserta_fk: profil.id,
      kode_paket: paketKode,
      no_soal: s.no_soal,
      attempt_no: 1,
      jawaban: jawaban[s.no_soal] ?? null,
      benar: jawaban[s.no_soal] === kunciMap.get(s.no_soal),
      skor: s.bobot_skor,
    }));
    await supabase.from('quiz_attempt').upsert(rows, { onConflict: 'id_peserta_fk,kode_paket,no_soal,attempt_no' });

    if (testPhase === 'pre') setPreDone(true);
    else setPostDone(true);

    toast(`Skor: ${skor}/100`, skor >= 70 ? 'success' : 'error');
  };

    const isPeserta = role === 'peserta';
    const isStaff = role === 'admin' || role === 'instruktur';
    const materiPeserta = modul?.materi_peserta_md?.trim() || modul?.content_md;
    const materiStaff = modul?.content_md?.trim();


  if (loading) return <div className="space-y-4 pt-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  if (error) return <EmptyState title="Gagal memuat" desc={error} />;
  if (!modul) return <EmptyState title="Modul tidak ditemukan" desc={`Kode sesi "${kode}" tidak valid.`} />;
  if (isPeserta && lockedMsg) {
    return (
      <div className="space-y-5 pt-2 pb-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 font-mono text-sm text-fg-muted hover:text-primary-text">
            ← Kembali
          </button>
        </div>
        <EmptyState title="Modul terkunci" desc={lockedMsg} />
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
                <div className="mt-3 space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map((pil) => {
                    const val = s[`pilihan_${pil.toLowerCase()}` as 'pilihan_a'] as string | null;
                    if (!val) return null;
                    return (
                      <label key={pil} className="flex items-start gap-3 cursor-pointer p-2 rounded-[4px] hover:bg-surface transition">
                        <input
                          type="radio"
                          name={`soal-${s.no_soal}`}
                          value={pil}
                          checked={jawaban[s.no_soal] === pil}
                          onChange={() => setJawaban({ ...jawaban, [s.no_soal]: pil })}
                          className="mt-1 accent-[primary]"
                        />
                        <span className="text-body text-fg"><span className="font-mono text-fg-muted mr-2">{pil}.</span>{val}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {testResult && testPhase === 'pre' && (
            <div className="mt-4 rounded-[8px] border border-border-2 p-4 text-center">
              <p className="text-2xl font-bold text-primary-text">{testResult.skor}/100</p>
              <p className="text-sm text-fg-muted">{testResult.benar} benar dari {testResult.total} soal</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button onClick={submitTest} disabled={saving || Object.keys(jawaban).length < soalList.length} className="flex-1">
              {saving ? 'Memproses...' : 'Submit Pre-Test'}
            </Button>
            {testResult && (
              <Button variant="secondary" onClick={() => setTestPhase(null)} className="flex-1">
                Lanjut ke Materi
              </Button>
            )}
          </div>
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
                <div className="mt-3 space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map((pil) => {
                    const val = s[`pilihan_${pil.toLowerCase()}` as 'pilihan_a'] as string | null;
                    if (!val) return null;
                    return (
                      <label key={pil} className="flex items-start gap-3 cursor-pointer p-2 rounded-[4px] hover:bg-surface transition">
                        <input
                          type="radio"
                          name={`soal-${s.no_soal}`}
                          value={pil}
                          checked={jawaban[s.no_soal] === pil}
                          onChange={() => setJawaban({ ...jawaban, [s.no_soal]: pil })}
                          className="mt-1 accent-[primary]"
                        />
                        <span className="text-body text-fg"><span className="font-mono text-fg-muted mr-2">{pil}.</span>{val}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {testResult && testPhase === 'post' && (
            <div className="mt-4 rounded-[8px] border border-border-2 p-4 text-center">
              <p className="text-2xl font-bold text-primary-text">{testResult.skor}/100</p>
              <p className="text-sm text-fg-muted">{testResult.benar} benar dari {testResult.total} soal</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button onClick={submitTest} disabled={saving || Object.keys(jawaban).length < soalList.length} className="flex-1">
              {saving ? 'Memproses...' : 'Submit Post-Test'}
            </Button>
            {testResult && (
              <Button variant="secondary" onClick={() => setTestPhase(null)} className="flex-1">
                Selesai
              </Button>
            )}
          </div>
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