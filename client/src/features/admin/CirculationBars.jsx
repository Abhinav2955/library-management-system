export default function CirculationBars({ checkoutsByDay }) {
  if (checkoutsByDay.length === 0) {
    return <p className="py-4 text-sm text-ink-muted">No checkouts in this period.</p>;
  }

  const maxCount = Math.max(...checkoutsByDay.map((d) => Number(d.count)));

  return (
    <div className="flex items-end gap-1.5" style={{ height: '120px' }}>
      {checkoutsByDay.map((day) => {
        const heightPct = maxCount > 0 ? (Number(day.count) / maxCount) * 100 : 0;
        return (
          <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${day.date}: ${day.count}`}>
            <div
              className="w-full rounded-t-sm bg-brass"
              style={{ height: `${Math.max(heightPct, 4)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}