import React, { useState, useEffect } from 'react';
import { Mail, X, CheckCircle, Eye } from 'lucide-react';

const EmailOutboxPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [previewEmail, setPreviewEmail] = useState(null);

  const loadEmails = () => {
    try {
      const stored = localStorage.getItem('ticketpro_sent_emails');
      if (stored) {
        setEmails(JSON.parse(stored) || []);
      } else {
        setEmails([]);
      }
    } catch (_e) {}
  };

  useEffect(() => {
    loadEmails();
    window.addEventListener('storage', loadEmails);
    window.addEventListener('ticketpro_toast_trigger', loadEmails);
    return () => {
      window.removeEventListener('storage', loadEmails);
      window.removeEventListener('ticketpro_toast_trigger', loadEmails);
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-2xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-cyan-700 transition-all cursor-pointer border border-slate-200 shadow-xs"
        title="View Dispatched Email Sent-Box"
        aria-label="View dispatched emails"
      >
        <Mail className="h-5 w-5 text-cyan-700" />
        {emails.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white shadow-xs">
            {emails.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3.5 top-[60px] max-h-[calc(100vh-80px)] w-auto sm:w-96 sm:max-w-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 rounded-3xl bg-white p-4 shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-cyan-700" />
                <h3 className="text-xs font-black text-slate-900 tracking-tight">Sent Email Notifications ({emails.length})</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            {emails.length === 0 ? (
              <div className="py-8 text-center">
                <Mail className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No emails dispatched yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Submit a new ticket to trigger real-time email dispatch.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 max-h-80">
                {emails.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPreviewEmail(item)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-bold text-cyan-700 truncate max-w-[170px]">{item.to}</span>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0 ml-1">
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-cyan-700 transition-colors">
                      {item.subject}
                    </h4>
                    <div className="mt-2 flex items-center justify-between text-[9.5px] font-bold text-emerald-600">
                      <span className="flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3 shrink-0" />
                        <span>SMTP Payload Sent</span>
                      </span>
                      <span className="text-cyan-700 flex items-center space-x-0.5 group-hover:underline">
                        <span>Preview HTML</span>
                        <Eye className="h-3 w-3 shrink-0 ml-0.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* HTML Email Body Modal Preview */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 select-text animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4 mb-3 sm:mb-4 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700">DISPATCHED EMAIL PAYLOAD</span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">{previewEmail.subject}</h3>
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Recipient: <strong className="text-slate-800">{previewEmail.to}</strong></p>
              </div>
              <button onClick={() => setPreviewEmail(null)} className="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-slate-100 cursor-pointer shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-2 sm:p-4 rounded-2xl border border-slate-200 min-h-0">
              <iframe
                title="Email Body Preview"
                srcDoc={previewEmail.body}
                className="w-full h-[300px] sm:h-[400px] rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs shrink-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">Sent At: {new Date(previewEmail.sentAt).toLocaleString()}</span>
              <button
                onClick={() => setPreviewEmail(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white font-bold hover:opacity-90 transition-opacity cursor-pointer text-center"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailOutboxPopover;
