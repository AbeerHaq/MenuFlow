import React, { forwardRef } from 'react';

const FormInput = forwardRef(
  ({ label, error, helperText, icon: Icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm transition-colors focus:outline-none focus:ring-2 px-3 py-2 ${
              Icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-700 focus:ring-brand-500 focus:border-brand-500'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;