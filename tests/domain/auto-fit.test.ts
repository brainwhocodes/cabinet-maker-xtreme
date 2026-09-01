import { describe, expect, it } from 'vitest';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { generateAutoFitProposals } from '@/domain/layout/auto-fit';
import { useProjectStore } from '@/state/project-store';

describe('Deterministic Auto-Fit Algorithm Engine', () => {
  it('generates ranked layout proposals for a 120" wall', () => {
    const wallLength = inchesToSixteenths(120); // 10 ft
    const proposals = generateAutoFitProposals({
      wallId: 'wall-1',
      wallLength,
      targetCategory: 'base',
      includeSinkBase: false,
    });

    expect(proposals.length).toBe(3);

    const balanced = proposals.find((p) => p.strategy === 'balanced_symmetry');
    const drawers = proposals.find((p) => p.strategy === 'maximum_drawers');
    const budget = proposals.find((p) => p.strategy === 'budget_optimized');

    expect(balanced).toBeDefined();
    expect(drawers).toBeDefined();
    expect(budget).toBeDefined();

    // Check that cabinets fit within the wall length
    for (const prop of proposals) {
      expect(prop.totalWidthSixteenths).toBeLessThanOrEqual(wallLength);
      expect(prop.cabinets.length).toBeGreaterThan(0);
      expect(prop.scores.overallScore).toBeGreaterThan(0);
    }

    expect(balanced?.estimatedCostUSD).toBeGreaterThan(0);
    expect(drawers?.estimatedCostUSD).toBeNull();
    expect(drawers?.scores.costScore).toBeNull();
    expect(budget?.estimatedCostUSD).toBeGreaterThan(0);
    expect(budget?.scores.costScore).toBeGreaterThan(0);
    expect(balanced?.uncoveredSpanSixteenths).toBe(0);
    expect(balanced?.cabinets.filter((cabinet) => cabinet.isCustomFiller)).toHaveLength(2);
    expect(balanced?.targetWallId).toBe('wall-1');
    expect(balanced?.targetRun).toBe('base');
    expect(generateAutoFitProposals({ wallId: 'wall-1', wallLength })).toEqual(proposals);
  });

  it('centers sink base when includeSinkBase is true', () => {
    const wallLength = inchesToSixteenths(144); // 12 ft
    const proposals = generateAutoFitProposals({
      wallId: 'wall-1',
      wallLength,
      targetCategory: 'base',
      includeSinkBase: true,
    });

    const balanced = proposals.find((p) => p.strategy === 'balanced_symmetry')!;
    expect(balanced).toBeDefined();

    const sink = balanced.cabinets.find((c) => c.definitionId === 'SB36');
    expect(sink, 'Sink Base SB36 should be placed').toBeDefined();

    // Verify sink base is near the center of the wall
    const sinkCenterInches = ((sink?.offsetX ?? 0) + (sink?.width ?? 0) / 2) / 16;
    expect(Math.abs(sinkCenterInches - 72)).toBeLessThan(10);
  });

  it('reserves opening and appliance spans before solving', () => {
    useProjectStore.getState().resetProject();
    const project = structuredClone(useProjectStore.getState().project);
    project.openings = [
      {
        id: 'opening-door',
        wallId: 'wall-1',
        type: 'door',
        name: 'Door',
        offsetX: inchesToSixteenths(40),
        elevation: 0,
        width: inchesToSixteenths(30),
        height: inchesToSixteenths(80),
        depth: inchesToSixteenths(4.5),
      },
    ];
    project.appliances = [];
    const proposals = generateAutoFitProposals({
      project,
      wallId: 'wall-1',
      wallLength: inchesToSixteenths(120),
      targetCategory: 'base',
    });
    expect(proposals.length).toBeGreaterThan(0);
    for (const proposal of proposals) {
      expect(
        Math.min(...proposal.cabinets.map((cabinet) => cabinet.offsetX)),
      ).toBeGreaterThanOrEqual(inchesToSixteenths(70));
    }
  });
});
