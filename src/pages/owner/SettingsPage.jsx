import React, { useState, useEffect } from 'react';
import { Save, Store, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';
import FormInput from '../../components/ui/FormInput';
import Skeleton from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await restaurantService.getProfile();
      if (res.data || res.restaurant || res.name) {
        const data = res.data || res.restaurant || res;
        setFormData({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          description: data.description || '',
        });
      }
    } catch (err) {
      toast.error('Failed to load restaurant profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await restaurantService.updateProfile(formData);
      toast.success('Restaurant settings saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Restaurant Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Update public restaurant details and contact information.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-5"
      >
        <FormInput
          label="Restaurant Name"
          type="text"
          name="name"
          icon={Store}
          placeholder="e.g. Gourmet Bistro"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Email Address"
            type="email"
            name="email"
            icon={Mail}
            placeholder="contact@bistro.com"
            value={formData.email}
            onChange={handleChange}
          />

          <FormInput
            label="Phone Number"
            type="tel"
            name="phone"
            icon={Phone}
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <FormInput
          label="Address"
          type="text"
          name="address"
          icon={MapPin}
          placeholder="123 Culinary Ave, Foodville"
          value={formData.address}
          onChange={handleChange}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            About Restaurant
          </label>
          <textarea
            name="description"
            rows="4"
            placeholder="A short description for your digital menu header..."
            value={formData.description}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 px-3 py-2"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;