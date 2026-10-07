import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('superadmin_user');
    const storedToken = localStorage.getItem('superadmin_token');
    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role === 'SUPER_ADMIN') {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    const storedUser = localStorage.getItem('superadmin_user');
    if (token && storedUser && !user) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role === 'SUPER_ADMIN') {
          setUser(parsed);
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      }
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Direct API call to backend
      const data = await api.post('/auth/login', { email, password });
      
      if (!data || !data.token) {
        throw new Error('Authentication failed: No token received from server.');
      }

      if (data.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. This account does not have Super Admin privileges.');
      }

      const userProfile = {
        id: data.id || data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
        companyId: data.companyId || 0,
        companyName: data.companyName || 'Platform Master',
        companyCode: data.companyCode || 'GLOBAL',
        avatarUrl: data.avatarUrl || ''
      };

      localStorage.setItem('superadmin_token', data.token);
      localStorage.setItem('superadmin_user', JSON.stringify(userProfile));
      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem('superadmin_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser
      }}
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
