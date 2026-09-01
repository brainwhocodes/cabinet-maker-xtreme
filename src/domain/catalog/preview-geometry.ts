import { resolveCabinetSpec } from '../cabinet/resolve-cabinet-spec';
import type { CabinetInstance } from '../geometry/models';
import { buildCabinetParts } from '../geometry/part-builder';
import type { PlannerCatalogEntry } from './planner-catalog';
import { getCabinetDefinitionByCode, HARDWARE_OPTIONS } from './standard-cabinets';
import type { CabinetDefinition } from './types';

export interface CatalogPreviewPrimitive {
  id: string;
  primitive: 'box' | 'cylinder';
  widthInches: number;
  heightInches: number;
  depthInches: number;
  radiusInches?: number;
  positionInches: [number, number, number];
  rotationDegrees?: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
}

export type CatalogPreviewShape =
  | { kind: 'polygon'; points: string; fill: string; opacity: number }
  | {
      kind: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: string;
      opacity: number;
    };

export interface CatalogPreviewGeometry {
  shapes: CatalogPreviewShape[];
  viewBox: string;
}

export function getCatalogPreviewPrimitives(
  entry: PlannerCatalogEntry,
  selectedCabinet?: CabinetInstance,
): CatalogPreviewPrimitive[] {
  if (entry.kind === 'cabinet') {
    return cabinetPrimitives(entry.cabinetDefinition, undefined, false);
  }
  if (entry.kind === 'built_in') {
    const definition = entry.builtInDefinition;
    return [
      {
        id: definition.id,
        primitive: 'box',
        widthInches: definition.defaultWidth / 16,
        heightInches: definition.defaultHeight / 16,
        depthInches: definition.defaultDepth / 16,
        positionInches: [
          definition.defaultWidth / 32,
          definition.defaultHeight / 32,
          definition.defaultDepth / 32,
        ],
        color: finishColor(definition.defaultFinishId),
        roughness: 0.65,
      },
    ];
  }
  if (entry.kind === 'hardware') {
    const hardware = entry.hardwareOption;
    if (hardware.type === 'none') return [];
    return [
      {
        id: hardware.id,
        primitive: hardware.primitive,
        widthInches: hardware.widthInches,
        heightInches: hardware.heightInches,
        depthInches: hardware.depthInches,
        radiusInches: hardware.radiusInches,
        positionInches: [0, 0, 0],
        rotationDegrees: hardware.type === 'knob' ? [90, 0, 0] : undefined,
        color: hardware.colorHex,
        metalness: hardware.metalness,
        roughness: 0.2,
      },
    ];
  }
  if (entry.kind === 'drawer_system') {
    const drawer = entry.drawerBoxOption;
    const isMetal = drawer.material === 'metal_box_slim';
    const boxColor = isMetal ? '#738292' : '#D4B38C';
    const slideColor = '#A0AEC0';
    const w = 18;
    const h = 6;
    const d = 21;
    const sideThickness = isMetal ? 0.5 : 0.625;
    return [
      {
        id: `${drawer.id}_left`,
        primitive: 'box',
        widthInches: sideThickness,
        heightInches: h,
        depthInches: d,
        positionInches: [sideThickness / 2, h / 2, d / 2],
        color: boxColor,
        metalness: isMetal ? 0.7 : 0,
        roughness: isMetal ? 0.3 : 0.5,
      },
      {
        id: `${drawer.id}_right`,
        primitive: 'box',
        widthInches: sideThickness,
        heightInches: h,
        depthInches: d,
        positionInches: [w - sideThickness / 2, h / 2, d / 2],
        color: boxColor,
        metalness: isMetal ? 0.7 : 0,
        roughness: isMetal ? 0.3 : 0.5,
      },
      {
        id: `${drawer.id}_bottom`,
        primitive: 'box',
        widthInches: w - 2 * sideThickness,
        heightInches: 0.5,
        depthInches: d,
        positionInches: [w / 2, 0.25, d / 2],
        color: isMetal ? '#8794A3' : '#EFE3D3',
        metalness: isMetal ? 0.5 : 0,
        roughness: 0.4,
      },
      {
        id: `${drawer.id}_back`,
        primitive: 'box',
        widthInches: w - 2 * sideThickness,
        heightInches: h - 0.5,
        depthInches: 0.5,
        positionInches: [w / 2, (h + 0.5) / 2, 0.25],
        color: boxColor,
        metalness: isMetal ? 0.7 : 0,
        roughness: 0.4,
      },
      {
        id: `${drawer.id}_slide_l`,
        primitive: 'box',
        widthInches: 0.75,
        heightInches: 0.75,
        depthInches: d,
        positionInches: [0.375, -0.375, d / 2],
        color: slideColor,
        metalness: 0.85,
        roughness: 0.2,
      },
      {
        id: `${drawer.id}_slide_r`,
        primitive: 'box',
        widthInches: 0.75,
        heightInches: 0.75,
        depthInches: d,
        positionInches: [w - 0.375, -0.375, d / 2],
        color: slideColor,
        metalness: 0.85,
        roughness: 0.2,
      },
    ];
  }
  if (entry.kind === 'hinge') {
    const hinge = entry.hingeOption;
    const metalColor = '#C8D0D8';
    return [
      {
        id: `${hinge.id}_cup`,
        primitive: 'cylinder',
        radiusInches: 0.689,
        widthInches: 1.378,
        heightInches: 0.45,
        depthInches: 1.378,
        positionInches: [0, 0, 0.225],
        rotationDegrees: [90, 0, 0],
        color: metalColor,
        metalness: 0.9,
        roughness: 0.2,
      },
      {
        id: `${hinge.id}_arm`,
        primitive: 'box',
        widthInches: 0.8,
        heightInches: 2.2,
        depthInches: 0.4,
        positionInches: [0, 1.0, -0.1],
        color: metalColor,
        metalness: 0.9,
        roughness: 0.2,
      },
      {
        id: `${hinge.id}_plate`,
        primitive: 'box',
        widthInches: 1.4,
        heightInches: 1.8,
        depthInches: 0.25,
        positionInches: [0, 1.6, -0.35],
        color: metalColor,
        metalness: 0.85,
        roughness: 0.25,
      },
    ];
  }

  const definition = selectedCabinet
    ? getCabinetDefinitionByCode(selectedCabinet.definitionId)
    : getCabinetDefinitionByCode('CW30');
  if (!definition) return [];
  const base = selectedCabinet ?? canonicalShelfCabinet(definition);
  const previewCabinet: CabinetInstance = {
    ...base,
    source: 'built',
    build: {
      ...base.build,
      frontLayout: 'open',
      drawerCount: 0,
      shelfCount: entry.shelfPackage.count,
      shelfLayout: 'even',
      shelfElevations: [],
      includeHardware: false,
    },
  };
  return cabinetPrimitives(definition, previewCabinet, true);
}

export function getCatalogPreviewGeometry(
  entry: PlannerCatalogEntry,
  selectedCabinet?: CabinetInstance,
): CatalogPreviewGeometry {
  const primitives = getCatalogPreviewPrimitives(entry, selectedCabinet);
  if (primitives.length === 0) {
    return {
      viewBox: '0 0 72 56',
      shapes: [
        {
          kind: 'polygon',
          points: '12,28 28,18 60,34 44,44',
          fill: '#E8EDF2',
          opacity: 1,
        },
      ],
    };
  }

  const rawShapes: RawShape[] = [];
  for (const primitive of primitives) {
    if (primitive.primitive === 'cylinder') {
      const [x, y, z] = primitive.positionInches;
      const center = projectPoint(x, y, z);
      const radius = primitive.radiusInches ?? primitive.widthInches / 2;
      rawShapes.push({
        kind: 'ellipse',
        cx: center.x,
        cy: center.y,
        rx: Math.max(radius, 0.08),
        ry: Math.max(radius * 0.55, 0.05),
        fill: primitive.color,
        opacity: 1,
      });
      continue;
    }
    rawShapes.push(...boxFaces(primitive));
  }

  const bounds = shapeBounds(rawShapes);
  const padding = 4;
  const width = Math.max(0.001, bounds.maxX - bounds.minX);
  const height = Math.max(0.001, bounds.maxY - bounds.minY);
  const scale = Math.min((72 - padding * 2) / width, (56 - padding * 2) / height);
  const offsetX = padding + (72 - padding * 2 - width * scale) / 2 - bounds.minX * scale;
  const offsetY = padding + (56 - padding * 2 - height * scale) / 2 - bounds.minY * scale;
  const shapes = rawShapes.map((shape): CatalogPreviewShape => {
    if (shape.kind === 'ellipse') {
      return {
        ...shape,
        cx: shape.cx * scale + offsetX,
        cy: shape.cy * scale + offsetY,
        rx: shape.rx * scale,
        ry: shape.ry * scale,
      };
    }
    return {
      kind: 'polygon',
      points: shape.points
        .map((point) => `${point.x * scale + offsetX},${point.y * scale + offsetY}`)
        .join(' '),
      fill: shape.fill,
      opacity: shape.opacity,
    };
  });
  return { shapes, viewBox: '0 0 72 56' };
}

function cabinetPrimitives(
  definition: CabinetDefinition,
  instance?: CabinetInstance,
  includeSmallHardware = false,
): CatalogPreviewPrimitive[] {
  const model = buildCabinetParts(resolveCabinetSpec(definition, instance));
  const primitives: CatalogPreviewPrimitive[] = [];
  for (const part of model.parts) {
    if (
      !includeSmallHardware &&
      (part.category === 'shelf_hardware' || part.category === 'hardware')
    ) {
      continue;
    }
    primitives.push({
      id: part.id,
      primitive: part.primitive ?? 'box',
      widthInches: part.widthInches,
      heightInches: part.heightInches,
      depthInches: part.depthInches,
      radiusInches: part.radiusInches,
      positionInches: part.positionInches,
      rotationDegrees: part.rotationDegrees,
      color:
        part.materialRole === 'finish'
          ? model.finish.colorHex
          : part.materialRole === 'hardware'
            ? model.hardware.colorHex
            : model.interiorFinish.colorHex,
      roughness:
        part.materialRole === 'finish' ? model.finish.roughness : model.interiorFinish.roughness,
    });
  }
  return primitives;
}

function canonicalShelfCabinet(definition: CabinetDefinition): CabinetInstance {
  const spec = resolveCabinetSpec(definition);
  return {
    id: 'cab-preview-shelf',
    definitionId: definition.code,
    source: 'built',
    wallId: 'wall-preview',
    name: 'Canonical shelf preview cabinet',
    category: definition.category,
    offsetX: 0,
    elevation: 0,
    width: definition.width,
    height: definition.height,
    depth: definition.depth,
    doorSwing: definition.defaultDoorSwing,
    doorStyleId: spec.doorStyleId,
    finishId: spec.finishId,
    interiorFinishId: spec.interiorFinishId,
    hardwareId: HARDWARE_OPTIONS[0].id,
    build: spec.build,
  };
}

interface Point {
  x: number;
  y: number;
}

type RawShape =
  | { kind: 'polygon'; points: Point[]; fill: string; opacity: number }
  | {
      kind: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: string;
      opacity: number;
    };

function projectPoint(x: number, y: number, z: number): Point {
  return { x: (x - z) * 0.866, y: (x + z) * 0.42 - y };
}

function boxFaces(primitive: CatalogPreviewPrimitive): RawShape[] {
  const [centerX, centerY, centerZ] = primitive.positionInches;
  const halfX = primitive.widthInches / 2;
  const halfY = primitive.heightInches / 2;
  const halfZ = primitive.depthInches / 2;
  const point = (x: number, y: number, z: number) =>
    projectPoint(centerX + x, centerY + y, centerZ + z);
  const top = [
    point(-halfX, halfY, -halfZ),
    point(halfX, halfY, -halfZ),
    point(halfX, halfY, halfZ),
    point(-halfX, halfY, halfZ),
  ];
  const left = [
    point(-halfX, -halfY, -halfZ),
    point(-halfX, halfY, -halfZ),
    point(-halfX, halfY, halfZ),
    point(-halfX, -halfY, halfZ),
  ];
  const right = [
    point(-halfX, -halfY, halfZ),
    point(-halfX, halfY, halfZ),
    point(halfX, halfY, halfZ),
    point(halfX, -halfY, halfZ),
  ];
  return [
    { kind: 'polygon', points: left, fill: shade(primitive.color, -0.12), opacity: 0.96 },
    { kind: 'polygon', points: right, fill: shade(primitive.color, -0.04), opacity: 0.98 },
    { kind: 'polygon', points: top, fill: shade(primitive.color, 0.08), opacity: 1 },
  ];
}

function shapeBounds(shapes: RawShape[]) {
  const xValues: number[] = [];
  const yValues: number[] = [];
  for (const shape of shapes) {
    if (shape.kind === 'ellipse') {
      xValues.push(shape.cx - shape.rx, shape.cx + shape.rx);
      yValues.push(shape.cy - shape.ry, shape.cy + shape.ry);
    } else {
      xValues.push(...shape.points.map((point) => point.x));
      yValues.push(...shape.points.map((point) => point.y));
    }
  }
  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
  };
}

function shade(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex;
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16),
  );
  return `#${channels
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel + 255 * amount)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function finishColor(finishId: string): string {
  if (finishId === 'natural_oak') return '#B88A5A';
  if (finishId === 'matte_navy') return '#263F5C';
  if (finishId === 'charcoal_slate') return '#3B424A';
  return '#F3F4F5';
}
