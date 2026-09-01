import type { BoundingBox3D, Vector3D, Wall } from './models';
import type { Sixteenths } from './units';

export interface WallLocalPoint {
  offsetX: Sixteenths;
  elevation: Sixteenths;
  depthOffset: Sixteenths;
}

export function wallLocalToWorld(wall: Wall, point: WallLocalPoint): Vector3D {
  const rotation = getWallRotationRadians(wall);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    x: Math.round(wall.start.x + point.offsetX * cosine + point.depthOffset * sine),
    y: point.elevation,
    z: Math.round(wall.start.y - point.offsetX * sine + point.depthOffset * cosine),
  };
}

export function worldToWallLocal(wall: Wall, point: Vector3D): WallLocalPoint {
  const rotation = getWallRotationRadians(wall);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const deltaX = point.x - wall.start.x;
  const deltaZ = point.z - wall.start.y;

  return {
    offsetX: Math.round(deltaX * cosine - deltaZ * sine),
    elevation: Math.round(point.y),
    depthOffset: Math.round(deltaX * sine + deltaZ * cosine),
  };
}

export function getWallRotationRadians(wall: Wall): number {
  return (wall.normalAngleDegrees * Math.PI) / 180;
}

export function getWorldBoundingBox(wall: Wall, localBounds: BoundingBox3D): BoundingBox3D {
  const corners: Vector3D[] = [];
  for (const offsetX of [localBounds.min.x, localBounds.max.x]) {
    for (const elevation of [localBounds.min.y, localBounds.max.y]) {
      for (const depthOffset of [localBounds.min.z, localBounds.max.z]) {
        corners.push(wallLocalToWorld(wall, { offsetX, elevation, depthOffset }));
      }
    }
  }

  return {
    min: {
      x: Math.min(...corners.map((corner) => corner.x)),
      y: Math.min(...corners.map((corner) => corner.y)),
      z: Math.min(...corners.map((corner) => corner.z)),
    },
    max: {
      x: Math.max(...corners.map((corner) => corner.x)),
      y: Math.max(...corners.map((corner) => corner.y)),
      z: Math.max(...corners.map((corner) => corner.z)),
    },
  };
}
