import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await login(formData);
      if (res.success || res.token) {
        toast.success('Logged in successfully!');
        navigate('/dashboard');
      } else {
        toast.error(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      const msg = !err.response
        ? 'Cannot reach the server. Make sure the backend is running on http://localhost:5000'
        : err.response?.data?.message || 'Invalid email or password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your restaurant menu and orders">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormInput
          label="Email Address"
          type="email"
          name="email"
          placeholder="owner@restaurant.com"
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
              className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
          >
            Register your restaurant
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;