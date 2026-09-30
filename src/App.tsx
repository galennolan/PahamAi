import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { Loading } from './components/ui';
import { LoginPage, RegisterPage } from './pages/Auth';
import { supabaseEnvMissing } from './lib/supabaseClient';
import LegacyRedirect from './components/LegacyRedirect';

function EnvMissingBanner() {
  if (!supabaseEnvMissing) return null;
  return (
    <div className="bg-destructive px-4 py-2 text-center text-sm font-medium text-[rgb(var(--on-primary))]">
      VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset. Salin .env.example menjadi .env lalu isi nilainya.
    </div>
  );
}

const LandingPage = lazy(() => import('./pages/Landing'));
const PendaftaranPage = lazy(() => import('./pages/Pendaftaran'));
const BerandaPage = lazy(() => import('./pages/Beranda'));
const SesiPage = lazy(() => import('./pages/Sesi'));
const AbsensiPage = lazy(() => import('./pages/Absensi'));
const KelolaModulPage = lazy(() => import('./pages/KelolaModul'));
const OrangTuaPage = lazy(() => import('./pages/OrangTua'));
const KelolaKelasPage = lazy(() => import('./pages/KelolaKelas'));
const KelolaPesertaPage = lazy(() => import('./pages/KelolaPeserta'));
const KelolaOrangTuaPage = lazy(() => import('./pages/KelolaOrangTua'));
const KelolaUserPage = lazy(() => import('./pages/KelolaUser'));
const PembayaranPage = lazy(() => import('./pages/Pembayaran'));
const BelajarPage = lazy(() => import('./pages/Belajar'));
const ModulPage = lazy(() => import('./pages/Modul'));
const CatatanPage = lazy(() => import('./pages/Catatan'));
const ProgresPage = lazy(() => import('./pages/Progres'));
const KaryaPage = lazy(() => import('./pages/Karya'));
const ProfilPage = lazy(() => import('./pages/Profil'));
const MarketingDashboardPage = lazy(() => import('./pages/MarketingDashboard'));
const KelolaBatchPage = lazy(() => import('./pages/KelolaBatch'));
const KelolaSesiPage = lazy(() => import('./pages/KelolaSesi'));
const KelolaSoalPage = lazy(() => import('./pages/KelolaSoal'));

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
          <ErrorBoundary>
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
              <Route path="/modul" element={<Protected allow={['admin', 'instruktur']}><ModulPage /></Protected>} />
              <Route path="/catatan" element={<Protected allow={['peserta']}><CatatanPage /></Protected>} />

              <Route path="/anak" element={<Protected allow={['parent']}><OrangTuaPage /></Protected>} />
              <Route path="/marketing" element={<Protected allow={['marketing', 'admin']}><MarketingDashboardPage /></Protected>} />

              <Route path="/absensi" element={<Protected allow={['admin', 'instruktur']}><AbsensiPage /></Protected>} />
              <Route path="/kelola-modul" element={<Protected allow={['admin']}><KelolaModulPage /></Protected>} />
              <Route path="/kelola-sesi" element={<Protected allow={['admin', 'instruktur']}><KelolaSesiPage /></Protected>} />
              <Route path="/kelola-batch" element={<Protected allow={['admin', 'instruktur']}><KelolaBatchPage /></Protected>} />
              <Route path="/kelola-kelas" element={<Protected allow={['admin', 'instruktur']}><KelolaKelasPage /></Protected>} />
              <Route path="/kelola-peserta" element={<Protected allow={['admin', 'instruktur']}><KelolaPesertaPage /></Protected>} />
              <Route path="/kelola-ortu" element={<Protected allow={['admin']}><KelolaOrangTuaPage /></Protected>} />
        <Route path="/kelola-user" element={<Protected allow={['admin']}><KelolaUserPage /></Protected>} />
              <Route path="/kelola-soal" element={<Protected allow={['admin']}><KelolaSoalPage /></Protected>} />
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
          </ErrorBoundary>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
