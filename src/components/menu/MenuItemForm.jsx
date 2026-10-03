import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import FormInput from '../ui/FormInput';
import Spinner from '../ui/Spinner';

const MenuItemForm = ({
  initialData = null,
  categories = [],
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isVegetarian: false,
    isAvailable: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price !== undefined ? initialData.price : '',
        categoryId: initialData.categoryId || initialData.category?._id || '',
        isVegetarian: !!initialData.isVegetarian,
        isAvailable: initialData.isAvailable !== undefined ? initialData.isAvailable : true,
      });
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    } else if (categories.length > 0) {
      setFormData((prev) => ({ ...prev, categoryId: categories[0]._id || categories[0].id }));
    }
  }, [initialData, categories]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      if (errors.image) setErrors((prev) => ({ ...prev, image: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Item name is required';
    if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.categoryId) newErrors.categoryId = 'Category selection is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = new FormData();
    data.append('name', formData.name.trim());
    data.append('description', formData.description.trim());
    data.append('price', formData.price);
    data.append('categoryId', formData.categoryId);
    data.append('isVegetarian', formData.isVegetarian);
    data.append('isAvailable', formData.isAvailable);

    if (imageFile) {
      data.append('image', imageFile);
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Item Name"
        type="text"
        name="name"
        placeholder="e.g. Margherita Pizza"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Category
        </label>
        <select
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          className={`w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm transition-colors focus:outline-none focus:ring-2 px-3 py-2 ${
            errors.categoryId
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-700 focus:ring-brand-500 focus:border-brand-500'
          }`}
        >
          <option value="" disabled>Select a category</option>
          {categories.map((cat) => (
            <option key={cat._id || cat.id} value={cat._id || cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>}
      </div>

      <FormInput
        label="Price ($)"
        type="number"
        step="0.01"
        name="price"
        placeholder="12.99"
        value={formData.price}
        onChange={handleChange}
        error={errors.price}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          rows="3"
          placeholder="Brief description of the dish..."
          value={formData.description}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 px-3 py-2"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Item Image
        </label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <label className="flex-1 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-lg p-4 text-center transition-colors">
            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Click to upload photo
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>
        {errors.image && <p className="mt-1 text-xs text-red-500">{errors.image}</p>}
      </div>

      {/* Toggles */}
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isVegetarian"
            checked={formData.isVegetarian}
            onChange={handleChange}
            className="w-4 h-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Vegetarian Dish
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isAvailable"
            checked={formData.isAvailable}
            onChange={handleChange}
            className="w-4 h-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Available Now
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
        >
          {isLoading ? <Spinner size="sm" /> : initialData ? 'Update Item' : 'Add Item'}
        </button>
      </div>
    </form>
  );
};

export default MenuItemForm;