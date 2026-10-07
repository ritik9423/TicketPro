import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import AppRoutes from './routes/AppRoutes';

function App() {
  // Prevent browser from navigating to dropped file or reloading the window when a file is dragged from desktop
  useEffect(() => {
    const handleGlobalDragOver = (e) => {
      e.preventDefault();
    };
    const handleGlobalDrop = (e) => {
      // Allow native file input to receive dropped files directly
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'file') {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <CommandPalette />
            <NetworkStatusBanner />
            <SessionTimeoutModal />
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
