import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/common/Button';
import StatCard from '../features/admin/StatCard';
import TopBooksList from '../features/admin/TopBooksList';
import OverdueTable from '../features/admin/OverdueTable';
import CirculationBars from '../features/admin/CirculationBars';
import {
  getDashboardSummary,
  getTopBooks,
  getOverdueLoans,
  getFineRevenue,
  getCirculationStats,
  downloadOverdueCsv,
} from '../api/reports.api';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [topBooks, setTopBooks] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [fineRevenue, setFineRevenue] = useState(null);
  const [circulation, setCirculation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getDashboardSummary(),
      getTopBooks(5),
      getOverdueLoans(),
      getFineRevenue(),
      getCirculationStats(30),
    ])
      .then(([summaryRes, topBooksRes, overdueRes, revenueRes, circulationRes]) => {
        if (cancelled) return;
        setSummary(summaryRes);
        setTopBooks(topBooksRes);
        setOverdueLoans(overdueRes);
        setFineRevenue(revenueRes);
        setCirculation(circulationRes);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Could not load the dashboard.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadOverdueCsv();
    } catch {
      setError('Could not export the overdue report.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <p className="font-mono text-sm text-ink-muted">Loading dashboard…</p>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="rounded-card border border-status-danger bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
          {error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">Circulation, revenue, and overdue overview.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Books" value={summary.totalBooks} />
        <StatCard label="Active Loans" value={summary.activeLoans} />
        <StatCard label="Overdue" value={summary.overdueLoans} tone={summary.overdueLoans > 0 ? 'danger' : 'neutral'} />
        <StatCard label="Reservation Queue" value={summary.waitingReservations} />
        <StatCard label="Total Copies" value={summary.totalCopies} />
        <StatCard label="Available Now" value={summary.availableCopies} />
        <StatCard label="Pending Fines" value={`$${summary.pendingFinesTotal.toFixed(2)}`} tone="brass" />
        <StatCard label="Collected Fines" value={`$${summary.collectedFinesTotal.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-hairline bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-ink">Checkouts — Last 30 Days</h2>
          <div className="mt-4">
            <CirculationBars checkoutsByDay={circulation.checkoutsByDay} />
          </div>
        </div>

        <div className="rounded-card border border-hairline bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-ink">Most Borrowed</h2>
          <TopBooksList books={topBooks} />
        </div>

        <div className="rounded-card border border-hairline bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-ink">Fine Revenue</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-mono text-xs uppercase text-ink-muted">Pending</p>
              <p className="mt-1 font-serif text-xl font-semibold text-brass-dark">
                ${fineRevenue.pending.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase text-ink-muted">Collected</p>
              <p className="mt-1 font-serif text-xl font-semibold text-status-success">
                ${fineRevenue.collected.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase text-ink-muted">Waived</p>
              <p className="mt-1 font-serif text-xl font-semibold text-ink-muted">
                ${fineRevenue.waived.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-hairline bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-ink">Overdue Loans</h2>
            <Button variant="secondary" className="text-xs" disabled={isExporting} onClick={handleExport}>
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>
          <div className="mt-4">
            <OverdueTable loans={overdueLoans} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}