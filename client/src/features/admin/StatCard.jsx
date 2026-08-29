const toneClasses = {
  neutral: 'text-ink',
  danger: 'text-status-danger',
  brass: 'text-brass-dark',
};

export default function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}