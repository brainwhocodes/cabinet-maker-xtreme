import { describe, expect, it } from 'vitest';
import {
  deriveCadBalloons,
  deriveCadGeometryBounds,
  deriveCadViewRecipe,
  expandCadBoundsForBalloons,
  projectCadParts,
} from '@/domain/assembly/cad-layout';
import { deriveAssemblyPartCallouts } from '@/domain/assembly/step-presentation';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import { buildCabinetParts } from '@/domain/geometry/part-builder';

const model = buildCabinetParts(resolveCabinetSpec(getCabinetDefinitionByCode('B30')!));

function viewFor(stepNumber: number, orientation: string) {
  const step = model.assemblySteps[stepNumber - 1];
  const recipe = deriveCadViewRecipe(step);
  return [recipe.primary, ...recipe.secondary].find((view) => view.orientation === orientation)!;
}

describe('CAD assembly layout', () => {
  it('projects the same cabinet geometry into deterministic orthographic views', () => {
    const step = model.assemblySteps[1];
    const part = model.parts.find((candidate) => candidate.id === 'panel_side_left')!;
    const front = projectCadParts(model, step, {
      id: 'front',
      orientation: 'front',
      label: 'Front',
      scaleLabel: 'NTS',
      partFilter: 'visible',
    }).find((candidate) => candidate.part.id === part.id)!;
    const rear = projectCadParts(model, step, {
      id: 'rear',
      orientation: 'rear',
      label: 'Rear',
      scaleLabel: 'NTS',
      partFilter: 'visible',
    }).find((candidate) => candidate.part.id === part.id)!;
    const top = projectCadParts(model, step, viewFor(2, 'top')).find(
      (candidate) => candidate.part.id === part.id,
    )!;
    const right = projectCadParts(model, step, {
      id: 'right',
      orientation: 'right',
      label: 'Right',
      scaleLabel: 'NTS',
      partFilter: 'visible',
    }).find((candidate) => candidate.part.id === part.id)!;

    expect(front.assembled.x).toBe(part.positionInches[0]);
    expect(front.assembled.y).toBe(model.heightInches - part.positionInches[1]);
    expect(rear.assembled.x).toBe(model.widthInches - part.positionInches[0]);
    expect(top.assembled.y).toBe(model.depthInches - part.positionInches[2]);
    expect(right.assembled.x).toBe(model.depthInches - part.positionInches[2]);
  });

  it('preserves the established isometric formula and exploded active position', () => {
    const step = model.assemblySteps[1];
    const part = model.parts.find((candidate) => candidate.id === 'panel_side_left')!;
    const projected = projectCadParts(model, step, viewFor(2, 'isometric')).find(
      (candidate) => candidate.part.id === part.id,
    )!;
    const offset = part.explodedOffsetInches ?? [0, 0, 0];

    expect(projected.assembled).toEqual({
      x: part.positionInches[0] + part.positionInches[2] * 0.34,
      y: model.heightInches - part.positionInches[1] + part.positionInches[2] * 0.16,
    });
    expect(projected.position.x).toBe(
      part.positionInches[0] + offset[0] + (part.positionInches[2] + offset[2]) * 0.34,
    );
    expect(projected.state).toBe('active');
  });

  it('omits future geometry and filters the enlarged step-six detail to current parts', () => {
    const stepTwo = model.assemblySteps[1];
    const stepSix = model.assemblySteps[5];
    const topParts = projectCadParts(model, stepTwo, viewFor(2, 'top'));
    const detailParts = projectCadParts(model, stepSix, viewFor(6, 'front-detail'));

    expect(topParts.some((part) => part.part.id.startsWith('door_'))).toBe(false);
    expect(detailParts.length).toBe(stepSix.activePartIds.length);
    expect(detailParts.every((part) => stepSix.activePartIds.includes(part.part.id))).toBe(true);
  });

  it('derives task-specific primary, orthographic, section, and detail views', () => {
    expect(deriveCadViewRecipe(model.assemblySteps[0]).primary.orientation).toBe('isometric');
    expect(deriveCadViewRecipe(model.assemblySteps[1]).secondary[0].orientation).toBe('top');
    expect(deriveCadViewRecipe(model.assemblySteps[3]).primary.orientation).toBe('rear');
    expect(
      deriveCadViewRecipe(model.assemblySteps[3]).secondary.map((view) => view.orientation),
    ).toEqual(['isometric', 'section-right']);
    expect(deriveCadViewRecipe(model.assemblySteps[4]).primary.orientation).toBe('front');
    expect(deriveCadViewRecipe(model.assemblySteps[5]).secondary.at(-1)).toEqual(
      expect.objectContaining({ orientation: 'front-detail', scaleLabel: 'ENLARGED' }),
    );
  });

  it('routes stable numbered balloons to perimeter lanes without overlap', () => {
    const step = model.assemblySteps[1];
    const parts = projectCadParts(model, step, viewFor(2, 'isometric'));
    const geometry = deriveCadGeometryBounds(parts);
    const callouts = deriveAssemblyPartCallouts(model, step);
    const balloons = deriveCadBalloons(parts, callouts, geometry);
    const sheetBounds = expandCadBoundsForBalloons(geometry, balloons);

    expect(balloons.map((balloon) => balloon.callout.number)).toEqual([1, 2, 3]);
    expect(
      balloons.every((balloon) =>
        balloon.side === 'left'
          ? balloon.center.x < geometry.left
          : balloon.center.x > geometry.right,
      ),
    ).toBe(true);
    for (const side of ['left', 'right'] as const) {
      const lane = balloons.filter((balloon) => balloon.side === side);
      for (let index = 1; index < lane.length; index += 1) {
        expect(Math.abs(lane[index].center.y - lane[index - 1].center.y)).toBeGreaterThanOrEqual(
          lane[index].radius * 2,
        );
      }
    }
    expect(sheetBounds.left).toBeLessThan(geometry.left);
    expect(sheetBounds.right).toBeGreaterThan(geometry.right);
  });
});
