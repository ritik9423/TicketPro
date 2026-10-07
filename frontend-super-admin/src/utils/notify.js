// Universal Real-World Real-Time Notification & Email Dispatcher for TicketPro Super Admin
import { sendNotificationEmail } from '../services/emailService';
import { cleanNotificationText } from './textUtils';

export const createNotification = ({
  title,
  message,
  type = 'GENERAL',
  link = '/dashboard',
  targetRole = 'SUPER_ADMIN',
  tenantId = 'GLOBAL',
  recipientEmail
}) => {
  const newNotif = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    tenantId: tenantId,
    title: cleanNotificationText(title) || 'Real-Time System Notification',
    message: cleanNotificationText(message) || '',
    type: type,
    read: false,
    createdAt: new Date().toISOString(),
    link: link,
    targetRole: targetRole
  };

  try {
    const key = `ticketpro_notifications_${tenantId}`;
    const globalKey = `ticketpro_notifications_GLOBAL`;

    // Save to tenant storage
    const storedTenant = localStorage.getItem(key);
    let tenantList = [];
    if (storedTenant) {
      try { tenantList = JSON.parse(storedTenant); } catch(e) {}
    }
    const updatedTenantList = [newNotif, ...tenantList];
    localStorage.setItem(key, JSON.stringify(updatedTenantList));

    // Also save to global storage if applicable
    if (tenantId !== 'GLOBAL') {
      const storedGlobal = localStorage.getItem(globalKey);
      let globalList = [];
      if (storedGlobal) {
        try { globalList = JSON.parse(storedGlobal); } catch(e) {}
      }
      localStorage.setItem(globalKey, JSON.stringify([newNotif, ...globalList]));
    }

    // Broadcast real-time events across windows & contexts
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('ticketpro_notification_event'));
    window.dispatchEvent(new CustomEvent('ticketpro_toast_trigger', { detail: newNotif }));

    // Auto-dispatch Email Notification Payload
    sendNotificationEmail({
      to: recipientEmail,
      title: newNotif.title,
      message: newNotif.message,
      link: newNotif.link,
      tenantId: tenantId
    });
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
  }

  return newNotif;
};
