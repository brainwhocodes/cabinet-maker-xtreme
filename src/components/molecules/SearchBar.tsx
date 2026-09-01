'use client';

import { SolarIcon } from '../atoms/SolarIcon';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search cabinets (e.g. B30, sink, drawer)...',
  label = 'Search cabinet catalog',
  className = '',
}: SearchBarProps) {
  return (
    <div className={`catalog-search field mb-0 ${className}`}>
      <div className="catalog-search-control">
        <input
          type="search"
          className="catalog-search-input input is-small"
          placeholder={placeholder}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <SolarIcon
          name="solar:minimalistic-magnifier-linear"
          size={16}
          className="catalog-search-leading"
        />
        {value && (
          <button
            type="button"
            className="catalog-search-clear button is-small is-ghost p-0"
            onClick={() => onChange('')}
            title="Clear search"
            aria-label="Clear search"
          >
            <SolarIcon name="solar:close-circle-linear" size={16} className="has-text-grey" />
          </button>
        )}
      </div>
    </div>
  );
}
