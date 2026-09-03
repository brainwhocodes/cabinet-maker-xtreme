import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from '@/state/project-store';
import { getWebMCPTools } from '@/webmcp/register-tools';

const EXPECTED_TOOL_NAMES = [
  'get_agent_guidance',
  'get_project_summary',
  'list_catalog_options',
  'set_room_dimensions',
  'analyze_wall_fit',
  'validate_design',
  'generate_project_bom',
  'capture_design_screenshot',
  'get_assembly_overview',
  'configure_cabinet',
  'configure_built_in_element',
  'select_scene_entities',
  'preview_catalog_placement',
  'preview_scene_transform',
  'preview_auto_fit_proposal',
  'commit_scene_preview',
  'cancel_scene_preview',
  'duplicate_scene_selection',
  'remove_scene_selection',
  'align_distribute_scene_selection',
  'set_scene_inspection',
  'complete_built_in_runs',
  'get_sheet_nesting',
  'export_cnc_dxf',
  'get_clearance_clashes',
  'evaluate_work_triangle',
  'undo_last_action',
  'redo_last_action',
];

function tool(name: string) {
  const found = getWebMCPTools().find((candidate) => candidate.name === name);
  if (!found) throw new Error(`Missing tool: ${name}`);
  return found;
}

async function execute(name: string, input: Record<string, unknown> = {}) {
  return JSON.parse(await tool(name).execute(input));
}

describe('WebMCP clean-cutover tool contract', () => {
  beforeEach(() => useProjectStore.getState().resetProject());

  it('exposes exactly the ordered 22-tool contract and no legacy mutation tools', () => {
    const names = getWebMCPTools().map((candidate) => candidate.name);
    expect(names).toEqual(EXPECTED_TOOL_NAMES);
    expect(names).not.toEqual(
      expect.arrayContaining([
        'place_cabinet',
        'set_cabinet_finishes',
        'preview_layout_proposal',
        'apply_layout_proposal',
        'generate_home_depot_bom',
      ]),
    );
  });

  it('returns structured summary, catalog, validation, BOM, and exact assembly output', async () => {
    const summary = await execute('get_project_summary');
    expect(summary.revision).toBe(useProjectStore.getState().project.revision);
    expect(summary.counts).toMatchObject({ cabinets: 5, builtInElements: 0 });

    const catalog = await execute('list_catalog_options', { kind: 'all', search: 'floating' });
    expect(catalog.items).toEqual([
      expect.objectContaining({ kind: 'built_in', code: 'floating_shelf_24' }),
    ]);

    const validation = await execute('validate_design');
    expect(validation.isValid).toBe(true);
    const bom = await execute('generate_project_bom');
    expect(bom.knownGrandTotalUSD).toBeGreaterThan(0);
    expect(bom.unpricedRowCount).toBeGreaterThan(0);
    expect(bom).not.toHaveProperty('estimatedGrandTotal');

    const assembly = await execute('get_assembly_overview', { cabinet_id: 'cab-seed-1' });
    expect(assembly.resolvedSpec.definitionId).toBe('B30');
    expect(assembly.parts.length).toBeGreaterThan(10);
    expect(assembly.steps).toHaveLength(6);
  });

  it('rejects unknown keys, non-finite values, unknown IDs, and stale revisions', async () => {
    await expect(
      tool('set_room_dimensions').execute({
        width_inches: 120,
        length_inches: 120,
        height_inches: 96,
        layout_shape: 'single_wall',
        expected_revision: 1,
        content_behavior: 'new_project',
        unknown: true,
      }),
    ).rejects.toThrow();
    await expect(
      tool('set_room_dimensions').execute({
        width_inches: Number.POSITIVE_INFINITY,
        length_inches: 120,
        height_inches: 96,
        layout_shape: 'single_wall',
        expected_revision: 1,
        content_behavior: 'new_project',
      }),
    ).rejects.toThrow();
    await expect(
      tool('select_scene_entities').execute({
        entity_ids: ['cab-missing'],
        mode: 'replace',
      }),
    ).rejects.toThrow('Scene entity not found');

    const revision = useProjectStore.getState().project.revision;
    const stale = await execute('configure_cabinet', {
      cabinet_id: 'cab-seed-1',
      expected_revision: revision - 1,
      finish_id: 'natural_oak',
    });
    expect(stale.ok).toBe(false);
    expect(stale.message).toContain('Stale project revision');
    expect(useProjectStore.getState().historyPast).toEqual([]);
  });

  it('configures and converts a stock cabinet in one history entry', async () => {
    const revision = useProjectStore.getState().project.revision;
    const result = await execute('configure_cabinet', {
      cabinet_id: 'cab-seed-1',
      expected_revision: revision,
      convert_to_built: true,
      width_inches: 29,
      finish_id: 'natural_oak',
      build: {
        construction: 'face_frame',
        left_finished_end: true,
      },
    });
    expect(result.ok).toBe(true);
    const state = useProjectStore.getState();
    const cabinet = state.project.cabinets.find((candidate) => candidate.id === 'cab-seed-1')!;
    expect(cabinet).toMatchObject({
      source: 'built',
      width: 29 * 16,
      finishId: 'natural_oak',
    });
    expect(cabinet.build).toMatchObject({ construction: 'face_frame', leftFinishedEnd: true });
    expect(state.project.revision).toBe(revision + 1);
    expect(state.historyPast).toHaveLength(1);
  });

  it('commits the exact placement preview token once', async () => {
    const initial = useProjectStore.getState();
    const preview = await execute('preview_catalog_placement', {
      entry_id: 'catalog-b12',
      wall_id: 'wall-1',
      offset_inches: 0,
      elevation_inches: 0,
      snap: false,
    });
    expect(preview.kind).toBe('placement');
    expect(preview.expectedRevision).toBe(initial.project.revision);
    expect(useProjectStore.getState().project.revision).toBe(initial.project.revision);

    const mismatch = await execute('commit_scene_preview', {
      token: `${preview.token}-wrong`,
      expected_revision: preview.expectedRevision,
    });
    expect(mismatch.ok).toBe(false);
    expect(useProjectStore.getState().historyPast).toHaveLength(0);

    const committed = await execute('commit_scene_preview', {
      token: preview.token,
      expected_revision: preview.expectedRevision,
    });
    expect(committed.ok).toBe(true);
    expect(useProjectStore.getState().historyPast).toHaveLength(1);
    expect(useProjectStore.getState().scenePreview).toBeNull();
  });

  it('previews a deterministic analyzed proposal by identity', async () => {
    const revision = useProjectStore.getState().project.revision;
    const analysis = await execute('analyze_wall_fit', {
      wall_id: 'wall-2',
      target_run: 'base',
      include_sink_base: false,
    });
    const proposal = analysis.proposals[0];
    const preview = await execute('preview_auto_fit_proposal', {
      proposal_id: proposal.id,
      expected_revision: revision,
    });
    expect(preview.kind).toBe('layout');
    expect(preview.cabinets.map((cabinet: { id: string }) => cabinet.id)).toEqual(
      proposal.cabinets.map((cabinet: { id: string }) => cabinet.id),
    );
  });

  it('updates inspection state and creates exact wall-anchored measurements without revision', async () => {
    const revision = useProjectStore.getState().project.revision;
    const output = await execute('set_scene_inspection', {
      hidden_ids: ['cab-seed-2'],
      isolate_ids: [],
      section_mode: 'room_plane',
      section_offset_inches: 72.25,
      measurement: {
        action: 'create',
        start: { wall_id: 'wall-1', offset_inches: 0, elevation_inches: 0 },
        end: { wall_id: 'wall-1', offset_inches: 12, elevation_inches: 5 },
        name: 'Wall check',
      },
    });
    expect(output.hiddenEntityIds).toEqual(['cab-seed-2']);
    expect(output.sectionOffsetInches).toBe(72.25);
    expect(output.measurements[0]).toMatchObject({ name: 'Wall check', distanceInches: 13 });
    expect(useProjectStore.getState().project.revision).toBe(revision);
  });

  it('stages and commits built-in run completion with one history entry', async () => {
    const revision = useProjectStore.getState().project.revision;
    const preview = await execute('complete_built_in_runs', {
      wall_id: 'wall-1',
      expected_revision: revision,
    });
    expect(preview.kind).toBe('run_finish');
    expect(preview.builtInElements.length).toBeGreaterThan(0);
    const committed = await execute('commit_scene_preview', {
      token: preview.token,
      expected_revision: preview.expectedRevision,
    });
    expect(committed.ok).toBe(true);
    const summary = await execute('get_project_summary');
    expect(summary.counts.builtInElements).toBeGreaterThan(0);
    expect(useProjectStore.getState().historyPast).toHaveLength(1);
  });

  it('new-project room dimensions clear content and history in one revision', async () => {
    const revision = useProjectStore.getState().project.revision;
    const result = await execute('set_room_dimensions', {
      width_inches: 120,
      length_inches: 96,
      height_inches: 96,
      layout_shape: 'single_wall',
      expected_revision: revision,
      content_behavior: 'new_project',
    });
    expect(result.ok).toBe(true);
    const state = useProjectStore.getState();
    expect(state.project.revision).toBe(revision + 1);
    expect(state.project.cabinets).toEqual([]);
    expect(state.project.builtInElements).toEqual([]);
    expect(state.project.openings).toEqual([]);
    expect(state.project.appliances).toEqual([]);
    expect(state.historyPast).toEqual([]);
  });
  it('returns an explicit screenshot error when no planner renderer is registered', async () => {
    await expect(
      tool('capture_design_screenshot').execute({ include_transient_preview: false }),
    ).rejects.toThrow('No active planner renderer');
  });

  it('calculates 2D sheet nesting and exports CNC DXF content through WebMCP', async () => {
    const nesting = await execute('get_sheet_nesting');
    expect(nesting.totalSheets).toBeGreaterThan(0);
    expect(nesting.overallYieldPercentage).toBeGreaterThan(0);

    const dxf = await execute('export_cnc_dxf', { sheet_index: 1 });
    expect(dxf.sheetIndex).toBe(1);
    expect(dxf.dxfString).toContain('SECTION');
    expect(dxf.dxfString).toContain('OUTLINE_CUT');
  });

  it('evaluates dynamic clearance clashes and NKBA work triangle through WebMCP', async () => {
    const clashes = await execute('get_clearance_clashes');
    expect(clashes).toHaveProperty('clashCount');
    expect(Array.isArray(clashes.clashes)).toBe(true);

    const triangle = await execute('evaluate_work_triangle');
    expect(triangle).toHaveProperty('sinkPresent');
    expect(triangle).toHaveProperty('fridgePresent');
    expect(triangle).toHaveProperty('cooktopPresent');
    expect(triangle).toHaveProperty('nkbaStandard');
  });

  it('supports undo and redo through WebMCP tools', async () => {
    const initialRevision = useProjectStore.getState().project.revision;
    // Perform a mutation
    useProjectStore.getState().removeSelection();
    const mutatedRevision = useProjectStore.getState().project.revision;
    expect(mutatedRevision).toBeGreaterThan(initialRevision);

    const undoResult = await execute('undo_last_action');
    expect(undoResult.success).toBe(true);
    expect(useProjectStore.getState().project.revision).toBe(initialRevision);

    const redoResult = await execute('redo_last_action');
    expect(redoResult.success).toBe(true);
    expect(useProjectStore.getState().project.revision).toBe(mutatedRevision);
  });
});
