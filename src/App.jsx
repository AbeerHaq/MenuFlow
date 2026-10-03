import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context
import { AuthProvider } from './context/AuthContext';

// Layouts
import OwnerLayout from './components/layout/OwnerLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Owner Pages
import DashboardPage from './pages/owner/DashboardPage';
import CategoriesPage from './pages/owner/CategoriesPage';
import MenuPage from './pages/owner/MenuPage';
import TablesPage from './pages/owner/TablesPage';
import SettingsPage from './pages/owner/SettingsPage';

// Customer View
import CustomerMenuPage from './pages/customer/CustomerMenuPage';

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Public Customer Menu Route */}
        <Route path="/menu/:tableId" element={<CustomerMenuPage />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Protected Owner Routes
            ProtectedRoute and OwnerLayout both render <Outlet />, so they must be
            "layout routes" that wrap the child routes below. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<OwnerLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/categories" element={<CategoriesPage />} />
            <Route path="/dashboard/menu" element={<MenuPage />} />
            <Route path="/dashboard/tables" element={<TablesPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} /> 
          </Route>
        </Route>

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;