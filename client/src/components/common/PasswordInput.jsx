import { useState } from 'react';

export default function PasswordInput({ label, id, error, className = '', ...props }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          className={`w-full rounded-card border px-3 py-2 pr-10 text-sm text-ink placeholder:text-ink-muted/60
            ${error ? 'border-status-danger' : 'border-hairline'}
            bg-white focus:border-brass ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {isVisible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l18 18" />
              <path d="M10.58 10.58a2 2 0 002.83 2.83" />
              <path d="M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4.5 10 7-.36 1.02-1.05 2.17-2.02 3.24M6.1 6.1C4.24 7.35 2.86 9.14 2 12c1 2.5 5 7 10 7 1.06 0 2.07-.19 3-.53" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}