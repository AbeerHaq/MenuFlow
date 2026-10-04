import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load persistent session from localStorage on initial render
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('menuflow_token');
        const storedUser = localStorage.getItem('menuflow_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token against server /api/auth/me
          try {
            const res = await authService.getMe();
            if (res.success && res.user) {
              setUser(res.user);
              if (res.restaurant) {
                setRestaurant(res.restaurant);
              }
              localStorage.setItem('menuflow_user', JSON.stringify(res.user));
            }
          } catch (err) {
            console.warn('Session verification error:', err.message);
          }
        }
      } catch (error) {
        console.error('Failed to parse stored auth session:', error);
        localStorage.removeItem('menuflow_token');
        localStorage.removeItem('menuflow_user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    if (res.success && res.token) {
      const authToken = res.token;
      const userData = res.user;

      setToken(authToken);
      setUser(userData);
      if (res.restaurant) {
        setRestaurant(res.restaurant);
      }

      localStorage.setItem('menuflow_token', authToken);
      localStorage.setItem('menuflow_user', JSON.stringify(userData));
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.success && res.token) {
      const authToken = res.token;
      const userObj = res.user;

      setToken(authToken);
      setUser(userObj);
      if (res.restaurant) {
        setRestaurant(res.restaurant);
      }

      localStorage.setItem('menuflow_token', authToken);
      localStorage.setItem('menuflow_user', JSON.stringify(userObj));
    }
    return res;
  };

  const logout = () => {
    setUser(null);
    setRestaurant(null);
    setToken(null);
    localStorage.removeItem('menuflow_token');
    localStorage.removeItem('menuflow_user');
  };

  const value = {
    user,
    restaurant,
    token,
    loading,
    isAuthenticated: !!token,
    role: user?.role || 'owner',
    isAdmin: user?.role === 'admin',
    isOwner: user?.role === 'owner',
    login,
    register,
    logout,
    setUser,
    setRestaurant,
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