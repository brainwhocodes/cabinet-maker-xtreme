import { beforeEach, describe, expect, it } from 'vitest';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';

describe('transactional scene commands', () => {
  beforeEach(() => useProjectStore.getState().resetProject());

  it('keeps scene selection outside project revision and history', () => {
    const before = useProjectStore.getState();
    useProjectStore.getState().selectSceneEntity('cab-seed-2', 'replace');
    const after = useProjectStore.getState();
    expect(after.selectedEntityIds).toEqual(['cab-seed-2']);
    expect(after.primarySelectedEntityId).toBe('cab-seed-2');
    expect(after.project.revision).toBe(before.project.revision);
    expect(after.historyPast).toHaveLength(0);
  });

  it('merges nested cabinet build patches in one revision and one history entry', () => {
    const before = useProjectStore.getState();
    const cabinet = before.project.cabinets[0];
    const result = before.configureCabinet(
      cabinet.id,
      {
        finishId: 'natural_oak',
        build: { leftFinishedEnd: true },
      },
      before.project.revision,
    );
    const after = useProjectStore.getState();
    const updated = after.project.cabinets.find((candidate) => candidate.id === cabinet.id)!;

    expect(result.ok).toBe(true);
    expect(after.project.revision).toBe(before.project.revision + 1);
    expect(after.historyPast).toHaveLength(1);
    expect(updated.finishId).toBe('natural_oak');
    expect(updated.build.leftFinishedEnd).toBe(true);
    expect(updated.build.rightFinishedEnd).toBe(false);
    expect(updated.build.carcassThickness).toBe(cabinet.build.carcassThickness);
  });

  it('rejects stale revisions and creates no mutation', () => {
    const state = useProjectStore.getState();
    const result = state.configureCabinet(
      'cab-seed-1',
      { finishId: 'natural_oak' },
      state.project.revision - 1,
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Stale project revision');
    expect(useProjectStore.getState().historyPast).toHaveLength(0);
  });

  it('locks stock dimensions until the one-way built conversion', () => {
    const state = useProjectStore.getState();
    expect(state.configureCabinet('cab-seed-1', { width: inchesToSixteenths(31) }).ok).toBe(false);
    expect(state.convertCabinetToBuilt('cab-seed-1').ok).toBe(true);
    expect(
      useProjectStore.getState().configureCabinet('cab-seed-1', { width: inchesToSixteenths(29) })
        .ok,
    ).toBe(true);
    expect(useProjectStore.getState().project.cabinets[0].width).toBe(inchesToSixteenths(29));
    expect(useProjectStore.getState().project.cabinets[0].source).toBe('built');
  });

  it('stages placement without mutation and commits the exact token once', () => {
    const before = useProjectStore.getState();
    const started = before.startCatalogPlacement('B12');
    const staged = useProjectStore.getState();
    expect(started.ok).toBe(true);
    expect(started.previewToken).toBe(staged.scenePreview?.token);
    expect(staged.project.revision).toBe(before.project.revision);
    expect(staged.historyPast).toHaveLength(0);

    const preview = staged.scenePreview!;
    const committed = staged.commitScenePreview(preview.token, preview.expectedRevision);
    expect(committed.ok).toBe(true);
    expect(useProjectStore.getState().project.revision).toBe(before.project.revision + 1);
    expect(useProjectStore.getState().historyPast).toHaveLength(1);
    expect(useProjectStore.getState().scenePreview).toBeNull();
    expect(
      useProjectStore.getState().commitScenePreview(preview.token, preview.expectedRevision).ok,
    ).toBe(false);
  });

  it('keeps move preview transient and commits one exact keyboard-equivalent move', () => {
    const before = useProjectStore.getState();
    const original = before.project.cabinets.find((cabinet) => cabinet.id === 'cab-seed-1')!;
    const started = before.startSceneMovePreview([original.id], -inchesToSixteenths(1), 0, false);
    const staged = useProjectStore.getState();
    expect(started.ok).toBe(true);
    expect(staged.project.cabinets.find((cabinet) => cabinet.id === original.id)?.offsetX).toBe(
      original.offsetX,
    );
    expect(staged.project.revision).toBe(before.project.revision);

    const preview = staged.scenePreview!;
    expect(staged.commitScenePreview(preview.token, preview.expectedRevision).ok).toBe(true);
    expect(
      useProjectStore.getState().project.cabinets.find((cabinet) => cabinet.id === original.id)
        ?.offsetX,
    ).toBe(original.offsetX - inchesToSixteenths(1));
    expect(useProjectStore.getState().historyPast).toHaveLength(1);
  });

  it('adds, edits, and removes openings and appliances transactionally', () => {
    const state = useProjectStore.getState();
    const opening = state.addOpening({
      wallId: 'wall-2',
      type: 'door',
      name: 'Side door',
      offsetX: 0,
      elevation: 0,
      width: inchesToSixteenths(36),
      height: inchesToSixteenths(80),
      depth: inchesToSixteenths(4.5),
    });
    expect(opening.ok).toBe(true);
    const openingId = opening.affectedIds[0];
    expect(
      useProjectStore.getState().updateOpening(openingId, { width: inchesToSixteenths(32) }).ok,
    ).toBe(true);
    expect(useProjectStore.getState().removeOpening(openingId).ok).toBe(true);

    const appliance = useProjectStore.getState().addAppliance({
      wallId: 'wall-2',
      type: 'refrigerator',
      name: 'Refrigerator',
      offsetX: inchesToSixteenths(48),
      elevation: 0,
      width: inchesToSixteenths(36),
      height: inchesToSixteenths(72),
      depth: inchesToSixteenths(30),
    });
    expect(appliance.ok).toBe(true);
    expect(useProjectStore.getState().removeAppliance(appliance.affectedIds[0]).ok).toBe(true);
  });

  it('rejects generated built-in configuration but permits removal', () => {
    const project = structuredClone(useProjectStore.getState().project);
    project.builtInElements.push({
      id: 'builtin-run-test',
      definitionId: 'countertop_standard',
      type: 'countertop',
      origin: 'run_generated',
      name: 'Generated countertop',
      wallId: 'wall-1',
      offsetX: inchesToSixteenths(18),
      elevation: inchesToSixteenths(34.5),
      depthOffset: 0,
      width: inchesToSixteenths(90),
      height: inchesToSixteenths(1.5),
      depth: inchesToSixteenths(25.5),
      finishId: 'natural_oak',
      attachedCabinetIds: ['cab-seed-1', 'cab-seed-2', 'cab-seed-3'],
    });
    useProjectStore.getState().loadProject(project);
    expect(
      useProjectStore
        .getState()
        .configureBuiltInElement('builtin-run-test', { width: inchesToSixteenths(80) }).ok,
    ).toBe(false);
    expect(useProjectStore.getState().removeBuiltInElement('builtin-run-test').ok).toBe(true);
  });

  it('duplicates a selection in one undoable transaction', () => {
    const project = batchProject([{ id: 'cab-a', offset: 0, elevation: 0 }]);
    useProjectStore.getState().loadProject(project);
    useProjectStore.getState().setSceneSelection(['cab-a'], 'cab-a');
    const beforeRevision = project.revision;
    const result = useProjectStore.getState().duplicateSelection();
    expect(result.ok).toBe(true);
    expect(result.affectedIds).toHaveLength(1);
    expect(useProjectStore.getState().project.cabinets).toHaveLength(2);
    expect(useProjectStore.getState().project.revision).toBe(beforeRevision + 1);
    expect(useProjectStore.getState().historyPast).toHaveLength(1);
  });

  it('aligns to the primary entity and distributes endpoints deterministically', () => {
    const project = batchProject([
      { id: 'cab-a', offset: 0, elevation: 0 },
      { id: 'cab-b', offset: 40, elevation: 40 },
      { id: 'cab-c', offset: 100, elevation: 0 },
    ]);
    useProjectStore.getState().loadProject(project);
    useProjectStore.getState().setSceneSelection(['cab-a', 'cab-b'], 'cab-a');
    expect(useProjectStore.getState().alignSelection('left').ok).toBe(true);
    expect(
      useProjectStore.getState().project.cabinets.find((cabinet) => cabinet.id === 'cab-b')
        ?.offsetX,
    ).toBe(0);

    const reset = batchProject([
      { id: 'cab-a', offset: 0, elevation: 0 },
      { id: 'cab-b', offset: 40, elevation: 0 },
      { id: 'cab-c', offset: 100, elevation: 0 },
    ]);
    useProjectStore.getState().loadProject(reset);
    useProjectStore.getState().setSceneSelection(['cab-a', 'cab-b', 'cab-c'], 'cab-a');
    expect(useProjectStore.getState().distributeSelection('equal_gaps').ok).toBe(true);
    expect(
      useProjectStore.getState().project.cabinets.find((cabinet) => cabinet.id === 'cab-b')
        ?.offsetX,
    ).toBe(inchesToSixteenths(50));
    expect(
      useProjectStore.getState().project.cabinets.find((cabinet) => cabinet.id === 'cab-c')
        ?.offsetX,
    ).toBe(inchesToSixteenths(100));
  });

  it('blocks cross-wall batch alignment without history and removes a selection once', () => {
    const project = batchProject([
      { id: 'cab-a', offset: 0, elevation: 0, wallId: 'wall-1' },
      { id: 'cab-b', offset: 40, elevation: 0, wallId: 'wall-2' },
    ]);
    useProjectStore.getState().loadProject(project);
    useProjectStore.getState().setSceneSelection(['cab-a', 'cab-b'], 'cab-a');
    expect(useProjectStore.getState().alignSelection('left').ok).toBe(false);
    expect(useProjectStore.getState().historyPast).toHaveLength(0);

    useProjectStore.getState().setSceneSelection(['cab-a'], 'cab-a');
    expect(useProjectStore.getState().removeSelection().ok).toBe(true);
    expect(useProjectStore.getState().project.cabinets.map((cabinet) => cabinet.id)).toEqual([
      'cab-b',
    ]);
    expect(useProjectStore.getState().historyPast).toHaveLength(1);
  });
});

function batchProject(
  entries: Array<{ id: string; offset: number; elevation: number; wallId?: string }>,
) {
  const project = structuredClone(useProjectStore.getState().project);
  const template = project.cabinets[0];
  project.openings = [];
  project.appliances = [];
  project.builtInElements = [];
  project.cabinets = entries.map((entry) => ({
    ...template,
    id: entry.id,
    name: entry.id,
    wallId: entry.wallId ?? 'wall-1',
    offsetX: inchesToSixteenths(entry.offset),
    elevation: inchesToSixteenths(entry.elevation),
  }));
  return project;
}
