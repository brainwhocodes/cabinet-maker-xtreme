import { describe, expect, it } from 'vitest';
import {
  calculateEdgeBandingRequirements,
  deductEdgeBanding,
} from '@/domain/manufacturing/edge-banding';

describe('edge banding specification and deductions', () => {
  it('deducts thickness cleanly for front edge only', () => {
    const raw = deductEdgeBanding(24, 34.5, { type: 'pvc_2mm', coverage: 'front' });
    expect(raw.finishedWidth).toBe(24);
    expect(raw.finishedHeight).toBe(34.5);
    expect(raw.rawWidth).toBe(24);
    expect(raw.rawHeight).toBeCloseTo(34.5 - 0.079, 2);
  });

  it('deducts thickness on all 4 sides for full edge banding', () => {
    const raw = deductEdgeBanding(24, 30, { type: 'wood_1mm', coverage: 'all_4' });
    expect(raw.rawWidth).toBeCloseTo(24 - 0.039 * 2, 2);
    expect(raw.rawHeight).toBeCloseTo(30 - 0.039 * 2, 2);
  });

  it('returns unchanged dimensions when edge banding is none', () => {
    const raw = deductEdgeBanding(24, 30, { type: 'none', coverage: 'none' });
    expect(raw.rawWidth).toBe(24);
    expect(raw.rawHeight).toBe(30);
  });

  it('calculates linear footage and roll counts accurately with 10% shop waste', () => {
    const parts = [
      {
        width: 24,
        height: 34.5,
        edgeBanding: { type: 'pvc_2mm' as const, coverage: 'front' as const },
      },
      {
        width: 24,
        height: 34.5,
        edgeBanding: { type: 'pvc_2mm' as const, coverage: 'front' as const },
      },
      {
        width: 28.5,
        height: 24,
        edgeBanding: { type: 'pvc_2mm' as const, coverage: 'front' as const },
      },
    ];

    const summary = calculateEdgeBandingRequirements(parts);
    expect(summary).toHaveLength(1);
    expect(summary[0].type).toBe('pvc_2mm');
    expect(summary[0].totalLinearInches).toBeCloseTo(34.5 + 34.5 + 24, 1);
    expect(summary[0].totalLinearFeet).toBeGreaterThan(7);
    expect(summary[0].rollCount250ft).toBe(1);
  });
});
