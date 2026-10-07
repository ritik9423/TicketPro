import React, { useEffect } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

/**
 * Ultra-clean, minimal confirmation modal for delete actions.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  message = '',
  itemName = '',
  itemSubtext = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'primary' | 'blue'
  isLoading = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isBlue = type === 'blue' || type === 'primary';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 fade-in duration-150 text-left">
        
        {/* Top Accent Stripe */}
        <div className={`h-1.5 w-full ${
          isBlue ? 'bg-[#362f9d]' :
          isDanger ? 'bg-rose-600' : 
          'bg-amber-500'
        }`} />

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 ${
                isBlue ? 'bg-indigo-50 text-[#362f9d]' :
                isDanger ? 'bg-rose-50 text-rose-600' : 
                'bg-amber-50 text-amber-600'
              }`}>
                {isDanger ? <Trash2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Simple Item Name Badge / Message */}
          <div className="space-y-2">
            {itemName && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center space-x-2.5">
                <span className="text-xs font-black text-[#362f9d]">📌</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{itemName}</p>
                  {itemSubtext && (
                    <p className="text-[11px] text-slate-500 truncate">{itemSubtext}</p>
                  )}
                </div>
              </div>
            )}

            {message && (
              <p className="text-xs text-slate-500 font-medium px-1">
                {message}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#362f9d] text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {cancelText}
            </button>
            
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer flex items-center space-x-1.5 active:scale-95 transition-all ${
                isBlue
                  ? 'bg-[#362f9d] hover:bg-[#2e2a85]'
                  : isDanger 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConfirmModal;
