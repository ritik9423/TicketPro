// Universal Real-World Multi-Recipient Email & Notification Dispatcher for TicketPro
import { sendNotificationEmail } from '../services/emailService';

export const createNotification = ({
  title,
  message,
  type = 'GENERAL',
  link = '/tickets',
  targetRole = 'COMPANY_ADMIN',
  tenantId = 'IOCL',
  recipientEmail,
  recipients = [],
  dispatchEmail = false
}) => {
  const newNotif = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    tenantId: tenantId,
    title: title || 'Real-Time Notification',
    message: message || '',
    type: type,
    read: false,
    createdAt: Date.now(),
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
      try { tenantList = JSON.parse(storedTenant); } catch(_e) {}
    }
    
    // Deduplicate duplicate notifications within 2 seconds
    const isDuplicate = tenantList.some(n => n.title === newNotif.title && (Date.now() - new Date(n.createdAt).getTime()) < 2000);
    if (!isDuplicate) {
      const updatedTenantList = [newNotif, ...tenantList];
      localStorage.setItem(key, JSON.stringify(updatedTenantList));

      // Also save to global storage if applicable
      if (tenantId !== 'GLOBAL') {
        const storedGlobal = localStorage.getItem(globalKey);
        let globalList = [];
        if (storedGlobal) {
          try { globalList = JSON.parse(storedGlobal); } catch(_e) {}
        }
        localStorage.setItem(globalKey, JSON.stringify([newNotif, ...globalList]));
      }

      // Broadcast real-time events across windows & contexts
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('ticketpro_notification_event'));
      window.dispatchEvent(new CustomEvent('ticketpro_toast_trigger', { detail: newNotif }));
    }

    // Compile list of unique recipient emails
    const targetEmails = new Set();
    if (recipientEmail) targetEmails.add(recipientEmail);
    if (Array.isArray(recipients)) {
      recipients.forEach(email => { if (email) targetEmails.add(email); });
    }

    // Only dispatch external email if explicitly requested and valid recipient is present (Backend services handle authoritative transactional emails)
    if (dispatchEmail && targetEmails.size > 0) {
      targetEmails.forEach(email => {
        if (email && email.includes('@') && !email.endsWith('@test.com') && !email.endsWith('@example.com')) {
          sendNotificationEmail({
            to: email,
            title: newNotif.title,
            message: newNotif.message,
            link: newNotif.link,
            tenantId: tenantId
          });
        }
      });
    }

  } catch (err) {
    console.error('Failed to dispatch notification:', err);
  }

  return newNotif;
};
