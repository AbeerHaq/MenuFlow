import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderTree, ArrowUp, ArrowDown } from 'lucide-react';
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
  const [reordering, setReordering] = useState(false);

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
      const msg = err.response?.data?.message || 'Operation failed.';
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
      toast.success('Category deleted successfully');
      setCategories((prev) => prev.filter((c) => (c._id || c.id) !== deletingId));
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete category');
    } finally {
      setSubmitting(false);
      setDeletingId(null);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(index, 1);
    newCategories.splice(targetIndex, 0, movedItem);

    setCategories(newCategories);

    const orders = newCategories.map((c, idx) => ({
      id: c._id || c.id,
      order: idx,
    }));

    setReordering(true);
    try {
      await categoryService.reorder(orders);
      toast.success('Category order saved!');
    } catch (err) {
      toast.error('Failed to save category order');
      fetchCategories();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Menu Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize dishes into ordered sections for your digital QR menu.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Create Category</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8">
          <EmptyState
            icon={FolderTree}
            title="No categories found"
            description="Create categories like Appetizers, Main Entrees, Desserts to organize your menu."
            actionLabel="Add Category"
            onAction={handleOpenAddModal}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700/80 overflow-hidden">
          {categories.map((category, index) => {
            const catId = category._id || category.id;
            return (
              <div
                key={catId}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs font-bold text-gray-400">
                    {index + 1}
                  </span>
                  <span className="font-bold text-base text-gray-900 dark:text-white">
                    {category.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reorder Buttons */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <button
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0 || reordering}
                      className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 1)}
                      disabled={index === categories.length - 1 || reordering}
                      className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenEditModal(category)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenDeleteModal(catId)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    title="Delete"
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
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Category Name"
            placeholder="e.g. Appetizers & Starters"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            error={error}
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
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
        message="Are you sure you want to delete this category? Menu items in this category will remain, but you may need to reassign them."
        confirmText="Delete Category"
        type="danger"
        loading={submitting}
      />
    </div>
  );
};

export default CategoriesPage;