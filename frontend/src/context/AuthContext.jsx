import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';

const AuthContext = createContext(null);

const colorsMap = {
  indigo: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#8b5cf6', 600: '#4f46e5', 700: '#362f9d', 800: '#2e2a85', 900: '#1e1b4b', 950: '#0f172a'
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22'
  },
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554'
  },
  crimson: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519'
  },
  orange: {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
    500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407'
  }
};

const applyTheme = (colorName) => {
  const selectedTheme = colorsMap[colorName] || colorsMap.indigo;
  Object.keys(selectedTheme).forEach(key => {
    document.documentElement.style.setProperty(`--primary-${key}`, selectedTheme[key]);
  });
  document.documentElement.style.setProperty(`--primary-main`, selectedTheme[600]);
  document.documentElement.style.setProperty(`--primary-dark`, selectedTheme[700]);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // sessionStorage provides isolated per-tab sessions (prevents tab overwriting between Admin/Agent/User)
    const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed;
      } catch (_e) {}
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token && !user) {
      try {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        }
      } catch (_e) {}
    }
  }, [user]);

  // Establish Real-Time STOMP WebSocket Connection across devices
  useEffect(() => {
    if (user) {
      wsService.connect(user.companyCode || 'GLOBAL', user.email);
    } else {
      wsService.disconnect();
    }
    return () => {
      wsService.disconnect();
    };
  }, [user]);

  // LIVE BACKGROUND SYNC WITH SUPER ADMIN / BACKEND CHANGES
  const syncCompanyState = useCallback(async () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token || !user?.companyId) return;
    // Only admins have access to /companies/:id; END_USER and AGENT must not poll this
    if (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN') return;

    try {
      const companyData = await api.get(`/companies/${user.companyId}`);
      if (companyData && companyData.status && companyData.status !== 'ACTIVE') {
        // Only if company was explicitly marked non-active by Super Admin
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login?error=company_inactive';
        return;
      }
      if (!companyData) return;

      let hasChanges = false;
      let updatedUser = { ...user };

      if (companyData.companyName && companyData.companyName !== user.companyName) {
        updatedUser.companyName = companyData.companyName;
        hasChanges = true;
      }

      if (companyData.logoUrl && companyData.logoUrl !== user.logoUrl) {
        updatedUser.logoUrl = companyData.logoUrl;
        updatedUser.avatarUrl = companyData.logoUrl;
        hasChanges = true;
      }

      if (companyData.customFields) {
        try {
          const custom = JSON.parse(companyData.customFields);
          if (custom.primaryColor && custom.primaryColor !== user.primaryColor) {
            updatedUser.primaryColor = custom.primaryColor;
            hasChanges = true;
          }
        } catch (_e) {}
      }

      if (hasChanges) {
        setUser(updatedUser);
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (_err) {
      // If endpoint returns 404 or 400 (company deleted in super admin), log out
      if (_err?.status === 404 || _err?.status === 400) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login?error=company_deleted';
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    syncCompanyState();

    const interval = setInterval(syncCompanyState, 20000);
    const handleFocus = () => syncCompanyState();

    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, syncCompanyState]);

  useEffect(() => {
    if (user?.companyCode) {
      const codeUpper = user.companyCode.toUpperCase();
      const storedTheme = localStorage.getItem(`theme_config_${codeUpper}`) || localStorage.getItem(`ticketpro_company_theme_${codeUpper}`);
      if (storedTheme) {
        applyTheme(storedTheme);
      } else {
        applyTheme('indigo');
      }

      const tenantLogo = localStorage.getItem(`ticketpro_company_logo_${codeUpper}`) || user.logoUrl || '';

      if (tenantLogo && (user.logoUrl !== tenantLogo || user.avatarUrl !== tenantLogo)) {
        const updatedUser = { ...user, logoUrl: tenantLogo, avatarUrl: tenantLogo };
        setUser(updatedUser);
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } else {
      applyTheme('indigo');
    }
  }, [user?.companyCode, user?.logoUrl, user?.avatarUrl, user]);

  const login = async (email, password, companyCode) => {
    setLoading(true);
    // Clear current tab session to guarantee clean slate
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    cleanupLegacyTicketCache();
    setUser(null);

    try {
      const emailLower = (email || '').toLowerCase().trim();
      const payload = { email: emailLower, password };
      if (companyCode && companyCode.trim()) {
        payload.companyCode = companyCode.trim();
      }
      const data = await api.post('/auth/login', payload);

      if (!data || (!data.token && !data.userId && !data.id)) {
        throw new Error('Invalid email address or password.');
      }

      if ((data.role || '').toUpperCase() === 'SUPER_ADMIN') {
        throw new Error('SUPER_ADMIN_PORTAL_ONLY');
      }

      const userProfile = {
        id: data.userId || data.id || Date.now(),
        name: data.name || emailLower.split('@')[0],
        email: data.email || emailLower,
        role: (data.role || 'USER').toUpperCase(),
        department: data.department || 'Management',
        companyId: data.companyId || null,
        companyName: data.companyName || (data.role === 'SUPER_ADMIN' ? 'Platform Root' : 'Corporate Workspace'),
        companyCode: (data.companyCode || (data.role === 'SUPER_ADMIN' ? 'SUPER' : 'DEFAULT')).toUpperCase(),
        logoUrl: data.logoUrl || '',
        avatarUrl: data.logoUrl || '',
        primaryColor: data.primaryColor || '#362f9d'
      };

      if (data.token) {
        sessionStorage.setItem('token', data.token);
      }
      sessionStorage.setItem('user', JSON.stringify(userProfile));
      setUser(userProfile);
      setLoading(false);
      return userProfile;
    } catch (err) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setUser(null);
      setLoading(false);
      const errText = err.message || 'Invalid email address or password.';
      throw new Error(errText);
    }
  };

  const cleanupLegacyTicketCache = () => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ticketpro_tickets_') || key === 'ticketpro_all_tickets' || key.startsWith('tp_dash_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  };

  useEffect(() => {
    cleanupLegacyTicketCache();
  }, []);

  const logout = useCallback(() => {
    wsService.disconnect();
    try {
      sessionStorage.clear();
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    cleanupLegacyTicketCache();
    setUser(null);
  }, []);

  const updateUserProfile = (updates) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      ...updates,
      role: user.role || 'COMPANY_ADMIN',
      companyId: user.companyId || Date.now(),
      companyName: updates.companyName || user.companyName,
      companyCode: user.companyCode,
      logoUrl: updates.logoUrl !== undefined && updates.logoUrl !== '' ? updates.logoUrl : user.logoUrl,
      avatarUrl: updates.avatarUrl !== undefined && updates.avatarUrl !== '' ? updates.avatarUrl : user.avatarUrl,
      primaryColor: user.primaryColor || '#362f9d'
    };
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateUserLogo = (newLogoUrl) => {
    if (!user) return;
    const updatedUser = { ...user, logoUrl: newLogoUrl, avatarUrl: newLogoUrl };
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateUserTheme = (newColorName) => {
    if (!user || !user.companyCode) return;
    applyTheme(newColorName);
    localStorage.setItem(`theme_config_${user.companyCode}`, newColorName);
  };

  return (
    <AuthContext.Provider
      value={
        {
          user,
          loading,
          isAuthenticated: !!user,
          login,
          logout,
          updateUserProfile,
          updateUserLogo,
          updateUserTheme,
          updateLocalTheme: updateUserTheme,
          syncCompanyState
        }
      }
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
