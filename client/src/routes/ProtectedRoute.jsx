import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Session restore (silent refresh) is still in flight — avoid a flash
    // redirect to /login before we actually know if the user is signed in.
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}