import StampBadge from '../../components/common/StampBadge';
import Button from '../../components/common/Button';

const statusBadge = {
  waiting: { tone: 'neutral', label: 'Waiting' },
  ready: { tone: 'brass', label: 'Ready for Pickup' },
  fulfilled: { tone: 'success', label: 'Fulfilled' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  expired: { tone: 'danger', label: 'Expired' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function ReservationRow({ reservation, onCancel, isCancelling, cancelError }) {
  const badge = statusBadge[reservation.status];
  const canCancel = ['waiting', 'ready'].includes(reservation.status);

  return (
    <div className="border-b border-hairline py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-base font-semibold text-ink">{reservation.book?.title}</h3>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            Requested {formatDate(reservation.requestedAt)}
            {reservation.status === 'waiting' &&
              reservation.queuePosition &&
              ` · Position ${reservation.queuePosition} in line`}
            {reservation.status === 'ready' &&
              reservation.expiresAt &&
              ` · Pick up by ${formatDate(reservation.expiresAt)}`}
          </p>
        </div>
        <StampBadge tone={badge.tone}>{badge.label}</StampBadge>
      </div>

      {cancelError && <p className="mt-2 text-xs text-status-danger">{cancelError}</p>}

      {canCancel && (
        <Button
          variant="secondary"
          className="mt-3 text-xs"
          disabled={isCancelling}
          onClick={() => onCancel(reservation.id)}
        >
          {isCancelling ? 'Cancelling…' : 'Cancel'}
        </Button>
      )}
    </div>
  );
}