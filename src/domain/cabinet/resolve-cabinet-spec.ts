import {
  DOOR_STYLES,
  FINISH_OPTIONS,
  HARDWARE_OPTIONS,
  INTERIOR_FINISH_OPTIONS,
} from '../catalog/standard-cabinets';
import type {
  CabinetDefinition,
  CabinetFamily,
  DoorStyleOption,
  FinishOption,
  HardwareOption,
} from '../catalog/types';
import type {
  CabinetBuildConfig,
  CabinetFrontLayout,
  CabinetInstance,
  CabinetSource,
  DoorSwing,
} from '../geometry/models';
import { inchesToSixteenths, sixteenthsToInches } from '../geometry/units';

const TOE_KICK_FAMILIES = new Set<CabinetFamily>([
  'standard_base',
  'sink_base',
  'drawer_base',
  'lazy_susan_corner',
  'tall',
  'bench',
  'media',
]);

const DRAWER_FRONT_LAYOUTS = new Set<CabinetFrontLayout>(['door_and_drawer', 'drawers']);

export interface ResolvedCabinetSpec {
  definitionId: string;
  name: string;
  source: CabinetSource;
  family: CabinetFamily;
  category: CabinetDefinition['category'];
  widthInches: number;
  heightInches: number;
  depthInches: number;
  doorSwing: DoorSwing;
  doorStyleId: string;
  finishId: string;
  interiorFinishId: string;
  hardwareId: string;
  doorStyle: DoorStyleOption;
  finish: FinishOption;
  interiorFinish: FinishOption;
  hardware: HardwareOption;
  frontLayout: CabinetFrontLayout;
  drawerCount: number;
  hasSinkCutout: boolean;
  build: CabinetBuildConfig;
  shelfElevationsInches: number[];
}

export function createDefaultCabinetBuildConfig(definition: CabinetDefinition): CabinetBuildConfig {
  const hasToeKick = TOE_KICK_FAMILIES.has(definition.family);

  return {
    construction: 'frameless',
    carcassThickness: inchesToSixteenths(0.75),
    backThickness: inchesToSixteenths(0.25),
    shelfThickness: inchesToSixteenths(0.75),
    faceFrameWidth: inchesToSixteenths(1.5),
    frontLayout: definition.frontLayout,
    drawerCount: definition.drawerCount,
    shelfCount: definition.shelfCount,
    shelfLayout: 'even',
    shelfElevations: [],
    includeHardware: definition.family !== 'filler' && definition.frontLayout !== 'open',
    hardwarePlacement: 'auto',
    leftFinishedEnd: false,
    rightFinishedEnd: false,
    toeKickHeight: hasToeKick ? inchesToSixteenths(4.5) : 0,
    toeKickDepth: hasToeKick ? inchesToSixteenths(3) : 0,
  };
}

export function resolveCabinetSpec(
  definition: CabinetDefinition,
  instance?: CabinetInstance,
): ResolvedCabinetSpec {
  if (!definition) {
    throw new Error(`Unknown cabinet definition: ${instance?.definitionId ?? 'undefined'}`);
  }

  const source = instance?.source ?? (definition.source === 'stock' ? 'stock' : 'built');
  const build = instance?.build ?? createDefaultCabinetBuildConfig(definition);
  const widthInches =
    source === 'stock' || !instance
      ? sixteenthsToInches(definition.width)
      : sixteenthsToInches(instance.width);
  const heightInches =
    source === 'stock' || !instance
      ? sixteenthsToInches(definition.height)
      : sixteenthsToInches(instance.height);
  const depthInches =
    source === 'stock' || !instance
      ? sixteenthsToInches(definition.depth)
      : sixteenthsToInches(instance.depth);

  const hardwareId = instance?.hardwareId ?? 'matte_black_bar';
  const finishId = instance?.finishId ?? 'polar_white';
  const interiorFinishId = instance?.interiorFinishId ?? 'natural_birch';
  const doorStyleId = instance?.doorStyleId ?? 'shaker';
  const hardware = HARDWARE_OPTIONS.find((option) => option.id === hardwareId);
  const finish = FINISH_OPTIONS.find((option) => option.id === finishId);
  const interiorFinish = INTERIOR_FINISH_OPTIONS.find((option) => option.id === interiorFinishId);
  const doorStyle = DOOR_STYLES.find((option) => option.id === doorStyleId);

  if (!hardware) throw new Error(`Unknown hardware option: ${hardwareId}`);
  if (!finish) throw new Error(`Unknown finish option: ${finishId}`);
  if (!interiorFinish) {
    throw new Error(`Unknown interior finish option: ${interiorFinishId}`);
  }
  if (!doorStyle) throw new Error(`Unknown door style option: ${doorStyleId}`);

  validateBuildConfig(build, widthInches, heightInches, depthInches);

  const carcassThickness = sixteenthsToInches(build.carcassThickness);
  const toeKickHeight = sixteenthsToInches(build.toeKickHeight);
  const interiorMin = toeKickHeight + carcassThickness;
  const interiorMax = heightInches - carcassThickness;
  const shelfElevationsInches =
    build.shelfLayout === 'custom'
      ? build.shelfElevations.map(sixteenthsToInches)
      : Array.from(
          { length: build.shelfCount },
          (_, index) =>
            interiorMin + ((interiorMax - interiorMin) * (index + 1)) / (build.shelfCount + 1),
        );

  validateShelfElevations(build, shelfElevationsInches, interiorMin, interiorMax);

  return {
    definitionId: definition.id,
    name: instance?.name ?? definition.name,
    source,
    family: definition.family,
    category: definition.category,
    widthInches,
    heightInches,
    depthInches,
    doorSwing: instance?.doorSwing ?? definition.defaultDoorSwing,
    doorStyleId,
    finishId,
    interiorFinishId,
    hardwareId,
    doorStyle,
    finish,
    interiorFinish,
    hardware,
    frontLayout: build.frontLayout,
    drawerCount: build.drawerCount,
    hasSinkCutout: definition.hasSinkCutout ?? false,
    build,
    shelfElevationsInches,
  };
}

function validateBuildConfig(
  build: CabinetBuildConfig,
  widthInches: number,
  heightInches: number,
  depthInches: number,
): void {
  if (!Number.isInteger(build.drawerCount) || build.drawerCount < 0 || build.drawerCount > 6) {
    throw new Error('Drawer count must be an integer from 0 through 6');
  }
  if (!Number.isInteger(build.shelfCount) || build.shelfCount < 0 || build.shelfCount > 6) {
    throw new Error('Shelf count must be an integer from 0 through 6');
  }
  if (!DRAWER_FRONT_LAYOUTS.has(build.frontLayout) && build.drawerCount !== 0) {
    throw new Error('A non-drawer front requires drawer count 0');
  }

  const carcassThickness = sixteenthsToInches(build.carcassThickness);
  const backThickness = sixteenthsToInches(build.backThickness);
  const shelfThickness = sixteenthsToInches(build.shelfThickness);
  const faceFrameWidth = sixteenthsToInches(build.faceFrameWidth);
  const toeKickHeight = sixteenthsToInches(build.toeKickHeight);
  const toeKickDepth = sixteenthsToInches(build.toeKickDepth);

  if (carcassThickness <= 0 || backThickness <= 0 || shelfThickness <= 0 || faceFrameWidth <= 0) {
    throw new Error('Cabinet thickness values must be positive');
  }
  if (toeKickHeight < 0 || toeKickDepth < 0) {
    throw new Error('Toe-kick dimensions cannot be negative');
  }
  if (
    widthInches - 2 * carcassThickness <= 0 ||
    heightInches - toeKickHeight - 2 * carcassThickness <= 0 ||
    depthInches - backThickness <= 0
  ) {
    throw new Error('Cabinet configuration must leave a positive interior cavity');
  }
}

function validateShelfElevations(
  build: CabinetBuildConfig,
  elevations: number[],
  interiorMin: number,
  interiorMax: number,
): void {
  if (build.shelfLayout === 'even' && build.shelfElevations.length !== 0) {
    throw new Error('Even shelf layout requires empty custom elevations');
  }
  if (build.shelfLayout === 'custom' && elevations.length !== build.shelfCount) {
    throw new Error('Custom shelf elevations must match shelf count');
  }

  for (let index = 0; index < elevations.length; index += 1) {
    const elevation = elevations[index];
    if (elevation <= interiorMin || elevation >= interiorMax) {
      throw new Error('Shelf elevations must stay within the cabinet interior');
    }
    if (index > 0 && elevation - elevations[index - 1] < 1) {
      throw new Error('Shelf elevations must be strictly ascending and at least 1 inch apart');
    }
  }
}
