'use client';

import clsx from 'clsx';
import type React from 'react';
import { SolarIcon } from './SolarIcon';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'warning' | 'success' | 'danger' | 'neutral';
  icon?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  icon,
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantClass = {
    primary: 'is-primary',
    warning: 'is-warning',
    success: 'is-success',
    danger: 'is-danger',
    neutral: '',
  }[variant];

  return (
    <span className={clsx('badge-status', variantClass, size === 'sm' && 'is-small', className)}>
      {icon && <SolarIcon name={icon} size={14} />}
      <span>{children}</span>
    </span>
  );
}
