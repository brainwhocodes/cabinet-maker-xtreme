import { describe, expect, it } from 'vitest';
import {
  createDefaultCabinetBuildConfig,
  resolveCabinetSpec,
} from '@/domain/cabinet/resolve-cabinet-spec';
import {
  getCabinetDefinitionByCode,
  STANDARD_CABINET_CATALOG,
} from '@/domain/catalog/standard-cabinets';
import type { CabinetDefinition } from '@/domain/catalog/types';
import type { CabinetInstance } from '@/domain/geometry/models';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import { inchesToSixteenths, sixteenthsToInches } from '@/domain/geometry/units';

function cabinetInstance(
  definition: CabinetDefinition,
  overrides: Partial<CabinetInstance> = {},
): CabinetInstance {
  return {
    id: `cab-test-${definition.code.toLowerCase()}`,
    definitionId: definition.code,
    source: definition.source === 'stock' ? 'stock' : 'built',
    wallId: 'wall-1',
    name: definition.name,
    category: definition.category,
    offsetX: 0,
    elevation: 0,
    width: definition.width,
    height: definition.height,
    depth: definition.depth,
    doorSwing: definition.defaultDoorSwing,
    doorStyleId: 'shaker',
    finishId: 'polar_white',
    interiorFinishId: 'natural_birch',
    hardwareId: 'matte_black_bar',
    build: createDefaultCabinetBuildConfig(definition),
    ...overrides,
  };
}

describe('resolved cabinet build specification', () => {
  it('resolves every stock definition to its catalog dimensions and defaults', () => {
    for (const definition of STANDARD_CABINET_CATALOG.filter(
      (candidate) => candidate.source === 'stock',
    )) {
      const instance = cabinetInstance(definition, {
        width: inchesToSixteenths(99),
        height: inchesToSixteenths(99),
        depth: inchesToSixteenths(99),
      });
      const spec = resolveCabinetSpec(definition, instance);

      expect(spec.source).toBe('stock');
      expect(spec.widthInches).toBe(sixteenthsToInches(definition.width));
      expect(spec.heightInches).toBe(sixteenthsToInches(definition.height));
      expect(spec.depthInches).toBe(sixteenthsToInches(definition.depth));
      expect(spec.frontLayout).toBe(definition.frontLayout);
      expect(spec.drawerCount).toBe(definition.drawerCount);
      expect(spec.build.shelfCount).toBe(definition.shelfCount);
    }
  });

  it('uses editable dimensions for a built cabinet', () => {
    const definition = getCabinetDefinitionByCode('CB30')!;
    const instance = cabinetInstance(definition, {
      width: inchesToSixteenths(33.5),
      height: inchesToSixteenths(37),
      depth: inchesToSixteenths(26),
    });
    const spec = resolveCabinetSpec(definition, instance);
    const model = buildCabinetParts(spec);

    expect(spec.source).toBe('built');
    expect([model.widthInches, model.heightInches, model.depthInches]).toEqual([33.5, 37, 26]);
  });

  it('resolves zero through six evenly spaced shelves', () => {
    const definition = getCabinetDefinitionByCode('CW30')!;
    for (let shelfCount = 0; shelfCount <= 6; shelfCount += 1) {
      const base = cabinetInstance(definition);
      const instance = cabinetInstance(definition, {
        build: { ...base.build, shelfCount, shelfLayout: 'even', shelfElevations: [] },
      });
      const spec = resolveCabinetSpec(definition, instance);
      const shelfParts = buildCabinetParts(spec).parts.filter((part) => part.category === 'shelf');

      expect(spec.shelfElevationsInches).toHaveLength(shelfCount);
      expect(shelfParts).toHaveLength(shelfCount);
      if (shelfCount > 1) {
        const gaps = spec.shelfElevationsInches
          .slice(1)
          .map((elevation, index) => elevation - spec.shelfElevationsInches[index]);
        expect(new Set(gaps.map((gap) => gap.toFixed(6))).size).toBe(1);
      }
    }
  });

  it('uses exact custom shelf elevations and rejects invalid custom layouts', () => {
    const definition = getCabinetDefinitionByCode('CW30')!;
    const base = cabinetInstance(definition);
    const valid = cabinetInstance(definition, {
      build: {
        ...base.build,
        shelfCount: 3,
        shelfLayout: 'custom',
        shelfElevations: [8, 16, 24].map(inchesToSixteenths),
      },
    });
    expect(resolveCabinetSpec(definition, valid).shelfElevationsInches).toEqual([8, 16, 24]);

    const invalidElevations = [
      [8, 16],
      [8, 7, 20],
      [8, 8.5, 20],
      [0.5, 8, 16],
      [8, 16, 30],
    ];
    for (const elevations of invalidElevations) {
      expect(() =>
        resolveCabinetSpec(
          definition,
          cabinetInstance(definition, {
            build: {
              ...base.build,
              shelfCount: 3,
              shelfLayout: 'custom',
              shelfElevations: elevations.map(inchesToSixteenths),
            },
          }),
        ),
      ).toThrow();
    }
  });

  it('emits no pull for no hardware and exact knob and pull primitives', () => {
    const definition = getCabinetDefinitionByCode('CB30')!;
    const base = cabinetInstance(definition);
    const none = cabinetInstance(definition, {
      hardwareId: 'no_hardware',
      build: { ...base.build, includeHardware: false },
    });
    expect(buildCabinetParts(resolveCabinetSpec(definition, none)).parts).not.toContainEqual(
      expect.objectContaining({ category: 'hardware' }),
    );

    const knob = cabinetInstance(definition, { hardwareId: 'modern_knob' });
    const knobPart = buildCabinetParts(resolveCabinetSpec(definition, knob)).parts.find(
      (part) => part.category === 'hardware',
    );
    expect(knobPart).toMatchObject({
      primitive: 'cylinder',
      radiusInches: 0.625,
      heightInches: 1.25,
      rotationDegrees: [90, 0, 0],
    });

    const bar = cabinetInstance(definition, { hardwareId: 'matte_black_bar' });
    expect(
      buildCabinetParts(resolveCabinetSpec(definition, bar)).parts.find(
        (part) => part.id === 'hardware_pull_left',
      ),
    ).toMatchObject({
      primitive: 'box',
      widthInches: 0.5,
      heightInches: 5,
      depthInches: 1.25,
    });
  });

  it('emits configured face frame, finished ends, shelf pins, and structural toe kick', () => {
    const definition = getCabinetDefinitionByCode('CB30')!;
    const base = cabinetInstance(definition);
    const instance = cabinetInstance(definition, {
      build: {
        ...base.build,
        construction: 'face_frame',
        leftFinishedEnd: true,
        rightFinishedEnd: true,
      },
    });
    const model = buildCabinetParts(resolveCabinetSpec(definition, instance));

    expect(model.parts.filter((part) => part.category === 'face_frame')).toHaveLength(4);
    expect(model.parts.filter((part) => part.category === 'finished_end')).toHaveLength(2);
    expect(model.parts.filter((part) => part.category === 'shelf_hardware')).toHaveLength(4);
    expect(model.parts.find((part) => part.id === 'toe_kick_structure')).toMatchObject({
      category: 'toe_kick',
      heightInches: 4.5,
    });
    expect(model.parts.some((part) => part.id === 'panel_toe_kick')).toBe(false);
  });

  it('uses family-specific corner, tall, and open built-in geometry', () => {
    const corner = buildCabinetParts(resolveCabinetSpec(getCabinetDefinitionByCode('LS36')!));
    expect(corner.parts.map((part) => part.id)).toEqual(
      expect.arrayContaining(['corner_bottom_back', 'corner_bottom_return', 'corner_panel_return']),
    );

    const tall = buildCabinetParts(resolveCabinetSpec(getCabinetDefinitionByCode('CT24')!));
    expect(tall.parts.some((part) => part.id === 'toe_kick_structure')).toBe(true);
    expect(tall.parts.some((part) => part.id.includes('_upper'))).toBe(true);
    expect(tall.parts.some((part) => part.id.includes('_lower'))).toBe(true);

    const bookcase = buildCabinetParts(resolveCabinetSpec(getCabinetDefinitionByCode('BK30')!));
    expect(bookcase.parts.some((part) => part.category === 'door')).toBe(false);
    expect(bookcase.parts.some((part) => part.category === 'drawer')).toBe(false);
    expect(bookcase.parts.some((part) => part.category === 'hardware')).toBe(false);
  });

  it('throws exact unknown option errors', () => {
    const definition = getCabinetDefinitionByCode('CB30')!;
    expect(() =>
      resolveCabinetSpec(definition, cabinetInstance(definition, { hardwareId: 'bad' })),
    ).toThrow('Unknown hardware option: bad');
    expect(() =>
      resolveCabinetSpec(definition, cabinetInstance(definition, { finishId: 'bad' })),
    ).toThrow('Unknown finish option: bad');
    expect(() =>
      resolveCabinetSpec(definition, cabinetInstance(definition, { interiorFinishId: 'bad' })),
    ).toThrow('Unknown interior finish option: bad');
    expect(() =>
      resolveCabinetSpec(definition, cabinetInstance(definition, { doorStyleId: 'bad' })),
    ).toThrow('Unknown door style option: bad');
  });
});
