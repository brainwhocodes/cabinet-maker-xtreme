import type { RoomProject, Wall } from '@/domain/geometry/models';
import { sixteenthsToInches } from '@/domain/geometry/units';
import { wallLocalToWorld } from '@/domain/geometry/wall-transform';

export type ClashType =
  | 'appliance_door_drop'
  | 'corner_drawer_bind'
  | 'walkway_obstruction'
  | 'door_swing_overlap';

export interface ClashEvent {
  clashId: string;
  entityIdA: string;
  entityIdB: string;
  entityNameA: string;
  entityNameB: string;
  clashType: ClashType;
  severity: 'warning' | 'error';
  description: string;
  mitigation: string;
}

interface BoundingBoxSimple {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Evaluates 3D physical clashes when cabinet doors swing open and appliance doors drop open.
 */
export function detectDynamicClashes(project: RoomProject): ClashEvent[] {
  const clashes: ClashEvent[] = [];
  const wallById = new Map<string, Wall>(project.walls.map((w) => [w.id, w]));

  // 1. Check dishwasher door drop clash (projects 24" into room from appliance face)
  const dishwashers = project.appliances.filter((a) => a.type === 'dishwasher');
  for (const dw of dishwashers) {
    const wall = wallById.get(dw.wallId);
    if (!wall) continue;

    const dwWidth = sixteenthsToInches(dw.width);
    const dwHeight = sixteenthsToInches(dw.height);
    const dwOffset = sixteenthsToInches(dw.offsetX);

    // Open dishwasher door volume extends 24" into room
    const dwWorldStart = wallLocalToWorld(wall, {
      offsetX: dw.offsetX,
      elevation: 0,
      depthOffset: dw.depth,
    });
    const dwWorldEnd = wallLocalToWorld(wall, {
      offsetX: dw.offsetX + dw.width,
      elevation: dw.height,
      depthOffset: dw.depth + 384, // 24 inches = 384 sixteenths
    });

    const dwBox: BoundingBoxSimple = {
      minX: Math.min(dwWorldStart.x, dwWorldEnd.x),
      maxX: Math.max(dwWorldStart.x, dwWorldEnd.x),
      minY: 0,
      maxY: dwHeight,
      minZ: Math.min(dwWorldStart.z, dwWorldEnd.z),
      maxZ: Math.max(dwWorldStart.z, dwWorldEnd.z),
    };

    // Check adjacent cabinets on perpendicular walls or opposing runs
    for (const cab of project.cabinets) {
      if (cab.wallId === dw.wallId) {
        // Check corner proximity: if dishwasher is placed within 24" of an inside corner

        // Check corner proximity: if dishwasher is placed within 24" of an inside corner
        if (dwOffset < 24 || dwOffset + dwWidth > sixteenthsToInches(wall.length) - 24) {
          clashes.push({
            clashId: `clash-dw-corner-${dw.id}-${cab.id}`,
            entityIdA: dw.id,
            entityIdB: cab.id,
            entityNameA: dw.name,
            entityNameB: cab.definitionId,
            clashType: 'corner_drawer_bind',
            severity: 'warning',
            description: `Dishwasher is placed within 24" of room corner, which may block perpendicular cabinet drawers when open.`,
            mitigation: `Allow at least 21" to 24" between dishwasher edge and perpendicular corner return.`,
          });
          break;
        }
      } else {
        // Perpendicular or opposing wall: test 3D volume intersection
        const cabWall = wallById.get(cab.wallId);
        if (!cabWall) continue;

        const cabStart = wallLocalToWorld(cabWall, {
          offsetX: cab.offsetX,
          elevation: cab.elevation,
          depthOffset: 0,
        });
        const cabEnd = wallLocalToWorld(cabWall, {
          offsetX: cab.offsetX + cab.width,
          elevation: cab.elevation + cab.height,
          depthOffset: cab.depth + 336, // 21" drawer extension
        });

        const cabBox: BoundingBoxSimple = {
          minX: Math.min(cabStart.x, cabEnd.x),
          maxX: Math.max(cabStart.x, cabEnd.x),
          minY: sixteenthsToInches(cab.elevation),
          maxY: sixteenthsToInches(cab.elevation + cab.height),
          minZ: Math.min(cabStart.z, cabEnd.z),
          maxZ: Math.max(cabStart.z, cabEnd.z),
        };

        if (boxesIntersect(dwBox, cabBox)) {
          clashes.push({
            clashId: `clash-dw-opposing-${dw.id}-${cab.id}`,
            entityIdA: dw.id,
            entityIdB: cab.id,
            entityNameA: dw.name,
            entityNameB: cab.definitionId,
            clashType: 'appliance_door_drop',
            severity: 'error',
            description: `Open dishwasher door collides with ${cab.definitionId} on ${cabWall.name}.`,
            mitigation: `Maintain minimum 40" to 42" walkway clearance between opposing cabinet runs.`,
          });
        }
      }
    }
  }

  // 2. Check corner cabinet drawer bind in 90-degree L-shapes
  const cornerRuns = project.cabinets.filter(
    (c) => c.definitionId.startsWith('LS') || c.definitionId.startsWith('BLB'),
  );
  for (const cornerCab of cornerRuns) {
    const wall = wallById.get(cornerCab.wallId);
    if (!wall) continue;

    const cornerStart = sixteenthsToInches(cornerCab.offsetX);
    if (cornerStart < 3) {
      clashes.push({
        clashId: `clash-corner-pull-${cornerCab.id}`,
        entityIdA: cornerCab.id,
        entityIdB: cornerCab.wallId,
        entityNameA: cornerCab.definitionId,
        entityNameB: wall.name,
        clashType: 'corner_drawer_bind',
        severity: 'warning',
        description: `Corner cabinet ${cornerCab.definitionId} hardware pulls require minimum 2" filler clearance to clear adjacent door faces.`,
        mitigation: `Verify at least 2" corner filler is installed on both returns.`,
      });
    }
  }

  return clashes;
}

function boxesIntersect(a: BoundingBoxSimple, b: BoundingBoxSimple): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}
