import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, BookOpen, PenTool,
  HelpCircle, Send, Lock, ExternalLink, Sparkles, ListFilter,
  FileText, CheckSquare
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getModulByKode, getModulFromCache } from '../services/modul';
import { saveCatatan, getCatatanBySesi } from '../services/catatan';
import { markAttendance } from '../services/absensi';
import { getProgresSesi, listSesiAssigned, type SesiAssigned } from '../services/penugasan';
import { Card, EmptyState, Badge, Field, TextArea, TextInput, SelectInput, Button, ConfirmDialog, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { formatJakarta } from '../lib/time';
import { renderMarkdown, extractTOC, estimateReadingTime, type TOCItem } from '../lib/markdown';
import { HasilKuisPanel, OpsiSoal, submitKuis } from '../components/KuisPanel';
import type { HasilKuis } from '../components/KuisPanel';
import type { Modul, JadwalSesi, SesiPeserta, Kehadiran, SoalButir } from '../types';

type LearningStep = 'persiapan' | 'materi' | 'praktik' | 'evaluasi' | 'tugas';

export default function SesiPage() {
  const { kode } = useParams<{ kode: string }>();
  const { user, role } = useAuth();
  const { push: toast } = useToast();
  const navigate = useNavigate();

  // Core Data
  const [modul, setModul] = useState<Modul | null>(null);
  const [jadwal, setJadwal] = useState<JadwalSesi | null>(null);
  const [sesiPeserta, setSesiPeserta] = useState<SesiPeserta | null>(null);

  // Learning Step / Stepper State
  const [activeStep, setActiveStep] = useState<LearningStep>('materi');

  // Reader Settings
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>('normal');
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Sesi Activities
  const [catatan, setCatatan] = useState<string>('');
  const [tldrawUrl, setTldrawUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Kehadiran | null>(null);
  const [myStatus, setMyStatus] = useState<Kehadiran | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  const [belumDiassign, setBelumDiassign] = useState<string | null>(null);

  // Pre-test / Post-test
  const [testPhase, setTestPhase] = useState<'pre' | 'post' | null>(null);
  const [soalList, setSoalList] = useState<SoalButir[]>([]);
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [testResult, setTestResult] = useState<HasilKuis | null>(null);
  const [preDone, setPreDone] = useState(false);
  const [postDone, setPostDone] = useState(false);

  // Portfolio form
  const [showPortForm, setShowPortForm] = useState(false);
  const [portSubmitted, setPortSubmitted] = useState(false);
  const [portForm, setPortForm] = useState({ item_url: '', item_type: 'github', deskripsi: '' });

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
      let activeModul = cached;
      if (!activeModul) {
        const fresh = await getModulByKode(kode);
        if (fresh) activeModul = fresh;
      }
      if (activeModul) {
        setModul(activeModul);
        const rawMd = activeModul.materi_peserta_md?.trim() || activeModul.content_md || '';
        setToc(extractTOC(rawMd));
      }

      if (isPeserta && peserta && sesiList.length > 0) {
        const j = sesiList.find((s) => s.modul?.kode === kode);
        if (j) {
          const sp = { id: j.sesi_peserta_id, sesi_id: j.id, peserta_id: peserta.id } as SesiPeserta;
          setSesiPeserta(sp);
          const [{ data: myAbs }, c, { data: preAtt }, { data: postAtt }, { data: portList }] = await Promise.all([
            supabase.from('absensi').select('status_kehadiran').eq('sesi_peserta_id', sp.id).maybeSingle(),
            getCatatanBySesi(sp.id),
            supabase.from('quiz_attempt').select('id').eq('id_peserta_fk', peserta.id).eq('kode_paket', `PRE-${kode}`).limit(1),
            supabase.from('quiz_attempt').select('id').eq('id_peserta_fk', peserta.id).eq('kode_paket', `POST-${kode}`).limit(1),
            supabase.from('portfolio_item').select('id').eq('id_peserta_fk', peserta.id).eq('kode_sesi', kode).limit(1),
          ]);
          setMyStatus((myAbs as { status_kehadiran: Kehadiran } | null)?.status_kehadiran ?? null);
          if (c) {
            setCatatan(c.catatan_text ?? '');
            setTldrawUrl(c.tldraw_url ?? '');
          }
          const hasPre = (preAtt?.length ?? 0) > 0;
          const hasPost = (postAtt?.length ?? 0) > 0;
          setPreDone(hasPre);
          setPostDone(hasPost);
          setPortSubmitted((portList?.length ?? 0) > 0);

          // Cek kunci urutan modul
          const urutanIni = j.modul?.urutan_sesi ?? 0;
          const prev = sesiList.filter((s) => (s.modul?.urutan_sesi ?? 0) < urutanIni);
          if (prev.length > 0) {
            const progres = await getProgresSesi(prev.map((s) => s.sesi_peserta_id));
            if (prev.some((s) => progres[s.sesi_peserta_id]?.selesai !== true)) {
              setLockedMsg('Modul ini terkunci. Selesaikan modul sebelumnya untuk membukanya.');
            }
          }
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [kode, user, role]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Track Scroll Progress for Reader
  useEffect(() => {
    const handleScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) {
        setReadingProgress(100);
        return;
      }
      const current = Math.max(0, -rect.top);
      const pct = Math.min(100, Math.round((current / total) * 100));
      setReadingProgress(pct);

      // Highlight active heading in TOC
      const headings = el.querySelectorAll('h2, h3');
      for (const h of Array.from(headings)) {
        const top = h.getBoundingClientRect().top;
        if (top >= 0 && top <= 250) {
          setActiveHeading(h.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeStep]);

  const doAbsen = async () => {
    if (!sesiPeserta || !pendingStatus) return;
    setSaving(true);
    try {
      await markAttendance(sesiPeserta.id, pendingStatus);
      toast(pendingStatus === 'hadir' ? 'Kehadiran berhasil dicatat! Selamat belajar.' : 'Status izin/telat tersimpan', 'success');
      setMyStatus(pendingStatus);
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
      await saveCatatan(sesiPeserta.id, catatan, tldrawUrl);
      toast('Catatan belajar berhasil disimpan!', 'success');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
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
      tanggal: new Date().toISOString().slice(0, 10),
      deskripsi: portForm.deskripsi || null,
    });
    setSaving(false);
    if (pErr) {
      toast(pErr.message, 'error');
      return;
    }
    toast('Karya tugas sesi ini berhasil dikumpulkan!', 'success');
    setPortSubmitted(true);
    setShowPortForm(false);
  };

  const startTest = async (phase: 'pre' | 'post') => {
    const paketKode = phase === 'pre' ? `PRE-${kode}` : `POST-${kode}`;
    const { data: soal } = await supabase.from('soal_butir_view').select('*').eq('kode_paket', paketKode).order('no_soal');
    if (!soal || soal.length === 0) {
      toast(`Soal ${phase === 'pre' ? 'Pre-Test' : 'Post-Test'} belum tersedia untuk modul ini`, 'error');
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
    if (!profil) {
      toast('Profil peserta tidak ditemukan', 'error');
      return;
    }

    const paketKode = testPhase === 'pre' ? `PRE-${kode}` : `POST-${kode}`;
    setSaving(true);
    try {
      const hasil = await submitKuis(profil.id, paketKode, soalList, jawaban);
      setTestResult(hasil);
      if (testPhase === 'pre') setPreDone(true);
      else setPostDone(true);

      toast(`Kuis selesai! Skor: ${hasil.skor}/100 (${hasil.lulus ? 'Lulus KKM' : 'Belum Lulus'})`, hasil.lulus ? 'success' : 'error');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
  };

  const isPeserta = role === 'peserta';
  const materiText = modul?.materi_peserta_md?.trim() || modul?.content_md?.trim() || '';
  const estMins = estimateReadingTime(materiText);

  if (loading) {
    return (
      <div className="space-y-4 pt-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) return <EmptyState title="Gagal memuat modul" desc={error} />;
  if (!modul) return <EmptyState title="Modul tidak ditemukan" desc={`Kode modul "${kode}" tidak valid.`} />;

  if (isPeserta && (lockedMsg || belumDiassign)) {
    return (
      <div className="space-y-5 pt-4 pb-12 max-w-xl mx-auto text-center">
        <button onClick={() => navigate('/belajar')} className="inline-flex items-center gap-1 font-mono text-sm text-fg-muted hover:text-primary-text mb-2">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog Belajar
        </button>
        <Card className="p-8 border-border-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-fg">{belumDiassign ? 'Modul Belum Ditugaskan' : 'Modul Masih Terkunci'}</h2>
          <p className="mt-2 text-sm text-fg-muted leading-relaxed">{belumDiassign ?? lockedMsg}</p>
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={() => navigate('/belajar')}>Buka Modul yang Tersedia</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Stepper Items
  const steps: Array<{ key: LearningStep; label: string; icon: typeof BookOpen; badge?: string; done: boolean }> = [
    { key: 'persiapan', label: '1. Persiapan & Pre-Test', icon: CheckSquare, done: myStatus !== null && preDone },
    { key: 'materi', label: '2. Modul Materi', icon: BookOpen, done: readingProgress >= 90 },
    { key: 'praktik', label: '3. Praktik & Kanvas', icon: PenTool, done: Boolean(catatan.trim()) },
    { key: 'evaluasi', label: '4. Post-Test', icon: HelpCircle, done: postDone },
    { key: 'tugas', label: '5. Tugas & Kelulusan', icon: Send, done: portSubmitted },
  ];

  const fontSizeClass = fontSize === 'large' ? 'text-[17.5px]' : fontSize === 'huge' ? 'text-[19px]' : 'text-[16px]';

  return (
    <div className="min-h-screen pb-20">
      {/* 1. STICKY TOP READING PROGRESS BAR */}
      <div className="fixed top-0 inset-x-0 z-40 h-1.5 bg-bg/80 backdrop-blur-sm">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-primary to-accent transition-all duration-150"
          style={{ width: `${activeStep === 'materi' ? readingProgress : 100}%` }}
        />
      </div>

      {/* 2. HEADER BANNER MODUL */}
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={() => navigate('/belajar')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-primary-text transition"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Modul Belajar
          </button>
          <div className="flex items-center gap-2">
            {jadwal?.status_sesi && (
              <Badge className="capitalize font-medium">Sesi: {jadwal.status_sesi}</Badge>
            )}
          </div>
        </div>

        {/* Hero Modul Card */}
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-surface to-surface-2 p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary-text">
                  {modul.kode}
                </span>
                <span className="text-xs text-fg-muted font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {modul.durasi_menit} menit
                </span>
                <span className="text-xs text-accent font-medium flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> ~{estMins} mnt baca
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">{modul.judul}</h1>
              <p className="mt-1.5 text-sm text-fg-muted">
                {jadwal?.tanggal_kelas ? `Jadwal: ${formatJakarta(jadwal.tanggal_kelas)}` : 'Sesi Mandiri'}
                {jadwal?.jam_mulai && ` · Pukul ${jadwal.jam_mulai.slice(0, 5)}–${jadwal.jam_akhir?.slice(0, 5) ?? ''}`}
                {jadwal?.lokasi && ` (${jadwal.lokasi})`}
              </p>
            </div>

            {/* Quick Actions / Attendance Status */}
            <div className="flex items-center gap-2 shrink-0">
              {myStatus ? (
                <div className="flex items-center gap-2 rounded-xl bg-success/15 border border-success/30 px-3.5 py-2 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> Hadir: {myStatus}
                </div>
              ) : (
                <Button size="sm" onClick={() => { setPendingStatus('hadir'); setShowConfirm(true); }}>
                  Tandai Kehadiran
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ALUR BELAJAR STEPPER NAVIGATION */}
      <div className="sticky top-2 z-30 mb-6 bg-bg/95 backdrop-blur-md py-2 border-b border-border-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {steps.map((st) => {
            const isActive = activeStep === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setActiveStep(st.key)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-primary bg-primary text-[rgb(var(--on-primary))] shadow-sm'
                    : st.done
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/50'
                    : 'border-border-2 bg-surface text-fg-muted hover:border-border-3 hover:text-fg'
                }`}
              >
                <st.icon className="h-4 w-4 shrink-0" />
                <span>{st.label}</span>
                {st.done && <Check className="h-3.5 w-3.5 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. KONTEN PER TAHAP BELAJAR */}

      {/* TAHAP 1: PERSIAPAN & PRE-TEST */}
      {activeStep === 'persiapan' && (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
          {/* Absensi Card */}
          <Card className="border-border-2 p-6">
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary-text" /> 1. Konfirmasi Kehadiran Sesi
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Pastikan Anda sudah mengonfirmasi kehadiran sebelum memulai materi kelas.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {myStatus ? (
                <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-bold text-success flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Status kehadiran Anda: "{myStatus.toUpperCase()}"
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => { setPendingStatus('hadir'); setShowConfirm(true); }}>
                    ✓ Konfirmasi Hadir
                  </Button>
                  <Button variant="secondary" onClick={() => { setPendingStatus('izin'); setShowConfirm(true); }}>
                    Izin / Telat
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Pre-Test Card */}
          <Card className="border-border-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-fg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary-text" /> 2. Uji Pengetahuan Awal (Pre-Test)
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Jawab 5 pertanyaan kilat untuk mengukur pemahaman awal Anda sebelum membaca materi.
                </p>
              </div>
              {!testPhase && (
                <Button onClick={() => startTest('pre')} disabled={preDone} size="sm">
                  {preDone ? '✓ Sudah Dikerjakan' : 'Mulai Pre-Test'}
                </Button>
              )}
            </div>

            {testPhase === 'pre' && (
              <div className="mt-6 space-y-5 pt-4 border-t border-border-2">
                {soalList.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border-2 bg-surface/50 p-4">
                    <p className="font-semibold text-fg">
                      <span className="font-mono text-primary-text mr-1.5">{s.no_soal}.</span> {s.pertanyaan}
                    </p>
                    <div className="mt-3">
                      <OpsiSoal soal={s} value={jawaban[s.no_soal]} onPick={(v) => setJawaban({ ...jawaban, [s.no_soal]: v })} />
                    </div>
                  </div>
                ))}

                {testResult ? (
                  <HasilKuisPanel result={testResult} soalList={soalList} jawaban={jawaban} />
                ) : (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button onClick={submitTest} disabled={saving || Object.keys(jawaban).length === 0}>
                      {saving ? 'Menilai...' : 'Kirim Jawaban Pre-Test'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Tombol Lanjut ke Tahap 2 */}
          <div className="flex justify-end pt-2">
            <Button onClick={() => setActiveStep('materi')} className="flex items-center gap-2">
              Lanjut Membaca Modul Materi <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* TAHAP 2: BACA MATERI (ULTIMATE READING EXPERIENCE) */}
      {activeStep === 'materi' && (
        <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Main Reading Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Reading Toolbar */}
            <div className="flex items-center justify-between rounded-xl border border-border-2 bg-surface/80 px-4 py-2.5 backdrop-blur-sm text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary-text" /> Waktu baca: ~{estMins} menit
              </span>
              <div className="flex items-center gap-2">
                <span className="text-fg-subtle">Ukuran Teks:</span>
                <button
                  onClick={() => setFontSize('normal')}
                  className={`px-2 py-1 rounded text-xs font-semibold ${fontSize === 'normal' ? 'bg-primary text-black' : 'bg-surface-2 text-fg'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-2 py-1 rounded text-xs font-semibold ${fontSize === 'large' ? 'bg-primary text-black' : 'bg-surface-2 text-fg'}`}
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSize('huge')}
                  className={`px-2 py-1 rounded text-xs font-semibold ${fontSize === 'huge' ? 'bg-primary text-black' : 'bg-surface-2 text-fg'}`}
                >
                  A++
                </button>
              </div>
            </div>

            {/* Embedded Slide Presentation if available */}
            {modul.slide_url && (
              <div className="overflow-hidden rounded-2xl border border-border-2 bg-bg shadow-sm">
                <div className="flex items-center justify-between bg-surface px-4 py-2 border-b border-border-2">
                  <span className="text-xs font-semibold text-fg flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary-text" /> Slide Materi Sesi
                  </span>
                  <a
                    href={modul.slide_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-text hover:underline inline-flex items-center gap-1"
                  >
                    Buka Tab Penuh <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <iframe src={modul.slide_url} title="Slide Materi" className="aspect-video w-full border-none" />
              </div>
            )}

            {/* Markdown Content Container */}
            <div className="rounded-2xl border border-border-2 bg-surface p-6 sm:p-10 shadow-sm">
              <article
                className={`prose-md max-w-none ${fontSizeClass}`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(materiText) }}
              />
            </div>

            {/* Action Bar Selesai Baca */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div>
                <h3 className="font-bold text-fg">Selesai membaca materi ini?</h3>
                <p className="text-xs text-fg-muted mt-0.5">Tulis catatan pemahaman atau langsung uji kemampuan praktik Anda.</p>
              </div>
              <Button onClick={() => setActiveStep('praktik')} className="shrink-0 flex items-center gap-2">
                Lanjut ke Praktik & Kanvas <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sticky Sidebar: Table of Contents & Quick Info */}
          <div className="lg:col-span-4 sticky top-16 space-y-5">
            {/* Table of Contents */}
            {toc.length > 0 && (
              <Card className="border-border-2 p-5 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-border-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
                    <ListFilter className="h-4 w-4 text-primary-text" /> Daftar Isi Modul
                  </h3>
                  <span className="text-[11px] font-mono text-fg-subtle">{toc.length} Bagian</span>
                </div>
                <nav className="space-y-1 text-sm">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block rounded-lg px-2.5 py-1.5 transition text-xs leading-snug ${
                        item.level === 3 ? 'pl-6 text-fg-subtle' : 'font-medium text-fg'
                      } ${
                        activeHeading === item.id
                          ? 'bg-primary/10 text-primary-text font-bold border-l-2 border-primary'
                          : 'hover:bg-surface-2 hover:text-fg'
                      }`}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </Card>
            )}

            {/* Ringkasan Modul Info Card */}
            <Card className="border-border-2 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Info Pembelajaran</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border-2/50">
                  <span className="text-fg-subtle">Kategori:</span>
                  <span className="font-semibold text-primary-text">{modul.kategori ?? 'Umum'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-2/50">
                  <span className="text-fg-subtle">Durasi:</span>
                  <span className="font-semibold text-fg">{modul.durasi_menit} Menit</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-fg-subtle">Progres Membaca:</span>
                  <span className="font-bold text-accent font-mono">{readingProgress}%</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAHAP 3: PRAKTIK & KANVAS */}
      {activeStep === 'praktik' && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
          <Card className="border-border-2 p-6">
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary-text" /> Catatan Pemahaman Belajar
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Tulis insight penting, prompt yang sudah Anda coba, atau rangkuman mandiri untuk sesi ini.
            </p>
            <div className="mt-4">
              <TextArea
                rows={8}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Pada sesi ini saya belajar teknik Few-Shot Prompting. Langkah terbaik adalah memberikan minimal 3 contoh format input-output sebelum mengajukan pertanyaan utama..."
                className="font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="mt-5 pt-5 border-t border-border-2">
              <Field
                label="Kanvas Visual (Tldraw Board)"
                hint="Tempel tautan board tldraw Anda jika melakukan sketsa arsitektur atau mind map."
              >
                <div className="flex gap-2 mt-1.5">
                  <TextInput
                    type="url"
                    value={tldrawUrl}
                    onChange={(e) => setTldrawUrl(e.target.value)}
                    placeholder="https://tldraw.com/r/..."
                    className="flex-1 text-sm"
                  />
                  {tldrawUrl && (
                    <a
                      href={tldrawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-4 py-2.5 rounded-lg border border-border-2 bg-surface text-sm text-fg hover:text-primary-text"
                    >
                      Buka <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </Field>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveCatatan} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Catatan & Kanvas'}
              </Button>
            </div>
          </Card>

          <div className="flex justify-between items-center pt-2">
            <Button variant="secondary" onClick={() => setActiveStep('materi')} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali Baca Modul
            </Button>
            <Button onClick={() => setActiveStep('evaluasi')} className="flex items-center gap-2">
              Lanjut ke Evaluasi Post-Test <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* TAHAP 4: EVALUASI POST-TEST */}
      {activeStep === 'evaluasi' && (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
          <Card className="border-border-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-fg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-accent" /> Evaluasi Akhir (Post-Test)
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Uji pemahaman mendalam Anda setelah mempelajari modul materi dan latihan praktik.
                </p>
              </div>
              {!testPhase && (
                <Button onClick={() => startTest('post')} disabled={postDone} size="sm">
                  {postDone ? '✓ Post-Test Selesai' : 'Mulai Post-Test'}
                </Button>
              )}
            </div>

            {testPhase === 'post' && (
              <div className="mt-6 space-y-5 pt-4 border-t border-border-2">
                {soalList.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border-2 bg-surface/50 p-4">
                    <p className="font-semibold text-fg">
                      <span className="font-mono text-primary-text mr-1.5">{s.no_soal}.</span> {s.pertanyaan}
                    </p>
                    <div className="mt-3">
                      <OpsiSoal soal={s} value={jawaban[s.no_soal]} onPick={(v) => setJawaban({ ...jawaban, [s.no_soal]: v })} />
                    </div>
                  </div>
                ))}

                {testResult ? (
                  <HasilKuisPanel result={testResult} soalList={soalList} jawaban={jawaban} />
                ) : (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button onClick={submitTest} disabled={saving || Object.keys(jawaban).length === 0}>
                      {saving ? 'Memproses Nilai...' : 'Kirim Jawaban Post-Test'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="flex justify-between items-center pt-2">
            <Button variant="secondary" onClick={() => setActiveStep('praktik')} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Catatan
            </Button>
            <Button onClick={() => setActiveStep('tugas')} className="flex items-center gap-2">
              Lanjut ke Pengumpulan Tugas <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* TAHAP 5: TUGAS & KELULUSAN */}
      {activeStep === 'tugas' && (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
          <Card className="border-border-2 p-6">
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <Send className="h-5 w-5 text-success" /> Pengumpulan Karya & Tugas Sesi
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Kirim tautan proyek atau repositori hasil pengerjaan Anda untuk dinilai oleh instruktur.
            </p>

            {portSubmitted && (
              <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Tugas untuk sesi ini telah berhasil dikumpulkan!
              </div>
            )}

            {!showPortForm && !portSubmitted ? (
              <div className="mt-4">
                <Button onClick={() => setShowPortForm(true)}>+ Tambah Karya Sesi Ini</Button>
              </div>
            ) : showPortForm ? (
              <form onSubmit={handleSubmitPort} className="mt-5 space-y-4 pt-4 border-t border-border-2">
                <Field label="Tipe Karya">
                  <SelectInput value={portForm.item_type} onChange={(e) => setPortForm({ ...portForm, item_type: e.target.value })}>
                    <option value="github">GitHub Repository</option>
                    <option value="link">Tautan Web / Demo App</option>
                    <option value="dokumen">Google Drive / Dokumen</option>
                    <option value="video">Video Presentasi / Demo</option>
                  </SelectInput>
                </Field>

                <Field label="Tautan / URL Karya">
                  <TextInput
                    value={portForm.item_url}
                    onChange={(e) => setPortForm({ ...portForm, item_url: e.target.value })}
                    placeholder="https://github.com/..."
                    required
                  />
                </Field>

                <Field label="Deskripsi Singkat">
                  <TextArea
                    rows={3}
                    value={portForm.deskripsi}
                    onChange={(e) => setPortForm({ ...portForm, deskripsi: e.target.value })}
                    placeholder="Jelaskan fitur yang dibuat atau instruksi pengujian..."
                  />
                </Field>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Mengirim...' : 'Simpan & Kirim Karya'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowPortForm(false)}>
                    Batal
                  </Button>
                </div>
              </form>
            ) : null}
          </Card>

          {/* Selesai Sesi CTA */}
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center space-y-3">
            <Sparkles className="h-8 w-8 text-success mx-auto" />
            <h3 className="text-lg font-bold text-fg">Selamat! Anda telah menyelesaikan seluruh rangkaian sesi ini.</h3>
            <p className="text-sm text-fg-muted max-w-md mx-auto">
              Progres belajar Anda telah diperbarui secara otomatis. Silakan kembali ke katalog atau lanjut ke modul berikutnya.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button onClick={() => navigate('/belajar')} variant="secondary">
                Kembali ke Katalog Belajar
              </Button>
              <Button onClick={() => navigate('/progres')}>
                Lihat Rekap Progres Belajar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && pendingStatus && (
        <ConfirmDialog
          title="Konfirmasi Kehadiran"
          message={`Tandai status kehadiran Anda pada sesi ini sebagai "${pendingStatus.toUpperCase()}"?`}
          confirmLabel="Simpan Kehadiran"
          onConfirm={doAbsen}
          onCancel={() => setShowConfirm(false)}
          busy={saving}
        />
      )}
    </div>
  );
}
