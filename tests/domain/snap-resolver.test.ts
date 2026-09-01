import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultCabinetBuildConfig } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import type { CabinetInstance, RoomProject } from '@/domain/geometry/models';
import { createDefaultWalls } from '@/domain/geometry/models';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { resolveSceneSnap } from '@/domain/layout/snap-resolver';
import { useProjectStore } from '@/state/project-store';

const definition = getCabinetDefinitionByCode('B30')!;

function cabinet(id: string, offsetInches: number, widthInches = 30): CabinetInstance {
  return {
    id,
    definitionId: definition.code,
    source: 'stock',
    wallId: 'wall-1',
    name: id,
    category: 'base',
    offsetX: inchesToSixteenths(offsetInches),
    elevation: 0,
    width: inchesToSixteenths(widthInches),
    height: definition.height,
    depth: definition.depth,
    doorSwing: definition.defaultDoorSwing,
    doorStyleId: 'shaker',
    finishId: 'polar_white',
    interiorFinishId: 'natural_birch',
    hardwareId: 'matte_black_bar',
    build: createDefaultCabinetBuildConfig(definition),
  };
}

function project(cabinets: CabinetInstance[]): RoomProject {
  const width = inchesToSixteenths(120);
  const length = inchesToSixteenths(120);
  const height = inchesToSixteenths(96);
  return {
    id: 'snap-project',
    name: 'Snap project',
    revision: 1,
    layoutShape: 'single_wall',
    width,
    length,
    ceilingHeight: height,
    walls: createDefaultWalls(width, length, height, 'single_wall'),
    openings: [],
    appliances: [],
    cabinets,
    builtInElements: [],
    activeWallId: 'wall-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('scene snap resolver', () => {
  beforeEach(() => useProjectStore.getState().resetProject());

  it('snaps to wall limits before lower-precedence sources', () => {
    const inputProject = project([cabinet('cab-a', 20)]);
    const result = resolveSceneSnap({
      project: inputProject,
      entityIds: ['cab-a'],
      wallId: 'wall-1',
      candidateOffset: inchesToSixteenths(0.5),
      candidateElevation: 0,
    });
    expect(result.offsetX).toBe(0);
    expect(result.guides.find((guide) => guide.axis === 'offset')?.source).toBe('wall');
  });

  it('snaps to sibling cabinet edges within three quarters of an inch', () => {
    const inputProject = project([cabinet('cab-a', 10), cabinet('cab-b', 60)]);
    const result = resolveSceneSnap({
      project: inputProject,
      entityIds: ['cab-a'],
      wallId: 'wall-1',
      candidateOffset: inchesToSixteenths(29.5),
      candidateElevation: inchesToSixteenths(10),
    });
    expect(result.offsetX).toBe(inchesToSixteenths(30));
    expect(result.guides.find((guide) => guide.axis === 'offset')).toMatchObject({
      source: 'cabinet',
      sourceId: 'cab-b',
    });
  });

  it('snaps to opening and appliance obstacle edges', () => {
    const inputProject = project([cabinet('cab-a', 10)]);
    inputProject.openings.push({
      id: 'opening-1',
      wallId: 'wall-1',
      type: 'door',
      name: 'Door',
      offsetX: inchesToSixteenths(90),
      elevation: 0,
      width: inchesToSixteenths(20),
      height: inchesToSixteenths(80),
      depth: inchesToSixteenths(4.5),
    });
    const result = resolveSceneSnap({
      project: inputProject,
      entityIds: ['cab-a'],
      wallId: 'wall-1',
      candidateOffset: inchesToSixteenths(59.5),
      candidateElevation: 0,
    });
    expect(result.offsetX).toBe(inchesToSixteenths(60));
    expect(result.guides.find((guide) => guide.axis === 'offset')).toMatchObject({
      source: 'opening',
      sourceId: 'opening-1',
    });
  });

  it('uses standard elevations before the half-inch grid', () => {
    const inputProject = project([cabinet('cab-a', 20)]);
    const result = resolveSceneSnap({
      project: inputProject,
      entityIds: ['cab-a'],
      wallId: 'wall-1',
      candidateOffset: inchesToSixteenths(10.3),
      candidateElevation: inchesToSixteenths(53.5),
    });
    expect(result.offsetX).toBe(inchesToSixteenths(10.5));
    expect(result.elevation).toBe(inchesToSixteenths(54));
    expect(result.guides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ axis: 'offset', source: 'grid' }),
        expect.objectContaining({ axis: 'elevation', source: 'elevation' }),
      ]),
    );
  });

  it('snaps a multi-selection by its combined same-wall bounds', () => {
    const inputProject = project([cabinet('cab-a', 10, 20), cabinet('cab-b', 30, 20)]);
    const result = resolveSceneSnap({
      project: inputProject,
      entityIds: ['cab-a', 'cab-b'],
      wallId: 'wall-1',
      candidateOffset: inchesToSixteenths(79.5),
      candidateElevation: 0,
    });
    expect(result.offsetX).toBe(inchesToSixteenths(80));
    expect(result.guides.find((guide) => guide.axis === 'offset')?.source).toBe('wall');
  });

  it('keeps numeric configuration exact and bypasses snapping', () => {
    const inputProject = project([cabinet('cab-a', 20)]);
    useProjectStore.getState().loadProject(inputProject);
    const exactOffset = inchesToSixteenths(10.3125);
    const result = useProjectStore
      .getState()
      .configureCabinet('cab-a', { offsetX: exactOffset }, inputProject.revision);
    expect(result.ok).toBe(true);
    expect(useProjectStore.getState().project.cabinets[0].offsetX).toBe(exactOffset);
  });
});
