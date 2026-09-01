'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getPlannerCatalogEntries,
  type PlannerCatalogEntry,
} from '@/domain/catalog/planner-catalog';
import type { CabinetInstance } from '@/domain/geometry/models';
import { useProjectStore } from '@/state/project-store';
import { Select } from '../atoms/Select';
import { CatalogItemRow } from '../molecules/CatalogItemRow';
import { FormField } from '../molecules/FormField';
import { SearchBar } from '../molecules/SearchBar';
import { CatalogPreviewCanvas } from './CatalogPreviewCanvas';

export type MainCatalogTab = 'cabinets' | 'hardware' | 'drawers' | 'hinges';

const CABINET_CATEGORIES = [
  { id: 'all', label: 'All Cabinets & Built-ins' },
  { id: 'base', label: 'Base Cabinets' },
  { id: 'wall', label: 'Wall Cabinets' },
  { id: 'tall', label: 'Tall / Pantry' },
  { id: 'corner', label: 'Corner Cabinets' },
  { id: 'fillers', label: 'Filler Strips' },
  { id: 'built-ins', label: 'Built-ins & Trim' },
  { id: 'shelves', label: 'Shelving Packages' },
] as const;

type CabinetCategory = (typeof CABINET_CATEGORIES)[number]['id'];

export function CatalogRail() {
  const {
    project,
    primarySelectedEntityId,
    setActiveWall,
    startCatalogPlacement,
    configureCabinet,
  } = useProjectStore();
  const entries = useMemo(() => getPlannerCatalogEntries(), []);
  const [activeTab, setActiveTab] = useState<MainCatalogTab>('cabinets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CabinetCategory>('all');
  const [focusedEntryId, setFocusedEntryId] = useState(entries[0]?.id ?? '');
  const [pinnedEntryId, setPinnedEntryId] = useState<string | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const selectedCabinet = project.cabinets.find(
    (cabinet) => cabinet.id === primarySelectedEntityId,
  );
  const selectedBuiltIn = project.builtInElements.find(
    (element) => element.id === primarySelectedEntityId,
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesTab = entryMatchesTab(entry, activeTab, selectedCategory);
      const matchesSearch =
        query.length === 0 ||
        [entry.code, entry.name, entry.description, entry.kind, ...entry.searchTerms]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, entries, searchQuery, selectedCategory]);

  useEffect(() => {
    if (!filteredEntries.some((entry) => entry.id === focusedEntryId)) {
      setFocusedEntryId(filteredEntries[0]?.id ?? '');
    }
  }, [filteredEntries, focusedEntryId]);

  const focusedEntry =
    filteredEntries.find((entry) => entry.id === focusedEntryId) ??
    filteredEntries[0] ??
    entries[0];

  const applyEntry = (entry: PlannerCatalogEntry) => {
    if (!selectedCabinet) return;
    if (entry.kind === 'hardware') {
      configureCabinet(selectedCabinet.id, {
        hardwareId: entry.hardwareOption.id,
        build: { includeHardware: entry.hardwareOption.type !== 'none' },
      });
    } else if (entry.kind === 'drawer_system') {
      configureCabinet(selectedCabinet.id, {
        build: { drawerSlideId: entry.drawerBoxOption.id },
      });
    } else if (entry.kind === 'hinge') {
      configureCabinet(selectedCabinet.id, {
        build: { hingeId: entry.hingeOption.id },
      });
    } else if (entry.kind === 'shelving') {
      configureCabinet(selectedCabinet.id, {
        build: {
          shelfCount: entry.shelfPackage.count,
          shelfLayout: 'even',
          shelfElevations: [],
        },
      });
    }
  };

  const activatePreview = (entry: PlannerCatalogEntry) => {
    setFocusedEntryId(entry.id);
    setPinnedEntryId(entry.id);
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ block: 'nearest' });
      previewRef.current?.focus();
    });
  };

  return (
    <aside className="catalog-rail p-3 is-flex is-flex-direction-column">
      <div className="catalog-rail-heading is-flex is-align-items-center is-justify-content-between mb-2">
        <h3 className="is-size-6 has-text-weight-bold mb-0">Catalog & Hardware</h3>
        <span className="is-size-7 has-text-grey">{filteredEntries.length} items</span>
      </div>

      <div className="catalog-main-tabs mb-2" role="tablist" aria-label="Catalog sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cabinets'}
          className={activeTab === 'cabinets' ? 'is-active' : ''}
          onClick={() => setActiveTab('cabinets')}
        >
          Cabinets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'hardware'}
          className={activeTab === 'hardware' ? 'is-active' : ''}
          onClick={() => setActiveTab('hardware')}
        >
          Hardware
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'drawers'}
          className={activeTab === 'drawers' ? 'is-active' : ''}
          onClick={() => setActiveTab('drawers')}
        >
          Drawers
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'hinges'}
          className={activeTab === 'hinges' ? 'is-active' : ''}
          onClick={() => setActiveTab('hinges')}
        >
          Hinges
        </button>
      </div>

      <FormField label="Target wall">
        <Select
          aria-label="Target wall"
          selectSize="sm"
          value={project.activeWallId}
          options={project.walls.map((wall) => ({ value: wall.id, label: wall.name }))}
          onChange={(event) => setActiveWall(event.target.value)}
        />
      </FormField>

      {activeTab === 'cabinets' && (
        <FormField label="Category">
          <Select
            aria-label="Cabinet category"
            selectSize="sm"
            value={selectedCategory}
            options={CABINET_CATEGORIES.map((category) => ({
              value: category.id,
              label: category.label,
            }))}
            onChange={(event) => setSelectedCategory(event.target.value as CabinetCategory)}
          />
        </FormField>
      )}

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={`Search ${activeTab}...`}
      />

      {focusedEntry && (
        <section
          ref={previewRef}
          className={`catalog-shared-preview ${
            pinnedEntryId === focusedEntry.id ? 'is-pinned' : ''
          }`}
          tabIndex={-1}
          aria-label={`Previewing ${focusedEntry.name}`}
        >
          <div className="catalog-preview-heading">
            <strong>{focusedEntry.name}</strong>
            <span>{focusedEntry.code}</span>
          </div>
          <CatalogPreviewCanvas entry={focusedEntry} selectedCabinet={selectedCabinet} />
          <MechanismPreviewFacts entry={focusedEntry} />
        </section>
      )}

      <div className="catalog-list is-flex-grow-1">
        {filteredEntries.length === 0 ? (
          <div className="catalog-empty-state" role="status">
            <strong>No matching {activeTab} entries</strong>
            <span>Try clearing the search query or switching categories.</span>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <CatalogItemRow
              key={entry.id}
              entry={entry}
              selectedCabinet={selectedCabinet}
              isFocused={entry.id === focusedEntry?.id}
              isSelected={entryIsSelected(entry, selectedCabinet, selectedBuiltIn?.definitionId)}
              onFocus={(nextEntry) => setFocusedEntryId(nextEntry.id)}
              onPreview={activatePreview}
              onAdd={(nextEntry) => startCatalogPlacement(nextEntry.id)}
              onApply={applyEntry}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function MechanismPreviewFacts({ entry }: { entry: PlannerCatalogEntry }) {
  if (entry.kind === 'hardware') {
    const hardware = entry.hardwareOption;
    return (
      <dl className="catalog-hardware-facts">
        <div>
          <dt>Style</dt>
          <dd>{hardware.type.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Shape</dt>
          <dd>{hardware.type === 'none' ? 'None' : hardware.primitive}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>
            {hardware.widthInches}&quot; × {hardware.heightInches}&quot; × {hardware.depthInches}
            &quot;
          </dd>
        </div>
        {hardware.radiusInches !== undefined && (
          <div>
            <dt>Radius</dt>
            <dd>{hardware.radiusInches}&quot;</dd>
          </div>
        )}
        <div>
          <dt>Finish</dt>
          <dd className="catalog-hardware-finish">
            <span style={{ backgroundColor: hardware.colorHex }} aria-hidden="true" />
            {hardware.name}
          </dd>
        </div>
      </dl>
    );
  }

  if (entry.kind === 'drawer_system') {
    const drawer = entry.drawerBoxOption;
    return (
      <dl className="catalog-hardware-facts">
        <div>
          <dt>Construction</dt>
          <dd>{drawer.material.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Slide Runner</dt>
          <dd>{drawer.slideType.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Load Rating</dt>
          <dd>{drawer.weightCapacityLbs} lbs</dd>
        </div>
        <div>
          <dt>Extension</dt>
          <dd>{drawer.extensionType.replaceAll('_', ' ')}</dd>
        </div>
      </dl>
    );
  }

  if (entry.kind === 'hinge') {
    const hinge = entry.hingeOption;
    return (
      <dl className="catalog-hardware-facts">
        <div>
          <dt>Opening Angle</dt>
          <dd>{hinge.openingAngleDegrees}°</dd>
        </div>
        <div>
          <dt>Mounting</dt>
          <dd>{hinge.mountingType.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Soft-Close</dt>
          <dd>{hinge.softClose ? 'Integrated damper' : 'Free swing'}</dd>
        </div>
      </dl>
    );
  }

  return null;
}

function entryMatchesTab(
  entry: PlannerCatalogEntry,
  tab: MainCatalogTab,
  category: CabinetCategory,
): boolean {
  if (tab === 'hardware') return entry.kind === 'hardware';
  if (tab === 'drawers') return entry.kind === 'drawer_system';
  if (tab === 'hinges') return entry.kind === 'hinge';

  // Cabinets tab
  if (category === 'all') {
    return entry.kind === 'cabinet' || entry.kind === 'built_in' || entry.kind === 'shelving';
  }
  if (category === 'built-ins') return entry.kind === 'built_in';
  if (category === 'shelves') return entry.kind === 'shelving';
  if (entry.kind !== 'cabinet') return false;
  if (category === 'corner') return entry.cabinetDefinition.category === 'corner';
  if (category === 'fillers') return entry.cabinetDefinition.family === 'filler';
  return entry.cabinetDefinition.category === category;
}

function entryIsSelected(
  entry: PlannerCatalogEntry,
  cabinet: CabinetInstance | undefined,
  selectedBuiltInDefinitionId?: string,
): boolean {
  if (entry.kind === 'cabinet') return cabinet?.definitionId === entry.cabinetDefinition.code;
  if (entry.kind === 'built_in') return selectedBuiltInDefinitionId === entry.builtInDefinition.id;
  if (entry.kind === 'hardware') return cabinet?.hardwareId === entry.hardwareOption.id;
  if (entry.kind === 'drawer_system') {
    return cabinet?.build.drawerSlideId === entry.drawerBoxOption.id;
  }
  if (entry.kind === 'hinge') {
    return cabinet?.build.hingeId === entry.hingeOption.id;
  }
  return (
    cabinet?.build.shelfCount === entry.shelfPackage.count &&
    cabinet.build.shelfLayout === entry.shelfPackage.layout
  );
}
