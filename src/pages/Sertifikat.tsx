import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatJakarta } from '../lib/time';
import type { Sertifikat } from '../types';

export default function SertifikatPage() {
  const { user } = useAuth();
  const [sertifikat, setSertifikat] = useState<Sertifikat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profil } = await supabase.from('peserta').select('id').eq('user_id', user.id).maybeSingle();
      if (!profil) { setLoading(false); return; }
      const { data } = await supabase.from('sertifikat').select('*').eq('id_peserta_fk', profil.id).order('tanggal_terbit', { ascending: false });
      setSertifikat((data as Sertifikat[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Loading text="Memuat sertifikat..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-[#F1F5F9]">Sertifikat Saya</h1>

      {sertifikat.length === 0 ? (
        <EmptyState title="Belum ada sertifikat" desc="Lulus kriteria kelulusan & admin akan terbitkan sertifikat PAHAI/[TAHUN]/[JALUR]/[NOMOR]." />
      ) : (
        <div className="grid gap-4">
          {sertifikat.map(s => (
            <Card key={s.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-lg text-[#FBBF24]">{s.nomor_seri}</p>
                  <p className="text-sm text-[#94A3B8] mt-1">
                    Jalur: <Badge>{s.jalur ?? '-'}</Badge> · {s.level_lulus ?? '-'} · {s.tanggal_terbit ? formatJakarta(s.tanggal_terbit) : '-'}
                  </p>
                  {s.file_url && <p className="text-xs text-[#64748B] mt-1">{s.file_url}</p>}
                </div>
                {s.file_url && (
                  <Button size="sm" onClick={() => window.open(s.file_url!, '_blank')}>
                    Unduh
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}