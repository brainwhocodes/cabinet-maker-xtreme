'use client';

import clsx from 'clsx';
import type React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  isInvalid?: boolean;
  selectSize?: 'sm' | 'md' | 'lg';
  isFullWidth?: boolean;
}

export function Select({
  options,
  isInvalid = false,
  selectSize = 'md',
  isFullWidth = true,
  className = '',
  id,
  ...props
}: SelectProps) {
  const sizeClass = {
    sm: 'is-small',
    md: '',
    lg: 'is-medium',
  }[selectSize];

  return (
    <div
      className={clsx(
        'select',
        sizeClass,
        isFullWidth && 'is-fullwidth',
        isInvalid && 'is-danger',
        className,
      )}
    >
      <select id={id} aria-invalid={isInvalid} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
