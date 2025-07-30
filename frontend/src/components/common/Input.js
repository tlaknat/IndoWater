import React from 'react';

const Input = ({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  disabled = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  errorClassName = '',
  ...props
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={id || name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
          focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
          ${
            error && touched
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800' : ''}
          ${inputClassName}
        `}
        {...props}
      />
      {error && touched && (
        <p className={`mt-2 text-sm text-red-600 dark:text-red-400 ${errorClassName}`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;