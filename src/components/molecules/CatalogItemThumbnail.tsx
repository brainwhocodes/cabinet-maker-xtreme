'use client';

import { useMemo } from 'react';
import type { PlannerCatalogEntry } from '@/domain/catalog/planner-catalog';
import { getCatalogPreviewGeometry } from '@/domain/catalog/preview-geometry';
import type { CabinetInstance } from '@/domain/geometry/models';

export function CatalogItemThumbnail({
  entry,
  selectedCabinet,
}: {
  entry: PlannerCatalogEntry;
  selectedCabinet?: CabinetInstance;
}) {
  const contextualCabinet = entry.kind === 'shelving' ? selectedCabinet : undefined;
  const geometry = useMemo(
    () => getCatalogPreviewGeometry(entry, contextualCabinet),
    [entry, contextualCabinet],
  );
  return (
    <svg
      className="catalog-item-thumbnail"
      viewBox={geometry.viewBox}
      role="img"
      aria-label={`${entry.name} geometry preview`}
      focusable="false"
    >
      {geometry.shapes.map((shape) => {
        const key =
          shape.kind === 'polygon'
            ? `${entry.id}-${shape.points}`
            : `${entry.id}-${shape.cx}-${shape.cy}-${shape.rx}-${shape.ry}`;
        return shape.kind === 'polygon' ? (
          <polygon
            key={key}
            points={shape.points}
            fill={shape.fill}
            fillOpacity={shape.opacity}
            stroke="#738292"
            strokeWidth="0.35"
          />
        ) : (
          <ellipse
            key={key}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            fill={shape.fill}
            fillOpacity={shape.opacity}
            stroke="#738292"
            strokeWidth="0.35"
          />
        );
      })}
    </svg>
  );
}
