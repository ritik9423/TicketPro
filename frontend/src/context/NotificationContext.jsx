import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import NotificationToast from '../components/common/NotificationToast';
import { audioNotifier } from '../utils/audioNotify';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => audioNotifier.isSoundEnabled());
  const lastToastRef = useRef({ text: '', time: 0 });

  const toggleSound = useCallback(() => {
    const next = audioNotifier.toggleSound();
    setSoundEnabled(next);
    return next;
  }, []);

  // Fetch scoped notifications via JWT
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const data = await api.get('/notifications').catch(() => null);
      const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
      setNotifications(list);
    } catch (_e) {
      // Handled silently
    }
  }, [user]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((notif) => {
    if (!notif || !notif.title) return;
    const toastKey = `${notif.title}`;
    const now = Date.now();
    
    // Suppress duplicates within 4 seconds
    if (lastToastRef.current.text === toastKey && (now - lastToastRef.current.time) < 4000) {
      return;
    }
    lastToastRef.current = { text: toastKey, time: now };

    const newToast = {
      id: 'toast_' + (notif.id || Date.now()) + '_' + Math.random().toString(36).substring(2, 5),
      title: notif.title || 'Notification',
      message: notif.message || '',
      type: notif.type || 'GENERAL',
      link: notif.link,
      tenantId: notif.tenantId
    };
    
    // Keep only ONE active toast on screen at any time to prevent stacking
    setToasts([newToast]);
    
    setTimeout(() => {
      removeToast(newToast.id);
    }, 4000);
  }, [removeToast]);

  // Request browser desktop notification permission when user is active
  useEffect(() => {
    if (user) {
      audioNotifier.requestPushPermission();
    }
  }, [user]);

  // Initial fetch and WebSocket Real-Time Subscription
  useEffect(() => {
    fetchNotifications();

    if (!user) {
      wsService.disconnect();
      return;
    }

    // Connect WebSocket with user credentials
    wsService.connect(user.companyCode, user.email);

    const unsubscribers = [];

    const handleIncomingNotif = (notif) => {
      if (!notif || !notif.id) return;
      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      showToast(notif);

      // Play audio chime based on notification severity
      const type = (notif.type || '').toUpperCase();
      if (type.includes('SLA') || type.includes('CRITICAL') || type.includes('URGENT')) {
        audioNotifier.playUrgentAlert();
      } else if (type.includes('ASSIGNED') || type.includes('TICKET_CREATED')) {
        audioNotifier.playAssignmentChime();
      } else {
        audioNotifier.playChime();
      }

      // If tab is in background or unfocused, trigger Desktop Notification & Flash Title
      if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
        audioNotifier.showSystemNotification(notif.title || 'TicketPro Update', {
          body: notif.message || 'You received a new support notification.',
          data: { link: notif.link || '/tickets' }
        });
        audioNotifier.flashTabTitle(`🔔 ${notif.title || 'New Notification!'}`);
      }
    };

    // Also handle incoming ticket broadcast for agents and admins
    const handleIncomingTicket = (ticket) => {
      if (!ticket || !ticket.id) return;

      const userRole = user?.role;
      const isStaff = userRole === 'SUPER_ADMIN' || userRole === 'COMPANY_ADMIN' || userRole === 'AGENT' || userRole === 'MANAGER';
      if (!isStaff) return;

      const isMyCreation = user && ticket.createdBy && String(ticket.createdBy.id) === String(user.id);
      if (isMyCreation) return;

      // Play chime
      if (ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH') {
        audioNotifier.playUrgentAlert();
      } else {
        audioNotifier.playAssignmentChime();
      }

      const ticketNum = ticket.ticketNumber || `#TK-${ticket.id}`;
      showToast({
        id: 'ticket_' + ticket.id + '_' + Date.now(),
        title: `Incoming Ticket: ${ticketNum}`,
        message: `${ticket.subject || 'New support request'} (${ticket.priority || 'NORMAL'})`,
        type: 'TICKET_CREATED',
        link: `/tickets/${ticket.id}`
      });

      if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
        audioNotifier.showSystemNotification(`New Ticket: ${ticketNum}`, {
          body: `${ticket.subject || 'Support issue logged'} - Priority: ${ticket.priority || 'MEDIUM'}`,
          data: { link: `/tickets/${ticket.id}` }
        });
        audioNotifier.flashTabTitle(`🔔 (New Ticket) ${ticketNum}`);
      }
    };

    // Subscribe to global notifications (SUPER_ADMIN only)
    if (user.role === 'SUPER_ADMIN') {
      unsubscribers.push(wsService.subscribe('/topic/notifications/GLOBAL', handleIncomingNotif));
      unsubscribers.push(wsService.subscribe('/topic/notifications/SUPER_ADMIN', handleIncomingNotif));
    }

    // Subscribe to tenant-scoped notifications
    if (user.companyCode) {
      const compCode = user.companyCode.toUpperCase();
      // Tenant general announcements
      unsubscribers.push(wsService.subscribe(`/topic/notifications/${compCode}`, handleIncomingNotif));

      // Role-specific channels
      if (user.role === 'COMPANY_ADMIN') {
        unsubscribers.push(wsService.subscribe(`/topic/notifications/${compCode}/admin`, handleIncomingNotif));
      } else if (user.role === 'AGENT' || user.role === 'MANAGER') {
        unsubscribers.push(wsService.subscribe(`/topic/notifications/${compCode}/agent`, handleIncomingNotif));
      }

      // ONLY internal support staff (Admin, Agent, Manager) subscribe to company ticket creation stream!
      // END_USER must NEVER subscribe to other users' ticket notifications!
      const isStaff = ['COMPANY_ADMIN', 'AGENT', 'MANAGER', 'SUPER_ADMIN'].includes(user.role);
      if (isStaff) {
        unsubscribers.push(wsService.subscribe(`/topic/tickets/${compCode}`, handleIncomingTicket));
      }
    }

    // Subscribe to user's private personal notification channel
    if (user.email) {
      unsubscribers.push(wsService.subscribe(`/topic/notifications/user/${user.email.toLowerCase()}`, handleIncomingNotif));
    }

    // Light fallback polling every 30s
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      unsubscribers.forEach(unsub => {
        try { unsub(); } catch (_e) {}
      });
      clearInterval(interval);
    };
  }, [user, fetchNotifications, showToast]);

  const markAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true, read: true } : n))
    );
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (_e) {}
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
    try {
      await api.put('/notifications/read-all');
    } catch (_e) {}
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch (_e) {}
  };

  const clearAll = async () => {
    setNotifications([]);
    try {
      await api.delete('/notifications/clear-all');
    } catch (_e) {}
  };

  const unreadCount = notifications.filter(n => !(n.isRead === true || n.read === true)).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        toggleSound,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refreshNotifications: fetchNotifications,
        showToast
      }}
    >
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <NotificationToast
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
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
