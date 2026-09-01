import { beforeEach, describe, expect, it } from 'vitest';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';

describe('view-only scene inspection state', () => {
  beforeEach(() => useProjectStore.getState().resetProject());

  it('hides, isolates, labels, and shows entities without project mutation', () => {
    const before = useProjectStore.getState();
    const revision = before.project.revision;
    const projectSnapshot = JSON.stringify(before.project);

    before.setSceneSelection(['cab-seed-1', 'cab-seed-2'], 'cab-seed-1');
    before.isolateSelection();
    expect(useProjectStore.getState().isolationEntityIds).toEqual(['cab-seed-1', 'cab-seed-2']);
    before.toggleSceneLabels();
    expect(useProjectStore.getState().showSceneLabels).toBe(false);
    before.showAllEntities();
    expect(useProjectStore.getState().isolationEntityIds).toEqual([]);

    before.setSceneSelection(['cab-seed-1'], 'cab-seed-1');
    before.hideSelection();
    expect(useProjectStore.getState().hiddenEntityIds).toEqual(['cab-seed-1']);
    expect(useProjectStore.getState().selectedEntityIds).toEqual([]);
    expect(useProjectStore.getState().project.revision).toBe(revision);
    expect(JSON.stringify(useProjectStore.getState().project)).toBe(projectSnapshot);
  });

  it('creates an exact Euclidean measurement from two snapped points', () => {
    const state = useProjectStore.getState();
    const start = {
      world: { x: 0, y: 0, z: 0 },
      wallId: 'wall-1',
      wallOffset: 0,
    };
    const end = {
      world: {
        x: inchesToSixteenths(3),
        y: inchesToSixteenths(4),
        z: inchesToSixteenths(12),
      },
      wallId: 'wall-1',
      wallOffset: inchesToSixteenths(3),
    };
    expect(state.addMeasurementPoint(start).ok).toBe(true);
    expect(useProjectStore.getState().pendingMeasurementStart).toEqual(start);
    expect(useProjectStore.getState().addMeasurementPoint(end).ok).toBe(true);
    const measurement = useProjectStore.getState().measurements[0];
    expect(measurement.distanceInches).toBe(13);
    expect(useProjectStore.getState().project.revision).toBe(state.project.revision);

    useProjectStore.getState().renameMeasurement(measurement.id, 'Diagonal check');
    expect(useProjectStore.getState().measurements[0].name).toBe('Diagonal check');
    useProjectStore.getState().deleteMeasurement(measurement.id);
    expect(useProjectStore.getState().measurements).toEqual([]);
  });

  it('updates section modes and offsets outside undo history', () => {
    const state = useProjectStore.getState();
    state.setSectionMode('cabinet_front');
    expect(useProjectStore.getState().sectionMode).toBe('cabinet_front');
    state.setSectionMode('room_plane');
    state.setSectionOffset(inchesToSixteenths(72.25));
    expect(useProjectStore.getState().sectionMode).toBe('room_plane');
    expect(useProjectStore.getState().sectionOffset).toBe(inchesToSixteenths(72.25));
    expect(useProjectStore.getState().historyPast).toEqual([]);
    expect(useProjectStore.getState().project.revision).toBe(state.project.revision);
  });
});
