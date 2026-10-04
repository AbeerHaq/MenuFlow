import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';

// Layouts
import OwnerLayout from './components/layout/OwnerLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Owner Pages
import DashboardPage from './pages/owner/DashboardPage';
import LiveOrdersPage from './pages/owner/LiveOrdersPage';
import CategoriesPage from './pages/owner/CategoriesPage';
import MenuPage from './pages/owner/MenuPage';
import TablesPage from './pages/owner/TablesPage';
import SettingsPage from './pages/owner/SettingsPage';

// Admin Pages
import AdminRestaurantsPage from './pages/admin/AdminRestaurantsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';

// Customer Pages
import CustomerMenuPage from './pages/customer/CustomerMenuPage';
import OrderTrackingPage from './pages/customer/OrderTrackingPage';

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '16px',
                background: '#0f172a',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
              },
            }}
          />
          <Routes>
            {/* 1. Public Customer Routes */}
            {/* PRD Specified Route: /r/:slug/t/:token */}
            <Route path="/r/:slug/t/:token" element={<CustomerMenuPage />} />
            {/* Fallback alias */}
            <Route path="/menu/:tableId" element={<CustomerMenuPage />} />
            {/* PRD Specified Route: /order/:orderId */}
            <Route path="/order/:orderId" element={<OrderTrackingPage />} />

            {/* 2. Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            {/* 3. Protected Owner Dashboard Routes */}
            <Route element={<ProtectedRoute allowedRoles={['owner', 'admin']} />}>
              <Route element={<OwnerLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/orders" element={<LiveOrdersPage />} />
                <Route path="/dashboard/categories" element={<CategoriesPage />} />
                <Route path="/dashboard/menu" element={<MenuPage />} />
                <Route path="/dashboard/tables" element={<TablesPage />} />
                <Route path="/dashboard/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* 4. Protected Admin Portal Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/restaurants" replace />} />
                <Route path="/admin/restaurants" element={<AdminRestaurantsPage />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              </Route>
            </Route>

            {/* Root & Catch-all Redirects */}
            <Route path="/" element={<Navigate to="/dashboard/orders" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/orders" replace />} />
          </Routes>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;