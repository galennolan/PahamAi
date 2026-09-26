import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Loading } from './components/ui';
import { LoginPage, RegisterPage } from './pages/Auth';

const BerandaPage = lazy(() => import('./pages/Beranda'));
const ModulPage = lazy(() => import('./pages/Modul'));
const SesiPage = lazy(() => import('./pages/Sesi'));
const AbsensiPage = lazy(() => import('./pages/Absensi'));
const PendaftarPage = lazy(() => import('./pages/Pendaftar'));
const KelolaSesiPage = lazy(() => import('./pages/KelolaSesi'));
const KelolaModulPage = lazy(() => import('./pages/KelolaModul'));

function Protected({ children, allow }: { children: React.ReactNode; allow?: Parameters<typeof ProtectedRoute>[0]['allow'] }) {
  return (
    <ProtectedRoute allow={allow}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading text="Memuat halaman..." />}>
            <Routes>
              <Route path="/masuk" element={<LoginPage />} />
              <Route path="/daftar" element={<RegisterPage />} />
              <Route path="/" element={<Protected><BerandaPage /></Protected>} />
              <Route path="/modul" element={<Protected><ModulPage /></Protected>} />
              <Route path="/modul/:kode" element={<Protected><SesiPage /></Protected>} />
              <Route path="/absensi" element={<Protected allow={['admin', 'instruktur']}><AbsensiPage /></Protected>} />
              <Route path="/pendaftar" element={<Protected allow={['admin']}><PendaftarPage /></Protected>} />
              <Route path="/kelola-sesi" element={<Protected allow={['admin', 'instruktur']}><KelolaSesiPage /></Protected>} />
              <Route path="/kelola-modul" element={<Protected allow={['admin']}><KelolaModulPage /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}