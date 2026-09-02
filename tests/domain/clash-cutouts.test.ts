import { describe, expect, it } from 'vitest';
import { detectDynamicClashes } from '@/domain/architecture/clash-simulation';
import {
  calculateFaucetHoles,
  validateCountertopCutout,
} from '@/domain/architecture/countertop-cutout-engine';
import { calculateUnderCabinetLighting } from '@/domain/architecture/internal-organizers';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';

describe('countertop cutouts, dynamic clashes, and architectural lighting', () => {
  it('validates safe countertop bridge margins against cracking', () => {
    const safe = validateCountertopCutout(60, 25.5, {
      preset: 'sink_undermount_single', // 30" x 18"
      centerOffsetX: 30,
      setbackFromFront: 3.5,
      faucetDrilling: 'single_hole',
      faucetSetbackFromCutout: 2.25,
    });

    expect(safe.valid).toBe(true);
    expect(safe.frontBridgeInches).toBe(3.5);
    expect(safe.rearBridgeInches).toBe(25.5 - 3.5 - 18); // 4.0"
    expect(safe.warnings).toHaveLength(0);

    const unsafe = validateCountertopCutout(60, 24, {
      preset: 'sink_drop_in', // 33" x 22"
      centerOffsetX: 30,
      setbackFromFront: 1.0, // Unsafe < 1.5"
      faucetDrilling: 'none',
      faucetSetbackFromCutout: 0,
    });

    expect(unsafe.valid).toBe(false);
    expect(unsafe.warnings.some((w) => w.includes('MIA standard'))).toBe(true);
  });

  it('calculates faucet hole coordinates accurately', () => {
    const single = calculateFaucetHoles(30, 21.5, 'single_hole', 2.25);
    expect(single).toHaveLength(1);
    expect(single[0].x).toBe(30);
    expect(single[0].y).toBe(23.75);

    const widespread = calculateFaucetHoles(30, 21.5, 'three_hole_8in', 2.25);
    expect(widespread).toHaveLength(3);
    expect(widespread[0].x).toBe(26);
    expect(widespread[1].x).toBe(30);
    expect(widespread[2].x).toBe(34);
  });

  it('detects dynamic clearance clashes when dishwashers are placed in tight corners', () => {
    const project = structuredClone(useProjectStore.getState().project);
    project.appliances = [
      {
        id: 'app-dw',
        name: 'Dishwasher',
        type: 'dishwasher' as const,
        wallId: project.walls[0].id,
        offsetX: inchesToSixteenths(12),
        elevation: 0,
        width: inchesToSixteenths(24),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
      },
    ];

    const clashes = detectDynamicClashes(project);
    expect(clashes.length).toBeGreaterThan(0);
    expect(clashes.some((c) => c.clashType === 'corner_drawer_bind')).toBe(true);
  });

  it('calculates under-cabinet lighting linear footage and driver sizing', () => {
    const wallCabinets = [
      { width: inchesToSixteenths(30) },
      { width: inchesToSixteenths(36) },
      { width: inchesToSixteenths(30) },
    ]; // Total = 96 inches = 8 feet

    const lighting = calculateUnderCabinetLighting(wallCabinets);
    expect(lighting.linearFeetRequired).toBe(8);
    expect(lighting.channelPieces96in).toBe(1);
    expect(lighting.driverWattageRequired).toBe(60); // 8ft * 4.5W * 1.2 = ~43.2W -> 60W driver
    expect(lighting.estimatedCostUSD).toBe(8 * 12 + 1 * 15 + 45); // $156
  });
});
