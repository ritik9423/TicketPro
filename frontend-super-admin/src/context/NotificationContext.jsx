import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { audioNotifier } from '../utils/audioNotify';
import { cleanNotificationText } from '../utils/textUtils';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => audioNotifier.isSoundEnabled());

  const sanitizeNotif = useCallback((n) => {
    if (!n) return n;
    return {
      ...n,
      title: cleanNotificationText(n.title),
      message: cleanNotificationText(n.message)
    };
  }, []);

  const toggleSound = useCallback(() => {
    const next = audioNotifier.toggleSound();
    setSoundEnabled(next);
    return next;
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const data = await api.get('/notifications').catch(() => null);
      const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
      const sanitizedList = list.map(sanitizeNotif);
      setNotifications(sanitizedList);
    } catch (_e) {}
  }, [user, sanitizeNotif]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((notif) => {
    const newToast = {
      id: 'toast_' + (notif.id || Date.now()),
      title: cleanNotificationText(notif.title) || 'Platform Notification',
      message: cleanNotificationText(notif.message) || '',
      type: notif.type || 'SYSTEM'
    };
    setToasts(prev => [newToast, ...prev.slice(0, 2)]);
    setTimeout(() => removeToast(newToast.id), 5000);
  }, [removeToast]);

  useEffect(() => {
    if (user) {
      audioNotifier.requestPushPermission();
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) {
      wsService.disconnect();
      return;
    }

    wsService.connect();

    const unsubscribers = [];

    const handleIncomingNotif = (rawNotif) => {
      if (!rawNotif || !rawNotif.id) return;
      const notif = sanitizeNotif(rawNotif);
      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      showToast(notif);

      const type = (notif.type || '').toUpperCase();
      if (type.includes('CRITICAL') || type.includes('SLA') || type.includes('ALERT')) {
        audioNotifier.playUrgentAlert();
      } else {
        audioNotifier.playChime();
      }

      if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
        audioNotifier.showSystemNotification(notif.title || 'Super Admin Alert', {
          body: notif.message || 'System platform activity received.',
          data: { link: notif.link || '/dashboard' }
        });
        audioNotifier.flashTabTitle(`🔔 ${notif.title || 'New Platform Alert'}`);
      }
    };

    unsubscribers.push(wsService.subscribe('/topic/notifications/GLOBAL', handleIncomingNotif));
    unsubscribers.push(wsService.subscribe('/topic/notifications/SUPER_ADMIN', handleIncomingNotif));

    if (user.email) {
      unsubscribers.push(wsService.subscribe(`/topic/notifications/user/${user.email.toLowerCase()}`, handleIncomingNotif));
    }

    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      unsubscribers.forEach(unsub => {
        try { unsub(); } catch (_e) {}
      });
      clearInterval(interval);
    };
  }, [user, fetchNotifications, showToast]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (_e) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (_e) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        toggleSound,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
        showToast
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-semibold max-w-sm">
              <p className="font-bold text-indigo-400">{cleanNotificationText(toast.title)}</p>
              <p className="text-slate-300 mt-0.5">{cleanNotificationText(toast.message)}</p>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
