import {
  type Appliance,
  type BoundingBox3D,
  type BuiltInElement,
  type CabinetInstance,
  doBoundingBoxesOverlap,
  getCabinetBoundingBox,
  type Opening,
  type RoomProject,
  type Wall,
} from '../geometry/models';
import { formatFractionalInches, inchesToSixteenths } from '../geometry/units';

const RUN_FINISH_TYPES = new Set<BuiltInElement['type']>([
  'countertop',
  'end_panel',
  'toe_kick',
  'crown',
  'light_rail',
]);

import { getWorldBoundingBox } from '../geometry/wall-transform';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  ruleId: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  affectedCabinetIds: string[];
  affectedWallId?: string;
  suggestedAction?: string;
}

export interface ValidationReport {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

export function validateRoomProject(project: RoomProject): ValidationReport {
  const issues: ValidationIssue[] = [];
  const wallById = new Map(project.walls.map((wall) => [wall.id, wall]));
  const cabinetById = new Map(project.cabinets.map((cabinet) => [cabinet.id, cabinet]));
  const cabinetsByWall = groupByWall(project.cabinets, project.walls);
  const builtInsByWall = groupByWall(project.builtInElements, project.walls);

  validateWallAttachments(project, wallById, issues);
  validateCabinetBounds(project.cabinets, wallById, issues);
  validateBuiltInBounds(project.builtInElements, wallById, cabinetById, issues);
  validateObstacleBounds(project.openings, 'Opening', wallById, issues);
  validateObstacleBounds(project.appliances, 'Appliance', wallById, issues);

  for (const wall of project.walls) {
    const wallCabinets = cabinetsByWall.get(wall.id) ?? [];
    for (let first = 0; first < wallCabinets.length; first += 1) {
      const cabinetA = wallCabinets[first];
      const boundsA = getCabinetBoundingBox(cabinetA);
      for (let second = first + 1; second < wallCabinets.length; second += 1) {
        const cabinetB = wallCabinets[second];
        if (doBoundingBoxesOverlap(boundsA, getCabinetBoundingBox(cabinetB))) {
          issues.push(collisionIssue(cabinetA, cabinetB, wall));
        }
      }
    }
  }

  validateCrossWallCabinetCollisions(project.cabinets, wallById, issues);
  validateObstacleCollisions(project.openings, 'opening', cabinetsByWall, builtInsByWall, issues);
  validateObstacleCollisions(
    project.appliances,
    'appliance',
    cabinetsByWall,
    builtInsByWall,
    issues,
  );
  validateBuiltInCollisions(project, wallById, issues);
  addCabinetGuidance(project, cabinetsByWall, issues);

  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const infoCount = issues.filter((issue) => issue.severity === 'info').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues,
  };
}

function groupByWall<T extends { wallId: string }>(entities: T[], walls: Wall[]): Map<string, T[]> {
  const grouped = new Map(walls.map((wall) => [wall.id, [] as T[]]));
  for (const entity of entities) {
    const group = grouped.get(entity.wallId);
    if (group) group.push(entity);
  }
  return grouped;
}

function validateWallAttachments(
  project: RoomProject,
  wallById: Map<string, Wall>,
  issues: ValidationIssue[],
): void {
  const entities = [
    ...project.cabinets.map((entity) => ({ entity, kind: 'Cabinet' })),
    ...project.builtInElements.map((entity) => ({ entity, kind: 'Built-in element' })),
    ...project.openings.map((entity) => ({ entity, kind: 'Opening' })),
    ...project.appliances.map((entity) => ({ entity, kind: 'Appliance' })),
  ];
  for (const { entity, kind } of entities) {
    if (!wallById.has(entity.wallId)) {
      issues.push({
        id: `orphan-wall-${entity.id}`,
        ruleId: 'orphan_wall',
        severity: 'error',
        title: `${kind} References a Missing Wall`,
        message: `"${entity.name}" references wall "${entity.wallId}", which is not part of this project.`,
        affectedCabinetIds: [entity.id],
        affectedWallId: entity.wallId,
        suggestedAction: 'Assign the entity to an existing wall or remove it.',
      });
    }
  }
}

function validateCabinetBounds(
  cabinets: CabinetInstance[],
  wallById: Map<string, Wall>,
  issues: ValidationIssue[],
): void {
  for (const cabinet of cabinets) {
    const wall = wallById.get(cabinet.wallId);
    if (!wall) continue;
    validateDimensions(cabinet, 'Cabinet', issues);
    validateLocalWallBounds(cabinet, wall, issues);
  }
}

function validateBuiltInBounds(
  elements: BuiltInElement[],
  wallById: Map<string, Wall>,
  cabinetById: Map<string, CabinetInstance>,
  issues: ValidationIssue[],
): void {
  for (const element of elements) {
    const wall = wallById.get(element.wallId);
    if (!wall) continue;
    validateDimensions(element, 'Built-in element', issues);
    validateLocalWallBounds(element, wall, issues);
    if (element.depthOffset < 0) {
      issues.push({
        id: `builtin-depth-${element.id}`,
        ruleId: 'built_in_wall_bounds',
        severity: 'error',
        title: 'Built-in Element Extends Behind Wall Plane',
        message: `"${element.name}" has a negative wall depth offset.`,
        affectedCabinetIds: [element.id],
        affectedWallId: wall.id,
        suggestedAction: 'Set depth offset to zero or a positive value.',
      });
    }
    for (const cabinetId of element.attachedCabinetIds) {
      if (!cabinetById.has(cabinetId)) {
        issues.push({
          id: `orphan-attachment-${element.id}-${cabinetId}`,
          ruleId: 'orphan_attachment',
          severity: 'error',
          title: 'Built-in Attachment References a Missing Cabinet',
          message: `"${element.name}" references missing cabinet "${cabinetId}".`,
          affectedCabinetIds: [element.id, cabinetId],
          affectedWallId: wall.id,
          suggestedAction: 'Regenerate the run or remove the orphan attachment.',
        });
      }
    }
  }
}

function validateObstacleBounds<T extends Opening | Appliance>(
  obstacles: T[],
  kind: 'Opening' | 'Appliance',
  wallById: Map<string, Wall>,
  issues: ValidationIssue[],
): void {
  for (const obstacle of obstacles) {
    const wall = wallById.get(obstacle.wallId);
    if (!wall) continue;
    validateDimensions(obstacle, kind, issues);
    validateLocalWallBounds(obstacle, wall, issues);
  }
}

function validateDimensions(
  entity: {
    id: string;
    name: string;
    wallId: string;
    width: number;
    height: number;
    depth: number;
  },
  kind: string,
  issues: ValidationIssue[],
): void {
  if (entity.width > 0 && entity.height > 0 && entity.depth > 0) return;
  issues.push({
    id: `invalid-dimensions-${entity.id}`,
    ruleId: 'invalid_dimensions',
    severity: 'error',
    title: `${kind} Has Invalid Dimensions`,
    message: `"${entity.name}" must have positive width, height, and depth.`,
    affectedCabinetIds: [entity.id],
    affectedWallId: entity.wallId,
    suggestedAction: 'Enter dimensions greater than zero.',
  });
}

function validateLocalWallBounds(
  entity: {
    id: string;
    name: string;
    wallId: string;
    offsetX: number;
    elevation: number;
    width: number;
    height: number;
  },
  wall: Wall,
  issues: ValidationIssue[],
): void {
  if (entity.offsetX < 0) {
    issues.push({
      id: `wall-bound-left-${entity.id}`,
      ruleId: 'wall_boundaries',
      severity: 'error',
      title: 'Entity Exceeds Wall Start',
      message: `"${entity.name}" extends ${formatFractionalInches(Math.abs(entity.offsetX))} past the start of ${wall.name}.`,
      affectedCabinetIds: [entity.id],
      affectedWallId: wall.id,
      suggestedAction: 'Move the entity to offset zero or greater.',
    });
  }
  if (entity.offsetX + entity.width > wall.length) {
    const overflow = entity.offsetX + entity.width - wall.length;
    issues.push({
      id: `wall-bound-right-${entity.id}`,
      ruleId: 'wall_boundaries',
      severity: 'error',
      title: 'Entity Exceeds Wall End',
      message: `"${entity.name}" extends ${formatFractionalInches(overflow)} past the end of ${wall.name}.`,
      affectedCabinetIds: [entity.id],
      affectedWallId: wall.id,
      suggestedAction: 'Reduce width or move the entity toward the wall start.',
    });
  }
  if (entity.elevation < 0) {
    issues.push({
      id: `below-floor-${entity.id}`,
      ruleId: 'floor_clearance',
      severity: 'error',
      title: 'Entity Extends Below Floor',
      message: `"${entity.name}" starts below floor elevation.`,
      affectedCabinetIds: [entity.id],
      affectedWallId: wall.id,
      suggestedAction: 'Set elevation to zero or greater.',
    });
  }
  if (entity.elevation + entity.height > wall.height) {
    const overflow = entity.elevation + entity.height - wall.height;
    issues.push({
      id: `ceiling-collision-${entity.id}`,
      ruleId: 'ceiling_clearance',
      severity: 'error',
      title: 'Entity Exceeds Ceiling Height',
      message: `"${entity.name}" penetrates the ceiling by ${formatFractionalInches(overflow)}.`,
      affectedCabinetIds: [entity.id],
      affectedWallId: wall.id,
      suggestedAction: 'Lower the entity or reduce its height.',
    });
  }
}

function validateCrossWallCabinetCollisions(
  cabinets: CabinetInstance[],
  wallById: Map<string, Wall>,
  issues: ValidationIssue[],
): void {
  for (let first = 0; first < cabinets.length; first += 1) {
    const cabinetA = cabinets[first];
    const wallA = wallById.get(cabinetA.wallId);
    if (!wallA) continue;
    const boundsA = getWorldBoundingBox(wallA, getCabinetBoundingBox(cabinetA));
    for (let second = first + 1; second < cabinets.length; second += 1) {
      const cabinetB = cabinets[second];
      if (cabinetA.wallId === cabinetB.wallId) continue;
      const wallB = wallById.get(cabinetB.wallId);
      if (!wallB) continue;
      const boundsB = getWorldBoundingBox(wallB, getCabinetBoundingBox(cabinetB));
      if (doBoundingBoxesOverlap(boundsA, boundsB)) {
        issues.push({
          id: `cross-wall-collision-${cabinetA.id}-${cabinetB.id}`,
          ruleId: 'physical_overlap',
          severity: 'error',
          title: 'Cabinets Collide Across a Wall Corner',
          message: `"${cabinetA.name}" and "${cabinetB.name}" occupy the same world-space corner volume.`,
          affectedCabinetIds: [cabinetA.id, cabinetB.id],
          suggestedAction:
            'Move one cabinet away from the corner or add the required filler clearance.',
        });
      }
    }
  }
}

function validateObstacleCollisions<T extends Opening | Appliance>(
  obstacles: T[],
  kind: 'opening' | 'appliance',
  cabinetsByWall: Map<string, CabinetInstance[]>,
  builtInsByWall: Map<string, BuiltInElement[]>,
  issues: ValidationIssue[],
): void {
  for (const obstacle of obstacles) {
    const obstacleBounds = localBounds(obstacle, 0);
    for (const cabinet of cabinetsByWall.get(obstacle.wallId) ?? []) {
      if (doBoundingBoxesOverlap(getCabinetBoundingBox(cabinet), obstacleBounds)) {
        issues.push({
          id: `${kind}-clash-${obstacle.id}-${cabinet.id}`,
          ruleId: `${kind}_clearance`,
          severity: 'error',
          title: `Cabinet Blocks ${obstacle.name}`,
          message: `"${cabinet.name}" intersects ${kind} "${obstacle.name}".`,
          affectedCabinetIds: [cabinet.id, obstacle.id],
          affectedWallId: obstacle.wallId,
          suggestedAction: `Relocate the cabinet away from the ${kind} span.`,
        });
      }
    }
    for (const element of builtInsByWall.get(obstacle.wallId) ?? []) {
      if (kind === 'appliance' && obstacle.type === 'sink' && element.type === 'countertop') {
        continue;
      }
      if (doBoundingBoxesOverlap(localBounds(element, element.depthOffset), obstacleBounds)) {
        issues.push({
          id: `${kind}-builtin-clash-${obstacle.id}-${element.id}`,
          ruleId: `${kind}_clearance`,
          severity: 'error',
          title: `Built-in Element Blocks ${obstacle.name}`,
          message: `"${element.name}" intersects ${kind} "${obstacle.name}".`,
          affectedCabinetIds: [element.id, obstacle.id],
          affectedWallId: obstacle.wallId,
          suggestedAction: `Move or resize the built-in away from the ${kind} span.`,
        });
      }
    }
  }
}

function validateBuiltInCollisions(
  project: RoomProject,
  wallById: Map<string, Wall>,
  issues: ValidationIssue[],
): void {
  for (const element of project.builtInElements) {
    const elementWall = wallById.get(element.wallId);
    if (!elementWall) continue;
    const elementLocalBounds = localBounds(element, element.depthOffset);
    const elementWorldBounds = getWorldBoundingBox(elementWall, elementLocalBounds);

    for (const cabinet of project.cabinets) {
      if (isAllowedAttachment(element, cabinet)) continue;
      const cabinetWall = wallById.get(cabinet.wallId);
      if (!cabinetWall) continue;
      const overlaps =
        cabinet.wallId === element.wallId
          ? doBoundingBoxesOverlap(elementLocalBounds, getCabinetBoundingBox(cabinet))
          : doBoundingBoxesOverlap(
              elementWorldBounds,
              getWorldBoundingBox(cabinetWall, getCabinetBoundingBox(cabinet)),
            );
      if (overlaps) {
        issues.push({
          id: `builtin-cabinet-collision-${element.id}-${cabinet.id}`,
          ruleId: 'built_in_overlap',
          severity: 'error',
          title: 'Built-in Element Collides with Cabinet',
          message: `"${element.name}" intersects unrelated cabinet "${cabinet.name}".`,
          affectedCabinetIds: [element.id, cabinet.id],
          affectedWallId: element.wallId,
          suggestedAction: 'Move the built-in or attach it to the intended cabinet run.',
        });
      }
    }
  }

  for (let first = 0; first < project.builtInElements.length; first += 1) {
    const elementA = project.builtInElements[first];
    const wallA = wallById.get(elementA.wallId);
    if (!wallA) continue;
    for (let second = first + 1; second < project.builtInElements.length; second += 1) {
      const elementB = project.builtInElements[second];
      if (isAllowedRunFinishIntersection(elementA, elementB)) continue;
      const wallB = wallById.get(elementB.wallId);
      if (!wallB) continue;
      const boundsA = localBounds(elementA, elementA.depthOffset);
      const boundsB = localBounds(elementB, elementB.depthOffset);
      const overlaps =
        elementA.wallId === elementB.wallId
          ? doBoundingBoxesOverlap(boundsA, boundsB)
          : doBoundingBoxesOverlap(
              getWorldBoundingBox(wallA, boundsA),
              getWorldBoundingBox(wallB, boundsB),
            );
      if (overlaps) {
        issues.push({
          id: `builtin-collision-${elementA.id}-${elementB.id}`,
          ruleId: 'built_in_overlap',
          severity: 'error',
          title: 'Built-in Elements Overlap',
          message: `"${elementA.name}" and "${elementB.name}" occupy the same space.`,
          affectedCabinetIds: [elementA.id, elementB.id],
          suggestedAction: 'Move or resize one built-in element.',
        });
      }
    }
  }
}

function localBounds(
  entity: { offsetX: number; elevation: number; width: number; height: number; depth: number },
  depthOffset: number,
): BoundingBox3D {
  return {
    min: { x: entity.offsetX, y: entity.elevation, z: depthOffset },
    max: {
      x: entity.offsetX + entity.width,
      y: entity.elevation + entity.height,
      z: depthOffset + entity.depth,
    },
  };
}

function isAllowedAttachment(element: BuiltInElement, cabinet: CabinetInstance): boolean {
  return (
    element.attachedCabinetIds.includes(cabinet.id) &&
    (element.type === 'countertop' || element.type === 'end_panel' || element.type === 'toe_kick')
  );
}

function isAllowedRunFinishIntersection(first: BuiltInElement, second: BuiltInElement): boolean {
  if (first.origin !== 'run_generated' || second.origin !== 'run_generated') return false;
  let sharesCabinet = false;
  for (const firstId of first.attachedCabinetIds) {
    for (const secondId of second.attachedCabinetIds) {
      if (firstId === secondId) {
        sharesCabinet = true;
        break;
      }
    }
    if (sharesCabinet) break;
  }
  return (
    sharesCabinet &&
    first.type !== second.type &&
    RUN_FINISH_TYPES.has(first.type) &&
    RUN_FINISH_TYPES.has(second.type)
  );
}

function collisionIssue(
  cabinetA: CabinetInstance,
  cabinetB: CabinetInstance,
  wall: Wall,
): ValidationIssue {
  return {
    id: `cabinet-collision-${cabinetA.id}-${cabinetB.id}`,
    ruleId: 'physical_overlap',
    severity: 'error',
    title: 'Cabinets Overlap in 3D Space',
    message: `"${cabinetA.name}" and "${cabinetB.name}" collide along ${wall.name}.`,
    affectedCabinetIds: [cabinetA.id, cabinetB.id],
    affectedWallId: wall.id,
    suggestedAction: 'Adjust one cabinet offset to eliminate the collision.',
  };
}

function addCabinetGuidance(
  project: RoomProject,
  cabinetsByWall: Map<string, CabinetInstance[]>,
  issues: ValidationIssue[],
): void {
  for (const wall of project.walls) {
    for (const cabinet of cabinetsByWall.get(wall.id) ?? []) {
      if (
        cabinet.offsetX === 0 &&
        (cabinet.doorSwing === 'left' || cabinet.doorSwing === 'drawers')
      ) {
        issues.push({
          id: `corner-filler-left-${cabinet.id}`,
          ruleId: 'nkba_corner_filler',
          severity: 'warning',
          title: 'Corner Filler Recommended for Door Clearance',
          message: `"${cabinet.name}" is flush with the wall start. Its front may rub the adjacent wall or trim.`,
          affectedCabinetIds: [cabinet.id],
          affectedWallId: wall.id,
          suggestedAction: 'Insert a matching filler strip between the corner and cabinet.',
        });
      }
    }
  }

  const plumbingByWall = new Map<string, Opening>();
  for (const opening of project.openings) {
    if (opening.type === 'plumbing_center' && !plumbingByWall.has(opening.wallId)) {
      plumbingByWall.set(opening.wallId, opening);
    }
  }
  for (const sink of project.cabinets) {
    if (!sink.definitionId.startsWith('SB')) continue;
    const plumbing = plumbingByWall.get(sink.wallId);
    if (!plumbing) continue;
    const drift = Math.abs(sink.offsetX + sink.width / 2 - (plumbing.offsetX + plumbing.width / 2));
    if (drift > inchesToSixteenths(3)) {
      issues.push({
        id: `sink-plumbing-drift-${sink.id}`,
        ruleId: 'nkba_plumbing_alignment',
        severity: 'warning',
        title: 'Sink Base Off-Center from Plumbing Anchor',
        message: `"${sink.name}" is offset ${formatFractionalInches(drift)} from plumbing anchor "${plumbing.name}".`,
        affectedCabinetIds: [sink.id],
        affectedWallId: sink.wallId,
        suggestedAction: 'Align the sink-base center with the plumbing anchor.',
      });
    }
  }

  if (project.layoutShape === 'galley' && project.length < inchesToSixteenths(36)) {
    issues.push({
      id: 'galley-walkway-tight',
      ruleId: 'nkba_walkway_clearance',
      severity: 'warning',
      title: 'Walkway Width Below Recommended Clearance',
      message: `Opposing wall distance is ${formatFractionalInches(project.length)}. Allow at least 36 inches between opposing runs.`,
      affectedCabinetIds: [],
      suggestedAction: 'Increase room width or verify traffic clearances.',
    });
  }
}
