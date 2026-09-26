import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge, Button, ConfirmDialog } from '../components/ui';
import { useToast } from '../hooks/useToast';
import type { Pendaftar } from '../types';

export default function PendaftarPage() {
  const { push: toast } = useToast();
  const [pendaftars, setPendaftars] = useState<Pendaftar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('pendaftar').select('*').order('created_at', { ascending: false });
      if (!error) setPendaftars(data as Pendaftar[]);
      setLoading(false);
    })();
  }, []);

  const handleApprove = async (p: Pendaftar) => {
    setSaving(true);
    try {
      await supabase.from('pendaftar').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', p.id);
      setPendaftars(pendaftars.map((x) => (x.id === p.id ? { ...x, status: 'approved' as const } : x)));
      toast('Pendaftar disetujui', 'success');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
  };

  const handleReject = async (id: string) => {
    setSaving(true);
    try {
      await supabase.from('pendaftar').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
      setPendaftars(pendaftars.map((x) => (x.id === id ? { ...x, status: 'rejected' as const } : x)));
      toast('Pendaftar ditolak', 'success');
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
    setShowConfirm(null);
  };

  if (loading) return <Loading text="Memuat daftar pendaftar..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-[#F1F5F9]">Kelola Pendaftar</h1>

      {pendaftars.length === 0 && <EmptyState title="Belum ada pendaftar" desc="Formulir pendaftaran akan mengisi daftar ini." />}

      <div className="space-y-4">
        {pendaftars.map((p) => (
          <Card key={p.id} className="hover:shadow-subtle">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[#F1F5F9]">{p.nama_lengkap}</p>
                <p className="text-sm text-[#64748B]">{p.email ?? p.no_wa ?? '-'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="font-mono">{p.status}</Badge>
                <Badge className="font-mono text-[#22D3EE]">{p.jalur ?? '-'}</Badge>
                {p.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(p)} disabled={saving}>
                      Setujui
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowConfirm(p.id)}>
                      Tolak
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Tolak Pendaftar?"
          message="Tindakan ini tidak bisa dibatalkan."
          onConfirm={() => handleReject(showConfirm)}
          onCancel={() => setShowConfirm(null)}
          busy={saving}
        />
      )}
    </div>
  );
}