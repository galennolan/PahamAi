import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimerRingProps {
  durationSeconds: number;
  onExpire?: () => void;
  isPaused?: boolean;
}

export function TimerRing({ durationSeconds, onExpire, isPaused = false }: TimerRingProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);

  useEffect(() => {
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (isPaused) return;

    if (timeLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused, onExpire]);

  const percentage = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const isLowTime = timeLeft <= 15;

  return (
    <div className="w-full max-w-[200px] sm:max-w-xs space-y-1">
      <div className="flex justify-between items-center text-xs font-mono font-medium px-0.5">
        <span className={`flex items-center gap-1.5 ${isLowTime ? 'text-destructive animate-pulse font-semibold' : 'text-fg-muted'}`}>
          <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-destructive' : 'text-primary'}`} />
          Sisa Waktu
        </span>
        <span className={`font-mono text-xs px-2 py-0.5 rounded-md border ${
          isLowTime
            ? 'border-destructive/40 bg-destructive/10 text-destructive font-bold'
            : 'border-border-2 bg-surface-2 text-primary-text font-bold'
        }`}>
          {formattedTime}
        </span>
      </div>

      <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden border border-border-2 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isLowTime ? 'bg-destructive' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
