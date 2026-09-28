import { useState } from 'react';
import { Card } from '../components/ui';
import { Tabs } from '../components/ui';
import KelolaBatchPage from './KelolaBatch';
import KelolaSesiPage from './KelolaSesi';

type KelasTab = 'kelas' | 'sesi';

export default function KelolaKelasPage() {
  const [activeTab, setActiveTab] = useState<KelasTab>('kelas');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-headline font-bold text-fg">Kelola Kelas</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Buat kelas, kelola peserta, dan sesi dalam satu halaman.
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs
            label="Pilih tampilan"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { key: 'kelas', label: 'Kelas & Peserta' },
              { key: 'sesi', label: 'Jadwal Sesi' },
            ]}
          />
        </div>
      </div>

      {activeTab === 'kelas' && (
        <Card className="!p-0">
          <KelolaBatchPage />
        </Card>
      )}

      {activeTab === 'sesi' && (
        <Card className="!p-0">
          <KelolaSesiPage />
        </Card>
      )}
    </div>
  );
}