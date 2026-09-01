import { describe, expect, it } from 'vitest';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import { buildCabinetParts } from '@/domain/geometry/part-builder';

describe('Parametric Cabinet Part Builder Engine', () => {
  it('builds full 3D parts for a standard B30 base cabinet', () => {
    const b30 = getCabinetDefinitionByCode('B30')!;
    const model = buildCabinetParts(resolveCabinetSpec(b30));

    expect(model.widthInches).toBe(30);
    expect(model.heightInches).toBe(34.5);
    expect(model.depthInches).toBe(24);

    const partIds = model.parts.map((p) => p.id);
    expect(partIds).toContain('panel_side_left');
    expect(partIds).toContain('panel_side_right');
    expect(partIds).toContain('panel_bottom_deck');
    expect(partIds).toContain('panel_back_board');
    expect(partIds).toContain('toe_kick_structure');
    expect(partIds).toContain('shelf_interior_1');
    expect(partIds).toContain('door_front_left');
    expect(partIds).toContain('door_front_right');
    expect(partIds).toContain('hardware_pull_left');
    expect(partIds).toContain('hardware_pull_right');
    expect(partIds).toContain('drawer_top_front_1');
    const leftSide = model.parts.find((p) => p.id === 'panel_side_left')!;
    const shelf = model.parts.find((p) => p.id === 'shelf_interior_1')!;
    expect(leftSide.materialRole, 'Side panel should use exterior finish').toBe('finish');
    expect(shelf.materialRole, 'Shelf should use interior finish').toBe('interior');
    expect(model.finish.id).toBe('polar_white');
    expect(model.interiorFinish.id).toBe('natural_birch');

    expect(model.assemblySteps.length).toBe(6);
    expect(model.assemblySteps[0].title).toContain('Inspect Parts');
    expect(model.assemblySteps[5].title).toContain('Mount Doors');
  });
  it('builds parts for a 3-drawer DB24 base cabinet', () => {
    const db24 = getCabinetDefinitionByCode('DB24')!;
    const model = buildCabinetParts(resolveCabinetSpec(db24));

    const drawerParts = model.parts.filter((p) => p.category === 'drawer');
    expect(drawerParts.length).toBe(3);

    const pulls = model.parts.filter((p) => p.category === 'hardware');
    expect(pulls.length).toBe(3);
  });

  it('builds parts for a wall upper cabinet W3030', () => {
    const w3030 = getCabinetDefinitionByCode('W3030')!;
    const model = buildCabinetParts(resolveCabinetSpec(w3030));

    expect(model.depthInches).toBe(12);
    const partIds = model.parts.map((p) => p.id);
    expect(partIds).toContain('panel_top_deck'); // Wall cabinet has solid top panel
    expect(partIds).not.toContain('panel_toe_kick'); // Wall cabinet has no toe-kick

    const shelves = model.parts.filter((p) => p.category === 'shelf');
    expect(shelves.length).toBe(2);
  });

  it('includes valid explodedOffset vectors on all structural parts for step animation', () => {
    const b30 = getCabinetDefinitionByCode('B30')!;
    const model = buildCabinetParts(resolveCabinetSpec(b30));

    for (const part of model.parts) {
      if (part.explodedOffsetInches) {
        expect(part.explodedOffsetInches).toHaveLength(3);
        expect(typeof part.explodedOffsetInches[0]).toBe('number');
      }
    }
  });
});
