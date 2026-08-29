import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import StampBadge from '../components/common/StampBadge';
import { getBook } from '../api/books.api';
import { listCopiesForBook, addCopies, retireCopy } from '../api/borrow.api';

const statusTone = {
  available: 'success',
  borrowed: 'brass',
  reserved: 'neutral',
  lost: 'danger',
  damaged: 'danger',
  under_repair: 'warning',
};

export default function AdminBookCopies() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [copies, setCopies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [quantity, setQuantity] = useState('1');
  const [shelfLocation, setShelfLocation] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [retiringId, setRetiringId] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [bookRes, copiesRes] = await Promise.all([getBook(bookId), listCopiesForBook(bookId)]);
      setBook(bookRes);
      setCopies(copiesRes);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this book.');
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddCopies = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setError('');
    try {
      await addCopies({ bookId, quantity: Number(quantity) || 1, shelfLocation: shelfLocation.trim() || undefined });
      setQuantity('1');
      setShelfLocation('');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add copies.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRetire = async (copyId) => {
    if (!window.confirm('Retire this copy as lost? This permanently removes it from circulation.')) {
      return;
    }
    setRetiringId(copyId);
    try {
      await retireCopy(copyId);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not retire this copy.');
    } finally {
      setRetiringId(null);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/admin/books" className="text-sm font-medium text-brass hover:underline">
        ← Back to Manage Books
      </Link>

      <div className="mb-6 mt-3">
        <h1 className="font-serif text-2xl font-semibold text-ink">{book?.title}</h1>
        <p className="mt-1 font-mono text-xs text-ink-muted">ISBN {book?.isbn}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-status-danger bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-card border border-hairline bg-white p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Add Copies</h2>
        <form onSubmit={handleAddCopies} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-32">
            <Input
              id="quantity"
              label="Quantity"
              type="number"
              min="1"
              max="50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              id="shelfLocation"
              label="Shelf location (optional)"
              placeholder="e.g. Fiction — Aisle 3"
              value={shelfLocation}
              onChange={(e) => setShelfLocation(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isAdding}>
            {isAdding ? 'Adding…' : 'Add'}
          </Button>
        </form>
      </div>

      <div className="rounded-card border border-hairline bg-white">
        {copies.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No physical copies yet — add some above.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-medium">Barcode</th>
                <th className="px-5 py-3 font-medium">Shelf</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {copies.map((copy) => (
                <tr key={copy.id}>
                  <td className="px-5 py-3 font-mono text-xs text-ink">{copy.barcode}</td>
                  <td className="px-5 py-3 text-ink-muted">{copy.shelfLocation || '—'}</td>
                  <td className="px-5 py-3">
                    <StampBadge tone={statusTone[copy.status] || 'neutral'}>
                      {copy.status.replace('_', ' ')}
                    </StampBadge>
                  </td>
                  <td className="px-5 py-3">
                    {copy.status === 'available' && (
                      <Button
                        variant="secondary"
                        className="text-xs text-status-danger"
                        disabled={retiringId === copy.id}
                        onClick={() => handleRetire(copy.id)}
                      >
                        {retiringId === copy.id ? 'Retiring…' : 'Retire (Lost)'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}