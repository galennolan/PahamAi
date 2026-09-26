import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listModulByJalur } from '../services/modul';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import type { Modul, Jalur } from '../types';
import { JALUR_LABELS } from '../types';

export default function ModulPage() {
  const [jalur, setJalur] = useState<Jalur>('A');
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listModulByJalur(jalur);
        setModuls(data);
      } catch {
        // fallback kosong
      } finally {
        setLoading(false);
      }
    })();
  }, [jalur]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setJalur(e.target.value as Jalur);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-headline font-bold text-[#F1F5F9]">Modul Paham AI</h1>
        <select
          value={jalur}
          onChange={handleChange}
          className="rounded-[4px] border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm text-[#F1F5F9] outline-none focus:border-[#4ADE80] focus:shadow-[0_0_12px_rgba(74,222,128,0.15)]"
        >
          {(['A', 'B1', 'B2', 'B3'] as Jalur[]).map((j) => (
            <option key={j} value={j} className="bg-[#1E293B]">
              {JALUR_LABELS[j]}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loading text="Memuat modul..." />}
      {!loading && moduls.length === 0 && (
        <EmptyState title="Modul belum tersedia" desc="Modul akan muncul saat sesi dimulai." />
      )}

      {!loading && moduls.length > 0 && (
        <ul className="grid gap-4">
          {moduls.map((m) => (
            <li key={m.id}>
              <Link to={`/modul/${m.kode}`} className="block">
                <Card className="transition hover:border-[#475569] hover:shadow-subtle">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-[#4ADE80]">{m.kode}</span>
                      <span className="text-[#94A3B8]">— {m.judul}</span>
                    </div>
                    <Badge>
                      <span className="font-mono text-xs text-[#22D3EE]">{m.urutan_sesi}</span>
                    </Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}