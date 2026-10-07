import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Ticket, 
  AlertTriangle, 
  Building, 
  ShieldCheck, 
  Sliders, 
  DollarSign, 
  Clock, 
  MessageSquare,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

export const cleanNotificationText = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  if (!text.includes('<')) return text.trim();
  
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<\/tr>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const formatTimeAgo = (isoDate) => {
  if (!isoDate) return 'Just now';
  let targetTime;
  if (typeof isoDate === 'number') {
    targetTime = isoDate;
  } else if (!isNaN(isoDate) && !isNaN(parseFloat(isoDate)) && isFinite(isoDate)) {
    targetTime = Number(isoDate);
  } else {
    targetTime = new Date(isoDate).getTime();
  }

  if (isNaN(targetTime)) return 'Just now';

  const nowTime = Date.now();
  const diffMs = nowTime - targetTime;

  if (diffMs < 60000) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'SLA_BREACH':
    case 'SLA_WARNING':
      return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    case 'TICKET_ASSIGNED':
      return <Ticket className="h-4 w-4 text-blue-600" />;
    case 'TICKET_STATUS_CHANGED':
      return <Sliders className="h-4 w-4 text-amber-600" />;
    case 'TICKET_CREATED':
      return <Building className="h-4 w-4 text-emerald-600" />;
    case 'SECURITY_ALERT':
      return <ShieldCheck className="h-4 w-4 text-purple-600" />;
    case 'REFUND_PROCESSED':
      return <DollarSign className="h-4 w-4 text-teal-600" />;
    case 'NEW_COMMENT':
      return <MessageSquare className="h-4 w-4 text-cyan-600" />;
    default:
      return <Bell className="h-4 w-4 text-slate-600" />;
  }
};

const NotificationPopover = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    soundEnabled, 
    toggleSound, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll 
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const isItemRead = (n) => n.read === true || n.isRead === true;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !isItemRead(n);
    return true;
  });

  const handleItemClick = (notif) => {
    if (!isItemRead(notif)) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative rounded-full p-2 sm:p-2.5 transition-all cursor-pointer ${
          isOpen 
            ? 'bg-cyan-50 text-cyan-700' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" />

        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex h-3.5 sm:h-4 min-w-[14px] sm:min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8.5px] sm:text-[9px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Drawer */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3.5 top-[60px] max-h-[calc(100vh-80px)] w-auto sm:w-96 sm:max-w-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2.5 rounded-3xl bg-white shadow-2xl border border-slate-200/90 z-50 overflow-hidden text-left font-sans flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Popover Header */}
            <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Audio Chime Mute/Unmute Toggle Button */}
                <button
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? "Audio chime active (Click to mute)" : "Audio chime muted (Click to enable)"}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    soundEnabled
                      ? 'text-cyan-600 hover:bg-cyan-100/70 bg-cyan-50'
                      : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600 bg-slate-100'
                  }`}
                  aria-label="Toggle audio notification chime"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] font-extrabold text-cyan-700 hover:text-cyan-900 flex items-center space-x-1 hover:underline cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Mark all read</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications panel"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 pt-2 border-b border-slate-100 flex items-center space-x-4 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'border-cyan-600 text-cyan-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                All ({notifications.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'unread'
                    ? 'border-cyan-600 text-cyan-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notifications Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 max-h-[55vh] sm:max-h-80">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => {
                  const readStatus = isItemRead(notif);
                  const cleanMessage = cleanNotificationText(notif.message);
                  const cleanTitle = cleanNotificationText(notif.title);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-3 sm:p-3.5 transition-all cursor-pointer flex items-start space-x-2.5 sm:space-x-3 group relative ${
                        !readStatus 
                          ? 'bg-cyan-50/40 hover:bg-cyan-50/80 font-medium' 
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {/* Icon Badge */}
                      <div className={`p-2 sm:p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                        !readStatus ? 'bg-cyan-100/70 border border-cyan-200/60' : 'bg-slate-100'
                      }`}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Body Content */}
                      <div className="flex-1 min-w-0 space-y-1 pr-5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black leading-tight truncate block ${!readStatus ? 'text-slate-900' : 'text-slate-700'}`}>
                            {cleanTitle}
                          </span>
                        </div>

                        <p className="text-[11px] font-semibold text-slate-500 leading-snug line-clamp-2">
                          {cleanMessage}
                        </p>

                        <div className="flex items-center space-x-2 pt-0.5 text-[9.5px] font-bold text-slate-400">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatTimeAgo(notif.createdAt)}</span>
                          {!readStatus && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-600 shrink-0"></span>
                          )}
                        </div>
                      </div>

                      {/* Hover / Tap Delete Action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 sm:text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center space-y-2">
                  <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">No notifications found</p>
                  <p className="text-[10px] text-slate-400">You are all caught up!</p>
                </div>
              )}
            </div>

            {/* Popover Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] shrink-0">
                <span className="text-slate-400 font-semibold truncate max-w-[160px]">
                  Tenant ID: {notifications[0]?.tenantId || 'SYSTEM'}
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-extrabold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPopover;
