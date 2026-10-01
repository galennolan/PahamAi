import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './ui';
import type { UserRole } from '../types';

export default function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: UserRole[];
}) {
  const { user, role, loading } = useAuth();
  if (loading) return <Loading text="Memeriksa sesi..." />;
  if (!user) return <Navigate to="/masuk" replace />;
  if (allow) {
    // Fail-closed: role yang belum termuat (null) TIDAK boleh membuka route.
    if (!role) return <Navigate to="/app" replace />;
    if (!allow.includes(role)) return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
