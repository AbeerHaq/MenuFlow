import React from 'react';
import Modal from './Modal';
import Spinner from './Spinner';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center min-w-[80px] ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-brand-500 hover:bg-brand-600 focus:ring-brand-500'
            } disabled:opacity-50`}
          >
            {isLoading ? <Spinner size="sm" /> : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;