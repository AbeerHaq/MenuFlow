import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';

const ProtectedRoute = ({ allowedRoles = null }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Spinner size="lg" className="text-brand-500" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Verifying session credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && user?.role) {
    if (!allowedRoles.includes(user.role)) {
      // Redirect based on role
      return user.role === 'admin' ? (
        <Navigate to="/admin/restaurants" replace />
      ) : (
        <Navigate to="/dashboard/orders" replace />
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;