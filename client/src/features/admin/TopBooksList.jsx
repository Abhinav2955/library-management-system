export default function TopBooksList({ books }) {
  if (books.length === 0) {
    return <p className="py-4 text-sm text-ink-muted">No circulation data yet.</p>;
  }

  return (
    <ol className="divide-y divide-hairline">
      {books.map((entry, index) => (
        <li key={entry.book.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-ink-muted">{String(index + 1).padStart(2, '0')}</span>
            <span className="font-serif text-sm text-ink">{entry.book.title}</span>
          </div>
          <span className="font-mono text-xs text-ink-muted">{entry.timesBorrowed}× borrowed</span>
        </li>
      ))}
    </ol>
  );
}