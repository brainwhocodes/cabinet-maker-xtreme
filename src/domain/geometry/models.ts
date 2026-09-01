import { inchesToSixteenths, type Sixteenths } from './units';

export type WallId = string;
export type CabinetInstanceId = string;
export type OpeningId = string;
export type ApplianceId = string;

export type LayoutShape = 'single_wall' | 'l_shape' | 'u_shape' | 'galley';

export interface Point2D {
  x: Sixteenths;
  y: Sixteenths;
}

export interface Vector3D {
  x: Sixteenths;
  y: Sixteenths;
  z: Sixteenths;
}

export interface BoundingBox3D {
  min: Vector3D;
  max: Vector3D;
}

export interface Wall {
  id: WallId;
  name: string;
  start: Point2D;
  end: Point2D;
  length: Sixteenths;
  height: Sixteenths;
  thickness: Sixteenths;
  normalAngleDegrees: number; // 0 = facing +Y, 90 = facing +X, 180 = facing -Y, 270 = facing -X
}

export type OpeningType =
  | 'door'
  | 'window'
  | 'pass_through'
  | 'plumbing_center'
  | 'electrical_outlet';

export interface Opening {
  id: OpeningId;
  wallId: WallId;
  type: OpeningType;
  name: string;
  offsetX: Sixteenths; // Offset from wall start
  elevation: Sixteenths; // From floor
  width: Sixteenths;
  height: Sixteenths;
  depth: Sixteenths;
}

export type ApplianceType =
  | 'refrigerator'
  | 'range'
  | 'cooktop'
  | 'wall_oven'
  | 'dishwasher'
  | 'sink'
  | 'microwave';

export interface Appliance {
  id: ApplianceId;
  wallId: WallId;
  type: ApplianceType;
  name: string;
  offsetX: Sixteenths;
  elevation: Sixteenths;
  width: Sixteenths;
  height: Sixteenths;
  depth: Sixteenths;
}

export type CabinetCategory = 'base' | 'wall' | 'tall' | 'corner' | 'filler' | 'trim';
export type DoorSwing = 'left' | 'right' | 'double' | 'drawers' | 'open_shelf' | 'false_front';

export type CabinetSource = 'stock' | 'built';
export type CabinetConstruction = 'frameless' | 'face_frame';
export type ShelfLayout = 'even' | 'custom';
export type HardwarePlacement = 'auto' | 'upper' | 'center' | 'lower';
export type CabinetFrontLayout =
  | 'single_door'
  | 'double_door'
  | 'door_and_drawer'
  | 'drawers'
  | 'open'
  | 'false_front';

export interface CabinetBuildConfig {
  construction: CabinetConstruction;
  carcassThickness: Sixteenths;
  backThickness: Sixteenths;
  shelfThickness: Sixteenths;
  faceFrameWidth: Sixteenths;
  frontLayout: CabinetFrontLayout;
  drawerCount: number;
  shelfCount: number;
  shelfLayout: ShelfLayout;
  shelfElevations: Sixteenths[];
  includeHardware: boolean;
  hardwarePlacement: HardwarePlacement;
  leftFinishedEnd: boolean;
  rightFinishedEnd: boolean;
  toeKickHeight: Sixteenths;
  toeKickDepth: Sixteenths;
  drawerSlideId?: string;
  drawerBoxId?: string;
  hingeId?: string;
}

export interface CabinetInstance {
  id: CabinetInstanceId;
  definitionId: string; // References catalog definition code (e.g. 'B30', 'SB36', 'W3036')
  source: CabinetSource;
  wallId: WallId;
  name: string;
  category: CabinetCategory;
  offsetX: Sixteenths; // Position along wall from start
  elevation: Sixteenths; // Distance from floor (0 for base, ~54" for standard uppers)
  width: Sixteenths;
  height: Sixteenths;
  depth: Sixteenths;
  doorSwing: DoorSwing;
  doorStyleId: string; // 'shaker', 'slab', 'raised_panel'
  finishId: string; // Outer / Exterior finish: 'polar_white', 'natural_oak', 'matte_navy', 'charcoal_slate'
  interiorFinishId?: string; // Inner / Interior finish: 'natural_birch', 'white_melamine', 'matching_oak', 'slate_linen'
  hardwareId: string; // 'matte_black_pull', 'brushed_brass_pull', 'satin_nickel_pull'
  build: CabinetBuildConfig;
  isCustomFiller?: boolean;
}

export type BuiltInElementType =
  | 'countertop'
  | 'end_panel'
  | 'toe_kick'
  | 'crown'
  | 'light_rail'
  | 'floating_shelf';

export interface BuiltInElement {
  id: string;
  definitionId: string;
  type: BuiltInElementType;
  origin: 'manual' | 'run_generated';
  name: string;
  wallId: WallId;
  offsetX: Sixteenths;
  elevation: Sixteenths;
  depthOffset: Sixteenths;
  width: Sixteenths;
  height: Sixteenths;
  depth: Sixteenths;
  finishId: string;
  attachedCabinetIds: CabinetInstanceId[];
}

export interface RoomProject {
  id: string;
  name: string;
  revision: number;
  layoutShape: LayoutShape;
  width: Sixteenths;
  length: Sixteenths;
  ceilingHeight: Sixteenths;
  walls: Wall[];
  openings: Opening[];
  appliances: Appliance[];
  cabinets: CabinetInstance[];
  builtInElements: BuiltInElement[];
  activeWallId: WallId;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculates 3D bounding box for a placed cabinet along its parent wall.
 */
export function getCabinetBoundingBox(cabinet: CabinetInstance): BoundingBox3D {
  return {
    min: {
      x: cabinet.offsetX,
      y: cabinet.elevation,
      z: 0,
    },
    max: {
      x: cabinet.offsetX + cabinet.width,
      y: cabinet.elevation + cabinet.height,
      z: cabinet.depth,
    },
  };
}

/**
 * Checks if two 3D bounding boxes intersect (AABB collision detection).
 */
export function doBoundingBoxesOverlap(a: BoundingBox3D, b: BoundingBox3D): boolean {
  const xOverlap = a.min.x < b.max.x && a.max.x > b.min.x;
  const yOverlap = a.min.y < b.max.y && a.max.y > b.min.y;
  const zOverlap = a.min.z < b.max.z && a.max.z > b.min.z;
  return xOverlap && yOverlap && zOverlap;
}

/**
 * Creates default room walls based on layout shape and dimensions.
 */
export function createDefaultWalls(
  width: Sixteenths,
  length: Sixteenths,
  height: Sixteenths,
  shape: LayoutShape,
): Wall[] {
  const wallThickness = inchesToSixteenths(4.5);

  switch (shape) {
    case 'single_wall':
      return [
        {
          id: 'wall-1',
          name: 'Main Wall (North)',
          start: { x: 0, y: 0 },
          end: { x: width, y: 0 },
          length: width,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 0,
        },
      ];

    case 'l_shape':
      return [
        {
          id: 'wall-1',
          name: 'Back Wall (North)',
          start: { x: 0, y: 0 },
          end: { x: width, y: 0 },
          length: width,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 0,
        },
        {
          id: 'wall-2',
          name: 'Side Wall (East)',
          start: { x: width, y: 0 },
          end: { x: width, y: length },
          length: length,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 270,
        },
      ];

    case 'u_shape':
      return [
        {
          id: 'wall-1',
          name: 'Left Wall (West)',
          start: { x: 0, y: length },
          end: { x: 0, y: 0 },
          length: length,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 90,
        },
        {
          id: 'wall-2',
          name: 'Back Wall (North)',
          start: { x: 0, y: 0 },
          end: { x: width, y: 0 },
          length: width,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 0,
        },
        {
          id: 'wall-3',
          name: 'Right Wall (East)',
          start: { x: width, y: 0 },
          end: { x: width, y: length },
          length: length,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 270,
        },
      ];

    case 'galley':
      return [
        {
          id: 'wall-1',
          name: 'North Wall',
          start: { x: 0, y: 0 },
          end: { x: width, y: 0 },
          length: width,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 0,
        },
        {
          id: 'wall-2',
          name: 'South Wall (Opposite)',
          start: { x: width, y: length },
          end: { x: 0, y: length },
          length: width,
          height: height,
          thickness: wallThickness,
          normalAngleDegrees: 180,
        },
      ];
  }
}
