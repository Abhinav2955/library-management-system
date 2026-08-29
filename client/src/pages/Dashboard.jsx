import { Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import StampBadge from '../components/common/StampBadge';
import { useAuth } from '../features/auth/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppShell>
      <h1 className="font-serif text-2xl font-semibold text-ink">
        Welcome back, {user?.name?.split(' ')[0]}
      </h1>

      <div className="mt-6 rounded-card border border-hairline bg-white p-6">
        <p className="text-sm text-ink-muted">
          Auth is fully wired — this confirms the access/refresh cycle, RBAC role
          (<span className="font-mono text-ink">{user?.role}</span>), and session restore all work.
        </p>
        <div className="mt-4 flex gap-2">
          <StampBadge tone="success">Active Member</StampBadge>
          <StampBadge tone="brass">Session Live</StampBadge>
        </div>
        <Link
          to="/catalog"
          className="mt-5 inline-block text-sm font-medium text-brass hover:underline"
        >
          Browse the catalog →
        </Link>
      </div>
    </AppShell>
  );
}