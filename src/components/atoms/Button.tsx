'use client';

import clsx from 'clsx';
import type React from 'react';
import { SolarIcon } from './SolarIcon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  isFullWidth?: boolean;
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  isFullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'is-primary',
    secondary: '',
    danger: 'is-danger',
    warning: 'is-warning',
    ghost: 'is-ghost',
    success: 'is-success',
  }[variant];

  const sizeClass = {
    sm: 'is-small',
    md: '',
    lg: 'is-medium',
  }[size];

  return (
    <button
      type={type}
      className={clsx(
        'button',
        variantClass,
        sizeClass,
        isLoading && 'is-loading',
        isFullWidth && 'is-fullwidth',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <SolarIcon name={icon} size={size === 'sm' ? 16 : 20} className="mr-1" />
      )}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'right' && (
        <SolarIcon name={icon} size={size === 'sm' ? 16 : 20} className="ml-1" />
      )}
    </button>
  );
}
