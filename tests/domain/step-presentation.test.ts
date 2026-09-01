import { describe, expect, it } from 'vitest';
import {
  deriveAssemblyPartCallouts,
  deriveAssemblyPartStates,
  splitAssemblyInstruction,
} from '@/domain/assembly/step-presentation';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import type { BuiltCabinetModel, CabinetPartMeshSpec } from '@/domain/geometry/part-builder';
import { buildCabinetParts } from '@/domain/geometry/part-builder';

function buildModel(code: string): BuiltCabinetModel {
  return buildCabinetParts(resolveCabinetSpec(getCabinetDefinitionByCode(code)!));
}

describe('assembly step presentation', () => {
  it('splits canonical prose into trimmed numbered actions', () => {
    expect(
      splitAssemblyInstruction(' Measure first.  Fasten it! Check the fit? Final note'),
    ).toEqual(['Measure first.', 'Fasten it!', 'Check the fit?', 'Final note']);
    expect(splitAssemblyInstruction('   ')).toEqual([]);
  });

  it('keeps the full step-one inventory visible and only current parts active', () => {
    const model = buildModel('B30');
    const states = deriveAssemblyPartStates(model, 1);

    expect(states.size).toBe(model.parts.length);
    expect(states.get('panel_side_left')).toBe('active');
    expect(states.get('panel_side_right')).toBe('active');
    expect(states.get('panel_bottom_deck')).toBe('active');
    expect(states.get('door_front_left')).toBe('context');
    expect([...states.values()].filter((state) => state === 'active')).toHaveLength(3);
    expect([...states.values()]).not.toContain('future');
  });

  it('keeps the repeated side panels and bottom deck active on step two', () => {
    const states = deriveAssemblyPartStates(buildModel('B30'), 2);

    expect(states.get('panel_side_left')).toBe('active');
    expect(states.get('panel_side_right')).toBe('active');
    expect(states.get('panel_bottom_deck')).toBe('active');
    expect(states.get('stretcher_top_front')).toBe('future');
  });

  it('introduces base stretchers and wall top decks on step three', () => {
    const baseStates = deriveAssemblyPartStates(buildModel('B30'), 3);
    const wallStates = deriveAssemblyPartStates(buildModel('W3030'), 3);

    expect(baseStates.get('panel_side_left')).toBe('complete');
    expect(baseStates.get('stretcher_top_front')).toBe('active');
    expect(baseStates.get('stretcher_top_rear')).toBe('active');
    expect(wallStates.get('panel_top_deck')).toBe('active');
  });

  it('introduces the back on step four', () => {
    const states = deriveAssemblyPartStates(buildModel('B30'), 4);

    expect(states.get('stretcher_top_front')).toBe('complete');
    expect(states.get('panel_back_board')).toBe('active');
    expect(states.get('shelf_interior_1')).toBe('future');
  });

  it('introduces shelves on step five and supports cabinets with no shelves', () => {
    const shelfModel = buildModel('B30');
    const shelfStates = deriveAssemblyPartStates(shelfModel, 5);
    const zeroShelfModel = buildModel('DB24');
    const zeroShelfStates = deriveAssemblyPartStates(zeroShelfModel, 5);

    expect(shelfStates.get('shelf_interior_1')).toBe('active');
    expect(zeroShelfModel.parts.some((part) => part.category === 'shelf')).toBe(false);
    expect([...zeroShelfStates.values()].filter((state) => state === 'active')).toHaveLength(0);
    expect(zeroShelfStates.get('drawer_front_1')).toBe('future');
  });

  it('introduces every finish and fallback category on step six with no future parts', () => {
    const model = buildModel('B30');
    const unknownPart: CabinetPartMeshSpec = {
      id: 'custom_unknown',
      name: 'Custom Unknown Part',
      category: 'carcass',
      materialRole: 'finish',
      widthInches: 1,
      heightInches: 1,
      depthInches: 1,
      positionInches: [0, 0, 0],
    };
    const modelWithUnknown = {
      ...model,
      parts: [...model.parts, unknownPart],
    };
    const states = deriveAssemblyPartStates(modelWithUnknown, 6);

    for (const category of ['face_frame', 'door', 'drawer', 'hardware', 'toe_kick'] as const) {
      for (const part of model.parts.filter((candidate) => candidate.category === category)) {
        expect(states.get(part.id)).toBe('active');
      }
    }
    expect(states.get('custom_unknown')).toBe('active');
    expect([...states.values()]).not.toContain('future');
  });

  it('deduplicates callouts, omits invalid active IDs, and preserves stored order', () => {
    const model = buildModel('B30');
    const step = {
      ...model.assemblySteps[1],
      activePartIds: ['panel_side_right', 'missing_part', 'panel_side_right', 'panel_bottom_deck'],
      highlightPartIds: ['missing_highlight'],
    };

    expect(deriveAssemblyPartCallouts(model, step)).toEqual([
      {
        partId: 'panel_side_right',
        number: 1,
        label: model.parts.find((part) => part.id === 'panel_side_right')!.name,
      },
      {
        partId: 'panel_bottom_deck',
        number: 2,
        label: model.parts.find((part) => part.id === 'panel_bottom_deck')!.name,
      },
    ]);

    const modelWithInvalidCurrent = {
      ...model,
      assemblySteps: model.assemblySteps.map((candidate) =>
        candidate.stepNumber === 2 ? step : candidate,
      ),
    };
    const states = deriveAssemblyPartStates(modelWithInvalidCurrent, 2);
    expect(states.has('missing_part')).toBe(false);
    expect(states.has('missing_highlight')).toBe(false);
  });
});
