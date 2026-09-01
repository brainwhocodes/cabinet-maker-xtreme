'use client';

import clsx from 'clsx';
import type React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  unitSuffix?: string;
  isInvalid?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

export function Input({
  unitSuffix,
  isInvalid = false,
  inputSize = 'md',
  className = '',
  id,
  type = 'text',
  ...props
}: InputProps) {
  const sizeClass = {
    sm: 'is-small',
    md: '',
    lg: 'is-medium',
  }[inputSize];

  if (unitSuffix) {
    return (
      <div className="field has-addons mb-0">
        <div className="control is-expanded">
          <input
            id={id}
            type={type}
            className={clsx('input', sizeClass, isInvalid && 'is-danger', className)}
            aria-invalid={isInvalid}
            {...props}
          />
        </div>
        <div className="control">
          <span className="button is-static">{unitSuffix}</span>
        </div>
      </div>
    );
  }

  return (
    <input
      id={id}
      type={type}
      className={clsx('input', sizeClass, isInvalid && 'is-danger', className)}
      aria-invalid={isInvalid}
      {...props}
    />
  );
}
