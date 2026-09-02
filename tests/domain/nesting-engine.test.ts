import { describe, expect, it } from 'vitest';
import { type CutPart, nestCutParts } from '@/domain/manufacturing/nesting-engine';

describe('2D sheet nesting engine', () => {
  it('nests rectangular panels on standard 48" x 96" sheets with high yield', () => {
    const parts: CutPart[] = [
      {
        id: 'p1',
        name: 'Left Side Panel',
        cabinetCode: 'B30',
        width: 23,
        height: 34.5,
        material: 'plywood_3_4',
        grain: 'lengthwise',
      },
      {
        id: 'p2',
        name: 'Right Side Panel',
        cabinetCode: 'B30',
        width: 23,
        height: 34.5,
        material: 'plywood_3_4',
        grain: 'lengthwise',
      },
      {
        id: 'p3',
        name: 'Bottom Deck',
        cabinetCode: 'B30',
        width: 23,
        height: 28.5,
        material: 'plywood_3_4',
        grain: 'either',
      },
      {
        id: 'p4',
        name: 'Interior Shelf',
        cabinetCode: 'B30',
        width: 23,
        height: 28.5,
        material: 'plywood_3_4',
        grain: 'either',
      },
    ];

    const result = nestCutParts(parts, 'plywood_3_4', {
      sheetWidth: 48,
      sheetHeight: 96,
      kerf: 0.125,
      trimMargin: 0.5,
    });

    expect(result.totalSheets).toBe(1);
    expect(result.sheets[0].placedParts).toHaveLength(4);
    expect(result.overallYieldPercentage).toBeGreaterThan(50);
    expect(result.sheets[0].ripCuts.length).toBeGreaterThan(0);
    expect(result.unplacedParts).toHaveLength(0);
  });

  it('allocates additional sheets when parts exceed single sheet area', () => {
    const largeParts: CutPart[] = Array.from({ length: 8 }, (_, i) => ({
      id: `tall-${i}`,
      name: `Tall Side Panel ${i}`,
      cabinetCode: 'T24',
      width: 24,
      height: 84,
      material: 'plywood_3_4',
      grain: 'lengthwise',
    }));

    const result = nestCutParts(largeParts, 'plywood_3_4');
    expect(result.totalSheets).toBeGreaterThanOrEqual(4);
    expect(result.unplacedParts).toHaveLength(0);
  });

  it('respects grain constraints by forbidding 90-degree rotation when grain is lengthwise', () => {
    const part: CutPart = {
      id: 'grain-test',
      name: 'Grained Panel',
      cabinetCode: 'B30',
      width: 30,
      height: 40,
      material: 'plywood_3_4',
      grain: 'lengthwise',
    };

    const result = nestCutParts([part]);
    const placed = result.sheets[0].placedParts[0];
    expect(placed.rotated).toBe(false);
    expect(placed.width).toBe(30);
    expect(placed.height).toBe(40);
  });
});
