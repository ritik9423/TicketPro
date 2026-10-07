import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const INACTIVITY_TIMEOUT_MS = 25 * 60 * 1000; // 25 Minutes idle threshold
const WARNING_COUNTDOWN_SECONDS = 60; // 60s countdown dialog

const SessionTimeoutModal = () => {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN_SECONDS);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setCountdown(WARNING_COUNTDOWN_SECONDS);
  }, []);

  const handleManualLogout = useCallback(() => {
    setShowWarning(false);
    logout();
  }, [logout]);

  // Track user interaction events to refresh inactivity timestamp
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      setCountdown(WARNING_COUNTDOWN_SECONDS);
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleEvent = () => {
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach((e) => window.addEventListener(e, handleEvent, { passive: true }));

    // Periodic check for inactivity threshold
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= INACTIVITY_TIMEOUT_MS && !showWarning) {
        setCountdown(WARNING_COUNTDOWN_SECONDS);
        setShowWarning(true);
      }
    }, 15000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleEvent));
      clearInterval(interval);
    };
  }, [user, showWarning]);

  // Pure countdown timer tick (NO side-effects inside state updater!)
  useEffect(() => {
    if (!showWarning) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning]);

  // Trigger logout safely in a post-render effect when countdown expires
  useEffect(() => {
    if (showWarning && countdown === 0) {
      setShowWarning(false);
      sessionStorage.setItem('ticketpro_session_expired', 'Your session timed out due to 25 minutes of inactivity.');
      logout();
    }
  }, [showWarning, countdown, logout]);

  if (!user || !showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95 font-sans">
        <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900">Session Inactivity Warning</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            You have been inactive for a while. For enterprise data security, you will be automatically logged out in:
          </p>
        </div>

        <div className="py-3 px-6 bg-amber-50 rounded-2xl border border-amber-200 inline-block">
          <span className="text-3xl font-mono font-black text-amber-700">
            00:{countdown < 10 ? `0${countdown}` : countdown}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={resetTimer}
            className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-10 px-5 gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Stay Logged In</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleManualLogout}
            className="rounded-xl border-slate-200 text-slate-600 hover:text-rose-600 font-bold text-xs h-10 px-4 gap-1.5 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
