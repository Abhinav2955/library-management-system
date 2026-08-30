import { useState, useRef, useEffect } from 'react';
import { useNotifications } from './NotificationContext';
import StampBadge from '../../components/common/StampBadge';

const typeMeta = {
  due_soon: { tone: 'warning', label: 'Due Soon' },
  overdue: { tone: 'danger', label: 'Overdue' },
  reservation_ready: { tone: 'brass', label: 'Ready for Pickup' },
  fine_issued: { tone: 'danger', label: 'Fine Issued' },
};

const formatRelative = (iso) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-card border border-hairline bg-white hover:bg-paper"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" className="text-ink-muted" stroke="currentColor" />
          <path d="M13.73 21a2 2 0 01-3.46 0" className="text-ink-muted" stroke="currentColor" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-danger px-1 font-mono text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-card border border-hairline bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
            <p className="font-serif text-sm font-semibold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="font-mono text-xs text-brass hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-ink-muted">You're all caught up.</p>
            ) : (
              notifications.map((n) => {
                const meta = typeMeta[n.type] || { tone: 'neutral', label: n.type };
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.readAt && markRead(n.id)}
                    className={`block w-full border-b border-hairline px-4 py-3 text-left last:border-b-0 hover:bg-paper ${
                      n.readAt ? '' : 'bg-brass-light/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StampBadge tone={meta.tone}>{meta.label}</StampBadge>
                      <span className="font-mono text-[10px] text-ink-muted">{formatRelative(n.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink">{n.message}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}