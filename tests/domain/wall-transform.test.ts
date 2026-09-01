import { describe, expect, it } from 'vitest';
import { createDefaultCabinetBuildConfig } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import { createDefaultWalls, getCabinetBoundingBox, type Wall } from '@/domain/geometry/models';
import { inchesToSixteenths } from '@/domain/geometry/units';
import {
  getWorldBoundingBox,
  wallLocalToWorld,
  worldToWallLocal,
} from '@/domain/geometry/wall-transform';

function orientedWall(normalAngleDegrees: number): Wall {
  const start = { x: inchesToSixteenths(24), y: inchesToSixteenths(36) };
  const length = inchesToSixteenths(120);
  const radians = (normalAngleDegrees * Math.PI) / 180;
  return {
    id: `wall-${normalAngleDegrees}`,
    name: `${normalAngleDegrees} degree wall`,
    start,
    end: {
      x: Math.round(start.x + length * Math.cos(radians)),
      y: Math.round(start.y - length * Math.sin(radians)),
    },
    length,
    height: inchesToSixteenths(96),
    thickness: inchesToSixteenths(4.5),
    normalAngleDegrees,
  };
}

describe('wall-local geometry transforms', () => {
  it.each([0, 90, 180, 270])(
    'round-trips local and world positions at %i degrees',
    (normalAngleDegrees) => {
      const wall = orientedWall(normalAngleDegrees);
      const local = {
        offsetX: inchesToSixteenths(31.25),
        elevation: inchesToSixteenths(42.5),
        depthOffset: inchesToSixteenths(18.75),
      };
      const world = wallLocalToWorld(wall, local);
      expect(worldToWallLocal(wall, world)).toEqual(local);
    },
  );

  it('produces distinct cabinet world bounds on L, U, and galley walls', () => {
    const dimensions = inchesToSixteenths(144);
    const height = inchesToSixteenths(96);
    const shapes = ['l_shape', 'u_shape', 'galley'] as const;
    const definition = getCabinetDefinitionByCode('B30')!;

    for (const shape of shapes) {
      const walls = createDefaultWalls(dimensions, dimensions, height, shape);
      const bounds = walls.map((wall, index) =>
        getWorldBoundingBox(
          wall,
          getCabinetBoundingBox({
            id: `cab-${shape}-${index}`,
            definitionId: 'B30',
            source: 'stock',
            wallId: wall.id,
            name: 'Test cabinet',
            category: 'base',
            offsetX: inchesToSixteenths(12),
            elevation: 0,
            width: inchesToSixteenths(30),
            height: inchesToSixteenths(34.5),
            depth: inchesToSixteenths(24),
            doorSwing: 'double',
            doorStyleId: 'shaker',
            finishId: 'polar_white',
            hardwareId: 'matte_black_bar',
            build: createDefaultCabinetBuildConfig(definition),
          }),
        ),
      );
      expect(new Set(bounds.map((box) => JSON.stringify(box))).size).toBe(walls.length);
    }
  });

  it('uses one transform for openings, appliances, and built-ins', () => {
    const wall = orientedWall(90);
    const common = {
      offsetX: inchesToSixteenths(20),
      elevation: inchesToSixteenths(30),
      depthOffset: inchesToSixteenths(6),
    };
    const openingWorld = wallLocalToWorld(wall, common);
    const applianceWorld = wallLocalToWorld(wall, common);
    const builtInWorld = wallLocalToWorld(wall, common);

    expect(openingWorld).toEqual(applianceWorld);
    expect(applianceWorld).toEqual(builtInWorld);
  });
});
