import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-xl max-h-[90vh] sm:max-h-[88vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 transition-all border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 bg-white">
          <h3 className="text-sm sm:text-lg font-black text-gray-900 tracking-tight truncate pr-2">{title}</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="rounded-xl p-1.5 sm:p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {children}
        </div>

      </div>
    </div>
  );
};

export default Modal;
