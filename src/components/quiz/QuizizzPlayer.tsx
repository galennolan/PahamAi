import { useState } from 'react';
import { TimerRing } from './TimerRing';
import { ConfettiEffect } from './ConfettiEffect';
import type { SoalButir } from '../../types';
import { Button, SecondaryButton, Card, Badge } from '../ui';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Lightbulb,
  X,
} from 'lucide-react';

interface QuizizzPlayerProps {
  soalList: SoalButir[];
  judulPaket: string;
  kodePaket: string;
  durasiMenit?: number;
  onExit?: () => void;
  onSubmitResult?: (hasil: {
    skor: number;
    benar: number;
    salah: number;
    total: number;
    jawaban: Record<number, string>;
  }) => Promise<void> | void;
}

export function QuizizzPlayer({
  soalList,
  judulPaket,
  kodePaket,
  durasiMenit = 5,
  onExit,
  onSubmitResult,
}: QuizizzPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [selectedInCurrent, setSelectedInCurrent] = useState<string | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  if (!soalList || soalList.length === 0) {
    return (
      <Card className="min-h-[360px] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-fg-subtle" />
        <h3 className="font-display text-lg font-bold text-fg">Belum Ada Soal di Paket Ini</h3>
        <p className="text-sm text-fg-muted max-w-md font-body">
          Paket kuis <span className="font-mono text-primary-text">{kodePaket}</span> belum memiliki butir pertanyaan.
        </p>
        {onExit && (
          <Button onClick={onExit} size="sm">
            Kembali
          </Button>
        )}
      </Card>
    );
  }

  const currentSoal = soalList[currentIndex];
  const totalQuestions = soalList.length;
  const isLastQuestion = currentIndex + 1 >= totalQuestions;

  // Format 4 Opsi Jawaban Bergaya Quizizz (Harmonis dengan tema Paham AI)
  const opsiList = [
    {
      key: 'A',
      text: currentSoal.pilihan_a,
      colorBadge: 'bg-rose-600 text-white',
      borderDefault: 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-fg',
    },
    {
      key: 'B',
      text: currentSoal.pilihan_b,
      colorBadge: 'bg-blue-600 text-white',
      borderDefault: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-fg',
    },
    {
      key: 'C',
      text: currentSoal.pilihan_c,
      colorBadge: 'bg-amber-600 text-white',
      borderDefault: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-fg',
    },
    {
      key: 'D',
      text: currentSoal.pilihan_d,
      colorBadge: 'bg-emerald-600 text-white',
      borderDefault: 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-fg',
    },
  ].filter((o) => Boolean(o.text));

  const handleSelectOption = (key: string) => {
    if (hasConfirmed) return;

    setSelectedInCurrent(key);
    setHasConfirmed(true);

    const updatedJawaban = {
      ...jawaban,
      [currentSoal.no_soal]: key,
    };
    setJawaban(updatedJawaban);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleFinishQuiz();
    } else {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextSoal = soalList[nextIdx];
      const existingAns = jawaban[nextSoal.no_soal] ?? null;
      setSelectedInCurrent(existingAns);
      setHasConfirmed(Boolean(existingAns));
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevSoal = soalList[prevIdx];
      const existingAns = jawaban[prevSoal.no_soal] ?? null;
      setSelectedInCurrent(existingAns);
      setHasConfirmed(Boolean(existingAns));
    }
  };

  const handleFinishQuiz = () => {
    setIsCompleted(true);

    let benarCount = 0;
    let salahCount = 0;

    soalList.forEach((s) => {
      const ans = jawaban[s.no_soal];
      const isCorrect = s.kunci && ans && ans.toUpperCase() === s.kunci.toUpperCase();
      if (isCorrect) benarCount++;
      else salahCount++;
    });

    const finalScore = Math.min(100, Math.round((benarCount / totalQuestions) * 100));

    if (onSubmitResult) {
      onSubmitResult({
        skor: finalScore,
        benar: benarCount,
        salah: salahCount,
        total: totalQuestions,
        jawaban,
      });
    }
  };

  const handleRestart = () => {
    setJawaban({});
    setCurrentIndex(0);
    setSelectedInCurrent(null);
    setHasConfirmed(false);
    setIsCompleted(false);
  };

  // =========================================================================
  // HASIL AKHIR KUIS (Results Screen khas Paham AI)
  // =========================================================================
  if (isCompleted) {
    let benarCount = 0;
    let salahCount = 0;
    soalList.forEach((s) => {
      const ans = jawaban[s.no_soal];
      const isCorrect = s.kunci && ans && ans.toUpperCase() === s.kunci.toUpperCase();
      if (isCorrect) benarCount++;
      else salahCount++;
    });

    const finalScore = Math.round((benarCount / totalQuestions) * 100);
    const isPassed = finalScore >= 60;

    return (
      <div className="relative min-h-[500px] w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-2 sm:p-4 font-body">
        <ConfettiEffect duration={3500} />

        <Card className="w-full space-y-6 text-center border-border-2">
          {/* Trophy Header */}
          <div className="relative inline-block">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 ${
              isPassed ? 'border-primary/50 bg-primary/10 glow-primary' : 'border-border-2 bg-surface-2'
            }`}>
              <Trophy className={`w-10 h-10 ${isPassed ? 'text-primary animate-pulse' : 'text-fg-subtle'}`} />
            </div>
          </div>

          <div className="space-y-1">
            <Badge className="font-mono text-primary-text font-bold">
              HASIL EVALUASI KUIS
            </Badge>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-fg">{judulPaket}</h2>
            <p className="font-mono text-xs text-fg-subtle">Kode: {kodePaket}</p>
          </div>

          {/* Skor Card khas Paham AI */}
          <div className={`p-6 rounded-lg space-y-1 border ${
            isPassed
              ? 'border-primary/40 bg-gradient-to-br from-surface to-surface-2 glow-primary'
              : 'border-border-2 bg-surface-2'
          }`}>
            <span className="text-overline font-semibold uppercase tracking-wider text-fg-muted block">
              Skor Perolehan
            </span>
            <div className="font-display text-5xl sm:text-6xl font-black tracking-tight text-primary-text">
              {finalScore}<span className="text-xl text-fg-subtle">/100</span>
            </div>
            <p className="text-sm font-medium text-fg pt-1">
              {finalScore === 100
                ? '🌟 Sempurna! Seluruh pertanyaan dijawab dengan tepat.'
                : isPassed
                ? '🎉 Selamat! Anda dinyatakan lulus kuis ini.'
                : '💪 Jangan patah semangat! Pelajari kembali materi dan coba lagi.'}
            </p>
          </div>

          {/* Statistik Rincian */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-surface-2/60 border border-success/30 rounded-lg">
              <span className="text-caption text-success font-semibold block">Benar</span>
              <span className="font-display text-2xl font-bold text-success">{benarCount}</span>
            </div>
            <div className="p-3 bg-surface-2/60 border border-destructive/30 rounded-lg">
              <span className="text-caption text-destructive font-semibold block">Salah</span>
              <span className="font-display text-2xl font-bold text-destructive">{salahCount}</span>
            </div>
            <div className="p-3 bg-surface-2/60 border border-border-2 rounded-lg">
              <span className="text-caption text-fg-muted font-semibold block">Total Soal</span>
              <span className="font-display text-2xl font-bold text-fg">{totalQuestions}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <SecondaryButton onClick={handleRestart} className="w-full sm:flex-1 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Ulangi Kuis
            </SecondaryButton>
            {onExit && (
              <Button onClick={onExit} className="w-full sm:flex-1 flex items-center justify-center gap-2">
                Selesai & Keluar <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Review Soal & Pembahasan */}
          <div className="text-left pt-4 border-t border-border-2 space-y-3">
            <h3 className="font-display text-sm font-semibold text-fg flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" /> Tinjauan Butir Soal & Pembahasan
            </h3>
            <div className="space-y-3">
              {soalList.map((s, idx) => {
                const userAns = jawaban[s.no_soal];
                const isCorrect = s.kunci && userAns && userAns.toUpperCase() === s.kunci.toUpperCase();
                return (
                  <div
                    key={s.id || idx}
                    className={`p-4 rounded-lg border text-sm space-y-2 ${
                      isCorrect
                        ? 'border-success/30 bg-success/5'
                        : 'border-destructive/30 bg-destructive/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-fg">
                        <span className="font-mono text-primary-text mr-1.5">{idx + 1}.</span>
                        {s.pertanyaan}
                      </span>
                      {isCorrect ? (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-mono text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Benar
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-mono text-destructive">
                          <XCircle className="w-3.5 h-3.5" /> Salah
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-fg-muted space-y-1">
                      <p>
                        Jawaban Anda:{' '}
                        <span className="font-medium text-fg">
                          {userAns ? `${userAns}. ${s[`pilihan_${userAns.toLowerCase()}` as 'pilihan_a'] || ''}` : 'Tidak dijawab'}
                        </span>
                      </p>
                      {!isCorrect && s.kunci && (
                        <p className="text-success font-medium">
                          Kunci Jawaban:{' '}
                          <span>{s.kunci}. {s[`pilihan_${s.kunci.toLowerCase()}` as 'pilihan_a']}</span>
                        </p>
                      )}
                      {s.pembahasan && (
                        <div className="mt-2 p-2.5 rounded-md bg-surface border border-border-2 text-xs leading-relaxed text-fg-muted font-body">
                          <span className="font-semibold text-primary-text block mb-0.5">💡 Pembahasan:</span>
                          {s.pembahasan}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN SOAL PER LAYAR (Quizizz Interactive Play View)
  // =========================================================================
  const isCorrect =
    hasConfirmed &&
    selectedInCurrent &&
    currentSoal.kunci &&
    selectedInCurrent.toUpperCase() === currentSoal.kunci.toUpperCase();

  return (
    <div className="min-h-[520px] w-full max-w-3xl mx-auto flex flex-col justify-between py-2 px-2 font-body space-y-4">
      {/* Top Header Card dengan Timer & Bar */}
      <Card className="!p-3.5 space-y-2 border-border-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary text-[rgb(var(--on-primary))] font-mono font-bold text-xs flex items-center justify-center shrink-0">
              {currentIndex + 1}
            </div>
            <div className="min-w-0">
              <span className="font-mono text-overline text-primary-text font-bold block uppercase tracking-wider">
                Soal {currentIndex + 1} dari {totalQuestions}
              </span>
              <h1 className="font-display text-xs sm:text-sm font-semibold text-fg truncate">
                {judulPaket}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <TimerRing
              durationSeconds={durasiMenit * 60}
              onExpire={handleFinishQuiz}
              isPaused={isCompleted}
            />
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="p-1 rounded-md text-fg-subtle hover:text-fg hover:bg-surface-2 transition"
                title="Tutup Kuis"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </Card>

      {/* Main Question Card */}
      <main className="flex-1 flex flex-col justify-center space-y-4">
        <Card className="border-border-2 p-5 sm:p-7 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge className="font-mono text-[11px] text-primary-text">
                <Sparkles className="w-3 h-3 mr-1" /> Pilihan Ganda · {currentSoal.bobot_skor || 50} Poin
              </Badge>
              <span className="text-caption text-fg-subtle font-mono">
                Pilih 1 jawaban yang paling tepat
              </span>
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-fg leading-relaxed break-words">
              {currentSoal.pertanyaan}
            </h2>
          </div>

          {/* Opsi Jawaban 4 Kotak Bergaya Quizizz */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opsiList.map((opt) => {
              const isSelected = selectedInCurrent === opt.key;
              const isKunci = currentSoal.kunci && opt.key.toUpperCase() === currentSoal.kunci.toUpperCase();

              let cardStyle = opt.borderDefault;
              if (hasConfirmed) {
                if (isKunci) {
                  cardStyle = 'border-success bg-success/20 text-fg ring-2 ring-success/40';
                } else if (isSelected && !isKunci) {
                  cardStyle = 'border-destructive bg-destructive/20 text-fg ring-2 ring-destructive/40';
                } else {
                  cardStyle = 'opacity-40 border-border bg-surface-2 text-fg-muted';
                }
              } else if (isSelected) {
                cardStyle = 'border-primary bg-primary/10 text-fg ring-2 ring-primary/40';
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={hasConfirmed}
                  onClick={() => handleSelectOption(opt.key)}
                  className={`min-h-[64px] sm:min-h-[72px] p-3.5 rounded-lg border text-left flex items-start justify-between gap-3 transition-all duration-150 active:scale-[0.99] ${cardStyle}`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={`w-7 h-7 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                        hasConfirmed && isKunci
                          ? 'bg-success text-black'
                          : hasConfirmed && isSelected && !isKunci
                          ? 'bg-destructive text-white'
                          : opt.colorBadge
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="pt-0.5 text-sm font-medium leading-snug break-words">
                      {opt.text}
                    </span>
                  </div>

                  {hasConfirmed && isKunci && (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  )}
                  {hasConfirmed && isSelected && !isKunci && (
                    <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback Instan (Quizizz Banner) */}
          {hasConfirmed && (
            <div
              className={`p-3.5 rounded-lg border text-sm space-y-1.5 transition-all ${
                isCorrect
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Jawaban Benar! 🎉
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-destructive" />
                      Kurang Tepat! Kunci Jawaban: {currentSoal.kunci}
                    </>
                  )}
                </span>
                {currentSoal.pembahasan && (
                  <button
                    type="button"
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="text-xs underline opacity-80 hover:opacity-100"
                  >
                    {showExplanation ? 'Sembunyikan' : 'Pembahasan'}
                  </button>
                )}
              </div>

              {showExplanation && currentSoal.pembahasan && (
                <p className="text-xs leading-relaxed opacity-90 pt-1 border-t border-current/20 font-body">
                  <span className="font-semibold">💡 Pembahasan: </span>
                  {currentSoal.pembahasan}
                </p>
              )}
            </div>
          )}
        </Card>
      </main>

      {/* Footer Navigasi */}
      <footer className="flex items-center justify-between gap-3 pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Sebelumnya
        </Button>

        <div>
          {hasConfirmed ? (
            <Button size="sm" onClick={handleNext} className="flex items-center gap-1.5">
              {isLastQuestion ? 'Lihat Hasil Kuis 🎉' : 'Soal Berikutnya ➔'}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleNext}>
              Lewati Soal
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
