import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, Lock, LogIn, Shield, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Spinner from '../../components/ui/Spinner';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const executeLogin = async (credentials) => {
    setLoading(true);
    try {
      const res = await login(credentials);
      if (res.success || res.token) {
        toast.success('Signed in successfully!');
        const role = res.user?.role || 'owner';
        if (role === 'admin') {
          navigate('/admin/restaurants');
        } else {
          navigate('/dashboard/orders');
        }
      } else {
        toast.error(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await executeLogin(formData);
  };

  const handleFillDemo = (email, password) => {
    setFormData({ email, password });
    executeLogin({ email, password });
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your restaurant orders and menus">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormInput
          label="Email Address"
          type="email"
          name="email"
          placeholder="owner@menuflow.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          icon={Mail}
          autoComplete="email"
        />

        <div>
          <FormInput
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={Lock}
            autoComplete="current-password"
          />
          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 text-white font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </>
          )}
        </button>

        {/* Quick Demo Credentials Autofill */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
            Quick Demo Autofill
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('owner@menuflow.com', 'password123')}
              className="p-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Demo Owner</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('admin@menuflow.com', 'admin123')}
              className="p-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Demo Admin</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-bold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
          >
            Register your restaurant
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;