'use client';

import type { AssemblyPartState } from '@/domain/assembly/step-presentation';
import type { CabinetPartMeshSpec } from '@/domain/geometry/part-builder';
import { Button } from '../atoms/Button';

export interface AssemblyPartLegendProps {
  parts: CabinetPartMeshSpec[];
  partStates: ReadonlyMap<string, AssemblyPartState>;
  highlightedPartId?: string;
  onHighlight(partId: string | undefined): void;
}

export function AssemblyPartLegend({
  parts,
  partStates,
  highlightedPartId,
  onHighlight,
}: AssemblyPartLegendProps) {
  return (
    <section className="assembly-part-legend" aria-labelledby="assembly-parts-title">
      <div className="assembly-part-legend-heading">
        <h3 id="assembly-parts-title">Cabinet parts</h3>
        {highlightedPartId && (
          <Button size="sm" variant="ghost" onClick={() => onHighlight(undefined)}>
            Clear highlight
          </Button>
        )}
      </div>

      <div className="assembly-part-legend-list">
        {parts.map((part) => {
          const state = partStates.get(part.id) ?? 'future';
          const isHighlighted = highlightedPartId === part.id;
          const isFuture = state === 'future';

          return (
            <button
              key={part.id}
              type="button"
              className={`assembly-part-legend-item is-${state} ${
                isHighlighted ? 'is-highlighted' : ''
              }`}
              aria-pressed={isHighlighted}
              aria-disabled={isFuture ? 'true' : undefined}
              disabled={isFuture}
              data-part-state={state}
              title={isFuture ? `${part.name} is used in a later step` : `Highlight ${part.name}`}
              onClick={() => onHighlight(isHighlighted ? undefined : part.id)}
            >
              <span className="assembly-part-dot" aria-hidden="true" />
              <span>
                <strong>{part.id}</strong>
                <small>{part.name}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
