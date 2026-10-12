import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('symptomlog_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('symptomlog_token'));
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('symptomlog_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('symptomlog_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('symptomlog_theme', 'light');
    }
  }, [darkMode]);

  // Multi-tab storage sync
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'symptomlog_token') {
        setToken(e.newValue);
      } else if (e.key === 'symptomlog_user') {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      } else if (e.key === 'symptomlog_theme') {
        setDarkMode(e.newValue === 'dark');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync current user on init
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await authApi.me();
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('symptomlog_user', JSON.stringify(res.data.user));
            if (res.data.user.dark_mode !== undefined) {
              setDarkMode(Boolean(res.data.user.dark_mode));
            }
          }
        } catch (err) {
          console.warn('Auth check token expired or invalid:', err);
          setToken(null);
          setUser(null);
          localStorage.removeItem('symptomlog_token');
          localStorage.removeItem('symptomlog_user');
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('symptomlog_token', receivedToken);
    localStorage.setItem('symptomlog_user', JSON.stringify(receivedUser));
    if (receivedUser.dark_mode !== undefined) {
      setDarkMode(Boolean(receivedUser.dark_mode));
    }
    return receivedUser;
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('symptomlog_token', receivedToken);
    localStorage.setItem('symptomlog_user', JSON.stringify(receivedUser));
    return receivedUser;
  };

  const logout = () => {
    authApi.logout().catch(() => { /* refresh cookie may already be expired, ignore */ });
    setToken(null);
    setUser(null);
    localStorage.removeItem('symptomlog_token');
    localStorage.removeItem('symptomlog_user');
  };

  const updateProfile = async (data) => {
    const res = await authApi.updateProfile(data);
    if (res.data?.user) {
      setUser(res.data.user);
      localStorage.setItem('symptomlog_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const toggleDarkMode = async () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (user) {
      try {
        await authApi.toggleDarkMode(nextMode);
      } catch (e) {
        console.error('Failed to sync dark mode to backend:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        darkMode,
        login,
        register,
        logout,
        updateProfile,
        toggleDarkMode,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
