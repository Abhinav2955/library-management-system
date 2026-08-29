export default function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-card border px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60
          ${error ? 'border-status-danger' : 'border-hairline'}
          bg-white focus:border-brass ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}