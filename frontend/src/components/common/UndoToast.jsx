import React, { useState, useEffect } from 'react';
import { Undo2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

let undoToastHandler = null;

export const triggerUndoableAction = (message, onUndo, timeoutMs = 6000) => {
  if (undoToastHandler) {
    undoToastHandler({ message, onUndo, timeoutMs });
  }
};

const UndoToast = () => {
  const [toast, setToast] = useState(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    undoToastHandler = ({ message, onUndo, timeoutMs = 6000 }) => {
      setToast({ message, onUndo, timeoutMs, id: Date.now() });
      setProgress(100);
    };

    return () => {
      undoToastHandler = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const interval = 50; // update progress every 50ms
    const step = (interval / toast.timeoutMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setToast(null);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast]);

  if (!toast) return null;

  const handleUndoClick = () => {
    if (toast && toast.onUndo) {
      toast.onUndo();
    }
    setToast(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 max-w-md flex flex-col gap-3 font-sans">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-100">{toast.message}</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              size="sm"
              onClick={handleUndoClick}
              className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-cyan-500 text-white text-xs font-black gap-1 cursor-pointer shadow-xs active:scale-95"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Undo</span>
            </Button>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Linear Progress Bar Countdown */}
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-cyan-500 h-full transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default UndoToast;
