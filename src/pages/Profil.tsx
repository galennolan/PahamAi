import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { Peserta } from '../types';

export default function ProfilPage() {
  const { user } = useAuth();
  const [profil, setProfil] = useState<Peserta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('peserta')
          .select('*, kelas(*)')
          .eq('user_id', user.id)
          .maybeSingle();
        setProfil((data as Peserta) ?? null);
      } catch (e) {
        console.error('[Profil] gagal memuat profil:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <Loading text="Memuat profil..." />;
  if (!profil) return <EmptyState title="Belum terdaftar" desc="Hubungi admin untuk pendaftaran." />;

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-fg">Profil Saya</h1>
      <Card>
        <p className="text-subhead font-semibold text-fg">{profil.nama_panggil ?? profil.nama_lengkap}</p>
        <p className="text-sm text-fg-muted mt-1">Kelas: <Badge>{profil.kelas?.nama ?? profil.kelas_penempatan ?? '-'}</Badge></p>
        <p className="text-sm text-fg-muted mt-1">Email: {user?.email}</p>
        <p className="text-sm text-fg-muted mt-1">WA: {profil.no_wa ?? '-'}</p>
      </Card>
    </div>
  );
}
