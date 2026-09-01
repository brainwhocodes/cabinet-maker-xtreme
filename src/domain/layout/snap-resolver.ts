import type { SnapGuide } from '@/state/project-store';
import {
  type BoundingBox3D,
  getCabinetBoundingBox,
  type RoomProject,
  type WallId,
} from '../geometry/models';
import { inchesToSixteenths, type Sixteenths } from '../geometry/units';

export interface SnapResolution {
  offsetX: Sixteenths;
  elevation: Sixteenths;
  guides: SnapGuide[];
}

const OBJECT_SNAP_THRESHOLD = inchesToSixteenths(0.75);
const GRID_SIZE = inchesToSixteenths(0.5);

export function getMovableEntityBounds(
  project: RoomProject,
  entityId: string,
): BoundingBox3D | null {
  const cabinet = project.cabinets.find((candidate) => candidate.id === entityId);
  if (cabinet) return getCabinetBoundingBox(cabinet);

  const element = project.builtInElements.find((candidate) => candidate.id === entityId);
  if (!element) return null;
  return {
    min: { x: element.offsetX, y: element.elevation, z: element.depthOffset },
    max: {
      x: element.offsetX + element.width,
      y: element.elevation + element.height,
      z: element.depthOffset + element.depth,
    },
  };
}

export function resolveSceneSnap(input: {
  project: RoomProject;
  entityIds: string[];
  wallId: WallId;
  candidateOffset: Sixteenths;
  candidateElevation: Sixteenths;
}): SnapResolution {
  const { project, entityIds, wallId } = input;
  const wall = project.walls.find((candidate) => candidate.id === wallId);
  const selected = entityIds
    .map((id) => ({ id, bounds: getMovableEntityBounds(project, id) }))
    .filter((entry): entry is { id: string; bounds: BoundingBox3D } => entry.bounds !== null);
  if (!wall || selected.length === 0) {
    return { offsetX: input.candidateOffset, elevation: input.candidateElevation, guides: [] };
  }

  const originalMinX = Math.min(...selected.map((entry) => entry.bounds.min.x));
  const originalMaxX = Math.max(...selected.map((entry) => entry.bounds.max.x));
  const originalMinY = Math.min(...selected.map((entry) => entry.bounds.min.y));
  const originalMaxY = Math.max(...selected.map((entry) => entry.bounds.max.y));
  const width = originalMaxX - originalMinX;
  const height = originalMaxY - originalMinY;
  const selectedIds = new Set(entityIds);

  const offsetSources: SnapCandidate[] = [
    { candidate: 0, source: 'wall' },
    { candidate: wall.length - width, source: 'wall' },
  ];
  const elevationSources: SnapCandidate[] = [
    { candidate: 0, source: 'wall' },
    { candidate: wall.height - height, source: 'wall' },
  ];

  const siblings = [
    ...project.cabinets.map((entity) => ({ entity, source: 'cabinet' as const })),
    ...project.builtInElements.map((entity) => ({ entity, source: 'cabinet' as const })),
  ].filter(({ entity }) => entity.wallId === wallId && !selectedIds.has(entity.id));
  addEntityEdgeCandidates(offsetSources, elevationSources, siblings, width, height);

  const obstacles = [
    ...project.openings.map((entity) => ({ entity, source: 'opening' as const })),
    ...project.appliances.map((entity) => ({ entity, source: 'appliance' as const })),
  ].filter(({ entity }) => entity.wallId === wallId);
  addEntityEdgeCandidates(offsetSources, elevationSources, obstacles, width, height);

  const offsetSnap = closestCandidate(input.candidateOffset, offsetSources);
  const elevationSnap = closestCandidate(input.candidateElevation, elevationSources);
  let offsetX = offsetSnap?.candidate ?? input.candidateOffset;
  let elevation = elevationSnap?.candidate ?? input.candidateElevation;
  const guides: SnapGuide[] = [];

  if (offsetSnap) {
    guides.push({
      axis: 'offset',
      value: offsetX,
      source: offsetSnap.source,
      sourceId: offsetSnap.sourceId,
    });
  }
  if (elevationSnap) {
    guides.push({
      axis: 'elevation',
      value: elevation,
      source: elevationSnap.source,
      sourceId: elevationSnap.sourceId,
    });
  }

  if (!elevationSnap) {
    const standardElevation = closestCandidate(input.candidateElevation, [
      { candidate: 0, source: 'elevation' },
      { candidate: inchesToSixteenths(54), source: 'elevation' },
    ]);
    if (standardElevation) {
      elevation = standardElevation.candidate;
      guides.push({ axis: 'elevation', value: elevation, source: 'elevation' });
    }
  }

  if (!offsetSnap) {
    offsetX = Math.round(offsetX / GRID_SIZE) * GRID_SIZE;
    guides.push({ axis: 'offset', value: offsetX, source: 'grid' });
  }
  if (!elevationSnap && !guides.some((guide) => guide.axis === 'elevation')) {
    elevation = Math.round(elevation / GRID_SIZE) * GRID_SIZE;
    guides.push({ axis: 'elevation', value: elevation, source: 'grid' });
  }

  return { offsetX, elevation, guides };
}

interface SnapCandidate {
  candidate: Sixteenths;
  source: SnapGuide['source'];
  sourceId?: string;
}

function addEntityEdgeCandidates<
  T extends {
    entity: {
      id: string;
      offsetX: Sixteenths;
      elevation: Sixteenths;
      width: Sixteenths;
      height: Sixteenths;
    };
    source: 'cabinet' | 'opening' | 'appliance';
  },
>(
  offsetCandidates: SnapCandidate[],
  elevationCandidates: SnapCandidate[],
  entries: T[],
  movingWidth: Sixteenths,
  movingHeight: Sixteenths,
): void {
  for (const { entity, source } of entries) {
    const left = entity.offsetX;
    const right = entity.offsetX + entity.width;
    const bottom = entity.elevation;
    const top = entity.elevation + entity.height;
    offsetCandidates.push(
      { candidate: left, source, sourceId: entity.id },
      { candidate: right, source, sourceId: entity.id },
      { candidate: left - movingWidth, source, sourceId: entity.id },
      { candidate: right - movingWidth, source, sourceId: entity.id },
    );
    elevationCandidates.push(
      { candidate: bottom, source, sourceId: entity.id },
      { candidate: top, source, sourceId: entity.id },
      { candidate: bottom - movingHeight, source, sourceId: entity.id },
      { candidate: top - movingHeight, source, sourceId: entity.id },
    );
  }
}

function closestCandidate(value: Sixteenths, candidates: SnapCandidate[]): SnapCandidate | null {
  let best: SnapCandidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.candidate - value);
    if (
      distance <= OBJECT_SNAP_THRESHOLD &&
      (distance < bestDistance ||
        (distance === bestDistance &&
          candidate.candidate < (best?.candidate ?? Number.POSITIVE_INFINITY)))
    ) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
