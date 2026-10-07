import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  Ticket, 
  AlertTriangle, 
  Building, 
  ShieldCheck, 
  Sliders, 
  DollarSign, 
  MessageSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react';

const getToastIcon = (type) => {
  switch (type) {
    case 'TICKET_ASSIGNED':
    case 'TICKET_CREATED':
      return <Ticket className="h-5 w-5 text-indigo-400" />;
    case 'SLA_WARNING':
      return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    case 'COMPANY_ONBOARDING':
      return <Building className="h-5 w-5 text-emerald-400" />;
    case 'SYSTEM_ALERT':
      return <ShieldCheck className="h-5 w-5 text-rose-400" />;
    case 'FORM_PUBLISHED':
      return <Sliders className="h-5 w-5 text-purple-400" />;
    case 'BILLING':
      return <DollarSign className="h-5 w-5 text-blue-400" />;
    case 'TICKET_REPLY':
      return <MessageSquare className="h-5 w-5 text-teal-400" />;
    default:
      return <Sparkles className="h-5 w-5 text-indigo-400" />;
  }
};

const NotificationToast = ({ toasts = [], onCloseToast }) => {
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none font-sans select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-start space-x-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300 group"
        >
          <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
            {getToastIcon(toast.type)}
          </div>

          <div className="flex-1 space-y-1 text-left pr-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                {toast.tenantId ? `Real-Time • ${toast.tenantId}` : 'Real-Time Alert'}
              </span>
              <span className="text-[9.5px] font-bold text-slate-400">Just now</span>
            </div>

            <h4 className="text-xs font-black text-white leading-tight">{toast.title}</h4>
            <p className="text-[11px] font-medium text-slate-300 leading-snug line-clamp-2">{toast.message}</p>

            {toast.link && (
              <button
                type="button"
                onClick={() => {
                  if (toast.link) navigate(toast.link);
                  onCloseToast(toast.id);
                }}
                className="pt-1 text-[11px] font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer hover:underline"
              >
                <span>View Details</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onCloseToast(toast.id)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
