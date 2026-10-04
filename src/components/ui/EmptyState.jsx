import React from 'react';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 my-4">
      {Icon && (
        <div className="p-3 bg-brand-50 dark:bg-brand-950/50 rounded-full text-brand-500 mb-4">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;