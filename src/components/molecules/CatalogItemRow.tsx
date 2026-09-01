'use client';

import type { PlannerCatalogEntry } from '@/domain/catalog/planner-catalog';
import type { CabinetInstance } from '@/domain/geometry/models';
import { Button } from '../atoms/Button';
import { CatalogItemThumbnail } from './CatalogItemThumbnail';

export interface CatalogItemRowProps {
  entry: PlannerCatalogEntry;
  selectedCabinet?: CabinetInstance;
  isSelected?: boolean;
  isFocused?: boolean;
  onFocus(entry: PlannerCatalogEntry): void;
  onPreview(entry: PlannerCatalogEntry): void;
  onAdd(entry: PlannerCatalogEntry): void;
  onApply(entry: PlannerCatalogEntry): void;
}

export function CatalogItemRow({
  entry,
  selectedCabinet,
  isSelected = false,
  isFocused = false,
  onFocus,
  onPreview,
  onAdd,
  onApply,
}: CatalogItemRowProps) {
  const isPlaceable = entry.kind === 'cabinet' || entry.kind === 'built_in';
  const actionLabel = isPlaceable
    ? `Add ${entry.name}`
    : selectedCabinet
      ? `Apply ${entry.name} to ${selectedCabinet.name}`
      : `Apply ${entry.name}`;
  const configurationUnavailable = !isPlaceable && !selectedCabinet;

  return (
    <article
      className={`catalog-item-row ${isSelected ? 'is-selected' : ''} ${isFocused ? 'is-focused' : ''}`}
      onMouseEnter={() => onFocus(entry)}
      onFocusCapture={() => onFocus(entry)}
    >
      <CatalogItemThumbnail entry={entry} selectedCabinet={selectedCabinet} />
      <div className="catalog-item-copy">
        <div className="catalog-item-heading">
          <strong>{entry.code}</strong>
          <span>{entryKindLabel(entry)}</span>
        </div>
        <p title={entry.name}>{entry.name}</p>
        <span className="catalog-item-fact">{entryFact(entry)}</span>
        {configurationUnavailable && (
          <span className="catalog-item-disabled-reason">
            Select a cabinet to apply this option.
          </span>
        )}
      </div>
      <div className="catalog-item-actions">
        <Button
          size="sm"
          variant="ghost"
          className="catalog-item-preview-action"
          onClick={() => onPreview(entry)}
          aria-label={`Preview ${entry.name}`}
        >
          Preview
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="catalog-item-add"
          disabled={configurationUnavailable}
          onClick={() => (isPlaceable ? onAdd(entry) : onApply(entry))}
          title={actionLabel}
          aria-label={actionLabel}
        >
          {isPlaceable ? 'Add' : 'Apply'}
        </Button>
      </div>
    </article>
  );
}

function entryKindLabel(entry: PlannerCatalogEntry): string {
  if (entry.kind === 'cabinet') return entry.cabinetDefinition.family.replaceAll('_', ' ');
  if (entry.kind === 'built_in') return entry.builtInDefinition.type.replaceAll('_', ' ');
  if (entry.kind === 'hardware') return entry.hardwareOption.type.replaceAll('_', ' ');
  if (entry.kind === 'drawer_system') return 'drawer box & slides';
  if (entry.kind === 'hinge') return `${entry.hingeOption.openingAngleDegrees}° hinge`;
  return `${entry.shelfPackage.count} shelves`;
}

function entryFact(entry: PlannerCatalogEntry): string {
  if (entry.kind === 'cabinet') {
    const definition = entry.cabinetDefinition;
    if (definition.retailMapping) {
      return `$${definition.retailMapping.estimatedPriceUSD.toFixed(0)} search-only estimate`;
    }
    return definition.source === 'built_template'
      ? 'Materials estimate in BOM'
      : 'Price unavailable';
  }
  if (entry.kind === 'built_in') return 'Materials estimate in BOM';
  if (entry.kind === 'hardware') {
    const option = entry.hardwareOption;
    return option.type === 'none'
      ? 'No visible primitive'
      : `${option.primitive}, ${option.widthInches} × ${option.heightInches} × ${option.depthInches} in`;
  }
  if (entry.kind === 'drawer_system') {
    const drawer = entry.drawerBoxOption;
    return `${drawer.material.replaceAll('_', ' ')} • ${drawer.weightCapacityLbs} lbs ${drawer.slideType.replaceAll('_', ' ')}`;
  }
  if (entry.kind === 'hinge') {
    const hinge = entry.hingeOption;
    return `${hinge.openingAngleDegrees}° ${hinge.mountingType.replaceAll('_', ' ')}${hinge.softClose ? ' (soft-close)' : ''}`;
  }
  return entry.shelfPackage.count === 0
    ? 'Open cavity'
    : `${entry.shelfPackage.count} evenly spaced adjustable shelves`;
}
