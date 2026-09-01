import type { HelperPose } from '@/domain/assembly/helper-pose';
import type { ResolvedCabinetSpec } from '../cabinet/resolve-cabinet-spec';

export type CabinetPartCategory =
  | 'carcass'
  | 'face_frame'
  | 'shelf'
  | 'shelf_hardware'
  | 'door'
  | 'drawer'
  | 'hardware'
  | 'toe_kick'
  | 'finished_end';

export interface CabinetPartMeshSpec {
  id: string;
  name: string;
  category: CabinetPartCategory;
  materialRole: 'finish' | 'interior' | 'hardware' | 'metal';
  primitive?: 'box' | 'cylinder';
  radiusInches?: number;
  widthInches: number;
  heightInches: number;
  depthInches: number;
  positionInches: [number, number, number];
  rotationDegrees?: [number, number, number];
  explodedOffsetInches?: [number, number, number];
  isDoorOrDrawer?: boolean;
}

export interface CabinetAssemblyStepDef {
  stepNumber: number;
  title: string;
  actionInstruction: string;
  safetyNote: string;
  checkWorkNote: string;
  requiredToolNames: string[];
  requiredMaterialNames: string[];
  activePartIds: string[];
  highlightPartIds: string[];
  helperPose: HelperPose;
}

export interface BuiltCabinetModel {
  definitionId: string;
  widthInches: number;
  heightInches: number;
  depthInches: number;
  parts: CabinetPartMeshSpec[];
  assemblySteps: CabinetAssemblyStepDef[];
  finish: ResolvedCabinetSpec['finish'];
  interiorFinish: ResolvedCabinetSpec['interiorFinish'];
  doorStyle: ResolvedCabinetSpec['doorStyle'];
  hardware: ResolvedCabinetSpec['hardware'];
}

interface BuildDimensions {
  width: number;
  height: number;
  depth: number;
  carcass: number;
  back: number;
  shelf: number;
  faceFrame: number;
  toeHeight: number;
  toeDepth: number;
  innerWidth: number;
}

export function buildCabinetParts(spec: ResolvedCabinetSpec): BuiltCabinetModel {
  const dimensions = getBuildDimensions(spec);
  let parts: CabinetPartMeshSpec[];

  if (spec.family === 'lazy_susan_corner') {
    parts = buildLazySusanCabinet(spec, dimensions);
  } else if (spec.frontLayout === 'open' || spec.family === 'bookcase') {
    parts = buildOpenBuiltIn(spec, dimensions);
  } else {
    parts = buildRectangularCabinet(spec, dimensions, true);
  }

  addFaceFrame(parts, spec, dimensions);
  addFinishedEnds(parts, spec, dimensions);

  return {
    definitionId: spec.definitionId,
    widthInches: dimensions.width,
    heightInches: dimensions.height,
    depthInches: dimensions.depth,
    parts,
    assemblySteps: createAssemblySteps(spec, parts),
    finish: spec.finish,
    interiorFinish: spec.interiorFinish,
    doorStyle: spec.doorStyle,
    hardware: spec.hardware,
  };
}

function getBuildDimensions(spec: ResolvedCabinetSpec): BuildDimensions {
  const carcass = spec.build.carcassThickness / 16;
  return {
    width: spec.widthInches,
    height: spec.heightInches,
    depth: spec.depthInches,
    carcass,
    back: spec.build.backThickness / 16,
    shelf: spec.build.shelfThickness / 16,
    faceFrame: spec.build.faceFrameWidth / 16,
    toeHeight: spec.build.toeKickHeight / 16,
    toeDepth: spec.build.toeKickDepth / 16,
    innerWidth: spec.widthInches - 2 * carcass,
  };
}

function buildRectangularCabinet(
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
  includeFronts: boolean,
): CabinetPartMeshSpec[] {
  const { width, height, depth, carcass, back, toeHeight, toeDepth, innerWidth } = dimensions;
  const parts: CabinetPartMeshSpec[] = [
    boxPart(
      'panel_side_left',
      `Left Side Carcass Panel (${formatThickness(carcass)})`,
      'carcass',
      'finish',
      carcass,
      height,
      depth,
      [carcass / 2, height / 2, depth / 2],
      [-12, 0, 0],
    ),
    boxPart(
      'panel_side_right',
      `Right Side Carcass Panel (${formatThickness(carcass)})`,
      'carcass',
      'finish',
      carcass,
      height,
      depth,
      [width - carcass / 2, height / 2, depth / 2],
      [12, 0, 0],
    ),
    boxPart(
      'panel_bottom_deck',
      `Bottom Floor Deck (${formatThickness(carcass)})`,
      'carcass',
      'interior',
      innerWidth,
      carcass,
      depth - toeDepth,
      [width / 2, toeHeight + carcass / 2, (depth - toeDepth) / 2],
      [0, -8, 0],
    ),
    boxPart(
      'panel_back_board',
      `Rear Capture Backing Board (${formatThickness(back)})`,
      'carcass',
      'interior',
      innerWidth,
      height - toeHeight,
      back,
      [width / 2, toeHeight + (height - toeHeight) / 2, back / 2],
      [0, 0, -10],
    ),
  ];

  if (isSolidTopFamily(spec)) {
    parts.push(
      boxPart(
        'panel_top_deck',
        `Top Ceiling Panel (${formatThickness(carcass)})`,
        'carcass',
        'finish',
        innerWidth,
        carcass,
        depth,
        [width / 2, height - carcass / 2, depth / 2],
        [0, 8, 0],
      ),
    );
  } else {
    parts.push(
      boxPart(
        'stretcher_top_front',
        `Front Top Stretcher Rail (${formatThickness(carcass)} x 3")`,
        'carcass',
        'finish',
        innerWidth,
        carcass,
        3,
        [width / 2, height - carcass / 2, depth - 1.5],
        [0, 6, 4],
      ),
      boxPart(
        'stretcher_top_rear',
        `Rear Top Mounting Rail (${formatThickness(carcass)} x 3")`,
        'carcass',
        'interior',
        innerWidth,
        carcass,
        3,
        [width / 2, height - carcass / 2, 1.5],
        [0, 6, -4],
      ),
    );
  }

  addToeKickStructure(parts, dimensions);
  addShelves(parts, spec, dimensions);
  if (includeFronts) addFronts(parts, spec, dimensions);
  return parts;
}

function buildOpenBuiltIn(
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
): CabinetPartMeshSpec[] {
  return buildRectangularCabinet(spec, dimensions, false);
}

function buildLazySusanCabinet(
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
): CabinetPartMeshSpec[] {
  const { width, height, depth, carcass, back, toeHeight, toeDepth, innerWidth } = dimensions;
  const halfDepth = depth / 2;
  const parts: CabinetPartMeshSpec[] = [
    boxPart(
      'corner_panel_left',
      'Lazy-Susan Left Wing Side',
      'carcass',
      'finish',
      carcass,
      height,
      depth,
      [carcass / 2, height / 2, depth / 2],
      [-12, 0, 0],
    ),
    boxPart(
      'corner_panel_back',
      'Lazy-Susan Rear Wing Side',
      'carcass',
      'finish',
      width,
      height,
      carcass,
      [width / 2, height / 2, carcass / 2],
      [0, 0, -12],
    ),
    boxPart(
      'corner_panel_return',
      'Lazy-Susan Return Side',
      'carcass',
      'finish',
      carcass,
      height,
      halfDepth,
      [width - carcass / 2, height / 2, halfDepth / 2],
      [12, 0, 0],
    ),
    boxPart(
      'corner_bottom_back',
      'L-Shaped Bottom Deck, Back Wing',
      'carcass',
      'interior',
      innerWidth,
      carcass,
      halfDepth - toeDepth / 2,
      [width / 2, toeHeight + carcass / 2, (halfDepth - toeDepth / 2) / 2],
      [0, -8, 0],
    ),
    boxPart(
      'corner_bottom_return',
      'L-Shaped Bottom Deck, Return Wing',
      'carcass',
      'interior',
      halfDepth,
      carcass,
      depth - halfDepth,
      [halfDepth / 2, toeHeight + carcass / 2, halfDepth + (depth - halfDepth) / 2],
      [0, -8, 0],
    ),
    boxPart(
      'panel_back_board',
      `Rear Capture Backing Board (${formatThickness(back)})`,
      'carcass',
      'interior',
      innerWidth,
      height - toeHeight,
      back,
      [width / 2, toeHeight + (height - toeHeight) / 2, back / 2],
      [0, 0, -10],
    ),
    boxPart(
      'stretcher_top_front',
      'Corner Front Top Stretcher',
      'carcass',
      'finish',
      width / 2,
      carcass,
      3,
      [width / 4, height - carcass / 2, depth - 1.5],
      [0, 6, 4],
    ),
    boxPart(
      'stretcher_top_return',
      'Corner Return Top Stretcher',
      'carcass',
      'finish',
      width / 2,
      carcass,
      3,
      [width - 1.5, height - carcass / 2, depth * 0.75],
      [6, 6, 0],
      [0, 90, 0],
    ),
  ];

  addToeKickStructure(parts, dimensions);
  addLazySusanShelves(parts, spec, dimensions);

  const doorHeight = height - toeHeight - 0.25;
  const doorWidth = Math.max(6, width * 0.34);
  parts.push(
    boxPart(
      'door_front_left',
      `Left Corner Door (${spec.doorStyle.name})`,
      'door',
      'finish',
      doorWidth,
      doorHeight,
      0.75,
      [width * 0.38, toeHeight + doorHeight / 2, depth + 0.25],
      [-4, 0, 10],
      [0, -45, 0],
      true,
    ),
    boxPart(
      'door_front_right',
      `Right Corner Door (${spec.doorStyle.name})`,
      'door',
      'finish',
      doorWidth,
      doorHeight,
      0.75,
      [width * 0.62, toeHeight + doorHeight / 2, depth + 0.25],
      [4, 0, 10],
      [0, 45, 0],
      true,
    ),
  );
  addDoorHardware(parts, spec, dimensions, [
    { id: 'left', x: width / 2 - 1.5, bottom: toeHeight, top: height, rotation: [0, -45, 0] },
    { id: 'right', x: width / 2 + 1.5, bottom: toeHeight, top: height, rotation: [0, 45, 0] },
  ]);

  return parts;
}

function addToeKickStructure(parts: CabinetPartMeshSpec[], dimensions: BuildDimensions): void {
  const { width, depth, carcass, toeHeight, toeDepth } = dimensions;
  if (toeHeight <= 0 || toeDepth <= 0) return;

  parts.push(
    boxPart(
      'toe_kick_structure',
      'Structural Recessed Toe Backer',
      'toe_kick',
      'interior',
      width,
      toeHeight,
      carcass,
      [width / 2, toeHeight / 2, depth - toeDepth - carcass / 2],
      [0, 0, 8],
    ),
  );
}

function addShelves(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
): void {
  if (spec.build.shelfCount === 0) return;
  const { width, depth, back, shelf, innerWidth } = dimensions;
  const shelfDepth = Math.max(0.25, depth - back - 1.25);

  spec.shelfElevationsInches.forEach((elevation, index) => {
    const shelfNumber = index + 1;
    parts.push(
      boxPart(
        `shelf_interior_${shelfNumber}`,
        `Adjustable Interior Shelf #${shelfNumber}`,
        'shelf',
        'interior',
        innerWidth - 0.25,
        shelf,
        shelfDepth,
        [width / 2, elevation, back + shelfDepth / 2],
        [0, shelfNumber * 4, 4],
      ),
    );
    addShelfPins(parts, shelfNumber, elevation - shelf / 2, dimensions);
  });
}

function addLazySusanShelves(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
): void {
  const { width, depth, back, shelf, innerWidth } = dimensions;
  spec.shelfElevationsInches.forEach((elevation, index) => {
    const shelfNumber = index + 1;
    parts.push(
      boxPart(
        `shelf_interior_${shelfNumber}_back`,
        `L-Shaped Shelf #${shelfNumber}, Back Wing`,
        'shelf',
        'interior',
        innerWidth - 0.25,
        shelf,
        depth / 2 - back,
        [width / 2, elevation, back + (depth / 2 - back) / 2],
        [0, shelfNumber * 4, 4],
      ),
      boxPart(
        `shelf_interior_${shelfNumber}_return`,
        `L-Shaped Shelf #${shelfNumber}, Return Wing`,
        'shelf',
        'interior',
        width / 2,
        shelf,
        depth / 2,
        [width / 4, elevation, depth * 0.75],
        [0, shelfNumber * 4, 4],
      ),
    );
    addShelfPins(parts, shelfNumber, elevation - shelf / 2, dimensions);
  });
}

function addShelfPins(
  parts: CabinetPartMeshSpec[],
  shelfNumber: number,
  elevation: number,
  dimensions: BuildDimensions,
): void {
  const { width, depth, carcass, back } = dimensions;
  const pinRadius = 0.098;
  const pinLength = 0.25;
  const positions: Array<[string, number, number, number]> = [
    ['left_rear', carcass + pinLength / 2, elevation, back + 2],
    ['left_front', carcass + pinLength / 2, elevation, depth - 2],
    ['right_rear', width - carcass - pinLength / 2, elevation, back + 2],
    ['right_front', width - carcass - pinLength / 2, elevation, depth - 2],
  ];

  for (const [positionName, x, y, z] of positions) {
    parts.push({
      id: `shelf_pin_${shelfNumber}_${positionName}`,
      name: `5mm Shelf Pin, Shelf #${shelfNumber}`,
      category: 'shelf_hardware',
      materialRole: 'hardware',
      primitive: 'cylinder',
      radiusInches: pinRadius,
      widthInches: pinRadius * 2,
      heightInches: pinLength,
      depthInches: pinRadius * 2,
      positionInches: [x, y, z],
      rotationDegrees: [0, 0, 90],
      explodedOffsetInches: [x < width / 2 ? -6 : 6, 0, 0],
    });
  }
}

function addFronts(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
): void {
  const { width, height, depth, toeHeight, carcass } = dimensions;
  const frontDepth = 0.75;
  const frontZ = depth + (spec.build.construction === 'face_frame' ? carcass : 0) + frontDepth / 2;
  const usableBottom = toeHeight;
  const usableTop = height;

  if (spec.frontLayout === 'drawers') {
    addDrawerFronts(parts, spec, dimensions, usableBottom, usableTop, frontZ);
    return;
  }

  if (spec.frontLayout === 'door_and_drawer') {
    const drawerHeight = Math.min(6, (usableTop - usableBottom) * 0.35);
    const drawerBottom = usableTop - drawerHeight;
    addTopDrawerRow(parts, spec, dimensions, drawerBottom, usableTop, frontZ);
    addDoorPanels(parts, spec, dimensions, usableBottom, drawerBottom - 0.125, frontZ);
    return;
  }

  if (spec.frontLayout === 'false_front') {
    const falseFrontHeight = Math.min(6, (usableTop - usableBottom) * 0.3);
    const falseFrontBottom = usableTop - falseFrontHeight;
    parts.push(
      boxPart(
        'false_front_panel',
        `False Front Panel (${spec.doorStyle.name})`,
        'drawer',
        'finish',
        width - 0.25,
        falseFrontHeight - 0.125,
        frontDepth,
        [width / 2, falseFrontBottom + falseFrontHeight / 2, frontZ],
        [0, 0, 12],
        undefined,
        true,
      ),
    );
    addDoorPanels(parts, spec, dimensions, usableBottom, falseFrontBottom - 0.125, frontZ);
    return;
  }

  addDoorPanels(parts, spec, dimensions, usableBottom, usableTop, frontZ);
}

function addDrawerFronts(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
  bottom: number,
  top: number,
  frontZ: number,
): void {
  const count = spec.drawerCount;
  if (count === 0) return;
  const spacing = (top - bottom) / count;
  for (let index = 0; index < count; index += 1) {
    const drawerNumber = index + 1;
    const drawerHeight = spacing - 0.25;
    const centerY = bottom + index * spacing + spacing / 2;
    parts.push(
      boxPart(
        `drawer_front_${drawerNumber}`,
        `Drawer Front #${drawerNumber} (${spec.doorStyle.name})`,
        'drawer',
        'finish',
        dimensions.width - 0.25,
        drawerHeight,
        0.75,
        [dimensions.width / 2, centerY, frontZ],
        [0, 0, 10 + index * 3],
        undefined,
        true,
      ),
    );
    addHardwarePart(
      parts,
      spec,
      dimensions,
      `drawer_${drawerNumber}`,
      dimensions.width / 2,
      centerY,
      true,
    );
  }
}

function addTopDrawerRow(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
  bottom: number,
  top: number,
  frontZ: number,
): void {
  const count = spec.drawerCount;
  if (count === 0) return;
  const cellWidth = dimensions.width / count;
  for (let index = 0; index < count; index += 1) {
    const drawerNumber = index + 1;
    const centerX = index * cellWidth + cellWidth / 2;
    const centerY = (bottom + top) / 2;
    parts.push(
      boxPart(
        `drawer_top_front_${drawerNumber}`,
        `Top Drawer Front #${drawerNumber} (${spec.doorStyle.name})`,
        'drawer',
        'finish',
        cellWidth - 0.25,
        top - bottom - 0.125,
        0.75,
        [centerX, centerY, frontZ],
        [0, 0, 12],
        undefined,
        true,
      ),
    );
    addHardwarePart(parts, spec, dimensions, `drawer_top_${drawerNumber}`, centerX, centerY, true);
  }
}

function addDoorPanels(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
  bottom: number,
  top: number,
  frontZ: number,
): void {
  if (top <= bottom || spec.frontLayout === 'open') return;
  const panelHeight = top - bottom - 0.25;
  const centerY = bottom + (top - bottom) / 2;
  const isDouble = spec.frontLayout === 'double_door' || spec.doorSwing === 'double';

  if (spec.family === 'tall') {
    addTallDoorPanels(parts, spec, dimensions, bottom, top, frontZ, isDouble);
    return;
  }

  if (isDouble) {
    const panelWidth = (dimensions.width - 0.375) / 2;
    parts.push(
      boxPart(
        'door_front_left',
        `Left Door Panel (${spec.doorStyle.name})`,
        'door',
        'finish',
        panelWidth,
        panelHeight,
        0.75,
        [panelWidth / 2 + 0.125, centerY, frontZ],
        [-4, 0, 10],
        undefined,
        true,
      ),
      boxPart(
        'door_front_right',
        `Right Door Panel (${spec.doorStyle.name})`,
        'door',
        'finish',
        panelWidth,
        panelHeight,
        0.75,
        [dimensions.width - panelWidth / 2 - 0.125, centerY, frontZ],
        [4, 0, 10],
        undefined,
        true,
      ),
    );
    addDoorHardware(parts, spec, dimensions, [
      { id: 'left', x: dimensions.width / 2 - 1.5, bottom, top },
      { id: 'right', x: dimensions.width / 2 + 1.5, bottom, top },
    ]);
  } else {
    parts.push(
      boxPart(
        'door_front_single',
        `Door Panel (${spec.doorStyle.name})`,
        'door',
        'finish',
        dimensions.width - 0.25,
        panelHeight,
        0.75,
        [dimensions.width / 2, centerY, frontZ],
        [0, 0, 10],
        undefined,
        true,
      ),
    );
    const x = spec.doorSwing === 'left' ? dimensions.width - 2 : 2;
    addDoorHardware(parts, spec, dimensions, [{ id: 'single', x, bottom, top }]);
  }
}

function addTallDoorPanels(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
  bottom: number,
  top: number,
  frontZ: number,
  isDouble: boolean,
): void {
  const verticalGap = 0.125;
  const sectionHeight = (top - bottom - verticalGap) / 2;
  const doorStyleName = spec.doorStyle.name;
  const sections = [
    { id: 'lower', centerY: bottom + sectionHeight / 2 },
    { id: 'upper', centerY: bottom + sectionHeight + verticalGap + sectionHeight / 2 },
  ];

  for (const section of sections) {
    if (isDouble) {
      const panelWidth = (dimensions.width - 0.375) / 2;
      parts.push(
        boxPart(
          `door_front_left_${section.id}`,
          `Tall ${section.id} Left Door (${doorStyleName})`,
          'door',
          'finish',
          panelWidth,
          sectionHeight - 0.125,
          0.75,
          [panelWidth / 2 + 0.125, section.centerY, frontZ],
          [-4, 0, 10],
          undefined,
          true,
        ),
        boxPart(
          `door_front_right_${section.id}`,
          `Tall ${section.id} Right Door (${doorStyleName})`,
          'door',
          'finish',
          panelWidth,
          sectionHeight - 0.125,
          0.75,
          [dimensions.width - panelWidth / 2 - 0.125, section.centerY, frontZ],
          [4, 0, 10],
          undefined,
          true,
        ),
      );
    } else {
      parts.push(
        boxPart(
          `door_front_single_${section.id}`,
          `Tall ${section.id} Door (${doorStyleName})`,
          'door',
          'finish',
          dimensions.width - 0.25,
          sectionHeight - 0.125,
          0.75,
          [dimensions.width / 2, section.centerY, frontZ],
          [0, 0, 10],
          undefined,
          true,
        ),
      );
    }
  }

  if (isDouble) {
    addDoorHardware(parts, spec, dimensions, [
      { id: 'left', x: dimensions.width / 2 - 1.5, bottom, top },
      { id: 'right', x: dimensions.width / 2 + 1.5, bottom, top },
    ]);
  } else {
    const x = spec.doorSwing === 'left' ? dimensions.width - 2 : 2;
    addDoorHardware(parts, spec, dimensions, [{ id: 'single', x, bottom, top }]);
  }
}

interface DoorHardwareTarget {
  id: string;
  x: number;
  bottom: number;
  top: number;
  rotation?: [number, number, number];
}

function addDoorHardware(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
  targets: DoorHardwareTarget[],
): void {
  if (!spec.build.includeHardware || spec.hardware.type === 'none') return;
  for (const target of targets) {
    addHardwarePart(
      parts,
      spec,
      dimensions,
      target.id,
      target.x,
      resolveHardwareElevation(spec, target.bottom, target.top),
      false,
      target.rotation,
    );
  }
}

function addHardwarePart(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
  id: string,
  x: number,
  y: number,
  horizontal: boolean,
  baseRotation?: [number, number, number],
): void {
  const hardware = spec.hardware;
  if (!spec.build.includeHardware || hardware.type === 'none') return;

  const isKnob = hardware.type === 'knob';
  const shouldRotateHorizontal = horizontal && hardware.type === 'pull';
  const rotation: [number, number, number] | undefined = isKnob
    ? [90, 0, 0]
    : shouldRotateHorizontal
      ? [0, 0, 90]
      : baseRotation;
  const radius = hardware.radiusInches;
  const radialDiameter = radius === undefined ? undefined : radius * 2;

  parts.push({
    id: `hardware_pull_${id}`,
    name: hardware.name,
    category: 'hardware',
    materialRole: 'hardware',
    primitive: hardware.primitive,
    radiusInches: radius,
    widthInches: radialDiameter ?? hardware.widthInches,
    heightInches: hardware.heightInches,
    depthInches: radialDiameter ?? hardware.depthInches,
    positionInches: [
      x,
      y,
      dimensions.depth +
        hardware.depthInches / 2 +
        (spec.build.construction === 'face_frame' ? dimensions.carcass : 0),
    ],
    rotationDegrees: rotation,
    explodedOffsetInches: [0, 0, 14],
  });
}

function resolveHardwareElevation(spec: ResolvedCabinetSpec, bottom: number, top: number): number {
  switch (spec.build.hardwarePlacement) {
    case 'upper':
      return top - 3;
    case 'lower':
      return bottom + 3;
    case 'center':
      return (bottom + top) / 2;
    case 'auto':
      if (spec.family === 'wall' || spec.family === 'appliance_bridge') return bottom + 3;
      if (spec.family === 'tall') return (bottom + top) / 2;
      return top - 3;
  }
}

function addFaceFrame(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
): void {
  if (spec.build.construction !== 'face_frame') return;
  const { width, height, depth, carcass, faceFrame } = dimensions;
  const frameDepth = carcass;
  const z = depth + frameDepth / 2;
  parts.push(
    boxPart(
      'face_frame_left',
      'Left Face-Frame Stile',
      'face_frame',
      'finish',
      faceFrame,
      height,
      frameDepth,
      [faceFrame / 2, height / 2, z],
      [-4, 0, 8],
    ),
    boxPart(
      'face_frame_right',
      'Right Face-Frame Stile',
      'face_frame',
      'finish',
      faceFrame,
      height,
      frameDepth,
      [width - faceFrame / 2, height / 2, z],
      [4, 0, 8],
    ),
    boxPart(
      'face_frame_top',
      'Top Face-Frame Rail',
      'face_frame',
      'finish',
      width - 2 * faceFrame,
      faceFrame,
      frameDepth,
      [width / 2, height - faceFrame / 2, z],
      [0, 4, 8],
    ),
    boxPart(
      'face_frame_bottom',
      'Bottom Face-Frame Rail',
      'face_frame',
      'finish',
      width - 2 * faceFrame,
      faceFrame,
      frameDepth,
      [width / 2, faceFrame / 2, z],
      [0, -4, 8],
    ),
  );
}

function addFinishedEnds(
  parts: CabinetPartMeshSpec[],
  spec: ResolvedCabinetSpec,
  dimensions: BuildDimensions,
): void {
  const appliedThickness = 0.25;
  if (spec.build.leftFinishedEnd) {
    parts.push(
      boxPart(
        'finished_end_left',
        'Applied Finished Left End',
        'finished_end',
        'finish',
        appliedThickness,
        dimensions.height,
        dimensions.depth,
        [-appliedThickness / 2, dimensions.height / 2, dimensions.depth / 2],
        [-8, 0, 0],
      ),
    );
  }
  if (spec.build.rightFinishedEnd) {
    parts.push(
      boxPart(
        'finished_end_right',
        'Applied Finished Right End',
        'finished_end',
        'finish',
        appliedThickness,
        dimensions.height,
        dimensions.depth,
        [dimensions.width + appliedThickness / 2, dimensions.height / 2, dimensions.depth / 2],
        [8, 0, 0],
      ),
    );
  }
}

function createAssemblySteps(
  spec: ResolvedCabinetSpec,
  parts: CabinetPartMeshSpec[],
): CabinetAssemblyStepDef[] {
  const shelfPartIds: string[] = [];
  const shelfHighlightIds: string[] = [];
  const frontPartIds: string[] = [];
  const hardwareHighlightIds: string[] = [];
  const topPartIds: string[] = [];
  for (const part of parts) {
    if (part.category === 'shelf' || part.category === 'shelf_hardware') {
      shelfPartIds.push(part.id);
      if (part.category === 'shelf') shelfHighlightIds.push(part.id);
    }
    if (
      part.category === 'door' ||
      part.category === 'drawer' ||
      part.category === 'hardware' ||
      part.category === 'face_frame' ||
      part.category === 'finished_end'
    ) {
      frontPartIds.push(part.id);
      if (part.category === 'hardware') hardwareHighlightIds.push(part.id);
    }
    if (part.id.startsWith('stretcher_top_') || part.id === 'panel_top_deck') {
      topPartIds.push(part.id);
    }
  }

  return [
    step(
      1,
      'Inspect Parts & Prepare Level Work Surface',
      `Unpack the ${spec.name} (${spec.widthInches}"W x ${spec.heightInches}"H x ${spec.depthInches}"D). Protect the ${spec.finish.name} finish and check every panel against the parts list.`,
      'Wear work gloves when handling cut panel edges.',
      `Verify the side panels are ${spec.heightInches}" high and ${spec.depthInches}" deep.`,
      ['Tape Measure', 'Work Gloves', 'Utility Knife'],
      ['Cardboard Protector Surface', 'Part Verification Checklist'],
      ['panel_side_left', 'panel_side_right', 'panel_bottom_deck'],
      ['panel_bottom_deck'],
      'measuring',
    ),
    step(
      2,
      'Assemble Carcass Deck & Side Panels',
      'Apply wood glue to the side-panel dados, insert the bottom deck, align the front edges, and drive the specified assembly screws.',
      'Use the drill clutch and do not overtighten panel fasteners.',
      'Confirm the bottom deck is square to both side panels.',
      ['Cordless Drill', '#2 Phillips Driver Bit', 'Carpenter Square'],
      ['Wood Glue (PVA)', '#8 x 1-1/4" Cabinet Assembly Screws'],
      ['panel_side_left', 'panel_side_right', 'panel_bottom_deck'],
      ['panel_side_left', 'panel_side_right'],
      'drill_safety',
    ),
    step(
      3,
      isSolidTopFamily(spec) ? 'Install Top Ceiling Panel' : 'Fasten Top Support Stretchers',
      isSolidTopFamily(spec)
        ? 'Slide the top panel into the upper dados and secure it with glue and assembly screws.'
        : 'Secure the front and rear top stretchers between the side panels.',
      'Support the cabinet frame so it cannot tip while fastening the top.',
      'Measure both face diagonals. They must match within 1/16 inch.',
      ['Cordless Drill', 'Corner Clamps', 'Tape Measure'],
      ['#8 x 1-1/4" Assembly Screws'],
      topPartIds,
      topPartIds.slice(0, 1),
      'check_square',
    ),
    step(
      4,
      'Slide & Secure Rear Capture Backing Board',
      'Seat the back board in the rear rabbets and fasten around the perimeter at six-inch spacing.',
      'Seat the back fully before fastening so it locks the carcass square.',
      'Sight both side panels and confirm there is no bow or twist.',
      ['Cordless Drill or Brad Nailer', 'Tape Measure'],
      ['3/4" Backer Fasteners'],
      ['panel_back_board'],
      ['panel_back_board'],
      'check_square',
    ),
    step(
      5,
      'Install Interior Shelf Pins & Shelves',
      spec.build.shelfCount > 0
        ? 'Insert four 5mm shelf pins at each resolved elevation, then lower each shelf onto its matching pin set.'
        : 'Inspect the open cabinet cavity and confirm required plumbing or equipment clearance.',
      'Seat every shelf pin fully before loading a shelf.',
      'Confirm each shelf is level and matches its configured elevation.',
      ['Torpedo Level'],
      spec.build.shelfCount > 0 ? [`5mm Shelf Pins (${spec.build.shelfCount * 4})`] : [],
      shelfPartIds,
      shelfHighlightIds,
      'pointing_guide',
    ),
    step(
      6,
      'Mount Doors/Drawers & Attach Hardware',
      `Install the configured ${spec.frontLayout.replaceAll('_', ' ')} fronts, align the reveals, and attach ${spec.build.includeHardware ? spec.hardware.name : 'no visible hardware'}.`,
      'Use a partner for tall or heavy fronts.',
      'Operate every front and confirm clear, even movement.',
      ['#2 Phillips Hand Screwdriver', 'Torpedo Level'],
      spec.build.includeHardware
        ? ['Soft-Close Hinges or Slides', 'Hardware Machine Screws']
        : ['Soft-Close Hinges or Slides'],
      frontPartIds,
      hardwareHighlightIds,
      'completion_check',
    ),
  ];
}

function step(
  stepNumber: number,
  title: string,
  actionInstruction: string,
  safetyNote: string,
  checkWorkNote: string,
  requiredToolNames: string[],
  requiredMaterialNames: string[],
  activePartIds: string[],
  highlightPartIds: string[],
  helperPose: HelperPose,
): CabinetAssemblyStepDef {
  return {
    stepNumber,
    title,
    actionInstruction,
    safetyNote,
    checkWorkNote,
    requiredToolNames,
    requiredMaterialNames,
    activePartIds,
    highlightPartIds,
    helperPose,
  };
}

function boxPart(
  id: string,
  name: string,
  category: CabinetPartCategory,
  materialRole: CabinetPartMeshSpec['materialRole'],
  widthInches: number,
  heightInches: number,
  depthInches: number,
  positionInches: [number, number, number],
  explodedOffsetInches?: [number, number, number],
  rotationDegrees?: [number, number, number],
  isDoorOrDrawer?: boolean,
): CabinetPartMeshSpec {
  return {
    id,
    name,
    category,
    materialRole,
    primitive: 'box',
    widthInches,
    heightInches,
    depthInches,
    positionInches,
    explodedOffsetInches,
    rotationDegrees,
    isDoorOrDrawer,
  };
}

function isSolidTopFamily(spec: ResolvedCabinetSpec): boolean {
  return (
    spec.category === 'wall' ||
    spec.family === 'tall' ||
    spec.family === 'bookcase' ||
    spec.frontLayout === 'open'
  );
}

function formatThickness(inches: number): string {
  return `${Number(inches.toFixed(3))}"`;
}
