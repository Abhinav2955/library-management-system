import { useEffect, useState, useCallback } from 'react';
import AppShell from '../components/layout/AppShell';
import Pagination from '../components/common/Pagination';
import ReservationRow from '../features/reservations/ReservationRow';
import { listMyReservations, cancelReservation } from '../api/reservations.api';

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelErrors, setCancelErrors] = useState({});

  const fetchReservations = useCallback(async (currentPage) => {
    setIsLoading(true);
    setError('');
    try {
      const { reservations: results, meta: resultMeta } = await listMyReservations({
        page: currentPage,
      });
      setReservations(results);
      setMeta(resultMeta);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your reservations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations(page);
  }, [page, fetchReservations]);

  const handleCancel = async (reservationId) => {
    setCancellingId(reservationId);
    setCancelErrors((prev) => ({ ...prev, [reservationId]: '' }));
    try {
      await cancelReservation(reservationId);
      await fetchReservations(page);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not cancel this reservation.';
      setCancelErrors((prev) => ({ ...prev, [reservationId]: message }));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Reservations</h1>
        <p className="mt-1 text-sm text-ink-muted">Books you're waiting on or holding a place for.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-status-danger bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="rounded-card border border-hairline bg-white px-5">
        {isLoading ? (
          <p className="py-6 font-mono text-sm text-ink-muted">Loading your reservations…</p>
        ) : reservations.length === 0 ? (
          <p className="py-6 text-sm text-ink-muted">You don't have any reservations yet.</p>
        ) : (
          reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              onCancel={handleCancel}
              isCancelling={cancellingId === reservation.id}
              cancelError={cancelErrors[reservation.id]}
            />
          ))
        )}
      </div>

      <div className="mt-6">
        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </AppShell>
  );
}