import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications.api';
import { connectSocket, disconnectSocket } from './socket';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const { notifications: results, unreadCount: count } = await listMyNotifications({ limit: 20 });
      setNotifications(results);
      setUnreadCount(count);
    } catch {
      // Notifications are a convenience layer — a failed fetch here
      // shouldn't surface as an app-breaking error anywhere else.
    }
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    fetchNotifications();

    const socket = connectSocket();
    const handleIncoming = (incoming) => {
      setNotifications((prev) => [incoming, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);
    };
    socket?.on('notification', handleIncoming);

    return () => {
      socket?.off('notification', handleIncoming);
    };
  }, [user, fetchNotifications]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      // best effort; a stale read-state here is low-consequence
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // best effort
    }
  }, []);

  const value = { notifications, unreadCount, markRead, markAllRead, refetch: fetchNotifications };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};