import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderTree } from 'lucide-react';
import { toast } from 'react-hot-toast';
import categoryService from '../../services/categoryService';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import FormInput from '../../components/ui/FormInput';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryService.getAll();
      if (res.success || Array.isArray(res.data) || Array.isArray(res)) {
        setCategories(res.data || (Array.isArray(res) ? res : []));
      }
    } catch (err) {
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    // Check duplicate name on client side
    const duplicate = categories.some(
      (c) =>
        c.name.toLowerCase() === categoryName.trim().toLowerCase() &&
        (editingCategory ? (c._id || c.id) !== (editingCategory._id || editingCategory.id) : true)
    );

    if (duplicate) {
      setError('A category with this name already exists.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        const catId = editingCategory._id || editingCategory.id;
        const res = await categoryService.update(catId, { name: categoryName.trim() });
        if (res.success || res.data) {
          toast.success('Category updated successfully!');
          fetchCategories();
          setIsModalOpen(false);
        }
      } else {
        const res = await categoryService.create({ name: categoryName.trim() });
        if (res.success || res.data) {
          toast.success('Category created successfully!');
          fetchCategories();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed. Duplicate category names are not allowed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSubmitting(true);
    try {
      await categoryService.delete(deletingId);
      toast.success('Category deleted successfully.');
      fetchCategories();
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setSubmitting(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize your menu into easy-to-navigate categories.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No Categories Yet"
          description="Create your first menu category (e.g., Starters, Mains, Drinks) to begin adding items."
          action={handleOpenAddModal}
          actionLabel="Create Category"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const catId = cat._id || cat.id;
            return (
              <div
                key={catId}
                className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between hover:border-brand-500/50 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {cat.itemCount !== undefined ? `${cat.itemCount} items` : 'Category'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-2 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenDeleteModal(catId)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Category Name"
            type="text"
            placeholder="e.g. Desserts"
            value={categoryName}
            onChange={(e) => {
              setCategoryName(e.target.value);
              if (error) setError('');
            }}
            error={error}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors flex items-center justify-center min-w-[80px]"
            >
              {submitting ? <Spinner size="sm" /> : editingCategory ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? Items under this category may become uncategorized."
        isLoading={submitting}
      />
    </div>
  );
};

export default CategoriesPage;