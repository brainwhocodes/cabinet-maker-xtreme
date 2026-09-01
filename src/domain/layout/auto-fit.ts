import { createDefaultCabinetBuildConfig } from '../cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '../catalog/standard-cabinets';
import type { CabinetDefinition } from '../catalog/types';
import type { CabinetInstance, RoomProject, WallId } from '../geometry/models';
import { inchesToSixteenths, type Sixteenths } from '../geometry/units';

export type AutoFitStrategy = 'balanced_symmetry' | 'maximum_drawers' | 'budget_optimized';

export interface AutoFitProposal {
  id: string;
  strategy: AutoFitStrategy;
  title: string;
  description: string;
  targetWallId: WallId;
  targetRun: 'base' | 'wall';
  cabinets: CabinetInstance[];
  totalWidthSixteenths: Sixteenths;
  uncoveredSpanSixteenths: Sixteenths;
  leftFillerWidthSixteenths: Sixteenths;
  rightFillerWidthSixteenths: Sixteenths;
  unitCount: number;
  drawerUnitCount: number;
  estimatedCostUSD: number | null;
  scores: {
    fitScore: number;
    symmetryScore: number;
    storageScore: number;
    costScore: number | null;
    overallScore: number;
  };
}

export interface AutoFitOptions {
  wallId: WallId;
  wallLength: Sixteenths;
  project?: RoomProject;
  includeSinkBase?: boolean;
  sinkCenterOffset?: Sixteenths;
  targetCategory?: 'base' | 'wall';
  finishId?: string;
  doorStyleId?: string;
  hardwareId?: string;
  strategies?: AutoFitStrategy[];
}

export function generateAutoFitProposals(options: AutoFitOptions): AutoFitProposal[] {
  const strategies = options.strategies ?? [
    'balanced_symmetry',
    'maximum_drawers',
    'budget_optimized',
  ];
  const span = largestAvailableSpan(options);
  if (span.length < inchesToSixteenths(12)) return [];

  return strategies
    .map((strategy) => solveWallLayout(options, strategy, span.start, span.length))
    .filter((proposal): proposal is AutoFitProposal => proposal !== null)
    .sort(
      (left, right) =>
        right.scores.overallScore - left.scores.overallScore || left.id.localeCompare(right.id),
    );
}

function solveWallLayout(
  options: AutoFitOptions,
  strategy: AutoFitStrategy,
  runStart: Sixteenths,
  runLength: Sixteenths,
): AutoFitProposal | null {
  const isBase = (options.targetCategory ?? 'base') === 'base';
  const finishId = options.finishId ?? 'polar_white';
  const doorStyleId = options.doorStyleId ?? 'shaker';
  const hardwareId = options.hardwareId ?? 'matte_black_bar';
  const minCornerFiller = inchesToSixteenths(1.5);
  const usableSpan = runLength - 2 * minCornerFiller;
  if (usableSpan < inchesToSixteenths(12)) return null;

  const candidateCodes = candidateCodesFor(strategy, isBase).filter((code) => {
    if (strategy !== 'budget_optimized') return true;
    return getCabinetDefinitionByCode(code)?.retailMapping !== undefined;
  });
  const placedCabinets: CabinetInstance[] = [];
  const elevation = isBase ? 0 : inchesToSixteenths(54);
  const sinkDefinition = getCabinetDefinitionByCode('SB36');

  if (options.includeSinkBase && isBase && sinkDefinition && usableSpan >= sinkDefinition.width) {
    const requestedCenter = options.sinkCenterOffset
      ? runStart + options.sinkCenterOffset
      : runStart + runLength / 2;
    const sinkOffset = Math.max(
      runStart + minCornerFiller,
      Math.min(
        runStart + runLength - minCornerFiller - sinkDefinition.width,
        Math.round(requestedCenter - sinkDefinition.width / 2),
      ),
    );
    const leftSpan = sinkOffset - (runStart + minCornerFiller);
    const rightSpan = runStart + runLength - minCornerFiller - (sinkOffset + sinkDefinition.width);
    let offset = runStart + minCornerFiller;
    const leftCodes = fillSpanWithKnapsack(leftSpan, candidateCodes);
    for (const code of leftCodes) {
      const definition = getCabinetDefinitionByCode(code);
      if (!definition) continue;
      placedCabinets.push(
        createCabinetInstance(
          definition,
          options.wallId,
          offset,
          elevation,
          finishId,
          doorStyleId,
          hardwareId,
        ),
      );
      offset += definition.width;
    }
    placedCabinets.push(
      createCabinetInstance(
        sinkDefinition,
        options.wallId,
        sinkOffset,
        0,
        finishId,
        doorStyleId,
        hardwareId,
      ),
    );
    const rightCodes =
      strategy === 'balanced_symmetry'
        ? [...leftCodes].reverse()
        : fillSpanWithKnapsack(rightSpan, candidateCodes);
    offset = sinkOffset + sinkDefinition.width;
    for (const code of rightCodes) {
      const definition = getCabinetDefinitionByCode(code);
      if (!definition || offset + definition.width > runStart + runLength - minCornerFiller) {
        continue;
      }
      placedCabinets.push(
        createCabinetInstance(
          definition,
          options.wallId,
          offset,
          elevation,
          finishId,
          doorStyleId,
          hardwareId,
        ),
      );
      offset += definition.width;
    }
  } else {
    let offset = runStart + minCornerFiller;
    for (const code of fillSpanWithKnapsack(usableSpan, candidateCodes)) {
      const definition = getCabinetDefinitionByCode(code);
      if (!definition) continue;
      placedCabinets.push(
        createCabinetInstance(
          definition,
          options.wallId,
          offset,
          elevation,
          finishId,
          doorStyleId,
          hardwareId,
        ),
      );
      offset += definition.width;
    }
  }

  if (placedCabinets.length === 0) return null;
  placedCabinets.sort(
    (left, right) => left.offsetX - right.offsetX || left.id.localeCompare(right.id),
  );
  const regularWidth = placedCabinets.reduce((sum, cabinet) => sum + cabinet.width, 0);
  const residual = Math.max(0, runLength - regularWidth);
  let leftFiller = 0;
  let rightFiller = 0;
  let uncovered = residual;
  if (residual >= inchesToSixteenths(0.25) && residual <= inchesToSixteenths(6)) {
    leftFiller = Math.round(residual / 2);
    rightFiller = residual - leftFiller;
    const fillerDefinition = getCabinetDefinitionByCode(isBase ? 'F334' : 'F330');
    if (fillerDefinition) {
      if (leftFiller > 0) {
        placedCabinets.push(
          createBuiltFiller(
            fillerDefinition,
            options.wallId,
            runStart,
            elevation,
            leftFiller,
            finishId,
          ),
        );
      }
      if (rightFiller > 0) {
        placedCabinets.push(
          createBuiltFiller(
            fillerDefinition,
            options.wallId,
            runStart + runLength - rightFiller,
            elevation,
            rightFiller,
            finishId,
          ),
        );
      }
      uncovered = 0;
    }
  }
  placedCabinets.sort(
    (left, right) => left.offsetX - right.offsetX || left.id.localeCompare(right.id),
  );

  const totalWidth = placedCabinets.reduce((sum, cabinet) => sum + cabinet.width, 0);
  const fitScore = Math.max(0, Math.round(100 - (uncovered / runLength) * 100));
  const drawerUnitCount = placedCabinets.filter(
    (cabinet) => getCabinetDefinitionByCode(cabinet.definitionId)?.family === 'drawer_base',
  ).length;
  const storageScore = Math.min(100, drawerUnitCount * 30 + placedCabinets.length * 10);
  const symmetryScore = strategy === 'balanced_symmetry' ? 95 : 75;
  const prices = placedCabinets.map(
    (cabinet) =>
      getCabinetDefinitionByCode(cabinet.definitionId)?.retailMapping?.estimatedPriceUSD ?? null,
  );
  const pricesAreKnown = prices.every((price): price is number => price !== null);
  const estimatedCostUSD = pricesAreKnown ? prices.reduce((sum, price) => sum + price, 0) : null;
  const costScore = estimatedCostUSD === null ? null : Math.max(0, 100 - placedCabinets.length * 8);
  const overallScore = Math.round(
    fitScore * 0.4 +
      (strategy === 'balanced_symmetry'
        ? symmetryScore * 0.4 + storageScore * 0.2
        : strategy === 'maximum_drawers'
          ? storageScore * 0.4 + symmetryScore * 0.2
          : (costScore ?? 0) * 0.4 + fitScore * 0.2),
  );
  const titles: Record<AutoFitStrategy, string> = {
    balanced_symmetry: 'Balanced Symmetry Layout',
    maximum_drawers: 'Maximum Utility & Storage Layout',
    budget_optimized: 'Cost-Optimized Standard Run',
  };
  const descriptions: Record<AutoFitStrategy, string> = {
    balanced_symmetry: 'Mirrored cabinet widths centered on the available wall span.',
    maximum_drawers: 'Prioritizes compatible three-drawer base definitions.',
    budget_optimized: 'Uses only definitions with known catalog costs and minimizes unit count.',
  };
  const targetRun = isBase ? 'base' : 'wall';
  const contentKey = JSON.stringify({
    strategy,
    wallId: options.wallId,
    targetRun,
    cabinets: placedCabinets.map((cabinet) => [
      cabinet.definitionId,
      cabinet.offsetX,
      cabinet.elevation,
      cabinet.width,
    ]),
  });

  return {
    id: `proposal-${strategy}-${stableHash(contentKey)}`,
    strategy,
    title: titles[strategy],
    description: descriptions[strategy],
    targetWallId: options.wallId,
    targetRun,
    cabinets: placedCabinets,
    totalWidthSixteenths: totalWidth,
    uncoveredSpanSixteenths: uncovered,
    leftFillerWidthSixteenths: leftFiller,
    rightFillerWidthSixteenths: rightFiller,
    unitCount: placedCabinets.length,
    drawerUnitCount,
    estimatedCostUSD,
    scores: { fitScore, symmetryScore, storageScore, costScore, overallScore },
  };
}

function candidateCodesFor(strategy: AutoFitStrategy, isBase: boolean): string[] {
  if (!isBase) return ['W3630', 'W3030', 'W2430', 'W1830', 'W1530', 'CW30'];
  if (strategy === 'maximum_drawers') {
    return ['DB30', 'DB24', 'DB18', 'B30', 'B24', 'B18', 'B15', 'B12', 'CB30'];
  }
  if (strategy === 'budget_optimized') return ['B36', 'B30', 'B24', 'B18', 'B15', 'B12'];
  return ['B30', 'B24', 'B18', 'B15', 'B36', 'B12', 'CB30'];
}

function fillSpanWithKnapsack(span: Sixteenths, candidateCodes: string[]): string[] {
  const definitions = candidateCodes
    .map((code) => getCabinetDefinitionByCode(code))
    .filter((definition): definition is CabinetDefinition => definition !== undefined);
  const result: string[] = [];
  let remaining = span;
  while (remaining >= inchesToSixteenths(12)) {
    const bestFit = definitions.find((definition) => definition.width <= remaining);
    if (!bestFit) break;
    result.push(bestFit.code);
    remaining -= bestFit.width;
  }
  return result;
}

function createCabinetInstance(
  definition: CabinetDefinition,
  wallId: WallId,
  offsetX: Sixteenths,
  elevation: Sixteenths,
  finishId: string,
  doorStyleId: string,
  hardwareId: string,
): CabinetInstance {
  return {
    id: deterministicCabinetId(wallId, definition.code, offsetX, elevation),
    definitionId: definition.code,
    source: definition.source === 'stock' ? 'stock' : 'built',
    wallId,
    name: definition.name,
    category: definition.category,
    offsetX,
    elevation,
    width: definition.width,
    height: definition.height,
    depth: definition.depth,
    doorSwing: definition.defaultDoorSwing,
    doorStyleId,
    finishId,
    interiorFinishId: 'natural_birch',
    hardwareId,
    build: createDefaultCabinetBuildConfig(definition),
  };
}

function createBuiltFiller(
  definition: CabinetDefinition,
  wallId: WallId,
  offsetX: Sixteenths,
  elevation: Sixteenths,
  width: Sixteenths,
  finishId: string,
): CabinetInstance {
  return {
    ...createCabinetInstance(
      definition,
      wallId,
      offsetX,
      elevation,
      finishId,
      'slab',
      'no_hardware',
    ),
    id: deterministicCabinetId(wallId, `built-filler-${width}`, offsetX, elevation),
    source: 'built',
    name: `Built filler (${width / 16}")`,
    width,
    hardwareId: 'no_hardware',
    isCustomFiller: true,
    build: {
      ...createDefaultCabinetBuildConfig(definition),
      includeHardware: false,
      frontLayout: 'open',
      drawerCount: 0,
    },
  };
}

function largestAvailableSpan(options: AutoFitOptions): { start: Sixteenths; length: Sixteenths } {
  if (!options.project) return { start: 0, length: options.wallLength };
  const isBase = (options.targetCategory ?? 'base') === 'base';
  const runBottom = isBase ? 0 : inchesToSixteenths(54);
  const runTop = isBase ? inchesToSixteenths(36) : options.project.ceilingHeight;
  const reserved: Array<{ start: Sixteenths; end: Sixteenths }> = [];
  for (const entity of options.project.openings) {
    if (
      entity.wallId === options.wallId &&
      entity.elevation < runTop &&
      entity.elevation + entity.height > runBottom
    ) {
      reserved.push({ start: entity.offsetX, end: entity.offsetX + entity.width });
    }
  }
  for (const entity of options.project.appliances) {
    if (
      entity.wallId === options.wallId &&
      !(isBase && options.includeSinkBase && entity.type === 'sink') &&
      entity.elevation < runTop &&
      entity.elevation + entity.height > runBottom
    ) {
      reserved.push({ start: entity.offsetX, end: entity.offsetX + entity.width });
    }
  }
  reserved.sort((left, right) => left.start - right.start);
  const free: Array<{ start: Sixteenths; length: Sixteenths }> = [];
  let cursor = 0;
  for (const span of reserved) {
    if (span.start > cursor) free.push({ start: cursor, length: span.start - cursor });
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < options.wallLength) {
    free.push({ start: cursor, length: options.wallLength - cursor });
  }
  return (
    free.sort((left, right) => right.length - left.length || left.start - right.start)[0] ?? {
      start: 0,
      length: 0,
    }
  );
}

function deterministicCabinetId(
  wallId: string,
  code: string,
  offsetX: Sixteenths,
  elevation: Sixteenths,
): string {
  return `cab-${sanitize(wallId)}-${sanitize(code)}-${offsetX}-${elevation}`;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function sanitize(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}
