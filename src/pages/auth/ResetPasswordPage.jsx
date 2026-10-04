import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Lock, KeyRound } from 'lucide-react';
import authService from '../../services/authService';
import AuthLayout from '../../components/layout/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Spinner from '../../components/ui/Spinner';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await authService.resetPassword(token, password);
      if (res.success || res.status === 'success') {
        toast.success('Password reset successfully! Please log in.');
        navigate('/login');
      } else {
        toast.error(res.message || 'Failed to reset password.');
      }
    } catch (err) {
      toast.error(
        !err.response
          ? 'Cannot reach the server. Make sure the backend is running on http://localhost:5000'
          : err.response?.data?.message || 'Invalid or expired token.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Enter your new password below to recover access"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormInput
          label="New Password"
          type="password"
          name="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
          }}
          error={errors.password}
          icon={Lock}
        />

        <FormInput
          label="Confirm New Password"
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword)
              setErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }}
          error={errors.confirmPassword}
          icon={Lock}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Update Password</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Remembered your password?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
          >
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;