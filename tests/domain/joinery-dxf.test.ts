import { describe, expect, it } from 'vitest';
import { exportPanelMachiningToDxf, exportSheetToDxf } from '@/domain/manufacturing/dxf-exporter';
import {
  generate32mmLineBoring,
  generateHingePlateHoles,
} from '@/domain/manufacturing/joinery-engine';
import { nestCutParts } from '@/domain/manufacturing/nesting-engine';

describe('joinery and CNC DXF generation', () => {
  it('generates accurate 32mm system line boring with 37mm setbacks', () => {
    const holes = generate32mmLineBoring(24, 34.5);
    expect(holes.length).toBeGreaterThan(10);

    const frontHole = holes.find((h) => h.id === 'hole-front-1')!;
    const rearHole = holes.find((h) => h.id === 'hole-rear-1')!;

    // 37mm / 25.4 = ~1.457 inches setback
    expect(frontHole.x).toBeCloseTo(1.457, 2);
    expect(rearHole.x).toBeCloseTo(24 - 1.457, 2);
    expect(frontHole.diameterInches).toBeCloseTo(5 / 25.4, 2);
  });

  it('generates hinge plate holes with 32mm spacing', () => {
    const holes = generateHingePlateHoles(34.5, [4.0, 30.0]);
    expect(holes).toHaveLength(4); // 2 plates x 2 holes
    const plate1Lower = holes[0];
    const plate1Upper = holes[1];

    const pitch = 32 / 25.4;
    expect(plate1Upper.y - plate1Lower.y).toBeCloseTo(pitch, 2);
  });

  it('produces valid layered AutoCAD DXF output for nested sheets', () => {
    const nesting = nestCutParts([
      {
        id: 'test-p1',
        name: 'Panel A',
        cabinetCode: 'B30',
        width: 24,
        height: 30,
        material: 'plywood_3_4',
        grain: 'either',
      },
    ]);

    const dxf = exportSheetToDxf(nesting.sheets[0]);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('HEADER');
    expect(dxf).toContain('TABLES');
    expect(dxf).toContain('OUTLINE_CUT');
    expect(dxf).toContain('DADO_POCKET');
    expect(dxf).toContain('DRILL_5MM');
    expect(dxf).toContain('PART_LABELS');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('POLYLINE');
    expect(dxf).toContain('EOF');
  });

  it('produces valid DXF with drill circles for single panel machining', () => {
    const dxf = exportPanelMachiningToDxf({
      partId: 'side-l',
      partName: 'Side Panel',
      width: 24,
      height: 34.5,
      holes: [
        {
          id: 'h1',
          x: 1.46,
          y: 4.5,
          diameterInches: 0.197,
          depthInches: 0.5,
          type: 'shelf_pin',
        },
      ],
      dados: [
        {
          id: 'd1',
          x: 0,
          y: 4.5,
          width: 23.75,
          height: 0.75,
          depthInches: 0.25,
          purpose: 'bottom_deck',
        },
      ],
    });

    expect(dxf).toContain('CIRCLE');
    expect(dxf).toContain('DRILL_5MM');
    expect(dxf).toContain('DADO_POCKET');
    expect(dxf).toContain('EOF');
  });
});
