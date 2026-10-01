import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Loading, EmptyState, Badge, Button, Field, TextInput, TextArea } from '../components/ui';
import { formatJakarta } from '../lib/time';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { Check, ExternalLink } from 'lucide-react';
import type { Catatan, JadwalSesi, Modul } from '../types';

interface SesiCatatanItem {
  sesiPesertaId: string;
  jadwal: JadwalSesi;
  modul: Modul | null;
  catatan: Catatan | null;
}

export default function CatatanPage() {
  const { user, role } = useAuth();
  const { push: toast } = useToast();
  const [items, setItems] = useState<SesiCatatanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, { text: string; url: string }>>({});

  useEffect(() => {
    if (role !== 'peserta' || !user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: profil } = await supabase
          .from('peserta')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profil) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Hanya sesi yang ditugaskan ke peserta ini lewat `sesi_peserta`.
        const { data: spList } = await supabase
          .from('sesi_peserta')
          .select('id, sesi:jadwal_sesi(*, modul(*))')
          .eq('peserta_id', profil.id);

        const ditugaskan = ((spList ?? []) as unknown as {
          id: string;
          sesi: JadwalSesi | null;
        }[])
          .filter((r): r is { id: string; sesi: JadwalSesi } => r.sesi !== null)
          .sort(
            (a, b) =>
              (a.sesi.tanggal_kelas ?? '').localeCompare(b.sesi.tanggal_kelas ?? '') ||
              (a.sesi.modul?.urutan_sesi ?? 0) - (b.sesi.modul?.urutan_sesi ?? 0)
          );

        const spIds = ditugaskan.map((r) => r.id);

        // Ambil catatan
        const { data: catatanList } = await supabase
          .from('catatan_ketik')
          .select('*')
          .in('sesi_peserta_id', spIds);

        const catatanMap = new Map((catatanList ?? []).map((c: Catatan) => [c.sesi_peserta_id, c]));

        const list: SesiCatatanItem[] = [];
        const formMap: Record<string, { text: string; url: string }> = {};

        for (const { id: spId, sesi: j } of ditugaskan) {
          const cat = catatanMap.get(spId) ?? null;
          list.push({
            sesiPesertaId: spId,
            jadwal: j,
            modul: j.modul ?? null,
            catatan: cat,
          });
          formMap[spId] = {
            text: cat?.catatan_text ?? '',
            url: cat?.tldraw_url ?? '',
          };
        }

        setItems(list);
        setFormData(formMap);
      } catch (e: unknown) {
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, role, toast]);

  const handleSave = async (sesiPesertaId: string) => {
    setSavingId(sesiPesertaId);
    try {
      const data = formData[sesiPesertaId] || { text: '', url: '' };
      const { error } = await supabase
        .from('catatan_ketik')
        .upsert({
          sesi_peserta_id: sesiPesertaId,
          catatan_text: data.text || null,
          tldraw_url: data.url || null,
          status_pengumpulan: Boolean(data.text || data.url),
          sync_status: 'synced',
        }, { onConflict: 'sesi_peserta_id' });

      if (error) throw error;
      toast('Catatan & link tldraw disimpan', 'success');

      // Refresh item
      const { data: updated } = await supabase
        .from('catatan_ketik')
        .select('*')
        .eq('sesi_peserta_id', sesiPesertaId)
        .maybeSingle();

      setItems(items.map(item => item.sesiPesertaId === sesiPesertaId ? { ...item, catatan: updated as Catatan } : item));
    } catch (e: unknown) {
      toast((e as Error).message, 'error');
    }
    setSavingId(null);
  };

  if (loading) return <Loading text="Memuat catatan manual..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline font-bold text-fg">Catatan &amp; Kanvas Tldraw</h1>
        <p className="mt-1 text-sm text-fg-muted">Catatan manual per sesi kelas &amp; link board tldraw Anda (gaya OutputLab).</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Belum ada sesi terjadwal" desc="Admin perlu menugaskan Anda ke sesi terlebih dahulu." />
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => {
            const spId = item.sesiPesertaId;
            const f = formData[spId] || { text: '', url: '' };
            const isSaving = savingId === spId;
            return (
              <Card key={spId}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono text-primary-text">
                        {item.modul?.kode ?? item.jadwal.kode_sesi_friendly}
                      </Badge>
                      <h2 className="text-subhead font-bold text-fg">{item.jadwal.judul_sesi}</h2>
                    </div>
                    <p className="mt-1 font-mono text-xs text-fg-muted">
                      Sesi #{idx + 1} · {item.jadwal.tanggal_kelas ? formatJakarta(item.jadwal.tanggal_kelas) : 'Belum dijadwalkan'}
                      {item.jadwal.jam_mulai && ` · ${item.jadwal.jam_mulai}–${item.jadwal.jam_akhir ?? ''}`}
                    </p>
                  </div>
                  {item.catatan?.status_pengumpulan && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-success">
                      <Check className="h-3 w-3" /> Tersimpan
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <Field label="Catatan Manual Sesi" hint="Tulis rangkuman, ide, atau jawaban latihan di sini.">
                    <TextArea
                      rows={5}
                      value={f.text}
                      onChange={(e) => setFormData({ ...formData, [spId]: { ...f, text: e.target.value } })}
                      placeholder="Ketik catatan manual di sini..."
                    />
                  </Field>

                  <Field label="Link Tldraw (Kanvas Visual)" hint="Tempelkan URL tldraw.com board Anda di sini.">
                    <TextInput
                      type="url"
                      value={f.url}
                      onChange={(e) => setFormData({ ...formData, [spId]: { ...f, url: e.target.value } })}
                      placeholder="https://tldraw.com/r/..."
                    />
                  </Field>

                  {f.url && (
                    <div>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Buka Board Tldraw di Tab Baru
                      </a>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button onClick={() => handleSave(spId)} disabled={isSaving}>
                      {isSaving ? 'Menyimpan...' : 'Simpan Catatan & Tldraw'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}