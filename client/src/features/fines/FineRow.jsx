import StampBadge from '../../components/common/StampBadge';
import Button from '../../components/common/Button';

const statusBadge = {
  pending: { tone: 'warning', label: 'Pending' },
  paid: { tone: 'success', label: 'Paid' },
  waived: { tone: 'neutral', label: 'Waived' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function FineRow({ fine, onPay, isPaying, payError }) {
  const badge = statusBadge[fine.status];

  return (
    <div className="border-b border-hairline py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">{fine.reason}</p>
          <p className="mt-1 font-mono text-xs text-ink-muted">Issued {formatDate(fine.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono text-sm font-semibold text-ink">
            ₹{Number(fine.amount).toFixed(2)}
          </span>
          <StampBadge tone={badge.tone}>{badge.label}</StampBadge>
        </div>
      </div>

      {payError && <p className="mt-2 text-xs text-status-danger">{payError}</p>}

      {fine.status === 'pending' && (
        <Button
          variant="brass"
          className="mt-3 text-xs"
          disabled={isPaying}
          onClick={() => onPay(fine)}
        >
          {isPaying ? 'Processing…' : 'Pay now'}
        </Button>
      )}
    </div>
  );
}