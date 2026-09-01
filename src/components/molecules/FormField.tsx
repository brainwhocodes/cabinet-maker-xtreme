'use client';

import clsx from 'clsx';
import type React from 'react';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  isRequired?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  helpText,
  isRequired = false,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={clsx('field', className)}>
      <label htmlFor={htmlFor} className="label is-size-7 has-text-weight-semibold mb-1">
        {label}
        {isRequired && <span className="has-text-danger ml-1">*</span>}
      </label>
      <div className="control">{children}</div>
      {error && <p className="help is-danger mt-1">{error}</p>}
      {!error && helpText && <p className="help has-text-grey mt-1">{helpText}</p>}
    </div>
  );
}
