import { Link } from 'react-router-dom';
import { Card, EmptyState } from '../components/ui';

export default function KaryaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-headline font-bold text-[#F1F5F9]">Karya Saya</h1>
      <EmptyState
        title="Karya tersimpan di Portfolio"
        desc="Semua karya tldraw & catatan sesi ada di halaman portfolio."
        action={<Link to="/portfolio" className="text-[#FBBF24] underline">Buka Portfolio</Link>}
      />
      <Card>
        <p className="text-sm text-[#94A3B8]">Upload karya baru dari halaman Sesi setelah mengerjakan tugas.</p>
      </Card>
    </div>
  );
}
