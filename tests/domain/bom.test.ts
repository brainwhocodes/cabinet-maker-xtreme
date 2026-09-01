import { beforeEach, describe, expect, it } from 'vitest';
import { computeProjectBOM } from '@/domain/bom/compute-project-bom';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';

describe('project bill of materials', () => {
  beforeEach(() => useProjectStore.getState().resetProject());

  it('returns zero procurement rows and totals for an empty project', () => {
    const project = structuredClone(useProjectStore.getState().project);
    project.cabinets = [];
    project.builtInElements = [];
    const bom = computeProjectBOM(project);
    expect(bom.rows).toEqual([]);
    expect(bom.knownGrandTotalUSD).toBe(0);
    expect(bom.unpricedRowCount).toBe(0);
    expect(bom.countertopSqFt).toBe(0);
    expect(bom.nextRecommendedAction).toContain('Add a cabinet');
  });

  it('keeps stock retailer mappings honest without unconditional allowances', () => {
    const project = structuredClone(useProjectStore.getState().project);
    project.cabinets = [project.cabinets[0]];
    project.builtInElements = [];
    const bom = computeProjectBOM(project);
    const cabinetRow = bom.rows.find((row) => row.category === 'cabinet')!;
    expect(cabinetRow).toMatchObject({
      sku: '1004128930',
      quantity: 1,
      unitPriceUSD: 209,
      totalPriceUSD: 209,
      dataStatus: 'search-only',
    });
    expect(cabinetRow.retailSearchUrl).toContain('homedepot.com');
    expect(bom.rows.some((row) => row.category === 'trim')).toBe(false);
    expect(bom.rows.some((row) => row.category === 'installation')).toBe(false);
    expect(bom.knownGrandTotalUSD).toBe(209);
  });

  it('calculates built cabinet sheets, shelves, pins, hardware, and fastener packs', () => {
    const project = structuredClone(useProjectStore.getState().project);
    const cabinet = {
      ...project.cabinets[0],
      id: 'cab-built-test',
      source: 'built' as const,
    };
    project.cabinets = [cabinet];
    project.builtInElements = [];
    const bom = computeProjectBOM(project);

    expect(bom.rows.find((row) => row.id === 'bom-material-plywood_3_4')).toMatchObject({
      quantity: 2,
      unit: 'sheet',
      totalPriceUSD: null,
    });
    expect(bom.rows.find((row) => row.id === 'bom-material-backer_1_4')).toMatchObject({
      quantity: 1,
      unit: 'sheet',
    });
    expect(bom.rows.find((row) => row.id === 'bom-material-shelf_pin_pack')).toMatchObject({
      quantity: 1,
      unit: 'pack',
    });
    expect(bom.rows.find((row) => row.id === 'bom-material-cabinet_hardware_pack')).toMatchObject({
      quantity: 4,
      unit: 'ea',
    });
    expect(bom.rows.find((row) => row.id === 'bom-material-cabinet_fastener_pack')).toMatchObject({
      quantity: 1,
      unit: 'pack',
    });
    expect(bom.unpricedRowCount).toBe(bom.rows.length);
  });

  it('emits exact explicit rows for every built-in element type', () => {
    const project = structuredClone(useProjectStore.getState().project);
    project.cabinets = [];
    project.builtInElements = [
      builtIn('countertop', 36, 1.5, 25.5),
      builtIn('end_panel', 0.75, 34.5, 24),
      builtIn('toe_kick', 96, 4.5, 0.25),
      builtIn('crown', 96, 2.5, 0.75),
      builtIn('light_rail', 96, 1.5, 0.75),
      builtIn('floating_shelf', 24, 1.25, 10),
    ];
    const bom = computeProjectBOM(project);
    expect(bom.countertopSqFt).toBe(7.01);
    expect(bom.rows.find((row) => row.category === 'countertop')).toMatchObject({
      quantity: 7.01,
      totalPriceUSD: null,
    });
    expect(bom.rows.filter((row) => row.category === 'trim')).toHaveLength(3);
    expect(bom.rows.find((row) => row.id === 'bom-built-in-end_panel')).toMatchObject({
      quantity: 1,
    });
    expect(bom.rows.find((row) => row.id === 'bom-built-in-floating_shelf')).toMatchObject({
      quantity: 1,
    });
  });
});

function builtIn(
  type: 'countertop' | 'end_panel' | 'toe_kick' | 'crown' | 'light_rail' | 'floating_shelf',
  width: number,
  height: number,
  depth: number,
) {
  return {
    id: `builtin-${type}`,
    definitionId: `${type}_test`,
    type,
    origin: 'manual' as const,
    name: type,
    wallId: 'wall-1',
    offsetX: 0,
    elevation: 0,
    depthOffset: 0,
    width: inchesToSixteenths(width),
    height: inchesToSixteenths(height),
    depth: inchesToSixteenths(depth),
    finishId: 'polar_white',
    attachedCabinetIds: [],
  };
}
