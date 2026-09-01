'use client';

import clsx from 'clsx';
import type { FinishOption } from '@/domain/catalog/types';

export interface ColorSwatchProps {
  finish: FinishOption;
  isSelected?: boolean;
  onSelect?: (finish: FinishOption) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ColorSwatch({
  finish,
  isSelected = false,
  onSelect,
  size = 'md',
}: ColorSwatchProps) {
  const sizePx = {
    sm: 24,
    md: 32,
    lg: 40,
  }[size];

  return (
    <button
      type="button"
      className={clsx('button p-0 is-rounded', isSelected && 'is-focused')}
      style={{
        width: sizePx,
        height: sizePx,
        backgroundColor: finish.colorHex,
        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-line)',
        boxShadow: isSelected
          ? '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary)'
          : 'none',
        cursor: onSelect ? 'pointer' : 'default',
      }}
      title={finish.name}
      aria-label={`Select finish ${finish.name}`}
      aria-pressed={isSelected}
      onClick={() => onSelect?.(finish)}
    />
  );
}
