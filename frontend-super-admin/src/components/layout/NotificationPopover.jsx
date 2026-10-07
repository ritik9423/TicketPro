import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Bell, 
  Check, 
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
  X,
  ExternalLink
} from 'lucide-react';
import { cleanNotificationText } from '../../utils/textUtils';

const formatTimeAgo = (isoDate) => {
  if (!isoDate) return 'Just now';
  const diffMs = new Date() - new Date(isoDate);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'TICKET_ASSIGNED':
      return <Ticket className="h-4 w-4 text-indigo-600" />;
    case 'SLA_WARNING':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'COMPANY_ONBOARDING':
      return <Building className="h-4 w-4 text-emerald-600" />;
    case 'SYSTEM_ALERT':
      return <ShieldCheck className="h-4 w-4 text-rose-500" />;
    case 'FORM_PUBLISHED':
      return <Sliders className="h-4 w-4 text-purple-600" />;
    case 'BILLING':
      return <DollarSign className="h-4 w-4 text-blue-600" />;
    case 'TICKET_REPLY':
      return <MessageSquare className="h-4 w-4 text-teal-600" />;
    default:
      return <Bell className="h-4 w-4 text-slate-500" />;
  }
};

const NotificationPopover = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll,
    soundEnabled,
    toggleSound
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read;
    return true;
  });

  const handleItemClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative rounded-full p-2.5 transition-all cursor-pointer ${
          isOpen 
            ? 'bg-indigo-50 text-[#362f9d]' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3.5 top-[64px] max-h-[calc(100vh-80px)] w-auto sm:w-96 sm:max-w-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2.5 rounded-3xl bg-white shadow-2xl border border-slate-200/90 z-50 overflow-hidden text-left font-sans flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Super Admin Alerts</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-[#362f9d] text-[10px] font-black">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Sound Mute/Unmute Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? "Audio alert active (Click to mute)" : "Audio alert muted (Click to enable)"}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'text-indigo-600 hover:bg-indigo-100/70 bg-indigo-50'
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
                  className="text-[11px] font-extrabold text-[#362f9d] hover:text-[#2a247e] flex items-center space-x-1 hover:underline cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-2 border-b border-slate-100 flex items-center space-x-4 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'border-[#362f9d] text-[#362f9d]'
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
                  ? 'border-[#362f9d] text-[#362f9d]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 transition-all cursor-pointer flex items-start space-x-3 group relative ${
                    !notif.read 
                      ? 'bg-indigo-50/40 hover:bg-indigo-50/80 font-medium' 
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                    !notif.read ? 'bg-indigo-100/70 border border-indigo-200/60' : 'bg-slate-100'
                  }`}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 space-y-1 pr-6">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black leading-tight ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>
                        {cleanNotificationText(notif.title)}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-slate-500 leading-snug line-clamp-2">
                      {cleanNotificationText(notif.message)}
                    </p>

                    <div className="flex items-center space-x-2 pt-0.5 text-[9.5px] font-bold text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(notif.createdAt)}</span>
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#362f9d]"></span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="absolute right-3 top-3 p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-600">No notifications found</p>
                <p className="text-[10px] text-slate-400 font-medium">You are all caught up!</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold">Scope: Platform Master</span>
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
