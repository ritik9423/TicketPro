import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import NetworkStatusBanner from './components/common/NetworkStatusBanner';
import SessionTimeoutModal from './components/common/SessionTimeoutModal';
import UndoToast from './components/common/UndoToast';
import AppRoutes from './routes/AppRoutes';
import { api } from './services/api';

function App() {
  // Global auto-sync for any offline or cached onboarding requests to the backend database
  useEffect(() => {
    const syncLocalOnboarding = async () => {
      try {
        const raw = localStorage.getItem('ticketpro_onboarding_requests');
        if (!raw) return;
        const list = JSON.parse(raw);
        if (!Array.isArray(list) || list.length === 0) return;

        let modified = false;
        for (const req of list) {
          if (req.syncedToBackend) continue;
          try {
            await api.post('/companies/register-request', {
              name: req.name || req.companyName,
              companyName: req.companyName || req.name,
              companyCode: req.companyCode,
              email: req.email,
              phone: req.phone || '+91 9999999999',
              website: req.website || ('https://' + (req.companyCode || 'comp').toLowerCase() + '.ticketpro.com'),
              address: req.address || 'Corporate Office',
              adminName: req.adminName || 'Company Admin',
              adminEmail: req.adminEmail,
              adminPhone: req.adminPhone || req.phone || '+91 9999999999',
              adminPassword: req.adminPassword || 'Admin@2026',
              logoUrl: req.logoUrl || '',
              customFields: typeof req.customFields === 'string' ? req.customFields : JSON.stringify(req.customFields || {})
            });
            req.syncedToBackend = true;
            modified = true;
          } catch (e) {
            console.warn('Sync cached onboarding request from App.jsx:', e);
          }
        }
        if (modified) {
          localStorage.setItem('ticketpro_onboarding_requests', JSON.stringify(list));
        }
      } catch (_e) {}
    };
    syncLocalOnboarding();
  }, []);

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
            <UndoToast />
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
