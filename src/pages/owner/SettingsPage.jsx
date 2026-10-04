import React, { useState, useEffect } from 'react';
import { Save, Store, Phone, MapPin, DollarSign, Image as ImageIcon, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/ui/FormInput';
import Skeleton from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

const SettingsPage = () => {
  const { setRestaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    logoUrl: '',
    currency: '$',
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
          slug: data.slug || '',
          address: data.address || '',
          phone: data.phone || '',
          logoUrl: data.logoUrl || '',
          currency: data.currency || '$',
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    setUploadingLogo(true);
    try {
      const res = await restaurantService.uploadImage(data);
      if (res.success && res.url) {
        setFormData((prev) => ({ ...prev, logoUrl: res.url }));
        toast.success('Logo uploaded successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await restaurantService.updateProfile(formData);
      if (res.success && res.restaurant) {
        setRestaurant(res.restaurant);
        toast.success('Restaurant settings saved successfully!');
      }
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
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Restaurant Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Update public restaurant details, branding logo, and contact info.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6"
      >
        {/* Logo Upload Section */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Restaurant Brand Logo
          </label>
          <div className="flex items-center gap-4">
            {formData.logoUrl ? (
              <img
                src={formData.logoUrl}
                alt="Logo Preview"
                className="w-20 h-20 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>{uploadingLogo ? 'Uploading...' : 'Upload New Logo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-gray-400">Recommended: Square PNG/JPG up to 5MB.</p>
            </div>
          </div>
        </div>

        {/* Restaurant Name */}
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

        {/* Slug Preview */}
        {formData.slug && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Restaurant Unique Slug
            </label>
            <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>{formData.slug}</span>
              <span className="text-[10px] text-gray-400 font-sans">Used in table QR URLs</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Contact Phone Number"
            type="tel"
            name="phone"
            icon={Phone}
            placeholder="+1 (555) 234-5678"
            value={formData.phone}
            onChange={handleChange}
          />

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Menu Currency Symbol
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                placeholder="$"
                maxLength="4"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        <FormInput
          label="Physical Street Address"
          type="text"
          name="address"
          icon={MapPin}
          placeholder="142 Gourmet Boulevard, New York, NY"
          value={formData.address}
          onChange={handleChange}
        />

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Restaurant Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;