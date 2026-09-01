'use client';

import { useRef } from 'react';
import type { Appliance, BuiltInElement, CabinetInstance, Opening } from '@/domain/geometry/models';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { DimensionDisplay } from '../atoms/DimensionDisplay';
import { SolarIcon } from '../atoms/SolarIcon';

type SceneListEntry =
  | { kind: 'cabinet'; entity: CabinetInstance }
  | { kind: 'built-in'; entity: BuiltInElement }
  | { kind: 'opening'; entity: Opening }
  | { kind: 'appliance'; entity: Appliance };

export function SemanticCabinetList() {
  const {
    project,
    selectedEntityIds,
    primarySelectedEntityId,
    selectSceneEntity,
    setSceneSelection,
    removeCabinet,
    removeBuiltInElement,
    removeOpening,
    removeAppliance,
  } = useProjectStore();
  const lastSelectedIndex = useRef<number | null>(null);
  const entries: SceneListEntry[] = [
    ...project.cabinets.map((entity) => ({ kind: 'cabinet' as const, entity })),
    ...project.builtInElements.map((entity) => ({ kind: 'built-in' as const, entity })),
    ...project.openings.map((entity) => ({ kind: 'opening' as const, entity })),
    ...project.appliances.map((entity) => ({ kind: 'appliance' as const, entity })),
  ];
  const selectedIdSet = new Set(selectedEntityIds);
  const wallNameById = new Map(project.walls.map((wall) => [wall.id, wall.name]));

  if (entries.length === 0) {
    return (
      <div className="has-text-centered py-4 has-text-grey is-size-7">
        No planning entities are currently placed.
      </div>
    );
  }

  return (
    <div className="table-container mb-0" style={{ maxHeight: 240, overflowY: 'auto' }}>
      <table className="table is-narrow is-fullwidth is-striped is-hoverable is-size-7">
        <thead>
          <tr>
            <th scope="col">Select</th>
            <th scope="col">Type</th>
            <th scope="col">Name</th>
            <th scope="col">Wall</th>
            <th scope="col">Offset</th>
            <th scope="col">Elevation</th>
            <th scope="col">Width</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const { entity } = entry;
            const isSelected = selectedIdSet.has(entity.id);
            const isPrimary = primarySelectedEntityId === entity.id;
            return (
              <tr key={entity.id} className={isSelected ? 'is-selected' : ''}>
                <td>
                  <button
                    type="button"
                    className="button is-small is-ghost"
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Deselect' : 'Select'} ${entity.name}${isPrimary ? ', primary selection' : ''}`}
                    onClick={(event) => {
                      if (event.shiftKey && lastSelectedIndex.current !== null) {
                        const start = Math.min(lastSelectedIndex.current, index);
                        const end = Math.max(lastSelectedIndex.current, index);
                        setSceneSelection(
                          entries.slice(start, end + 1).map((candidate) => candidate.entity.id),
                          entity.id,
                        );
                      } else {
                        selectSceneEntity(
                          entity.id,
                          event.ctrlKey || event.metaKey ? 'toggle' : 'replace',
                        );
                      }
                      lastSelectedIndex.current = index;
                    }}
                  >
                    {isPrimary ? 'Primary' : isSelected ? 'Selected' : 'Select'}
                  </button>
                </td>
                <td>{entry.kind}</td>
                <td>
                  <strong>
                    {entry.kind === 'cabinet'
                      ? `${entry.entity.definitionId} ${entity.name}`
                      : entity.name}
                  </strong>
                </td>
                <td>{wallNameById.get(entity.wallId) ?? entity.wallId}</td>
                <td>
                  <DimensionDisplay sixteenths={entity.offsetX} />
                </td>
                <td>
                  <DimensionDisplay sixteenths={entity.elevation} />
                </td>
                <td>
                  <DimensionDisplay sixteenths={entity.width} />
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-0 is-small"
                    onClick={() => removeEntry(entry)}
                    title={`Remove ${entity.name}`}
                    aria-label={`Remove ${entity.name}`}
                  >
                    <SolarIcon
                      name="solar:trash-bin-minimalistic-linear"
                      size={14}
                      className="has-text-danger"
                    />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  function removeEntry(entry: SceneListEntry) {
    if (entry.kind === 'cabinet') removeCabinet(entry.entity.id);
    else if (entry.kind === 'built-in') removeBuiltInElement(entry.entity.id);
    else if (entry.kind === 'opening') removeOpening(entry.entity.id);
    else removeAppliance(entry.entity.id);
  }
}
