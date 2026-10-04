import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Store, User, Mail, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Spinner from '../../components/ui/Spinner';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = 'Restaurant name is required';
    }
    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
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
      const res = await register({
        restaurantName: formData.restaurantName,
        ownerName: formData.ownerName,
        email: formData.email,
        password: formData.password,
      });

      if (res.success || res.token) {
        toast.success('Restaurant registered successfully!');
        navigate('/dashboard');
      } else {
        toast.error(res.message || 'Registration failed.');
      }
    } catch (err) {
      const msg = !err.response
        ? 'Cannot reach the server. Make sure the backend is running on http://localhost:5000'
        : err.response?.data?.message || 'Registration failed. Try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Get Started" subtitle="Create your restaurant account in seconds">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormInput
          label="Restaurant Name"
          type="text"
          name="restaurantName"
          placeholder="The Gourmet Bistro"
          value={formData.restaurantName}
          onChange={handleChange}
          error={errors.restaurantName}
          icon={Store}
        />

        <FormInput
          label="Owner Full Name"
          type="text"
          name="ownerName"
          placeholder="Jane Doe"
          value={formData.ownerName}
          onChange={handleChange}
          error={errors.ownerName}
          icon={User}
        />

        <FormInput
          label="Email Address"
          type="email"
          name="email"
          placeholder="owner@restaurant.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          icon={Mail}
        />

        <FormInput
          label="Password"
          type="password"
          name="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          icon={Lock}
        />

        <FormInput
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
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
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Already have an account?{' '}
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

export default RegisterPage;