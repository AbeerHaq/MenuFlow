import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import authService from '../../services/authService';
import AuthLayout from '../../components/layout/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Spinner from '../../components/ui/Spinner';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required');
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email address format');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      if (res.success || res.status === 'success') {
        setSubmitted(true);
        toast.success('Password reset link sent to your email!');
      } else {
        toast.error(res.message || 'Failed to send reset link.');
      }
    } catch (err) {
      toast.error(
        !err.response
          ? 'Cannot reach the server. Make sure the backend is running on http://localhost:5000'
          : err.response?.data?.message || 'Failed to send reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email and we'll send you instructions to reset your password"
    >
      {submitted ? (
        <div className="text-center space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
            We have sent password reset instructions to <strong>{email}</strong>.
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="text-sm font-semibold text-brand-500 hover:text-brand-600 block mx-auto"
          >
            Try another email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <FormInput
            label="Email Address"
            type="email"
            name="email"
            placeholder="owner@restaurant.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            error={error}
            icon={Mail}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Reset Link</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;