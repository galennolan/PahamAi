import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Button, Badge } from '../components/ui';
import { submitKuis } from '../components/KuisPanel';
import { QuizizzPlayer } from '../components/quiz/QuizizzPlayer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import type { SoalPaket, SoalButir } from '../types';
import { Play, Clock, Search } from 'lucide-react';

export default function KuisPage() {
  const { user } = useAuth();
  const { push: toast } = useToast();
  const [paketList, setPaketList] = useState<SoalPaket[]>([]);
  const [selectedKode, setSelectedKode] = useState<string>('');
  const [soal, setSoal] = useState<SoalButir[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSoal, setLoadingSoal] = useState(false);
  const [filterModul, setFilterModul] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Ambil profil peserta
  const [pesertaId, setPesertaId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: pList, error: pErr }, { data: profil }] = await Promise.all([
          supabase.from('soal_paket').select('*').order('kode_paket', { ascending: true }),
          user
            ? supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (pErr) throw pErr;
        setPaketList((pList as SoalPaket[]) ?? []);
        if (profil) setPesertaId(profil.id);
      } catch (e: unknown) {
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, toast]);

  // Load butir soal saat paket dipilih
  const loadSoalPaket = async (kode: string) => {
    setSelectedKode(kode);
    setLoadingSoal(true);
    try {
      // 1. Coba baca dari soal_butir (jika punya akses)
      const { data: directData, error: directErr } = await supabase
        .from('soal_butir')
        .select('*')
        .eq('kode_paket', kode)
        .order('no_soal', { ascending: true });

      if (!directErr && directData && directData.length > 0) {
        setSoal(directData as SoalButir[]);
        setIsPlaying(true);
        return;
      }

      // 2. Fallback aman ke soal_butir_view
      const { data: viewData, error: viewErr } = await supabase
        .from('soal_butir_view')
        .select('*')
        .eq('kode_paket', kode)
        .order('no_soal', { ascending: true });

      if (viewErr) throw viewErr;
      setSoal((viewData as SoalButir[]) ?? []);
      setIsPlaying(true);
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    } finally {
      setLoadingSoal(false);
    }
  };

  // Filter paket berdasarkan modul & pencarian
  const filteredPaket = useMemo(() => {
    return paketList.filter((p) => {
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
  }, [paketList, filterModul, searchQuery]);

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
        toast(`Skor ${res.skor}/100 tersimpan ke riwayat Anda!`, 'success');
      }
    } catch {
      // Abaikan jika RPC belum terkonfigurasi, pengerjaan kuis tetap tampil sukses di client
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
      {/* Header Halaman khas Paham AI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="font-mono text-primary-text">
              QUIZIZZ MODE
            </Badge>
            <span className="text-caption text-fg-subtle font-mono">2 Soal per Modul & Pertemuan</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-fg">
            Kuis & Evaluasi Belajar
          </h1>
          <p className="text-sm text-fg-muted font-body">
            Latihan mandiri interaktif dengan batas waktu per modul untuk memperkuat pemahaman kurikulum AI.
          </p>
        </div>
      </div>

      {/* Filter Modul & Search Bar */}
      <Card>
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Tabs Filter Modul */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
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
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 ml-auto">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-fg-subtle" />
            <input
              type="text"
              placeholder="Cari kode (misal: AI01)..."
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
          desc="Tidak ada paket soal yang sesuai dengan filter atau kata kunci pencarian Anda."
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
