import type { EdgeBandingConfig } from './edge-banding';

export type GrainDirection = 'lengthwise' | 'crosswise' | 'either';

export interface CutPart {
  id: string;
  name: string;
  cabinetCode: string;
  width: number;
  height: number;
  material: string;
  grain: GrainDirection;
  edgeBanding?: EdgeBandingConfig;
}

export interface PlacedCutPart {
  part: CutPart;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface CutLine {
  axis: 'x' | 'y';
  position: number;
  start: number;
  end: number;
}

export interface NestedSheet {
  sheetIndex: number;
  material: string;
  width: number;
  height: number;
  placedParts: PlacedCutPart[];
  usedAreaSqIn: number;
  totalAreaSqIn: number;
  yieldPercentage: number;
  ripCuts: CutLine[];
}

export interface NestingOptions {
  sheetWidth?: number;
  sheetHeight?: number;
  kerf?: number;
  trimMargin?: number;
}

export interface NestingResult {
  material: string;
  sheets: NestedSheet[];
  totalSheets: number;
  overallYieldPercentage: number;
  unplacedParts: CutPart[];
}

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 2D Guillotine & Maximal Rectangles Nesting Engine for Cabinet Panels.
 * Optimizes cutting layout of cabinet carcass parts on standard plywood sheets.
 */
export function nestCutParts(
  parts: CutPart[],
  materialFilter?: string,
  options: NestingOptions = {},
): NestingResult {
  const sheetW = options.sheetWidth ?? 48;
  const sheetH = options.sheetHeight ?? 96;
  const kerf = options.kerf ?? 0.125;
  const margin = options.trimMargin ?? 0.5;

  const usableW = Math.max(1, sheetW - margin * 2);
  const usableH = Math.max(1, sheetH - margin * 2);

  const filteredParts = materialFilter ? parts.filter((p) => p.material === materialFilter) : parts;

  // Sort parts descending by area (Best-Fit Decreasing heuristic)
  const sortedParts = [...filteredParts].sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA;
  });

  const sheets: NestedSheet[] = [];
  const unplacedParts: CutPart[] = [];

  let currentSheetIndex = 1;

  for (const part of sortedParts) {
    let placed = false;

    // Try placing in existing sheets first
    for (const sheet of sheets) {
      if (tryPlaceInSheet(sheet, part, kerf, margin, usableW, usableH)) {
        placed = true;
        break;
      }
    }

    // If not placed, create a new sheet
    if (!placed) {
      const newSheet: NestedSheet = {
        sheetIndex: currentSheetIndex++,
        material: part.material,
        width: sheetW,
        height: sheetH,
        placedParts: [],
        usedAreaSqIn: 0,
        totalAreaSqIn: sheetW * sheetH,
        yieldPercentage: 0,
        ripCuts: [],
      };

      if (tryPlaceInSheet(newSheet, part, kerf, margin, usableW, usableH)) {
        sheets.push(newSheet);
        placed = true;
      } else {
        unplacedParts.push(part);
      }
    }
  }

  // Calculate statistics and primary cut lines for each sheet
  let totalUsedArea = 0;
  let totalSheetArea = 0;

  for (const sheet of sheets) {
    let used = 0;
    const xCoords = new Set<number>();
    const yCoords = new Set<number>();

    for (const p of sheet.placedParts) {
      used += p.part.width * p.part.height;
      xCoords.add(p.x + p.width);
      yCoords.add(p.y + p.height);
    }

    sheet.usedAreaSqIn = Math.round(used * 100) / 100;
    sheet.yieldPercentage = Math.round((used / sheet.totalAreaSqIn) * 1000) / 10;
    totalUsedArea += used;
    totalSheetArea += sheet.totalAreaSqIn;

    // Generate primary cut lines
    for (const x of xCoords) {
      if (x < sheet.width - margin) {
        sheet.ripCuts.push({
          axis: 'x',
          position: Math.round(x * 100) / 100,
          start: margin,
          end: sheet.height - margin,
        });
      }
    }
    for (const y of yCoords) {
      if (y < sheet.height - margin) {
        sheet.ripCuts.push({
          axis: 'y',
          position: Math.round(y * 100) / 100,
          start: margin,
          end: sheet.width - margin,
        });
      }
    }
  }

  const overallYield =
    totalSheetArea > 0 ? Math.round((totalUsedArea / totalSheetArea) * 1000) / 10 : 0;

  return {
    material: materialFilter ?? filteredParts[0]?.material ?? 'plywood_3_4',
    sheets,
    totalSheets: sheets.length,
    overallYieldPercentage: overallYield,
    unplacedParts,
  };
}

function tryPlaceInSheet(
  sheet: NestedSheet,
  part: CutPart,
  kerf: number,
  margin: number,
  usableW: number,
  usableH: number,
): boolean {
  // Find all available free spaces
  const freeSpaces: FreeRect[] = computeFreeSpaces(
    sheet.placedParts,
    margin,
    usableW,
    usableH,
    kerf,
  );

  const canRotate = part.grain === 'either';
  const orientations: Array<{ w: number; h: number; rot: boolean }> = [
    { w: part.width, h: part.height, rot: false },
  ];
  if (canRotate && part.width !== part.height) {
    orientations.push({ w: part.height, h: part.width, rot: true });
  }

  // Find best fitting free rectangle (smallest leftover area)
  let bestFit: {
    space: FreeRect;
    w: number;
    h: number;
    rot: boolean;
    leftoverArea: number;
  } | null = null;

  for (const space of freeSpaces) {
    for (const orient of orientations) {
      if (space.width >= orient.w && space.height >= orient.h) {
        const leftover = space.width * space.height - orient.w * orient.h;
        if (!bestFit || leftover < bestFit.leftoverArea) {
          bestFit = {
            space,
            w: orient.w,
            h: orient.h,
            rot: orient.rot,
            leftoverArea: leftover,
          };
        }
      }
    }
  }

  if (!bestFit) return false;

  sheet.placedParts.push({
    part,
    x: Math.round(bestFit.space.x * 100) / 100,
    y: Math.round(bestFit.space.y * 100) / 100,
    width: bestFit.w,
    height: bestFit.h,
    rotated: bestFit.rot,
  });

  return true;
}

function computeFreeSpaces(
  placed: PlacedCutPart[],
  margin: number,
  usableW: number,
  usableH: number,
  kerf: number,
): FreeRect[] {
  if (placed.length === 0) {
    return [{ x: margin, y: margin, width: usableW, height: usableH }];
  }

  // Generate guillotine cut candidate spots adjacent to existing placements
  const candidates: FreeRect[] = [];
  const maxX = margin + usableW;
  const maxY = margin + usableH;

  for (const p of placed) {
    // Space to the right of placed part
    const rightX = p.x + p.width + kerf;
    const rightY = p.y;
    if (rightX < maxX) {
      const remainingW = maxX - rightX;
      const remainingH = maxY - rightY;
      if (
        remainingW > 2 &&
        remainingH > 2 &&
        !isSpaceOccupied(rightX, rightY, remainingW, remainingH, placed)
      ) {
        candidates.push({ x: rightX, y: rightY, width: remainingW, height: remainingH });
      }
    }

    // Space above placed part
    const topX = p.x;
    const topY = p.y + p.height + kerf;
    if (topY < maxY) {
      const remainingW = maxX - topX;
      const remainingH = maxY - topY;
      if (
        remainingW > 2 &&
        remainingH > 2 &&
        !isSpaceOccupied(topX, topY, remainingW, remainingH, placed)
      ) {
        candidates.push({ x: topX, y: topY, width: remainingW, height: remainingH });
      }
    }
  }

  return candidates.length > 0
    ? candidates
    : [{ x: margin, y: margin, width: usableW, height: usableH }];
}

function isSpaceOccupied(
  x: number,
  y: number,
  w: number,
  h: number,
  placed: PlacedCutPart[],
): boolean {
  for (const p of placed) {
    const overlapX = x < p.x + p.width && x + Math.min(w, 4) > p.x;
    const overlapY = y < p.y + p.height && y + Math.min(h, 4) > p.y;
    if (overlapX && overlapY) return true;
  }
  return false;
}
