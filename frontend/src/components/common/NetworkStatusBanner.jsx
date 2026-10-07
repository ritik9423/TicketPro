import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CheckCircle2 } from 'lucide-react';

const NetworkStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
      {!isOnline ? (
        <div className="bg-rose-600 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 border border-rose-500 pointer-events-auto">
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span>You are currently offline. Local changes will sync when connected.</span>
        </div>
      ) : (
        <div className="bg-emerald-600 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 border border-emerald-500 pointer-events-auto">
          <CheckCircle2 className="h-4 w-4" />
          <span>Back online — Real-time live sync restored.</span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusBanner;
