import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import FullScreenLoader from '../components/FullScreenLoader';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "developer" && !user.businessProfileComplete && window.location.pathname !== "/business-setup") return <Navigate to="/business-setup" replace />;

  return children;
}
