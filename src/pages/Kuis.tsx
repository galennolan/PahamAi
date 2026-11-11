import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Badge } from '../components/ui';
import { submitKuis } from '../components/KuisPanel';
import { QuizizzPlayer } from '../components/quiz/QuizizzPlayer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import type { SoalPaket, SoalButir, ModulInduk } from '../types';
import { getModulForKelas } from '../services/modul';
import { Play, Clock, Search, GraduationCap } from 'lucide-react';

export default function KuisPage() {
  const { user, role } = useAuth();
  const { push: toast } = useToast();
  const isPeserta = role === 'peserta';

  const [paketList, setPaketList] = useState<SoalPaket[]>([]);
  const [selectedKode, setSelectedKode] = useState<string>('');
  const [soal, setSoal] = useState<SoalButir[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSoal, setLoadingSoal] = useState(false);
  const [filterModul, setFilterModul] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Informasi Kelas & Modul Peserta
  const [pesertaId, setPesertaId] = useState<string | null>(null);
  const [kelasInfo, setKelasInfo] = useState<{ id: string; nama: string } | null>(null);
  const [modulKelas, setModulKelas] = useState<ModulInduk | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1. Ambil profil peserta & kelas yang diikuti jika role adalah peserta
        let activeProgram: string | null = null;

        if (user) {
          const { data: profil, error: profErr } = await supabase
            .from('peserta')
            .select('id, kelas_id, kelas:kelas_id(id, nama)')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profErr) throw profErr;

          if (profil) {
            setPesertaId(profil.id);
            if (profil.kelas) {
              const k = profil.kelas as unknown as { id: string; nama: string };
              setKelasInfo({ id: k.id, nama: k.nama });

              // Deteksi modul apa yang dipelajari oleh kelas murid tersebut
              const mInduk = await getModulForKelas(k.id);
              if (mInduk) {
                setModulKelas(mInduk);
                activeProgram = mInduk.id;
              }
            }
          }
        }

        // 2. Query soal_paket:
        // Jika PESERTA: HANYA AKSES paket kuis yang dipelajari kelasnya (diisolasi per modul kelas)
        // Jika INSTRUKTUR/ADMIN: Akses seluruh paket kuis untuk keperluan review & preview
        let query = supabase.from('soal_paket').select('*').order('kode_paket', { ascending: true });

        if (isPeserta && activeProgram) {
          query = query.eq('program', activeProgram);
        }

        const { data: pList, error: pErr } = await query;
        if (pErr) throw pErr;

        setPaketList((pList as SoalPaket[]) ?? []);
      } catch (e: unknown) {
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, role, isPeserta, toast]);

  // Load butir soal saat paket dipilih
  const loadSoalPaket = async (kode: string) => {
    setSelectedKode(kode);
    setLoadingSoal(true);
    try {
      // KEAMANAN AKSES SOAL:
      // Peserta MURNI HANYA AKSES SOAL DOANG (via soal_butir_view tanpa kunci jawaban)
      if (isPeserta) {
        const { data: viewData, error: viewErr } = await supabase
          .from('soal_butir_view')
          .select('*')
          .eq('kode_paket', kode)
          .order('no_soal', { ascending: true });

        if (viewErr) throw viewErr;
        setSoal((viewData as SoalButir[]) ?? []);
        setIsPlaying(true);
        return;
      }

      // Jika role staf (Admin/Instruktur): dapat membaca soal_butir langsung untuk preview kunci & pembahasan
      const { data: directData, error: directErr } = await supabase
        .from('soal_butir')
        .select('*')
        .eq('kode_paket', kode)
        .order('no_soal', { ascending: true });

      if (!directErr && directData && directData.length > 0) {
        setSoal(directData as SoalButir[]);
      } else {
        const { data: viewData, error: viewErr } = await supabase
          .from('soal_butir_view')
          .select('*')
          .eq('kode_paket', kode)
          .order('no_soal', { ascending: true });
        if (viewErr) throw viewErr;
        setSoal((viewData as SoalButir[]) ?? []);
      }
      setIsPlaying(true);
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setLoadingSoal(false);
    }
  };

  // Filter paket berdasarkan kategori & pencarian
  const filteredPaket = useMemo(() => {
    return paketList.filter((p) => {
      // Jika peserta: filter kategori "Semua", "Kuis Pertemuan", atau "Evaluasi Modul"
      if (isPeserta) {
        const matchKategori =
          filterModul === 'all'
            ? true
            : filterModul === 'pertemuan'
            ? p.kode_paket.includes('-P')
            : filterModul === 'evaluasi'
            ? !p.kode_paket.includes('-P')
            : true;

        const matchSearch =
          searchQuery === '' ||
          p.kode_paket.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sesi_target && p.sesi_target.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchKategori && matchSearch;
      }

      // Jika staf: filter per modul kurikulum
      const matchModul =
        filterModul === 'all'
          ? true
          : filterModul === 'MOD-AI-01'
          ? p.kode_paket.includes('AI01') || p.kode_paket === 'KUIS-MOD-AI-01'
          : filterModul === 'MOD-AI-02'
          ? p.kode_paket.includes('AI02') || p.kode_paket === 'KUIS-MOD-AI-02'
          : filterModul === 'MOD-AI-03'
          ? p.kode_paket.includes('AI03') || p.kode_paket === 'KUIS-MOD-AI-03'
          : true;

      const matchSearch =
        searchQuery === '' ||
        p.kode_paket.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sesi_target && p.sesi_target.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchModul && matchSearch;
    });
  }, [paketList, filterModul, searchQuery, isPeserta]);

  // Submit hasil ke backend
  const handleSubmitQuizResult = async (hasil: {
    skor: number;
    benar: number;
    salah: number;
    total: number;
    jawaban: Record<number, string>;
  }) => {
    if (!pesertaId || !selectedKode) return;
    try {
      const res = await submitKuis(pesertaId, selectedKode, soal, hasil.jawaban);
      if (res.skor !== null) {
        toast(`Skor ${res.skor}/100 berhasil tersimpan di riwayat belajar Anda!`, 'success');
      }
    } catch {
      // Fallback jika RPC tidak terkonfigurasi, hasil kuis tetap tampil sukses di client
    }
  };

  if (loading) return <Loading text="Memuat bank soal kuis..." />;

  // Jika sedang mode main kuis (Quizizz Player View)
  if (isPlaying && selectedKode) {
    const paketAktif = paketList.find((p) => p.kode_paket === selectedKode);
    const judulPaket = paketAktif?.sesi_target
      ? `Kuis ${paketAktif.sesi_target}`
      : `Kuis ${selectedKode}`;

    return (
      <div className="py-2">
        <QuizizzPlayer
          soalList={soal}
          kodePaket={selectedKode}
          judulPaket={judulPaket}
          durasiMenit={paketAktif?.durasi_menit || 5}
          onExit={() => {
            setIsPlaying(false);
            setSelectedKode('');
          }}
          onSubmitResult={handleSubmitQuizResult}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge className="font-mono text-primary-text">
              QUIZIZZ MODE
            </Badge>

            {isPeserta && kelasInfo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary-text border border-primary/20">
                <GraduationCap className="w-3.5 h-3.5" /> Kelas: {kelasInfo.nama}
              </span>
            )}

            {isPeserta && modulKelas && (
              <span className="text-caption text-fg-muted font-mono">
                Kurikulum: <span className="text-fg font-bold">{modulKelas.nama}</span>
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-fg">
            Kuis & Evaluasi Belajar
          </h1>

          <p className="text-sm text-fg-muted font-body">
            {isPeserta
              ? `Daftar soal dan kuis interaktif yang ditugaskan khusus untuk kelas Anda.`
              : `Kelola dan tinjau seluruh paket soal kuis kurikulum AI.`}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Tabs Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {isPeserta ? (
              // Filter Khusus Murid: Terisolasi ke kelasnya
              <>
                <button
                  onClick={() => setFilterModul('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-body transition whitespace-nowrap border ${
                    filterModul === 'all'
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))] font-semibold'
                      : 'border-border-2 bg-surface text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  Semua Kuis Kelas ({paketList.length})
                </button>
                <button
                  onClick={() => setFilterModul('pertemuan')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-body transition whitespace-nowrap border ${
                    filterModul === 'pertemuan'
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))] font-semibold'
                      : 'border-border-2 bg-surface text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  Kuis Pertemuan (P01–P14)
                </button>
                <button
                  onClick={() => setFilterModul('evaluasi')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-body transition whitespace-nowrap border ${
                    filterModul === 'evaluasi'
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))] font-semibold'
                      : 'border-border-2 bg-surface text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  Evaluasi Akhir Modul
                </button>
              </>
            ) : (
              // Filter Staf: Melihat per modul
              <>
                <button
                  onClick={() => setFilterModul('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-body transition whitespace-nowrap border ${
                    filterModul === 'all'
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))] font-semibold'
                      : 'border-border-2 bg-surface text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  Semua ({paketList.length})
                </button>
                <button
                  onClick={() => setFilterModul('MOD-AI-01')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-body transition whitespace-nowrap border ${
                    filterModul === 'MOD-AI-01'
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))] font-semibold'
                      : 'border-border-2 bg-surface text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  Modul 1: Dasar AI
                </button>
                <button
                  onClick={() => setFilterModul('MOD-AI-02')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-body transition whitespace-nowrap border ${
                    filterModul === 'MOD-AI-02'
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))] font-semibold'
                      : 'border-border-2 bg-surface text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  Modul 2: Machine Learning
                </button>
                <button
                  onClick={() => setFilterModul('MOD-AI-03')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-body transition whitespace-nowrap border ${
                    filterModul === 'MOD-AI-03'
                      ? 'border-primary bg-primary text-[rgb(var(--on-primary))] font-semibold'
                      : 'border-border-2 bg-surface text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  Modul 3: AI Engineering
                </button>
              </>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 ml-auto">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-fg-subtle" />
            <input
              type="text"
              placeholder="Cari kode kuis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-bg border border-border-2 rounded-lg text-fg placeholder-fg-subtle outline-none focus:border-primary font-body"
            />
          </div>
        </div>
      </Card>

      {/* Grid Kartu Paket Kuis */}
      {filteredPaket.length === 0 ? (
        <EmptyState
          title="Tidak Ada Paket Kuis"
          desc={
            isPeserta && !kelasInfo
              ? 'Anda belum terdaftar di kelas mana pun. Silakan hubungi admin/instruktur Anda.'
              : 'Tidak ada paket kuis yang sesuai dengan pencarian atau kurikulum kelas Anda.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPaket.map((p) => {
            const isModulInduk = p.kode_paket.includes('MOD-AI');
            return (
              <Card
                key={p.kode_paket}
                className="flex flex-col justify-between space-y-4 hover:border-border-3 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={isModulInduk ? 'text-primary-text font-mono' : 'font-mono'}>
                      {isModulInduk ? 'Evaluasi Modul' : 'Kuis Pertemuan'}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs font-mono text-fg-subtle">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {p.durasi_menit || 5} Menit
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display font-semibold text-base text-fg line-clamp-1">
                      {p.kode_paket}
                    </h3>
                    <p className="text-xs text-fg-muted font-body mt-0.5">
                      Target:{' '}
                      <span className="font-mono text-fg">
                        {p.sesi_target || p.program || 'Umum'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-fg-subtle">
                    Format: <span className="text-primary-text font-bold">2 Soal PG</span>
                  </span>
                  <Button
                    size="sm"
                    disabled={loadingSoal}
                    onClick={() => loadSoalPaket(p.kode_paket)}
                    className="flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Mulai
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
