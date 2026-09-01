import { resolveCabinetSpec } from '../cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '../catalog/standard-cabinets';
import type { BuiltInElement, CabinetInstance, RoomProject, WallId } from '../geometry/models';
import { inchesToSixteenths, type Sixteenths } from '../geometry/units';

const ADJACENCY_LIMIT = inchesToSixteenths(0.25);

export function deriveBuiltInRunProposal(
  project: RoomProject,
  wallId: WallId,
  cabinetIds?: string[],
): BuiltInElement[] {
  const selectedIds = cabinetIds ? new Set(cabinetIds) : null;
  const cabinets = project.cabinets
    .filter((cabinet) => cabinet.wallId === wallId && (!selectedIds || selectedIds.has(cabinet.id)))
    .sort((left, right) => left.offsetX - right.offsetX || left.id.localeCompare(right.id));
  const baseRuns = segmentRuns(
    cabinets.filter((cabinet) => cabinet.category === 'base' || cabinet.category === 'corner'),
  );
  const upperRuns = segmentRuns(
    cabinets.filter((cabinet) => cabinet.category === 'wall' || cabinet.category === 'tall'),
  );

  return [
    ...baseRuns.flatMap((run) => deriveBaseRunElements(wallId, run)),
    ...upperRuns.flatMap((run) => deriveUpperRunElements(wallId, run)),
  ];
}

function segmentRuns(cabinets: CabinetInstance[]): CabinetInstance[][] {
  const runs: CabinetInstance[][] = [];
  for (const cabinet of cabinets) {
    const current = runs.at(-1);
    if (!current) {
      runs.push([cabinet]);
      continue;
    }
    const previous = current.at(-1)!;
    if (cabinet.offsetX - (previous.offsetX + previous.width) <= ADJACENCY_LIMIT) {
      current.push(cabinet);
    } else {
      runs.push([cabinet]);
    }
  }
  return runs;
}

function deriveBaseRunElements(wallId: WallId, run: CabinetInstance[]): BuiltInElement[] {
  const start = Math.min(...run.map((cabinet) => cabinet.offsetX));
  const end = Math.max(...run.map((cabinet) => cabinet.offsetX + cabinet.width));
  const width = end - start;
  const top = Math.max(...run.map((cabinet) => cabinet.elevation + cabinet.height));
  const maxDepth = Math.max(...run.map((cabinet) => cabinet.depth));
  const finishId = run[0].finishId;
  const attachedCabinetIds = run.map((cabinet) => cabinet.id).sort();
  const elements: BuiltInElement[] = [
    runElement({
      wallId,
      type: 'countertop',
      name: 'Run countertop',
      offsetX: start,
      elevation: top,
      depthOffset: 0,
      width,
      height: inchesToSixteenths(1.5),
      depth: maxDepth + inchesToSixteenths(1.5),
      finishId,
      attachedCabinetIds,
    }),
  ];

  let toeHeight = 0;
  let toeDepth = 0;
  for (const cabinet of run) {
    const resolved = resolveBuild(cabinet);
    if (resolved.toeKickHeight > 0 && resolved.toeKickDepth > 0) {
      toeHeight = Math.max(toeHeight, resolved.toeKickHeight);
      toeDepth = Math.max(toeDepth, resolved.toeKickDepth);
    }
  }
  if (toeHeight > 0 && toeDepth > 0) {
    elements.push(
      runElement({
        wallId,
        type: 'toe_kick',
        name: 'Run toe-kick skin',
        offsetX: start,
        elevation: 0,
        depthOffset: Math.max(0, maxDepth - toeDepth - inchesToSixteenths(0.25)),
        width,
        height: toeHeight,
        depth: inchesToSixteenths(0.25),
        finishId,
        attachedCabinetIds,
      }),
    );
  }

  const left = run[0];
  if (!left.build.leftFinishedEnd) {
    elements.push(endPanel(wallId, left, 'left'));
  }
  const right = run.at(-1)!;
  if (!right.build.rightFinishedEnd) {
    elements.push(endPanel(wallId, right, 'right'));
  }
  return elements;
}

function deriveUpperRunElements(wallId: WallId, run: CabinetInstance[]): BuiltInElement[] {
  const start = Math.min(...run.map((cabinet) => cabinet.offsetX));
  const end = Math.max(...run.map((cabinet) => cabinet.offsetX + cabinet.width));
  const width = end - start;
  const highestTop = Math.max(...run.map((cabinet) => cabinet.elevation + cabinet.height));
  const lowestBottom = Math.min(...run.map((cabinet) => cabinet.elevation));
  const maxDepth = Math.max(...run.map((cabinet) => cabinet.depth));
  const finishId = run[0].finishId;
  const attachedCabinetIds = run.map((cabinet) => cabinet.id).sort();
  const elements: BuiltInElement[] = [
    runElement({
      wallId,
      type: 'crown',
      name: 'Run crown molding',
      offsetX: start,
      elevation: highestTop,
      depthOffset: Math.max(0, maxDepth - inchesToSixteenths(0.75)),
      width,
      height: inchesToSixteenths(2.5),
      depth: inchesToSixteenths(0.75),
      finishId,
      attachedCabinetIds,
    }),
    runElement({
      wallId,
      type: 'light_rail',
      name: 'Run light rail',
      offsetX: start,
      elevation: Math.max(0, lowestBottom - inchesToSixteenths(1.5)),
      depthOffset: Math.max(0, maxDepth - inchesToSixteenths(0.75)),
      width,
      height: inchesToSixteenths(1.5),
      depth: inchesToSixteenths(0.75),
      finishId,
      attachedCabinetIds,
    }),
  ];

  const left = run[0];
  if (!left.build.leftFinishedEnd) elements.push(endPanel(wallId, left, 'left'));
  const right = run.at(-1)!;
  if (!right.build.rightFinishedEnd) elements.push(endPanel(wallId, right, 'right'));
  return elements;
}

function endPanel(
  wallId: WallId,
  cabinet: CabinetInstance,
  side: 'left' | 'right',
): BuiltInElement {
  const width = inchesToSixteenths(0.75);
  return runElement({
    wallId,
    type: 'end_panel',
    name: `${side === 'left' ? 'Left' : 'Right'} run end panel`,
    offsetX: side === 'left' ? cabinet.offsetX : cabinet.offsetX + cabinet.width - width,
    elevation: cabinet.elevation,
    depthOffset: 0,
    width,
    height: cabinet.height,
    depth: cabinet.depth,
    finishId: cabinet.finishId,
    attachedCabinetIds: [cabinet.id],
  });
}

function resolveBuild(cabinet: CabinetInstance) {
  const definition = getCabinetDefinitionByCode(cabinet.definitionId);
  if (!definition) throw new Error(`Unknown cabinet definition: ${cabinet.definitionId}`);
  const spec = resolveCabinetSpec(definition, cabinet);
  return {
    toeKickHeight: spec.build.toeKickHeight,
    toeKickDepth: spec.build.toeKickDepth,
  };
}

function runElement(input: {
  wallId: WallId;
  type: BuiltInElement['type'];
  name: string;
  offsetX: Sixteenths;
  elevation: Sixteenths;
  depthOffset: Sixteenths;
  width: Sixteenths;
  height: Sixteenths;
  depth: Sixteenths;
  finishId: string;
  attachedCabinetIds: string[];
}): BuiltInElement {
  const sortedIds = [...input.attachedCabinetIds].sort();
  return {
    id: `builtin-run-${sanitize(input.wallId)}-${input.type}-${stableHash(
      `${sortedIds.join('|')}|${input.offsetX}|${input.elevation}|${input.name}`,
    )}`,
    definitionId: `${input.type}_run_generated`,
    type: input.type,
    origin: 'run_generated',
    name: input.name,
    wallId: input.wallId,
    offsetX: input.offsetX,
    elevation: input.elevation,
    depthOffset: input.depthOffset,
    width: input.width,
    height: input.height,
    depth: input.depth,
    finishId: input.finishId,
    attachedCabinetIds: sortedIds,
  };
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
