import { describe, expect, it } from 'vitest';
import { getPlannerCatalogEntries } from '@/domain/catalog/planner-catalog';
import {
  getCatalogPreviewGeometry,
  getCatalogPreviewPrimitives,
} from '@/domain/catalog/preview-geometry';
import {
  DOOR_STYLES,
  FINISH_OPTIONS,
  getCabinetDefinitionByCode,
  getCabinetsByCategory,
  HARDWARE_OPTIONS,
} from '@/domain/catalog/standard-cabinets';
import { sixteenthsToInches } from '@/domain/geometry/units';

describe('Standard Cabinet Catalog', () => {
  it('contains essential standard cabinet codes', () => {
    const requiredCodes = [
      'B12',
      'B18',
      'B24',
      'B30',
      'B36',
      'SB30',
      'SB36',
      'DB18',
      'DB24',
      'DB30',
      'W1830',
      'W3015',
      'W3030',
      'W3036',
      'U2484',
      'LS36',
      'F334',
      'CB30',
      'CW30',
      'CT24',
      'BK30',
      'BN48',
      'MB48',
    ];

    for (const code of requiredCodes) {
      const def = getCabinetDefinitionByCode(code);
      expect(def, `Cabinet ${code} should exist in catalog`).toBeDefined();
      expect(def?.code).toBe(code);
    }
  });

  it('verifies standard base cabinet dimensional constraints', () => {
    const b30 = getCabinetDefinitionByCode('B30')!;
    expect(sixteenthsToInches(b30.width)).toBe(30);
    expect(sixteenthsToInches(b30.height)).toBe(34.5);
    expect(sixteenthsToInches(b30.depth)).toBe(24);
    expect(b30.category).toBe('base');
    expect(b30.hasDrawers).toBe(true);
    expect(b30.shelfCount).toBe(1);
  });

  it('verifies sink base configuration', () => {
    const sb36 = getCabinetDefinitionByCode('SB36')!;
    expect(sixteenthsToInches(sb36.width)).toBe(36);
    expect(sb36.hasSinkCutout).toBe(true);
    expect(sb36.drawerCount).toBe(0);
    expect(sb36.shelfCount).toBe(0);
  });

  it('verifies 3-drawer base configuration', () => {
    const db24 = getCabinetDefinitionByCode('DB24')!;
    expect(sixteenthsToInches(db24.width)).toBe(24);
    expect(db24.hasDrawers).toBe(true);
    expect(db24.drawerCount).toBe(3);
    expect(db24.defaultDoorSwing).toBe('drawers');
  });

  it('uses 12-inch wall depths except for the appliance bridge', () => {
    const wallCabinets = getCabinetsByCategory('wall');
    expect(wallCabinets.length).toBeGreaterThanOrEqual(4);

    for (const cabinet of wallCabinets) {
      expect(sixteenthsToInches(cabinet.depth)).toBe(
        cabinet.family === 'appliance_bridge' ? 24 : 12,
      );
      expect(cabinet.category).toBe('wall');
    }
  });

  it('verifies finishes, door styles, and hardware options are populated', () => {
    expect(FINISH_OPTIONS.length).toBeGreaterThanOrEqual(4);
    expect(DOOR_STYLES.length).toBeGreaterThanOrEqual(3);
    expect(HARDWARE_OPTIONS.length).toBeGreaterThanOrEqual(3);

    expect(FINISH_OPTIONS.some((f) => f.id === 'polar_white')).toBe(true);
    expect(DOOR_STYLES.some((d) => d.id === 'shaker')).toBe(true);
    expect(HARDWARE_OPTIONS.some((h) => h.id === 'matte_black_bar')).toBe(true);
    expect(HARDWARE_OPTIONS.find((h) => h.id === 'modern_knob')).toMatchObject({
      primitive: 'cylinder',
      radiusInches: 0.625,
      heightInches: 1.25,
    });
    expect(HARDWARE_OPTIONS.find((h) => h.id === 'no_hardware')).toMatchObject({
      type: 'none',
      widthInches: 0,
      heightInches: 0,
      depthInches: 0,
    });
  });

  it('exposes cabinets, built-ins, hardware, and exact shelf packages', () => {
    const entries = getPlannerCatalogEntries();
    expect(new Set(entries.map((entry) => entry.kind))).toEqual(
      new Set(['cabinet', 'built_in', 'hardware', 'shelving', 'drawer_system', 'hinge']),
    );
    expect(
      entries.filter((entry) => entry.kind === 'shelving').map((entry) => entry.shelfPackage.id),
    ).toEqual(['shelf_0_open', 'shelf_1_adjustable', 'shelf_2_adjustable', 'shelf_3_adjustable']);
    const countertop = entries.find(
      (entry) => entry.kind === 'built_in' && entry.builtInDefinition.id === 'countertop_standard',
    );
    expect(
      countertop?.kind === 'built_in' &&
        sixteenthsToInches(countertop.builtInDefinition.defaultDepth),
    ).toBe(25.5);
  });

  it('derives thumbnails from exact cabinet, built-in, hardware, and shelf geometry', () => {
    const entries = getPlannerCatalogEntries();
    const cabinet = entries.find(
      (entry) => entry.kind === 'cabinet' && entry.cabinetDefinition.code === 'B30',
    )!;
    const builtIn = entries.find(
      (entry) => entry.kind === 'built_in' && entry.builtInDefinition.id === 'countertop_standard',
    )!;
    const knob = entries.find(
      (entry) => entry.kind === 'hardware' && entry.hardwareOption.id === 'modern_knob',
    )!;
    const shelves = entries.find(
      (entry) => entry.kind === 'shelving' && entry.shelfPackage.id === 'shelf_2_adjustable',
    )!;

    expect(getCatalogPreviewGeometry(cabinet).shapes.length).toBeGreaterThan(10);
    expect(getCatalogPreviewPrimitives(builtIn)).toEqual([
      expect.objectContaining({
        primitive: 'box',
        widthInches: 36,
        heightInches: 1.5,
        depthInches: 25.5,
      }),
    ]);
    expect(getCatalogPreviewPrimitives(knob)).toEqual([
      expect.objectContaining({
        primitive: 'cylinder',
        radiusInches: 0.625,
        heightInches: 1.25,
      }),
    ]);
    const shelfPrimitives = getCatalogPreviewPrimitives(shelves);
    expect(
      shelfPrimitives.filter((primitive) => primitive.id.startsWith('shelf_interior_')),
    ).toHaveLength(2);
    expect(
      shelfPrimitives.filter((primitive) => primitive.id.startsWith('shelf_pin_')),
    ).toHaveLength(8);
    expect(shelfPrimitives.find((primitive) => primitive.id === 'shelf_interior_1')).toMatchObject({
      widthInches: 28.25,
      heightInches: 0.75,
      depthInches: 10.5,
    });
  });
});
