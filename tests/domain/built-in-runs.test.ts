import { beforeEach, describe, expect, it } from 'vitest';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { deriveBuiltInRunProposal } from '@/domain/layout/built-in-runs';
import { useProjectStore } from '@/state/project-store';

function runProject() {
  const project = structuredClone(useProjectStore.getState().project);
  const base = project.cabinets.find((cabinet) => cabinet.definitionId === 'B30')!;
  const wall = project.cabinets.find((cabinet) => cabinet.definitionId === 'W3030')!;
  project.openings = [];
  project.appliances = [];
  project.builtInElements = [];
  project.cabinets = [
    { ...base, id: 'cab-base-1', name: 'Base 1', offsetX: 0 },
    {
      ...base,
      id: 'cab-base-2',
      name: 'Base 2',
      offsetX: inchesToSixteenths(30.25),
    },
    {
      ...base,
      id: 'cab-base-3',
      name: 'Base 3',
      offsetX: inchesToSixteenths(60.25),
    },
    { ...wall, id: 'cab-wall-1', name: 'Wall 1', offsetX: 0 },
    {
      ...wall,
      id: 'cab-wall-2',
      name: 'Wall 2',
      offsetX: inchesToSixteenths(30),
    },
  ];
  return project;
}

describe('built-in run proposal derivation', () => {
  beforeEach(() => useProjectStore.getState().resetProject());

  it('segments adjacent base runs and derives exact countertop, toe, and ends', () => {
    const project = runProject();
    const proposal = deriveBuiltInRunProposal(project, 'wall-1');
    const baseIds = new Set(['cab-base-1', 'cab-base-2', 'cab-base-3']);
    const baseElements = proposal.filter(
      (element) =>
        element.attachedCabinetIds.length > 1 &&
        element.attachedCabinetIds.every((id) => baseIds.has(id)),
    );
    const countertop = baseElements.find((element) => element.type === 'countertop')!;
    expect(countertop.offsetX).toBe(0);
    expect(countertop.width).toBe(inchesToSixteenths(90.25));
    expect(countertop.elevation).toBe(inchesToSixteenths(34.5));
    expect(countertop.depth).toBe(inchesToSixteenths(25.5));

    const toe = baseElements.find((element) => element.type === 'toe_kick')!;
    expect(toe.height).toBe(inchesToSixteenths(4.5));
    expect(toe.depthOffset).toBe(inchesToSixteenths(20.75));
    expect(proposal.filter((element) => element.type === 'end_panel')).toHaveLength(4);
  });

  it('derives crown, light rail, and exposed upper end panels', () => {
    const proposal = deriveBuiltInRunProposal(runProject(), 'wall-1');
    const crown = proposal.find(
      (element) => element.type === 'crown' && element.attachedCabinetIds.includes('cab-wall-1'),
    )!;
    const rail = proposal.find(
      (element) =>
        element.type === 'light_rail' && element.attachedCabinetIds.includes('cab-wall-1'),
    )!;
    expect(crown.width).toBe(inchesToSixteenths(60));
    expect(crown.elevation).toBe(inchesToSixteenths(84));
    expect(rail.elevation).toBe(inchesToSixteenths(52.5));
  });

  it('omits a generated end when the boundary cabinet already has that finished end', () => {
    const project = runProject();
    const left = project.cabinets.find((cabinet) => cabinet.id === 'cab-base-1')!;
    left.build.leftFinishedEnd = true;
    const proposal = deriveBuiltInRunProposal(project, 'wall-1');
    expect(
      proposal.some(
        (element) =>
          element.type === 'end_panel' &&
          element.attachedCabinetIds.length === 1 &&
          element.attachedCabinetIds[0] === left.id &&
          element.offsetX === left.offsetX,
      ),
    ).toBe(false);
  });

  it('is deterministic and commits only the exact current preview token', () => {
    const project = runProject();
    expect(deriveBuiltInRunProposal(project, 'wall-1')).toEqual(
      deriveBuiltInRunProposal(project, 'wall-1'),
    );
    useProjectStore.getState().loadProject(project);
    const started = useProjectStore
      .getState()
      .completeBuiltInRuns('wall-1', undefined, project.revision);
    const preview = useProjectStore.getState().scenePreview!;
    expect(started.ok).toBe(true);
    expect(preview.kind).toBe('run_finish');
    expect(
      useProjectStore.getState().commitScenePreview(preview.token, preview.expectedRevision + 1).ok,
    ).toBe(false);
    expect(useProjectStore.getState().project.builtInElements).toEqual([]);
    expect(
      useProjectStore.getState().commitScenePreview(preview.token, preview.expectedRevision).ok,
    ).toBe(true);
    expect(useProjectStore.getState().project.builtInElements.length).toBeGreaterThan(0);
    expect(useProjectStore.getState().historyPast).toHaveLength(1);
  });

  it('reconciles stale generated elements when run membership changes', () => {
    const project = runProject();
    useProjectStore.getState().loadProject(project);
    const first = useProjectStore.getState().completeBuiltInRuns('wall-1');
    const firstPreview = useProjectStore.getState().scenePreview!;
    expect(first.ok).toBe(true);
    expect(
      useProjectStore
        .getState()
        .commitScenePreview(firstPreview.token, firstPreview.expectedRevision).ok,
    ).toBe(true);

    const moved = useProjectStore
      .getState()
      .configureCabinet('cab-base-3', { offsetX: inchesToSixteenths(100) });
    expect(moved.ok).toBe(true);
    const second = useProjectStore.getState().completeBuiltInRuns('wall-1');
    expect(second.ok).toBe(true);
    expect(
      useProjectStore.getState().scenePreview?.removedBuiltInElementIds.length,
    ).toBeGreaterThan(0);
  });
});
