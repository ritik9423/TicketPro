import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const INACTIVITY_TIMEOUT_MS = 25 * 60 * 1000; // 25 Minutes idle threshold
const WARNING_COUNTDOWN_SECONDS = 60; // 60s countdown dialog

const SessionTimeoutModal = () => {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN_SECONDS);
  const lastActivityRef = useRef(Date.now());
  const countdownIntervalRef = useRef(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setCountdown(WARNING_COUNTDOWN_SECONDS);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
  }, [showWarning]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleEvent = () => {
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach(e => window.addEventListener(e, handleEvent, { passive: true }));

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= INACTIVITY_TIMEOUT_MS && !showWarning) {
        setShowWarning(true);
        setCountdown(WARNING_COUNTDOWN_SECONDS);
      }
    }, 15000);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleEvent));
      clearInterval(interval);
    };
  }, [user, showWarning]);

  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            sessionStorage.setItem('ticketpro_session_expired', 'Super Admin session timed out due to 25 minutes of inactivity.');
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [showWarning, logout]);

  if (!user || !showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-800 text-center space-y-5 animate-in zoom-in-95 font-sans">
        <div className="h-16 w-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-amber-500/30">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">Super Admin Session Timeout</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Due to 25 minutes of inactivity, your Super Admin session will automatically terminate in:
          </p>
        </div>

        <div className="py-3 px-6 bg-slate-800 rounded-2xl border border-slate-700 inline-block">
          <span className="text-3xl font-mono font-black text-amber-400">
            00:{countdown < 10 ? `0${countdown}` : countdown}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={resetTimer}
            className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-10 px-5 gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Stay Active</span>
          </Button>

          <Button
            variant="outline"
            onClick={logout}
            className="rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:text-rose-400 font-bold text-xs h-10 px-4 gap-1.5 cursor-pointer"
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
