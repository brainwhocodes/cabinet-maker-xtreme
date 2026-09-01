import { describe, expect, it } from 'vitest';
import { createDefaultCabinetBuildConfig } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import { createDefaultWalls, type RoomProject } from '@/domain/geometry/models';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { validateRoomProject } from '@/domain/validation/rules';

function cabinetContract(code: string) {
  const definition = getCabinetDefinitionByCode(code);
  if (!definition) throw new Error(`Unknown cabinet definition: ${code}`);
  return {
    source: definition.source === 'stock' ? ('stock' as const) : ('built' as const),
    build: createDefaultCabinetBuildConfig(definition),
  };
}

describe('NKBA Validation & Collision Rules', () => {
  function createTestProject(): RoomProject {
    const width = inchesToSixteenths(120); // 10 ft
    const length = inchesToSixteenths(120); // 10 ft
    const height = inchesToSixteenths(96); // 8 ft

    return {
      id: 'test-project',
      name: 'Test Kitchen',
      revision: 1,
      layoutShape: 'single_wall',
      width,
      length,
      ceilingHeight: height,
      walls: createDefaultWalls(width, length, height, 'single_wall'),
      openings: [],
      appliances: [],
      cabinets: [],
      builtInElements: [],
      activeWallId: 'wall-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  it('validates a clean, non-overlapping layout without errors', () => {
    const project = createTestProject();
    project.cabinets = [
      {
        id: 'cab-1',
        definitionId: 'B30',
        ...cabinetContract('B30'),
        wallId: 'wall-1',
        name: '30" Base',
        category: 'base',
        offsetX: inchesToSixteenths(10),
        elevation: 0,
        width: inchesToSixteenths(30),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
      {
        id: 'cab-2',
        definitionId: 'B30',
        ...cabinetContract('B30'),
        wallId: 'wall-1',
        name: '30" Base #2',
        category: 'base',
        offsetX: inchesToSixteenths(40),
        elevation: 0,
        width: inchesToSixteenths(30),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
    ];

    const report = validateRoomProject(project);
    expect(report.isValid).toBe(true);
    expect(report.errorCount).toBe(0);
  });

  it('detects physical 3D collision when cabinets overlap', () => {
    const project = createTestProject();
    project.cabinets = [
      {
        id: 'cab-1',
        definitionId: 'B30',
        ...cabinetContract('B30'),
        wallId: 'wall-1',
        name: '30" Base #1',
        category: 'base',
        offsetX: inchesToSixteenths(10),
        elevation: 0,
        width: inchesToSixteenths(30),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
      {
        id: 'cab-2',
        definitionId: 'B30',
        ...cabinetContract('B30'),
        wallId: 'wall-1',
        name: '30" Base #2 (Overlapping)',
        category: 'base',
        offsetX: inchesToSixteenths(25), // 15" overlap!
        elevation: 0,
        width: inchesToSixteenths(30),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
    ];

    const report = validateRoomProject(project);
    expect(report.isValid).toBe(false);
    expect(report.errorCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((i) => i.ruleId === 'physical_overlap')).toBe(true);
  });

  it('detects cabinet exceeding right wall edge', () => {
    const project = createTestProject(); // 120" wall
    project.cabinets = [
      {
        id: 'cab-overflow',
        definitionId: 'B36',
        ...cabinetContract('B36'),
        wallId: 'wall-1',
        name: '36" Base Over Boundary',
        category: 'base',
        offsetX: inchesToSixteenths(100), // 100 + 36 = 136" > 120" wall
        elevation: 0,
        width: inchesToSixteenths(36),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
    ];

    const report = validateRoomProject(project);
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.ruleId === 'wall_boundaries')).toBe(true);
  });

  it('detects cross-wall cabinet collisions at an L-shaped corner', () => {
    const project = createTestProject();
    project.layoutShape = 'l_shape';
    project.walls = createDefaultWalls(
      project.width,
      project.length,
      project.ceilingHeight,
      'l_shape',
    );
    project.cabinets = [
      {
        id: 'cab-wall-1',
        definitionId: 'B36',
        ...cabinetContract('B36'),
        wallId: 'wall-1',
        name: 'Back-wall corner cabinet',
        category: 'base',
        offsetX: inchesToSixteenths(84),
        elevation: 0,
        width: inchesToSixteenths(36),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
      {
        id: 'cab-wall-2',
        definitionId: 'B36',
        ...cabinetContract('B36'),
        wallId: 'wall-2',
        name: 'Side-wall corner cabinet',
        category: 'base',
        offsetX: 0,
        elevation: 0,
        width: inchesToSixteenths(36),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
    ];

    const report = validateRoomProject(project);
    expect(report.issues.some((issue) => issue.id.startsWith('cross-wall-collision'))).toBe(true);
  });

  it('allows attached finish geometry and rejects unrelated built-in collisions', () => {
    const project = createTestProject();
    project.cabinets = [
      {
        id: 'cab-1',
        definitionId: 'B30',
        ...cabinetContract('B30'),
        wallId: 'wall-1',
        name: 'Base cabinet',
        category: 'base',
        offsetX: inchesToSixteenths(10),
        elevation: 0,
        width: inchesToSixteenths(30),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        doorSwing: 'double',
        doorStyleId: 'shaker',
        finishId: 'polar_white',
        hardwareId: 'matte_black_bar',
      },
    ];
    project.builtInElements = [
      {
        id: 'builtin-attached-end',
        definitionId: 'end_panel_base',
        type: 'end_panel',
        origin: 'manual',
        name: 'Attached end panel',
        wallId: 'wall-1',
        offsetX: inchesToSixteenths(10),
        elevation: 0,
        depthOffset: 0,
        width: inchesToSixteenths(0.75),
        height: inchesToSixteenths(34.5),
        depth: inchesToSixteenths(24),
        finishId: 'polar_white',
        attachedCabinetIds: ['cab-1'],
      },
    ];
    expect(
      validateRoomProject(project).issues.some((issue) => issue.ruleId === 'built_in_overlap'),
    ).toBe(false);

    project.builtInElements.push({
      id: 'builtin-floating-collision',
      definitionId: 'floating_shelf_24',
      type: 'floating_shelf',
      origin: 'manual',
      name: 'Colliding floating shelf',
      wallId: 'wall-1',
      offsetX: inchesToSixteenths(12),
      elevation: inchesToSixteenths(20),
      depthOffset: 0,
      width: inchesToSixteenths(24),
      height: inchesToSixteenths(1.25),
      depth: inchesToSixteenths(10),
      finishId: 'natural_oak',
      attachedCabinetIds: [],
    });
    expect(
      validateRoomProject(project).issues.some((issue) => issue.ruleId === 'built_in_overlap'),
    ).toBe(true);
  });

  it('reports orphan walls, invalid dimensions, and below-floor geometry', () => {
    const project = createTestProject();
    project.openings.push({
      id: 'opening-invalid',
      wallId: 'missing-wall',
      type: 'door',
      name: 'Invalid door',
      offsetX: 0,
      elevation: -1,
      width: 0,
      height: inchesToSixteenths(80),
      depth: inchesToSixteenths(4.5),
    });
    project.appliances.push({
      id: 'app-invalid',
      wallId: 'wall-1',
      type: 'dishwasher',
      name: 'Invalid appliance',
      offsetX: 0,
      elevation: -1,
      width: 0,
      height: inchesToSixteenths(34.5),
      depth: inchesToSixteenths(24),
    });
    const report = validateRoomProject(project);
    expect(report.issues.some((issue) => issue.ruleId === 'orphan_wall')).toBe(true);
    expect(report.issues.some((issue) => issue.ruleId === 'invalid_dimensions')).toBe(true);
    expect(report.issues.some((issue) => issue.ruleId === 'floor_clearance')).toBe(true);
  });
});
