import type { AssemblyPartCallout, AssemblyPartState } from '@/domain/assembly/step-presentation';
import { deriveAssemblyPartStates } from '@/domain/assembly/step-presentation';
import type {
  BuiltCabinetModel,
  CabinetAssemblyStepDef,
  CabinetPartMeshSpec,
} from '@/domain/geometry/part-builder';

export type CadViewOrientation =
  | 'isometric'
  | 'front'
  | 'rear'
  | 'top'
  | 'right'
  | 'section-right'
  | 'front-detail';

export interface CadPoint {
  x: number;
  y: number;
}

export interface CadBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CadViewSpec {
  id: string;
  orientation: CadViewOrientation;
  label: string;
  scaleLabel: 'NTS' | 'ENLARGED';
  partFilter: 'visible' | 'active-detail';
}

export interface CadViewRecipe {
  primary: CadViewSpec;
  secondary: CadViewSpec[];
}

export interface CadProjectedPart {
  part: CabinetPartMeshSpec;
  state: AssemblyPartState;
  assembled: CadPoint;
  position: CadPoint;
  width: number;
  height: number;
  skewDepth: number;
  hidden: boolean;
  sectioned: boolean;
  paintOrder: number;
}

export interface CadBalloon {
  callout: AssemblyPartCallout;
  anchor: CadPoint;
  center: CadPoint;
  elbowX: number;
  radius: number;
  side: 'left' | 'right';
}

function view(
  stepNumber: number,
  suffix: string,
  orientation: CadViewOrientation,
  label: string,
  scaleLabel: CadViewSpec['scaleLabel'] = 'NTS',
  partFilter: CadViewSpec['partFilter'] = 'visible',
): CadViewSpec {
  return {
    id: `step-${stepNumber}-${suffix}`,
    orientation,
    label,
    scaleLabel,
    partFilter,
  };
}

export function deriveCadViewRecipe(step: CabinetAssemblyStepDef): CadViewRecipe {
  switch (step.stepNumber) {
    case 2:
      return {
        primary: view(2, 'iso', 'isometric', 'Exploded isometric'),
        secondary: [view(2, 'top', 'top', 'Top plan')],
      };
    case 3:
      return {
        primary: view(3, 'iso', 'isometric', 'Exploded isometric'),
        secondary: [view(3, 'top', 'top', 'Top plan · Front / rear')],
      };
    case 4:
      return {
        primary: view(4, 'rear', 'rear', 'Rear elevation'),
        secondary: [
          view(4, 'iso', 'isometric', 'Exploded isometric'),
          view(4, 'section', 'section-right', 'Section A–A · Side'),
        ],
      };
    case 5:
      return {
        primary: view(5, 'front', 'front', 'Front elevation'),
        secondary: [
          view(5, 'iso', 'isometric', 'Exploded isometric'),
          view(5, 'section', 'section-right', 'Section A–A · Shelf'),
        ],
      };
    case 6:
      return {
        primary: view(6, 'front', 'front', 'Front elevation'),
        secondary: [
          view(6, 'iso', 'isometric', 'Exploded isometric'),
          view(
            6,
            'detail',
            'front-detail',
            'Detail A · Doors / hardware',
            'ENLARGED',
            'active-detail',
          ),
        ],
      };
    default:
      return {
        primary: view(1, 'iso', 'isometric', 'Exploded inventory'),
        secondary: [view(1, 'front', 'front', 'Front elevation')],
      };
  }
}

function projectPoint(
  orientation: CadViewOrientation,
  model: BuiltCabinetModel,
  position: readonly [number, number, number],
): CadPoint {
  const [x, y, z] = position;
  switch (orientation) {
    case 'front':
    case 'front-detail':
      return { x, y: model.heightInches - y };
    case 'rear':
      return { x: model.widthInches - x, y: model.heightInches - y };
    case 'top':
      return { x, y: model.depthInches - z };
    case 'right':
    case 'section-right':
      return { x: model.depthInches - z, y: model.heightInches - y };
    default:
      return { x: x + z * 0.34, y: model.heightInches - y + z * 0.16 };
  }
}

function getProjectedDimensions(
  orientation: CadViewOrientation,
  part: CabinetPartMeshSpec,
): Pick<CadProjectedPart, 'width' | 'height' | 'skewDepth'> {
  switch (orientation) {
    case 'top':
      return {
        width: Math.max(0.8, part.widthInches),
        height: Math.max(0.8, part.depthInches),
        skewDepth: 0,
      };
    case 'right':
    case 'section-right':
      return {
        width: Math.max(0.8, part.depthInches),
        height: Math.max(0.8, part.heightInches),
        skewDepth: 0,
      };
    case 'isometric':
      return {
        width: Math.max(0.8, part.widthInches),
        height: Math.max(0.8, part.heightInches),
        skewDepth: Math.max(0.8, part.depthInches * 0.34),
      };
    default:
      return {
        width: Math.max(0.8, part.widthInches),
        height: Math.max(0.8, part.heightInches),
        skewDepth: 0,
      };
  }
}

function getPaintOrder(
  orientation: CadViewOrientation,
  model: BuiltCabinetModel,
  part: CabinetPartMeshSpec,
): number {
  switch (orientation) {
    case 'rear':
      return model.depthInches - part.positionInches[2];
    case 'top':
      return model.heightInches - part.positionInches[1];
    case 'right':
    case 'section-right':
      return model.widthInches - part.positionInches[0];
    default:
      return part.positionInches[2];
  }
}

function isHiddenInView(
  orientation: CadViewOrientation,
  model: BuiltCabinetModel,
  part: CabinetPartMeshSpec,
  state: AssemblyPartState,
): boolean {
  if (state === 'active' || orientation === 'isometric' || orientation === 'section-right') {
    return false;
  }
  switch (orientation) {
    case 'front':
    case 'front-detail':
      return part.positionInches[2] > model.depthInches * 0.55;
    case 'rear':
      return part.positionInches[2] < model.depthInches * 0.45;
    case 'top':
      return part.positionInches[1] < model.heightInches * 0.5;
    case 'right':
      return part.positionInches[0] < model.widthInches * 0.5;
    default:
      return false;
  }
}

export function projectCadParts(
  model: BuiltCabinetModel,
  step: CabinetAssemblyStepDef,
  viewSpec: CadViewSpec,
): CadProjectedPart[] {
  const states = deriveAssemblyPartStates(model, step.stepNumber);
  const detailPartIds =
    viewSpec.partFilter === 'active-detail' ? new Set(step.activePartIds) : undefined;
  const projected: CadProjectedPart[] = [];

  for (const part of model.parts) {
    const state = states.get(part.id) ?? 'future';
    if (state === 'future' || (detailPartIds && !detailPartIds.has(part.id))) continue;

    const assembledPosition = part.positionInches;
    const offset = state === 'active' ? (part.explodedOffsetInches ?? [0, 0, 0]) : [0, 0, 0];
    const explodedPosition: [number, number, number] = [
      assembledPosition[0] + offset[0],
      assembledPosition[1] + offset[1],
      assembledPosition[2] + offset[2],
    ];
    const dimensions = getProjectedDimensions(viewSpec.orientation, part);
    projected.push({
      part,
      state,
      assembled: projectPoint(viewSpec.orientation, model, assembledPosition),
      position: projectPoint(viewSpec.orientation, model, explodedPosition),
      ...dimensions,
      hidden: isHiddenInView(viewSpec.orientation, model, part, state),
      sectioned:
        viewSpec.orientation === 'section-right' &&
        (part.category === 'carcass' ||
          part.category === 'shelf' ||
          part.id === 'panel_back_board'),
      paintOrder: getPaintOrder(viewSpec.orientation, model, part),
    });
  }

  projected.sort((left, right) => right.paintOrder - left.paintOrder);
  return projected;
}

export function deriveCadGeometryBounds(parts: readonly CadProjectedPart[]): CadBounds {
  if (parts.length === 0) {
    return { x: -1, y: -1, width: 2, height: 2, left: -1, right: 1, top: -1, bottom: 1 };
  }

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const item of parts) {
    const partLeft = Math.min(item.position.x, item.assembled.x) - item.width / 2;
    const partRight = Math.max(item.position.x, item.assembled.x) + item.width / 2 + item.skewDepth;
    const partTop = Math.min(item.position.y, item.assembled.y) - item.height / 2 - item.skewDepth;
    const partBottom = Math.max(item.position.y, item.assembled.y) + item.height / 2;
    left = Math.min(left, partLeft);
    right = Math.max(right, partRight);
    top = Math.min(top, partTop);
    bottom = Math.max(bottom, partBottom);
  }

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    left,
    right,
    top,
    bottom,
  };
}

function distributeBalloons(
  entries: Array<{ callout: AssemblyPartCallout; anchor: CadPoint }>,
  side: CadBalloon['side'],
  bounds: CadBounds,
  radius: number,
): CadBalloon[] {
  if (entries.length === 0) return [];
  entries.sort((left, right) => left.anchor.y - right.anchor.y);
  const minimumY = bounds.top + radius;
  const maximumY = bounds.bottom - radius;
  const availableHeight = Math.max(0, maximumY - minimumY);
  const preferredGap = radius * 2.7;
  const gap =
    entries.length === 1 ? 0 : Math.min(preferredGap, availableHeight / (entries.length - 1));
  const laneOffset = Math.max(6, bounds.width * 0.14);
  const centerX = side === 'left' ? bounds.left - laneOffset : bounds.right + laneOffset;
  const elbowX = side === 'left' ? bounds.left - radius * 0.85 : bounds.right + radius * 0.85;
  const centers = entries.map((entry) => Math.min(maximumY, Math.max(minimumY, entry.anchor.y)));

  for (let index = 1; index < centers.length; index += 1) {
    centers[index] = Math.max(centers[index], centers[index - 1] + gap);
  }
  const overflow = centers.at(-1)! - maximumY;
  if (overflow > 0) {
    for (let index = 0; index < centers.length; index += 1) centers[index] -= overflow;
  }
  for (let index = centers.length - 2; index >= 0; index -= 1) {
    centers[index] = Math.min(centers[index], centers[index + 1] - gap);
  }

  return entries.map((entry, index) => ({
    callout: entry.callout,
    anchor: entry.anchor,
    center: { x: centerX, y: centers[index] },
    elbowX,
    radius,
    side,
  }));
}

export function deriveCadBalloons(
  parts: readonly CadProjectedPart[],
  callouts: readonly AssemblyPartCallout[],
  bounds = deriveCadGeometryBounds(parts),
): CadBalloon[] {
  const projectedById = new Map(parts.map((part) => [part.part.id, part]));
  const left: Array<{ callout: AssemblyPartCallout; anchor: CadPoint }> = [];
  const right: Array<{ callout: AssemblyPartCallout; anchor: CadPoint }> = [];
  const midpoint = bounds.left + bounds.width / 2;
  const radius = Math.min(2.2, Math.max(1.1, Math.max(bounds.width, bounds.height) * 0.028));

  for (const callout of callouts) {
    const projected = projectedById.get(callout.partId);
    if (!projected) continue;
    const side = projected.position.x < midpoint ? 'left' : 'right';
    const anchor = {
      x:
        projected.position.x +
        (side === 'left' ? -projected.width / 2 : projected.width / 2 + projected.skewDepth),
      y: projected.position.y,
    };
    (side === 'left' ? left : right).push({ callout, anchor });
  }

  return [
    ...distributeBalloons(left, 'left', bounds, radius),
    ...distributeBalloons(right, 'right', bounds, radius),
  ].sort((leftBalloon, rightBalloon) => leftBalloon.callout.number - rightBalloon.callout.number);
}

export function expandCadBoundsForBalloons(
  geometry: CadBounds,
  balloons: readonly CadBalloon[],
  padding = 4,
): CadBounds {
  let left = geometry.left;
  let right = geometry.right;
  let top = geometry.top;
  let bottom = geometry.bottom;
  for (const balloon of balloons) {
    left = Math.min(left, balloon.center.x - balloon.radius);
    right = Math.max(right, balloon.center.x + balloon.radius);
    top = Math.min(top, balloon.center.y - balloon.radius);
    bottom = Math.max(bottom, balloon.center.y + balloon.radius);
  }
  left -= padding;
  right += padding;
  top -= padding;
  bottom += padding;
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    left,
    right,
    top,
    bottom,
  };
}
