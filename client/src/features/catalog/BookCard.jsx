import StampBadge from '../../components/common/StampBadge';
import Button from '../../components/common/Button';

export default function BookCard({
  book,
  onBorrow,
  isBorrowing,
  borrowError,
  onReserve,
  isReserving,
  reserveError,
  reserveSuccess,
}) {
  const isAvailable = book.availableCopies > 0;
  const authorNames = book.authors?.map((a) => a.name).join(', ') || 'Unknown author';

  return (
    <div className="flex gap-4 rounded-card border border-hairline bg-white p-4">
      <div className="flex h-24 w-16 flex-shrink-0 items-center justify-center rounded-sm border border-hairline bg-brass-light font-serif text-xs text-brass-dark">
        {book.title.slice(0, 1).toUpperCase()}
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="font-serif text-base font-semibold leading-snug text-ink">{book.title}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">{authorNames}</p>
          <p className="mt-1 font-mono text-xs text-ink-muted">ISBN {book.isbn}</p>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {isAvailable ? (
            <StampBadge tone="success">{book.availableCopies} Available</StampBadge>
          ) : (
            <StampBadge tone="danger">Checked Out</StampBadge>
          )}
          {book.categories?.slice(0, 2).map((c) => (
            <StampBadge key={c.id} tone="neutral">
              {c.name}
            </StampBadge>
          ))}
        </div>

        {borrowError && <p className="mt-2 text-xs text-status-danger">{borrowError}</p>}
        {reserveError && <p className="mt-2 text-xs text-status-danger">{reserveError}</p>}
        {reserveSuccess && <p className="mt-2 text-xs text-status-success">{reserveSuccess}</p>}

        <div className="mt-3 flex gap-2">
          {onBorrow && isAvailable && (
            <Button
              variant="secondary"
              className="self-start text-xs"
              disabled={isBorrowing}
              onClick={() => onBorrow(book.id)}
            >
              {isBorrowing ? 'Borrowing…' : 'Borrow'}
            </Button>
          )}

          {onReserve && !isAvailable && (
            <Button
              variant="brass"
              className="self-start text-xs"
              disabled={isReserving}
              onClick={() => onReserve(book.id)}
            >
              {isReserving ? 'Reserving…' : 'Reserve'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}