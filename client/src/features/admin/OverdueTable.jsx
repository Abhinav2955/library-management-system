import StampBadge from '../../components/common/StampBadge';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const daysOverdue = (dueAt) => Math.ceil((Date.now() - new Date(dueAt)) / 86400000);

export default function OverdueTable({ loans }) {
  if (loans.length === 0) {
    return <p className="py-4 text-sm text-ink-muted">Nothing overdue right now.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
            <th className="py-2 pr-4 font-medium">Member</th>
            <th className="py-2 pr-4 font-medium">Book</th>
            <th className="py-2 pr-4 font-medium">Due date</th>
            <th className="py-2 font-medium">Overdue by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td className="py-3 pr-4">
                <p className="text-ink">{loan.borrower?.name}</p>
                <p className="font-mono text-xs text-ink-muted">{loan.borrower?.email}</p>
              </td>
              <td className="py-3 pr-4 text-ink">{loan.copy?.book?.title}</td>
              <td className="py-3 pr-4 font-mono text-xs text-ink-muted">{formatDate(loan.dueAt)}</td>
              <td className="py-3">
                <StampBadge tone="danger">{daysOverdue(loan.dueAt)} days</StampBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}