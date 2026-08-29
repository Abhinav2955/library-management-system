// The one memorable visual element of this app: status is shown as an
// ink-stamped due-date card (a real library artifact) rather than a generic
// colored pill. Monospace type + a bordered rectangle evokes a checkout-card
// stamp without any animation or skeuomorphic excess.
const toneClasses = {
  neutral: 'border-hairline text-ink-muted bg-white',
  success: 'border-status-success text-status-success bg-status-successBg',
  warning: 'border-status-warning text-status-warning bg-status-warningBg',
  danger: 'border-status-danger text-status-danger bg-status-dangerBg',
  brass: 'border-brass text-brass-dark bg-brass-light',
};

export default function StampBadge({ tone = 'neutral', children }) {
  return <span className={`stamp-badge ${toneClasses[tone]}`}>{children}</span>;
}