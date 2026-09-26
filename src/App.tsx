import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Loading } from './components/ui';
import { LoginPage, RegisterPage } from './pages/Auth';
import { supabaseEnvMissing } from './lib/supabaseClient';
import LegacyRedirect from './components/LegacyRedirect';

function EnvMissingBanner() {
  if (!supabaseEnvMissing) return null;
  return (
    <div className="bg-destructive px-4 py-2 text-center text-sm font-medium text-[bg]">
      VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset. Salin .env.example menjadi .env lalu isi nilainya.
    </div>
  );
}

const LandingPage = lazy(() => import('./pages/Landing'));
const PendaftaranPage = lazy(() => import('./pages/Pendaftaran'));
const BerandaPage = lazy(() => import('./pages/Beranda'));
const SesiPage = lazy(() => import('./pages/Sesi'));
const AbsensiPage = lazy(() => import('./pages/Absensi'));
const PendaftarPage = lazy(() => import('./pages/Pendaftar'));
const KelolaSesiPage = lazy(() => import('./pages/KelolaSesi'));
const KelolaModulPage = lazy(() => import('./pages/KelolaModul'));
const OrangTuaPage = lazy(() => import('./pages/OrangTua'));
const KelolaBatchPage = lazy(() => import('./pages/KelolaBatch'));
const KelolaPesertaPage = lazy(() => import('./pages/KelolaPeserta'));
const PembayaranPage = lazy(() => import('./pages/Pembayaran'));
const BelajarPage = lazy(() => import('./pages/Belajar'));
const CatatanPage = lazy(() => import('./pages/Catatan'));
const ProgresPage = lazy(() => import('./pages/Progres'));
const KaryaPage = lazy(() => import('./pages/Karya'));
const ProfilPage = lazy(() => import('./pages/Profil'));
const MarketingDashboardPage = lazy(() => import('./pages/MarketingDashboard'));

function Protected({ children, allow }: { children: React.ReactNode; allow?: Parameters<typeof ProtectedRoute>[0]['allow'] }) {
  return (
    <ProtectedRoute allow={allow}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <EnvMissingBanner />
        <BrowserRouter>
          <Suspense fallback={<Loading text="Memuat halaman..." />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pendaftaran" element={<PendaftaranPage />} />
              <Route path="/masuk" element={<LoginPage />} />
              <Route path="/daftar" element={<RegisterPage />} />

              <Route path="/app" element={<Protected><BerandaPage /></Protected>} />
              <Route path="/belajar" element={<Protected allow={['peserta']}><BelajarPage /></Protected>} />
              <Route path="/progres" element={<Protected allow={['peserta']}><ProgresPage /></Protected>} />
              <Route path="/karya" element={<Protected allow={['peserta']}><KaryaPage /></Protected>} />
              <Route path="/profil" element={<Protected allow={['peserta']}><ProfilPage /></Protected>} />
              <Route path="/modul/:kode" element={<Protected><SesiPage /></Protected>} />
              <Route path="/catatan" element={<Protected allow={['peserta']}><CatatanPage /></Protected>} />

              <Route path="/anak" element={<Protected allow={['parent']}><OrangTuaPage /></Protected>} />
              <Route path="/marketing" element={<Protected allow={['marketing', 'admin']}><MarketingDashboardPage /></Protected>} />

              <Route path="/absensi" element={<Protected allow={['admin', 'instruktur']}><AbsensiPage /></Protected>} />
              <Route path="/pendaftar" element={<Protected allow={['admin']}><PendaftarPage /></Protected>} />
              <Route path="/kelola-sesi" element={<Protected allow={['admin', 'instruktur']}><KelolaSesiPage /></Protected>} />
              <Route path="/kelola-modul" element={<Protected allow={['admin']}><KelolaModulPage /></Protected>} />
              <Route path="/kelola-batch" element={<Protected allow={['admin']}><KelolaBatchPage /></Protected>} />
              <Route path="/kelola-peserta" element={<Protected allow={['admin', 'instruktur']}><KelolaPesertaPage /></Protected>} />
              <Route path="/pembayaran" element={<Protected allow={['admin']}><PembayaranPage /></Protected>} />

              <Route path="/modul" element={<Protected><LegacyRedirect path="/modul" /></Protected>} />
              <Route path="/jadwal" element={<Protected allow={['peserta']}><LegacyRedirect path="/jadwal" /></Protected>} />
              <Route path="/absensi-saya" element={<Protected allow={['peserta']}><LegacyRedirect path="/absensi-saya" /></Protected>} />
              <Route path="/nilai" element={<Protected allow={['peserta']}><LegacyRedirect path="/nilai" /></Protected>} />
              <Route path="/kuis" element={<Protected allow={['peserta']}><LegacyRedirect path="/kuis" /></Protected>} />
              <Route path="/sertifikat" element={<Protected allow={['peserta']}><LegacyRedirect path="/sertifikat" /></Protected>} />
              <Route path="/portfolio" element={<Protected allow={['peserta']}><LegacyRedirect path="/portfolio" /></Protected>} />
              <Route path="/pembayaran-saya" element={<Protected allow={['peserta']}><LegacyRedirect path="/pembayaran-saya" /></Protected>} />
              <Route path="/survei" element={<Protected allow={['peserta', 'parent']}><LegacyRedirect path="/survei" /></Protected>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
