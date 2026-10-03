import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load persistent session from localStorage on initial render
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('menuflow_token');
      const storedUser = localStorage.getItem('menuflow_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse stored auth session:', error);
      localStorage.removeItem('menuflow_token');
      localStorage.removeItem('menuflow_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    if (res.success || res.token) {
      const authToken = res.token || res.data?.token;
      const userData = res.user || res.data?.user || { email: credentials.email, role: 'owner' };

      setToken(authToken);
      setUser(userData);

      localStorage.setItem('menuflow_token', authToken);
      localStorage.setItem('menuflow_user', JSON.stringify(userData));
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.success && res.token) {
      const authToken = res.token;
      const userObj = res.user || { name: userData.ownerName, email: userData.email, role: 'owner' };

      setToken(authToken);
      setUser(userObj);

      localStorage.setItem('menuflow_token', authToken);
      localStorage.setItem('menuflow_user', JSON.stringify(userObj));
    }
    return res;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('menuflow_token');
    localStorage.removeItem('menuflow_user');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    role: user?.role || 'owner',
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;