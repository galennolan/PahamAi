import { Navigate } from 'react-router-dom';

const legacyPesertaRoutes: Record<string, string> = {
  '/modul': '/belajar',
  '/jadwal': '/belajar',
  '/absensi-saya': '/progres',
  '/catatan': '/progres',
  '/nilai': '/progres',
  '/sertifikat': '/karya',
  '/portfolio': '/karya',
  '/pembayaran-saya': '/profil',
  '/survei': '/profil',
};

export default function LegacyPesertaRedirect({ path }: { path: string }) {
  const target = legacyPesertaRoutes[path];
  if (target) return <Navigate to={target} replace />;
  return <Navigate to="/app" replace />;
}