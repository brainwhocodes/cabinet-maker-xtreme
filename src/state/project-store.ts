import { create } from 'zustand';
import {
  createDefaultCabinetBuildConfig,
  resolveCabinetSpec,
} from '@/domain/cabinet/resolve-cabinet-spec';
import { getPlannerCatalogEntries } from '@/domain/catalog/planner-catalog';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import type {
  Appliance,
  ApplianceId,
  BuiltInElement,
  CabinetBuildConfig,
  CabinetInstance,
  CabinetInstanceId,
  DoorSwing,
  LayoutShape,
  Opening,
  OpeningId,
  RoomProject,
  Vector3D,
  WallId,
} from '@/domain/geometry/models';
import { createDefaultWalls } from '@/domain/geometry/models';
import { inchesToSixteenths, type Sixteenths } from '@/domain/geometry/units';
import type { AutoFitProposal } from '@/domain/layout/auto-fit';
import { deriveBuiltInRunProposal } from '@/domain/layout/built-in-runs';
import { getMovableEntityBounds, resolveSceneSnap } from '@/domain/layout/snap-resolver';
import { validateRoomProject } from '@/domain/validation/rules';

export type CameraPreset = 'room' | 'wall' | 'selection';

export interface SnapGuide {
  axis: 'offset' | 'elevation';
  value: Sixteenths;
  source: 'wall' | 'cabinet' | 'opening' | 'appliance' | 'elevation' | 'grid';
  sourceId?: string;
}

export interface MeasurementPoint {
  world: Vector3D;
  wallId?: WallId;
  wallOffset?: Sixteenths;
  sourceEntityId?: string;
}

export interface Measurement {
  id: string;
  name: string;
  start: MeasurementPoint;
  end: MeasurementPoint;
  distanceInches: number;
}

export interface ScenePreview {
  token: string;
  kind: 'placement' | 'move' | 'layout' | 'run_finish';
  expectedRevision: number;
  cabinets: CabinetInstance[];
  builtInElements: BuiltInElement[];
  removedBuiltInElementIds: string[];
  valid: boolean;
  messages: string[];
  snapGuides: SnapGuide[];
}

export interface SceneCommandResult {
  ok: boolean;
  message: string;
  affectedIds: string[];
  previewToken?: string;
}

export interface EditableCabinetPatch {
  wallId?: WallId;
  offsetX?: Sixteenths;
  elevation?: Sixteenths;
  width?: Sixteenths;
  height?: Sixteenths;
  depth?: Sixteenths;
  doorSwing?: DoorSwing;
  doorStyleId?: string;
  finishId?: string;
  interiorFinishId?: string;
  hardwareId?: string;
  build?: Partial<CabinetBuildConfig>;
}

export interface EditableBuiltInElementPatch {
  wallId?: WallId;
  offsetX?: Sixteenths;
  elevation?: Sixteenths;
  depthOffset?: Sixteenths;
  width?: Sixteenths;
  height?: Sixteenths;
  depth?: Sixteenths;
  finishId?: string;
}

export interface WebMCPActivityEntry {
  id: string;
  timestamp: string;
  toolName: string;
  args: Record<string, unknown>;
  resultSummary: string;
  isError: boolean;
}

type NewOpening = Omit<Opening, 'id'> & { id?: OpeningId };
type NewAppliance = Omit<Appliance, 'id'> & { id?: ApplianceId };

export interface ProjectState {
  project: RoomProject;
  historyPast: RoomProject[];
  historyFuture: RoomProject[];
  selectedEntityIds: string[];
  primarySelectedEntityId: string | null;
  scenePreview: ScenePreview | null;
  hiddenEntityIds: string[];
  isolationEntityIds: string[];
  showSceneLabels: boolean;
  measureMode: boolean;
  pendingMeasurementStart: MeasurementPoint | null;
  measurements: Measurement[];
  sectionMode: 'none' | 'cabinet_front' | 'room_plane';
  sectionOffset: Sixteenths;
  webMCPLogs: WebMCPActivityEntry[];
  isWebMCPDrawerOpen: boolean;
  viewMode: 'perspective' | 'top' | 'elevation';
  cameraPreset: CameraPreset;
  showDimensions: boolean;
  cameraTransitionToken: number;
  navigationTool: 'orbit' | 'pan' | 'zoom' | 'measure';
  snapEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  setRoomDimensions(
    widthInches: number,
    lengthInches: number,
    heightInches?: number,
    shape?: LayoutShape,
  ): void;
  setRoomDimensionsCommand(
    widthInches: number,
    lengthInches: number,
    heightInches: number,
    shape: LayoutShape,
    contentBehavior: 'new_project' | 'resize_current',
    expectedRevision: number,
  ): SceneCommandResult;
  setLayoutShape(shape: LayoutShape): void;
  setActiveWall(wallId: WallId): void;

  selectSceneEntity(id: string, mode: 'replace' | 'toggle'): void;
  setSceneSelection(ids: string[], primaryId: string | null): void;
  clearSceneSelection(): void;

  configureCabinet(
    id: CabinetInstanceId,
    patch: EditableCabinetPatch,
    expectedRevision?: number,
  ): SceneCommandResult;
  configureCabinetWithConversion(
    id: CabinetInstanceId,
    patch: EditableCabinetPatch,
    convertToBuilt: boolean,
    expectedRevision: number,
  ): SceneCommandResult;
  convertCabinetToBuilt(id: CabinetInstanceId, expectedRevision?: number): SceneCommandResult;
  removeCabinet(id: CabinetInstanceId, expectedRevision?: number): SceneCommandResult;

  configureBuiltInElement(
    id: string,
    patch: EditableBuiltInElementPatch,
    expectedRevision?: number,
  ): SceneCommandResult;
  removeBuiltInElement(id: string, expectedRevision?: number): SceneCommandResult;

  addOpening(opening: NewOpening, expectedRevision?: number): SceneCommandResult;
  updateOpening(
    id: OpeningId,
    patch: Partial<Omit<Opening, 'id'>>,
    expectedRevision?: number,
  ): SceneCommandResult;
  removeOpening(id: OpeningId, expectedRevision?: number): SceneCommandResult;
  addAppliance(appliance: NewAppliance, expectedRevision?: number): SceneCommandResult;
  updateAppliance(
    id: ApplianceId,
    patch: Partial<Omit<Appliance, 'id'>>,
    expectedRevision?: number,
  ): SceneCommandResult;
  removeAppliance(id: ApplianceId, expectedRevision?: number): SceneCommandResult;

  startCatalogPlacement(entryId: string): SceneCommandResult;
  startSceneMovePreview(
    entityIds: string[],
    deltaOffset: Sixteenths,
    deltaElevation: Sixteenths,
    snap: boolean,
  ): SceneCommandResult;
  updateScenePreview(
    wallId: WallId,
    offsetX: Sixteenths,
    elevation: Sixteenths,
    snap: boolean,
  ): void;
  stageAutoFitProposal(proposal: AutoFitProposal): SceneCommandResult;
  completeBuiltInRuns(
    wallId: WallId,
    cabinetIds?: string[],
    expectedRevision?: number,
  ): SceneCommandResult;
  commitScenePreview(token: string, expectedRevision: number): SceneCommandResult;
  cancelScenePreview(): void;

  duplicateSelection(): SceneCommandResult;
  rotateSelection90(): SceneCommandResult;
  alignSelection(
    alignment: 'left' | 'center' | 'right' | 'bottom' | 'middle' | 'top',
  ): SceneCommandResult;
  distributeSelection(distribution: 'equal_gaps' | 'equal_centers'): SceneCommandResult;
  removeSelection(): SceneCommandResult;

  addCabinet(
    definitionCode: string,
    wallId?: WallId,
    offsetXInches?: number,
    elevationInches?: number,
  ): CabinetInstanceId;

  undo(): void;
  redo(): void;
  setViewMode(mode: 'perspective' | 'top' | 'elevation'): void;
  setCameraPreset(preset: CameraPreset): void;
  toggleDimensions(): void;
  hideSelection(): void;
  isolateSelection(): void;
  showAllEntities(): void;
  toggleSceneLabels(): void;
  setNavigationTool(tool: 'orbit' | 'pan' | 'zoom' | 'measure'): void;
  toggleSnap(): void;
  setMeasureMode(active: boolean): void;
  addMeasurementPoint(point: MeasurementPoint): SceneCommandResult;
  createMeasurement(
    start: MeasurementPoint,
    end: MeasurementPoint,
    name?: string,
  ): SceneCommandResult;
  renameMeasurement(id: string, name: string): void;
  deleteMeasurement(id: string): void;
  cancelMeasurement(): void;
  setSectionMode(mode: 'none' | 'cabinet_front' | 'room_plane'): void;
  setSectionOffset(offset: Sixteenths): void;
  setInspectionVisibility(hiddenIds?: string[], isolateIds?: string[]): SceneCommandResult;
  toggleWebMCPDrawer(): void;
  logWebMCPActivity(
    toolName: string,
    args: Record<string, unknown>,
    resultSummary: string,
    isError?: boolean,
  ): void;
  loadProject(project: RoomProject): void;
  resetProject(): void;
}

const DEFAULT_WIDTH = inchesToSixteenths(144);
const DEFAULT_LENGTH = inchesToSixteenths(144);
const DEFAULT_HEIGHT = inchesToSixteenths(96);

function createInitialProject(): RoomProject {
  const walls = createDefaultWalls(DEFAULT_WIDTH, DEFAULT_LENGTH, DEFAULT_HEIGHT, 'l_shape');
  return {
    id: `project-${Date.now().toString(36)}`,
    name: 'My Kitchen Remodel',
    revision: 1,
    layoutShape: 'l_shape',
    width: DEFAULT_WIDTH,
    length: DEFAULT_LENGTH,
    ceilingHeight: DEFAULT_HEIGHT,
    walls,
    openings: [
      {
        id: 'opening-window-1',
        wallId: 'wall-1',
        type: 'window',
        name: 'Sink Window',
        offsetX: inchesToSixteenths(48),
        elevation: inchesToSixteenths(42),
        width: inchesToSixteenths(36),
        height: inchesToSixteenths(36),
        depth: inchesToSixteenths(6),
      },
    ],
    appliances: [
      {
        id: 'app-sink',
        wallId: 'wall-1',
        type: 'sink',
        name: 'Undermount Double Sink',
        offsetX: inchesToSixteenths(48),
        elevation: inchesToSixteenths(34.5),
        width: inchesToSixteenths(36),
        height: inchesToSixteenths(10),
        depth: inchesToSixteenths(22),
      },
    ],
    cabinets: [
      createCabinet('B30', 'cab-seed-1', 'wall-1', inchesToSixteenths(18), 0),
      createCabinet('SB36', 'cab-seed-2', 'wall-1', inchesToSixteenths(48), 0),
      createCabinet('DB24', 'cab-seed-3', 'wall-1', inchesToSixteenths(84), 0),
      createCabinet(
        'W3030',
        'cab-seed-4',
        'wall-1',
        inchesToSixteenths(18),
        inchesToSixteenths(54),
      ),
      {
        ...createCabinet(
          'W3030',
          'cab-seed-5',
          'wall-1',
          inchesToSixteenths(84),
          inchesToSixteenths(54),
        ),
        name: '30"W x 30"H Wall Cabinet #2',
      },
    ],
    builtInElements: [],
    activeWallId: 'wall-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createCabinet(
  definitionCode: string,
  id: string,
  wallId: WallId,
  offsetX: Sixteenths,
  elevation: Sixteenths,
): CabinetInstance {
  const definition = getCabinetDefinitionByCode(definitionCode);
  if (!definition) throw new Error(`Unknown cabinet definition: ${definitionCode}`);
  return {
    id,
    definitionId: definition.code,
    source: definition.source === 'stock' ? 'stock' : 'built',
    wallId,
    name: definition.name,
    category: definition.category,
    offsetX,
    elevation,
    width: definition.width,
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

export const useProjectStore = create<ProjectState>((set, get) => {
  const commitProjectMutation = (
    _label: string,
    mutate: (project: RoomProject) => RoomProject,
  ): boolean => {
    const state = get();
    const candidate = mutate(state.project);
    if (JSON.stringify(candidate) === JSON.stringify(state.project)) return false;

    const nextProject = {
      ...candidate,
      revision: state.project.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    set({
      project: nextProject,
      historyPast: [...state.historyPast.slice(-49), state.project],
      historyFuture: [],
      scenePreview: null,
      canUndo: true,
      canRedo: false,
    });
    return true;
  };

  const selectionAfterRemoval = (removedIds: string[]) => {
    const removed = new Set(removedIds);
    const selectedEntityIds = get().selectedEntityIds.filter((id) => !removed.has(id));
    const isolationEntityIds = get().isolationEntityIds.filter((id) => !removed.has(id));
    const hiddenEntityIds = get().hiddenEntityIds.filter((id) => !removed.has(id));
    set({
      selectedEntityIds,
      primarySelectedEntityId: selectedEntityIds[0] ?? null,
      isolationEntityIds,
      hiddenEntityIds,
      sectionMode:
        get().sectionMode === 'cabinet_front' && selectedEntityIds.length === 0
          ? 'none'
          : get().sectionMode,
    });
  };

  return {
    project: createInitialProject(),
    historyPast: [],
    historyFuture: [],
    selectedEntityIds: ['cab-seed-1'],
    primarySelectedEntityId: 'cab-seed-1',
    cameraTransitionToken: 0,
    scenePreview: null,
    hiddenEntityIds: [],
    isolationEntityIds: [],
    showSceneLabels: true,
    measureMode: false,
    pendingMeasurementStart: null,
    measurements: [],
    sectionMode: 'none',
    sectionOffset: DEFAULT_WIDTH / 2,
    webMCPLogs: [],
    isWebMCPDrawerOpen: false,
    viewMode: 'perspective',
    cameraPreset: 'room',
    showDimensions: true,
    navigationTool: 'orbit',
    snapEnabled: true,
    canUndo: false,
    canRedo: false,

    setRoomDimensions: (widthIn, lengthIn, heightIn = 96, shape = 'l_shape') => {
      const width = inchesToSixteenths(widthIn);
      const length = inchesToSixteenths(lengthIn);
      const ceilingHeight = inchesToSixteenths(heightIn);
      commitProjectMutation('Set room dimensions', (project) => {
        const walls = createDefaultWalls(width, length, ceilingHeight, shape);
        return {
          ...project,
          width,
          length,
          ceilingHeight,
          layoutShape: shape,
          walls,
          activeWallId: walls[0]?.id ?? 'wall-1',
        };
      });
    },

    setRoomDimensionsCommand: (
      widthIn,
      lengthIn,
      heightIn,
      shape,
      contentBehavior,
      expectedRevision,
    ) => {
      const state = get();
      const stale = staleRevisionResult(state.project, expectedRevision);
      if (stale) return stale;
      if (widthIn <= 0 || lengthIn <= 0 || heightIn <= 0) {
        return failure('Room dimensions must be positive');
      }
      const width = inchesToSixteenths(widthIn);
      const length = inchesToSixteenths(lengthIn);
      const ceilingHeight = inchesToSixteenths(heightIn);
      const walls = createDefaultWalls(width, length, ceilingHeight, shape);
      if (contentBehavior === 'new_project') {
        const project: RoomProject = {
          ...state.project,
          revision: state.project.revision + 1,
          width,
          length,
          ceilingHeight,
          layoutShape: shape,
          walls,
          openings: [],
          appliances: [],
          cabinets: [],
          builtInElements: [],
          activeWallId: walls[0]?.id ?? 'wall-1',
          updatedAt: new Date().toISOString(),
        };
        set({
          project,
          historyPast: [],
          historyFuture: [],
          selectedEntityIds: [],
          primarySelectedEntityId: null,
          scenePreview: null,
          hiddenEntityIds: [],
          isolationEntityIds: [],
          measurements: [],
          pendingMeasurementStart: null,
          measureMode: false,
          sectionMode: 'none',
          canUndo: false,
          canRedo: false,
        });
        return success('Created a new room project', []);
      }

      const wallIds = new Set(walls.map((wall) => wall.id));
      const candidate: RoomProject = {
        ...state.project,
        width,
        length,
        ceilingHeight,
        layoutShape: shape,
        walls,
        openings: state.project.openings.filter((entity) => wallIds.has(entity.wallId)),
        appliances: state.project.appliances.filter((entity) => wallIds.has(entity.wallId)),
        cabinets: state.project.cabinets.filter((entity) => wallIds.has(entity.wallId)),
        builtInElements: state.project.builtInElements.filter((entity) =>
          wallIds.has(entity.wallId),
        ),
        activeWallId: wallIds.has(state.project.activeWallId)
          ? state.project.activeWallId
          : (walls[0]?.id ?? 'wall-1'),
      };
      const issues = validateRoomProject(candidate).issues.filter(
        (issue) => issue.severity === 'error',
      );
      commitProjectMutation('Resize current room', () => candidate);
      return success(
        issues.length === 0
          ? 'Resized current room without spatial errors'
          : `Resized current room with ${issues.length} spatial errors`,
        [...new Set(issues.flatMap((issue) => issue.affectedCabinetIds))],
      );
    },

    setLayoutShape: (shape) => {
      commitProjectMutation('Set layout shape', (project) => {
        const walls = createDefaultWalls(
          project.width,
          project.length,
          project.ceilingHeight,
          shape,
        );
        return { ...project, layoutShape: shape, walls, activeWallId: walls[0]?.id ?? 'wall-1' };
      });
    },

    setActiveWall: (wallId) => {
      if (!get().project.walls.some((wall) => wall.id === wallId)) return;
      set((state) => ({ project: { ...state.project, activeWallId: wallId } }));
    },

    selectSceneEntity: (id, mode) => {
      if (!sceneEntityIds(get().project).has(id)) return;
      if (mode === 'replace') {
        set({ selectedEntityIds: [id], primarySelectedEntityId: id });
        return;
      }
      const current = get().selectedEntityIds;
      const selectedEntityIds = current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id];
      set({
        selectedEntityIds,
        primarySelectedEntityId: current.includes(id)
          ? get().primarySelectedEntityId === id
            ? (selectedEntityIds[0] ?? null)
            : get().primarySelectedEntityId
          : id,
      });
    },

    setSceneSelection: (ids, primaryId) => {
      const available = sceneEntityIds(get().project);
      const selectedEntityIds = [...new Set(ids)].filter((id) => available.has(id));
      const primarySelectedEntityId =
        primaryId && selectedEntityIds.includes(primaryId)
          ? primaryId
          : (selectedEntityIds[0] ?? null);
      set({ selectedEntityIds, primarySelectedEntityId });
    },

    clearSceneSelection: () => set({ selectedEntityIds: [], primarySelectedEntityId: null }),

    configureCabinet: (id, patch, expectedRevision) => {
      const state = get();
      const stale = staleRevisionResult(state.project, expectedRevision);
      if (stale) return stale;
      const existing = state.project.cabinets.find((cabinet) => cabinet.id === id);
      if (!existing) return failure(`Cabinet not found: ${id}`);
      if (patch.wallId && !state.project.walls.some((wall) => wall.id === patch.wallId)) {
        return failure(`Unknown wall: ${patch.wallId}`);
      }
      if (
        existing.source === 'stock' &&
        (patch.width !== undefined || patch.height !== undefined || patch.depth !== undefined)
      ) {
        return failure('Create a built version before changing cabinet dimensions');
      }

      const build = { ...existing.build, ...patch.build };
      if (patch.hardwareId !== undefined) {
        build.includeHardware = patch.hardwareId !== 'no_hardware';
      }
      const candidate: CabinetInstance = {
        ...existing,
        ...patch,
        build,
      };
      const definition = getCabinetDefinitionByCode(candidate.definitionId);
      if (!definition) return failure(`Unknown cabinet definition: ${candidate.definitionId}`);
      try {
        resolveCabinetSpec(definition, candidate);
      } catch (error) {
        return failure(error instanceof Error ? error.message : 'Invalid cabinet configuration');
      }
      const candidateProject = {
        ...state.project,
        cabinets: state.project.cabinets.map((cabinet) =>
          cabinet.id === id ? candidate : cabinet,
        ),
      };
      const issue = firstEntityError(candidateProject, id);
      if (issue) return failure(issue.message);

      const changed = commitProjectMutation('Configure cabinet', (project) => ({
        ...project,
        cabinets: project.cabinets.map((cabinet) => (cabinet.id === id ? candidate : cabinet)),
      }));
      return changed ? success('Cabinet updated', [id]) : success('No cabinet changes', []);
    },

    configureCabinetWithConversion: (id, patch, convertToBuilt, expectedRevision) => {
      if (!convertToBuilt) return get().configureCabinet(id, patch, expectedRevision);
      const state = get();
      const stale = staleRevisionResult(state.project, expectedRevision);
      if (stale) return stale;
      const existing = state.project.cabinets.find((cabinet) => cabinet.id === id);
      if (!existing) return failure(`Cabinet not found: ${id}`);
      if (patch.wallId && !state.project.walls.some((wall) => wall.id === patch.wallId)) {
        return failure(`Unknown wall: ${patch.wallId}`);
      }
      const build = { ...existing.build, ...patch.build };
      if (patch.hardwareId !== undefined) {
        build.includeHardware = patch.hardwareId !== 'no_hardware';
      }
      const candidate: CabinetInstance = {
        ...existing,
        ...patch,
        source: 'built',
        build,
      };
      const definition = getCabinetDefinitionByCode(candidate.definitionId);
      if (!definition) return failure(`Unknown cabinet definition: ${candidate.definitionId}`);
      try {
        resolveCabinetSpec(definition, candidate);
      } catch (error) {
        return failure(error instanceof Error ? error.message : 'Invalid cabinet configuration');
      }
      const candidateProject = {
        ...state.project,
        cabinets: state.project.cabinets.map((cabinet) =>
          cabinet.id === id ? candidate : cabinet,
        ),
      };
      const issue = firstEntityError(candidateProject, id);
      if (issue) return failure(issue.message);
      const changed = commitProjectMutation('Configure built cabinet', (project) => ({
        ...project,
        cabinets: project.cabinets.map((cabinet) => (cabinet.id === id ? candidate : cabinet)),
      }));
      return changed
        ? success('Cabinet converted and configured', [id])
        : success('No cabinet changes', []);
    },

    convertCabinetToBuilt: (id, expectedRevision) => {
      const state = get();
      const stale = staleRevisionResult(state.project, expectedRevision);
      if (stale) return stale;
      const existing = state.project.cabinets.find((cabinet) => cabinet.id === id);
      if (!existing) return failure(`Cabinet not found: ${id}`);
      if (existing.source === 'built') return success('Cabinet is already built', []);
      commitProjectMutation('Convert cabinet to built', (project) => ({
        ...project,
        cabinets: project.cabinets.map((cabinet) =>
          cabinet.id === id ? { ...cabinet, source: 'built' as const } : cabinet,
        ),
      }));
      return success('Created built version', [id]);
    },

    removeCabinet: (id, expectedRevision) => {
      const state = get();
      const stale = staleRevisionResult(state.project, expectedRevision);
      if (stale) return stale;
      if (!state.project.cabinets.some((cabinet) => cabinet.id === id)) {
        return failure(`Cabinet not found: ${id}`);
      }
      commitProjectMutation('Remove cabinet', (project) => ({
        ...project,
        cabinets: project.cabinets.filter((cabinet) => cabinet.id !== id),
        builtInElements: cleanBuiltInElements(project.builtInElements, new Set([id])),
      }));
      selectionAfterRemoval([id]);
      return success('Cabinet removed', [id]);
    },

    configureBuiltInElement: (id, patch, expectedRevision) => {
      const state = get();
      const stale = staleRevisionResult(state.project, expectedRevision);
      if (stale) return stale;
      const existing = state.project.builtInElements.find((element) => element.id === id);
      if (!existing) return failure(`Built-in element not found: ${id}`);
      if (existing.origin !== 'manual') {
        return failure('Use Complete runs to regenerate this finish element');
      }
      if (patch.wallId && !state.project.walls.some((wall) => wall.id === patch.wallId)) {
        return failure(`Unknown wall: ${patch.wallId}`);
      }
      const candidate = { ...existing, ...patch };
      const candidateProject = {
        ...state.project,
        builtInElements: state.project.builtInElements.map((element) =>
          element.id === id ? candidate : element,
        ),
      };
      const issue = firstEntityError(candidateProject, id);
      if (issue) return failure(issue.message);
      const changed = commitProjectMutation('Configure built-in element', (project) => ({
        ...project,
        builtInElements: project.builtInElements.map((element) =>
          element.id === id ? candidate : element,
        ),
      }));
      return changed ? success('Built-in element updated', [id]) : success('No changes', []);
    },

    removeBuiltInElement: (id, expectedRevision) => {
      const stale = staleRevisionResult(get().project, expectedRevision);
      if (stale) return stale;
      if (!get().project.builtInElements.some((element) => element.id === id)) {
        return failure(`Built-in element not found: ${id}`);
      }
      commitProjectMutation('Remove built-in element', (project) => ({
        ...project,
        builtInElements: project.builtInElements.filter((element) => element.id !== id),
      }));
      selectionAfterRemoval([id]);
      return success('Built-in element removed', [id]);
    },

    addOpening: (opening, expectedRevision) => {
      const stale = staleRevisionResult(get().project, expectedRevision);
      if (stale) return stale;
      const id = opening.id ?? nextId(get().project, 'opening', opening.type);
      const candidate = { ...opening, id } as Opening;
      const candidateProject = {
        ...get().project,
        openings: [...get().project.openings, candidate],
      };
      const issue = firstEntityError(candidateProject, id);
      if (issue) return failure(issue.message);
      commitProjectMutation('Add opening', (project) => ({
        ...project,
        openings: [...project.openings, candidate],
      }));
      set({ selectedEntityIds: [id], primarySelectedEntityId: id });
      return success('Opening added', [id]);
    },

    updateOpening: (id, patch, expectedRevision) => {
      const stale = staleRevisionResult(get().project, expectedRevision);
      if (stale) return stale;
      const existing = get().project.openings.find((opening) => opening.id === id);
      if (!existing) return failure(`Opening not found: ${id}`);
      const candidate = { ...existing, ...patch };
      const candidateProject = {
        ...get().project,
        openings: get().project.openings.map((opening) =>
          opening.id === id ? candidate : opening,
        ),
      };
      const issue = firstEntityError(candidateProject, id);
      if (issue) return failure(issue.message);
      commitProjectMutation('Update opening', (project) => ({
        ...project,
        openings: project.openings.map((opening) => (opening.id === id ? candidate : opening)),
      }));
      return success('Opening updated', [id]);
    },

    removeOpening: (id, expectedRevision) => {
      const stale = staleRevisionResult(get().project, expectedRevision);
      if (stale) return stale;
      if (!get().project.openings.some((opening) => opening.id === id)) {
        return failure(`Opening not found: ${id}`);
      }
      commitProjectMutation('Remove opening', (project) => ({
        ...project,
        openings: project.openings.filter((opening) => opening.id !== id),
      }));
      selectionAfterRemoval([id]);
      return success('Opening removed', [id]);
    },

    addAppliance: (appliance, expectedRevision) => {
      const stale = staleRevisionResult(get().project, expectedRevision);
      if (stale) return stale;
      const id = appliance.id ?? nextId(get().project, 'app', appliance.type);
      const candidate = { ...appliance, id } as Appliance;
      const candidateProject = {
        ...get().project,
        appliances: [...get().project.appliances, candidate],
      };
      const issue = firstEntityError(candidateProject, id);
      if (issue) return failure(issue.message);
      commitProjectMutation('Add appliance', (project) => ({
        ...project,
        appliances: [...project.appliances, candidate],
      }));
      set({ selectedEntityIds: [id], primarySelectedEntityId: id });
      return success('Appliance added', [id]);
    },

    updateAppliance: (id, patch, expectedRevision) => {
      const stale = staleRevisionResult(get().project, expectedRevision);
      if (stale) return stale;
      const existing = get().project.appliances.find((appliance) => appliance.id === id);
      if (!existing) return failure(`Appliance not found: ${id}`);
      const candidate = { ...existing, ...patch };
      const candidateProject = {
        ...get().project,
        appliances: get().project.appliances.map((appliance) =>
          appliance.id === id ? candidate : appliance,
        ),
      };
      const issue = firstEntityError(candidateProject, id);
      if (issue) return failure(issue.message);
      commitProjectMutation('Update appliance', (project) => ({
        ...project,
        appliances: project.appliances.map((appliance) =>
          appliance.id === id ? candidate : appliance,
        ),
      }));
      return success('Appliance updated', [id]);
    },

    removeAppliance: (id, expectedRevision) => {
      const stale = staleRevisionResult(get().project, expectedRevision);
      if (stale) return stale;
      if (!get().project.appliances.some((appliance) => appliance.id === id)) {
        return failure(`Appliance not found: ${id}`);
      }
      commitProjectMutation('Remove appliance', (project) => ({
        ...project,
        appliances: project.appliances.filter((appliance) => appliance.id !== id),
      }));
      selectionAfterRemoval([id]);
      return success('Appliance removed', [id]);
    },

    startCatalogPlacement: (entryId) => {
      const state = get();
      const entry = getPlannerCatalogEntries().find(
        (candidate) => candidate.id === entryId || candidate.code === entryId,
      );
      if (!entry) return failure(`Catalog entry not found: ${entryId}`);
      if (entry.kind !== 'cabinet' && entry.kind !== 'built_in') {
        return failure('Hardware and shelving entries apply to a selected cabinet');
      }
      const wall = state.project.walls.find(
        (candidate) => candidate.id === state.project.activeWallId,
      );
      if (!wall) return failure('No active wall is available for placement');

      let cabinets: CabinetInstance[] = [];
      let builtInElements: BuiltInElement[] = [];
      if (entry.kind === 'cabinet') {
        const definition = entry.cabinetDefinition;
        const elevation = definition.category === 'wall' ? inchesToSixteenths(54) : 0;
        const offset = firstAvailableOffset(
          state.project,
          wall.id,
          definition.width,
          elevation,
          definition.height,
        );
        cabinets = [
          createCabinet(
            definition.code,
            nextId(state.project, 'cab', definition.code.toLowerCase()),
            wall.id,
            offset,
            elevation,
          ),
        ];
      } else {
        const definition = entry.builtInDefinition;
        const id = nextId(state.project, 'builtin', definition.id);
        builtInElements = [
          {
            id,
            definitionId: definition.id,
            type: definition.type,
            origin: 'manual',
            name: definition.name,
            wallId: wall.id,
            offsetX: firstAvailableOffset(
              state.project,
              wall.id,
              definition.defaultWidth,
              0,
              definition.defaultHeight,
            ),
            elevation: 0,
            depthOffset: definition.defaultDepthOffset,
            width: definition.defaultWidth,
            height: definition.defaultHeight,
            depth: definition.defaultDepth,
            finishId: definition.defaultFinishId,
            attachedCabinetIds: [],
          },
        ];
      }

      const preview = evaluatePreview(state.project, {
        token: '',
        kind: 'placement',
        expectedRevision: state.project.revision,
        cabinets,
        builtInElements,
        removedBuiltInElementIds: [],
        valid: true,
        messages: [],
        snapGuides: [],
      });
      preview.token = previewToken(preview);
      set({ scenePreview: preview });
      return {
        ...success(
          preview.valid ? 'Placement preview ready' : (preview.messages[0] ?? 'Placement blocked'),
          [
            ...cabinets.map((cabinet) => cabinet.id),
            ...builtInElements.map((element) => element.id),
          ],
        ),
        previewToken: preview.token,
      };
    },

    startSceneMovePreview: (entityIds, deltaOffset, deltaElevation, snap) => {
      const state = get();
      const uniqueIds = [...new Set(entityIds)];
      const uniqueIdSet = new Set(uniqueIds);
      const cabinets = state.project.cabinets.filter((cabinet) => uniqueIdSet.has(cabinet.id));
      const builtInElements = state.project.builtInElements.filter((element) =>
        uniqueIdSet.has(element.id),
      );
      if (cabinets.length + builtInElements.length !== uniqueIds.length || uniqueIds.length === 0) {
        return failure('Only cabinets and built-in elements can be moved');
      }
      if (builtInElements.some((element) => element.origin === 'run_generated')) {
        return failure('Use Complete runs to regenerate this finish element');
      }
      const wallIds = new Set([
        ...cabinets.map((cabinet) => cabinet.wallId),
        ...builtInElements.map((element) => element.wallId),
      ]);
      if (wallIds.size !== 1) return failure('Move selection must be on the same wall');
      const wallId = [...wallIds][0];
      const minOffset = Math.min(
        ...cabinets.map((cabinet) => cabinet.offsetX),
        ...builtInElements.map((element) => element.offsetX),
      );
      const minElevation = Math.min(
        ...cabinets.map((cabinet) => cabinet.elevation),
        ...builtInElements.map((element) => element.elevation),
      );
      const resolution = snap
        ? resolveSceneSnap({
            project: state.project,
            entityIds: uniqueIds,
            wallId,
            candidateOffset: minOffset + deltaOffset,
            candidateElevation: minElevation + deltaElevation,
          })
        : {
            offsetX: minOffset + deltaOffset,
            elevation: minElevation + deltaElevation,
            guides: [] as SnapGuide[],
          };
      const resolvedDeltaOffset = resolution.offsetX - minOffset;
      const resolvedDeltaElevation = resolution.elevation - minElevation;
      const preview = evaluatePreview(state.project, {
        token: '',
        kind: 'move',
        expectedRevision: state.project.revision,
        cabinets: cabinets.map((cabinet) => ({
          ...cabinet,
          offsetX: cabinet.offsetX + resolvedDeltaOffset,
          elevation: cabinet.elevation + resolvedDeltaElevation,
        })),
        builtInElements: builtInElements.map((element) => ({
          ...element,
          offsetX: element.offsetX + resolvedDeltaOffset,
          elevation: element.elevation + resolvedDeltaElevation,
        })),
        removedBuiltInElementIds: [],
        valid: true,
        messages: [],
        snapGuides: resolution.guides,
      });
      preview.token = previewToken(preview);
      set({ scenePreview: preview });
      return {
        ...success(preview.valid ? 'Move preview ready' : preview.messages[0], uniqueIds),
        previewToken: preview.token,
      };
    },

    updateScenePreview: (wallId, offsetX, elevation, snap) => {
      const state = get();
      const preview = state.scenePreview;
      if (!preview || (preview.kind !== 'placement' && preview.kind !== 'move')) return;
      const first = preview.cabinets[0] ?? preview.builtInElements[0];
      if (!first) return;
      const ids = [
        ...preview.cabinets.map((cabinet) => cabinet.id),
        ...preview.builtInElements.map((element) => element.id),
      ];
      const projectForSnap = previewProject(state.project, preview);
      const resolution = snap
        ? resolveSceneSnap({
            project: projectForSnap,
            entityIds: ids,
            wallId,
            candidateOffset: offsetX,
            candidateElevation: elevation,
          })
        : { offsetX, elevation, guides: [] as SnapGuide[] };
      const deltaOffset = resolution.offsetX - first.offsetX;
      const deltaElevation = resolution.elevation - first.elevation;
      const updated = evaluatePreview(state.project, {
        ...preview,
        token: preview.token,
        cabinets: preview.cabinets.map((cabinet) => ({
          ...cabinet,
          wallId,
          offsetX: cabinet.offsetX + deltaOffset,
          elevation: cabinet.elevation + deltaElevation,
        })),
        builtInElements: preview.builtInElements.map((element) => ({
          ...element,
          wallId,
          offsetX: element.offsetX + deltaOffset,
          elevation: element.elevation + deltaElevation,
        })),
        snapGuides: resolution.guides,
      });
      set({ scenePreview: updated });
    },

    stageAutoFitProposal: (proposal) => {
      const state = get();
      const preview = evaluatePreview(state.project, {
        token: '',
        kind: 'layout',
        expectedRevision: state.project.revision,
        cabinets: proposal.cabinets,
        builtInElements: [],
        removedBuiltInElementIds: [],
        valid: true,
        messages: [],
        snapGuides: [],
      });
      preview.token = previewToken(preview);
      set({ scenePreview: preview });
      return {
        ...success(
          'Layout preview ready',
          preview.cabinets.map((cabinet) => cabinet.id),
        ),
        previewToken: preview.token,
      };
    },

    completeBuiltInRuns: (wallId, cabinetIds, expectedRevision) => {
      const state = get();
      const stale = staleRevisionResult(state.project, expectedRevision);
      if (stale) return stale;
      if (!state.project.walls.some((wall) => wall.id === wallId)) {
        return failure(`Unknown wall: ${wallId}`);
      }
      if (cabinetIds) {
        const cabinetById = new Map(state.project.cabinets.map((cabinet) => [cabinet.id, cabinet]));
        const invalidId = cabinetIds.find((id) => cabinetById.get(id)?.wallId !== wallId);
        if (invalidId) {
          return failure('Every run cabinet must exist on the target wall');
        }
      }
      const builtInElements = deriveBuiltInRunProposal(state.project, wallId, cabinetIds);
      const proposedIds = new Set(builtInElements.map((element) => element.id));
      const scopedTypes = new Set<BuiltInElement['type']>([
        'countertop',
        'end_panel',
        'toe_kick',
        'crown',
        'light_rail',
      ]);
      const removedBuiltInElementIds: string[] = [];
      for (const element of state.project.builtInElements) {
        if (
          element.origin === 'run_generated' &&
          element.wallId === wallId &&
          scopedTypes.has(element.type) &&
          !proposedIds.has(element.id)
        ) {
          removedBuiltInElementIds.push(element.id);
        }
      }
      const preview = evaluatePreview(state.project, {
        token: '',
        kind: 'run_finish',
        expectedRevision: state.project.revision,
        cabinets: [],
        builtInElements,
        removedBuiltInElementIds,
        valid: true,
        messages: [],
        snapGuides: [],
      });
      preview.token = previewToken(preview);
      set({ scenePreview: preview });
      return {
        ...success(
          preview.valid
            ? 'Built-in run finish preview ready'
            : (preview.messages[0] ?? 'Built-in run finish preview blocked'),
          [...builtInElements.map((element) => element.id), ...removedBuiltInElementIds],
        ),
        previewToken: preview.token,
      };
    },

    commitScenePreview: (token, expectedRevision) => {
      const state = get();
      const preview = state.scenePreview;
      if (!preview || preview.token !== token) return failure('Scene preview token mismatch');
      if (
        expectedRevision !== state.project.revision ||
        preview.expectedRevision !== state.project.revision
      ) {
        return failure(
          `Stale project revision: expected ${expectedRevision}, current ${state.project.revision}`,
        );
      }
      if (!preview.valid) return failure(preview.messages[0] ?? 'Scene preview is invalid');
      const affectedIds = [
        ...preview.cabinets.map((cabinet) => cabinet.id),
        ...preview.builtInElements.map((element) => element.id),
        ...preview.removedBuiltInElementIds,
      ];
      commitProjectMutation(`Commit ${preview.kind} preview`, (project) => {
        const previewCabinetById = new Map<string, CabinetInstance>();
        for (const cabinet of preview.cabinets) previewCabinetById.set(cabinet.id, cabinet);
        const previewBuiltInById = new Map<string, BuiltInElement>();
        for (const element of preview.builtInElements) previewBuiltInById.set(element.id, element);
        const removedBuiltInIds = new Set(preview.removedBuiltInElementIds);
        let cabinets = project.cabinets;
        if (preview.kind === 'placement') {
          cabinets = [...cabinets, ...preview.cabinets];
        } else if (preview.kind === 'move') {
          cabinets = cabinets.map((cabinet) => previewCabinetById.get(cabinet.id) ?? cabinet);
        } else if (preview.kind === 'layout') {
          cabinets = [
            ...cabinets.filter((cabinet) => !cabinetIsInLayoutScope(cabinet, preview)),
            ...preview.cabinets,
          ];
        }

        let builtInElements = project.builtInElements.filter(
          (element) => !removedBuiltInIds.has(element.id),
        );
        if (preview.kind === 'placement') {
          builtInElements = [...builtInElements, ...preview.builtInElements];
        } else {
          const existingIds = new Set<string>();
          builtInElements = builtInElements.map((element) => {
            existingIds.add(element.id);
            return previewBuiltInById.get(element.id) ?? element;
          });
          for (const element of preview.builtInElements) {
            if (!existingIds.has(element.id)) builtInElements.push(element);
          }
        }

        return { ...project, cabinets, builtInElements };
      });
      const selectedIds = [
        ...preview.cabinets.map((cabinet) => cabinet.id),
        ...preview.builtInElements.map((element) => element.id),
      ];
      set({
        scenePreview: null,
        selectedEntityIds: selectedIds,
        primarySelectedEntityId: selectedIds[0] ?? null,
      });
      return success('Scene preview committed', affectedIds);
    },

    cancelScenePreview: () => set({ scenePreview: null }),

    duplicateSelection: () => {
      const state = get();
      const movables = selectedMovableEntities(state.project, state.selectedEntityIds);
      if (movables.length === 0 || movables.length !== state.selectedEntityIds.length) {
        return failure('Select one or more cabinets or manual built-in elements to duplicate');
      }
      if (new Set(movables.map((entity) => entity.wallId)).size !== 1) {
        return failure('Duplicate selection must be on the same wall');
      }
      if (movables.some((entity) => 'origin' in entity && entity.origin === 'run_generated')) {
        return failure('Use Complete runs to regenerate this finish element');
      }

      const minOffset = Math.min(...movables.map((entity) => entity.offsetX));
      const maxOffset = Math.max(...movables.map((entity) => entity.offsetX + entity.width));
      const selectionWidth = maxOffset - minOffset;
      const usedIds = sceneEntityIds(state.project);
      const duplicates = movables.map((entity, index) => ({
        ...entity,
        id: uniqueBatchId(entity, state.project.revision + 1, index, usedIds),
      }));
      const duplicateWithDelta = (delta: Sixteenths) =>
        duplicates.map((entity) => ({ ...entity, offsetX: entity.offsetX + delta }));
      let positioned = duplicateWithDelta(selectionWidth + inchesToSixteenths(1));
      let candidate = appendMovables(state.project, positioned);
      let errors = batchErrors(
        candidate,
        positioned.map((entity) => entity.id),
      );
      if (errors.length > 0) {
        positioned = duplicateWithDelta(-(selectionWidth + inchesToSixteenths(1)));
        candidate = appendMovables(state.project, positioned);
        errors = batchErrors(
          candidate,
          positioned.map((entity) => entity.id),
        );
      }
      if (errors.length > 0) return failure(errors[0].message);

      commitProjectMutation('Duplicate selection', () => candidate);
      const ids = positioned.map((entity) => entity.id);
      set({ selectedEntityIds: ids, primarySelectedEntityId: ids[0] ?? null });
      return success('Selection duplicated', ids);
    },
    rotateSelection90: () => {
      const state = get();
      const movables = selectedMovableEntities(state.project, state.selectedEntityIds);
      if (movables.length === 0) {
        return failure('Select one or more items to rotate');
      }
      const walls = state.project.walls;
      if (walls.length > 1) {
        const wallIds = walls.map((w) => w.id);
        const mutatedCabinets = state.project.cabinets.map((cab) => {
          if (!state.selectedEntityIds.includes(cab.id)) return cab;
          const currentIdx = wallIds.indexOf(cab.wallId);
          const nextWallId = wallIds[(currentIdx + 1) % wallIds.length];
          return { ...cab, wallId: nextWallId };
        });
        const mutatedBuiltIns = state.project.builtInElements.map((elem) => {
          if (!state.selectedEntityIds.includes(elem.id)) return elem;
          const currentIdx = wallIds.indexOf(elem.wallId);
          const nextWallId = wallIds[(currentIdx + 1) % wallIds.length];
          return { ...elem, wallId: nextWallId };
        });
        commitProjectMutation('Rotate selection 90°', () => ({
          ...state.project,
          cabinets: mutatedCabinets,
          builtInElements: mutatedBuiltIns,
        }));
        return success('Moved selection to adjacent wall', state.selectedEntityIds);
      }
      const mutated = state.project.cabinets.map((cab) => {
        if (!state.selectedEntityIds.includes(cab.id)) return cab;
        const nextSwing: DoorSwing =
          cab.doorSwing === 'left' ? 'right' : cab.doorSwing === 'right' ? 'double' : 'left';
        return { ...cab, doorSwing: nextSwing };
      });
      commitProjectMutation('Rotate selection orientation', () => ({
        ...state.project,
        cabinets: mutated,
      }));
      return success('Updated selection orientation', state.selectedEntityIds);
    },

    alignSelection: (alignment) => {
      const state = get();
      const movables = selectedMovableEntities(state.project, state.selectedEntityIds);
      if (movables.length < 2 || movables.length !== state.selectedEntityIds.length) {
        return failure('Select at least two movable entities to align');
      }
      if (new Set(movables.map((entity) => entity.wallId)).size !== 1) {
        return failure('Alignment requires every selected entity on the same wall');
      }
      const anchor =
        movables.find((entity) => entity.id === state.primarySelectedEntityId) ?? movables[0];
      const anchorBounds = getMovableEntityBounds(state.project, anchor.id)!;
      const replacements = movables.map((entity) => {
        const bounds = getMovableEntityBounds(state.project, entity.id)!;
        const horizontalDelta =
          alignment === 'left'
            ? anchorBounds.min.x - bounds.min.x
            : alignment === 'center'
              ? (anchorBounds.min.x + anchorBounds.max.x - bounds.min.x - bounds.max.x) / 2
              : alignment === 'right'
                ? anchorBounds.max.x - bounds.max.x
                : 0;
        const verticalDelta =
          alignment === 'bottom'
            ? anchorBounds.min.y - bounds.min.y
            : alignment === 'middle'
              ? (anchorBounds.min.y + anchorBounds.max.y - bounds.min.y - bounds.max.y) / 2
              : alignment === 'top'
                ? anchorBounds.max.y - bounds.max.y
                : 0;
        return {
          ...entity,
          offsetX: Math.round(entity.offsetX + horizontalDelta),
          elevation: Math.round(entity.elevation + verticalDelta),
        };
      });
      const candidate = replaceMovables(state.project, replacements);
      const errors = batchErrors(
        candidate,
        replacements.map((entity) => entity.id),
      );
      if (errors.length > 0) return failure(errors[0].message);
      commitProjectMutation(`Align selection ${alignment}`, () => candidate);
      return success(
        `Selection aligned ${alignment}`,
        replacements.map((entity) => entity.id),
      );
    },

    distributeSelection: (distribution) => {
      const state = get();
      const movables = selectedMovableEntities(state.project, state.selectedEntityIds);
      if (movables.length < 3 || movables.length !== state.selectedEntityIds.length) {
        return failure('Select at least three movable entities to distribute');
      }
      if (new Set(movables.map((entity) => entity.wallId)).size !== 1) {
        return failure('Distribution requires every selected entity on the same wall');
      }
      const sorted = [...movables].sort(
        (left, right) =>
          left.offsetX + left.width / 2 - (right.offsetX + right.width / 2) ||
          left.id.localeCompare(right.id),
      );
      const first = sorted[0];
      const last = sorted.at(-1)!;
      const replacements = sorted.map((entity, index) => {
        if (index === 0 || index === sorted.length - 1) return entity;
        if (distribution === 'equal_centers') {
          const firstCenter = first.offsetX + first.width / 2;
          const lastCenter = last.offsetX + last.width / 2;
          const targetCenter =
            firstCenter + ((lastCenter - firstCenter) * index) / (sorted.length - 1);
          return { ...entity, offsetX: Math.round(targetCenter - entity.width / 2) };
        }
        const totalWidth = sorted.reduce((sum, candidate) => sum + candidate.width, 0);
        const availableSpan = last.offsetX + last.width - first.offsetX;
        const gap = (availableSpan - totalWidth) / (sorted.length - 1);
        const precedingWidth = sorted
          .slice(0, index)
          .reduce((sum, candidate) => sum + candidate.width, 0);
        return {
          ...entity,
          offsetX: Math.round(first.offsetX + precedingWidth + gap * index),
        };
      });
      const candidate = replaceMovables(state.project, replacements);
      const errors = batchErrors(
        candidate,
        replacements.map((entity) => entity.id),
      );
      if (errors.length > 0) return failure(errors[0].message);
      commitProjectMutation(`Distribute selection ${distribution}`, () => candidate);
      return success(
        `Selection distributed ${distribution === 'equal_gaps' ? 'with equal gaps' : 'by equal centers'}`,
        replacements.map((entity) => entity.id),
      );
    },

    removeSelection: () => {
      const state = get();
      const ids = state.selectedEntityIds.filter((id) => sceneEntityIds(state.project).has(id));
      if (ids.length === 0) return failure('No scene entities are selected');
      const removed = new Set(ids);
      commitProjectMutation('Remove selection', (project) => ({
        ...project,
        cabinets: project.cabinets.filter((entity) => !removed.has(entity.id)),
        builtInElements: cleanBuiltInElements(project.builtInElements, removed),
        openings: project.openings.filter((entity) => !removed.has(entity.id)),
        appliances: project.appliances.filter((entity) => !removed.has(entity.id)),
      }));
      set({ selectedEntityIds: [], primarySelectedEntityId: null });
      return success('Selection removed', ids);
    },

    addCabinet: (definitionCode, wallId, offsetXIn, elevationIn) => {
      const entry = getPlannerCatalogEntries().find(
        (candidate) =>
          candidate.kind === 'cabinet' && candidate.cabinetDefinition.code === definitionCode,
      );
      if (!entry) return '';
      const state = get();
      if (wallId) state.setActiveWall(wallId);
      const started = get().startCatalogPlacement(entry.id);
      if (!started.ok || !started.previewToken) return '';
      const preview = get().scenePreview;
      const cabinet = preview?.cabinets[0];
      if (!preview || !cabinet) return '';
      get().updateScenePreview(
        wallId ?? cabinet.wallId,
        offsetXIn === undefined ? cabinet.offsetX : inchesToSixteenths(offsetXIn),
        elevationIn === undefined ? cabinet.elevation : inchesToSixteenths(elevationIn),
        false,
      );
      const current = get().scenePreview;
      if (!current) return '';
      const result = get().commitScenePreview(current.token, current.expectedRevision);
      return result.ok ? cabinet.id : '';
    },

    undo: () => {
      const state = get();
      const previous = state.historyPast.at(-1);
      if (!previous) return;
      const historyPast = state.historyPast.slice(0, -1);
      const available = sceneEntityIds(previous);
      const selectedEntityIds = state.selectedEntityIds.filter((id) => available.has(id));
      set({
        project: previous,
        historyPast,
        historyFuture: [state.project, ...state.historyFuture].slice(0, 50),
        selectedEntityIds,
        primarySelectedEntityId: selectedEntityIds[0] ?? null,
        scenePreview: null,
        canUndo: historyPast.length > 0,
        canRedo: true,
      });
    },

    redo: () => {
      const state = get();
      const next = state.historyFuture[0];
      if (!next) return;
      const historyFuture = state.historyFuture.slice(1);
      const available = sceneEntityIds(next);
      const selectedEntityIds = state.selectedEntityIds.filter((id) => available.has(id));
      set({
        project: next,
        historyPast: [...state.historyPast.slice(-49), state.project],
        historyFuture,
        selectedEntityIds,
        primarySelectedEntityId: selectedEntityIds[0] ?? null,
        scenePreview: null,
        canUndo: true,
        canRedo: historyFuture.length > 0,
      });
    },

    setViewMode: (viewMode) =>
      set((state) => ({
        viewMode,
        cameraTransitionToken: state.cameraTransitionToken + 1,
      })),
    setCameraPreset: (cameraPreset) =>
      set((state) => ({
        cameraPreset,
        cameraTransitionToken: state.cameraTransitionToken + 1,
      })),
    toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),
    hideSelection: () =>
      set((state) => ({
        hiddenEntityIds: [
          ...new Set([
            ...state.hiddenEntityIds,
            ...state.selectedEntityIds.filter((id) => sceneEntityIds(state.project).has(id)),
          ]),
        ],
        selectedEntityIds: [],
        primarySelectedEntityId: null,
        sectionMode: state.sectionMode === 'cabinet_front' ? 'none' : state.sectionMode,
      })),
    isolateSelection: () =>
      set((state) => ({
        isolationEntityIds: state.selectedEntityIds.filter((id) =>
          sceneEntityIds(state.project).has(id),
        ),
        hiddenEntityIds: [],
      })),
    showAllEntities: () => set({ hiddenEntityIds: [], isolationEntityIds: [] }),
    toggleSceneLabels: () => set((state) => ({ showSceneLabels: !state.showSceneLabels })),
    setMeasureMode: (measureMode) =>
      set({
        measureMode,
        pendingMeasurementStart: measureMode ? get().pendingMeasurementStart : null,
      }),
    setNavigationTool: (navigationTool) => {
      set({
        navigationTool,
        measureMode: navigationTool === 'measure',
        pendingMeasurementStart:
          navigationTool === 'measure' ? get().pendingMeasurementStart : null,
      });
    },
    toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
    addMeasurementPoint: (point) => {
      const state = get();
      if (!state.pendingMeasurementStart) {
        set({ pendingMeasurementStart: point, measureMode: true });
        return success('Measurement start point set', []);
      }
      const result = state.createMeasurement(state.pendingMeasurementStart, point);
      set({ pendingMeasurementStart: null, measureMode: true });
      return result;
    },
    createMeasurement: (start, end, name) => {
      const deltaX = end.world.x - start.world.x;
      const deltaY = end.world.y - start.world.y;
      const deltaZ = end.world.z - start.world.z;
      const distanceInches = Math.sqrt(deltaX ** 2 + deltaY ** 2 + deltaZ ** 2) / 16;
      let suffix = get().measurements.length + 1;
      let id = `measurement-${suffix}`;
      while (get().measurements.some((measurement) => measurement.id === id)) {
        suffix += 1;
        id = `measurement-${suffix}`;
      }
      const measurement: Measurement = {
        id,
        name: name?.trim() || `Measurement ${suffix}`,
        start,
        end,
        distanceInches,
      };
      set((state) => ({ measurements: [...state.measurements, measurement] }));
      return success(`Measured ${Number(distanceInches.toFixed(4))} inches`, [id]);
    },
    renameMeasurement: (id, name) =>
      set((state) => ({
        measurements: state.measurements.map((measurement) =>
          measurement.id === id && name.trim()
            ? { ...measurement, name: name.trim() }
            : measurement,
        ),
      })),
    deleteMeasurement: (id) =>
      set((state) => ({
        measurements: state.measurements.filter((measurement) => measurement.id !== id),
      })),
    cancelMeasurement: () => set({ pendingMeasurementStart: null, measureMode: false }),
    setSectionMode: (sectionMode) => {
      const hasCabinetSelection = get().selectedEntityIds.some((id) =>
        get().project.cabinets.some((cabinet) => cabinet.id === id),
      );
      set({
        sectionMode: sectionMode === 'cabinet_front' && !hasCabinetSelection ? 'none' : sectionMode,
      });
    },
    setSectionOffset: (sectionOffset) => set({ sectionOffset }),
    setInspectionVisibility: (hiddenIds, isolateIds) => {
      const available = sceneEntityIds(get().project);
      const requested = [...(hiddenIds ?? []), ...(isolateIds ?? [])];
      const unknown = requested.find((id) => !available.has(id));
      if (unknown) return failure(`Scene entity not found: ${unknown}`);
      set((state) => ({
        hiddenEntityIds: hiddenIds === undefined ? state.hiddenEntityIds : [...new Set(hiddenIds)],
        isolationEntityIds:
          isolateIds === undefined ? state.isolationEntityIds : [...new Set(isolateIds)],
      }));
      return success('Scene visibility updated', requested);
    },
    toggleWebMCPDrawer: () => set((state) => ({ isWebMCPDrawerOpen: !state.isWebMCPDrawerOpen })),

    logWebMCPActivity: (toolName, args, resultSummary, isError = false) => {
      const entry: WebMCPActivityEntry = {
        id: `mcp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toLocaleTimeString(),
        toolName,
        args,
        resultSummary,
        isError,
      };
      set((state) => ({ webMCPLogs: [entry, ...state.webMCPLogs].slice(0, 50) }));
    },

    loadProject: (project) => {
      set({
        project,
        historyPast: [],
        historyFuture: [],
        selectedEntityIds: [],
        primarySelectedEntityId: null,
        cameraTransitionToken: 0,
        scenePreview: null,
        hiddenEntityIds: [],
        isolationEntityIds: [],
        showSceneLabels: true,
        measureMode: false,
        pendingMeasurementStart: null,
        measurements: [],
        sectionMode: 'none',
        sectionOffset: project.width / 2,
        canUndo: false,
        canRedo: false,
      });
    },

    resetProject: () => {
      const project = createInitialProject();
      set({
        project,
        historyPast: [],
        historyFuture: [],
        selectedEntityIds: ['cab-seed-1'],
        primarySelectedEntityId: 'cab-seed-1',
        scenePreview: null,
        hiddenEntityIds: [],
        isolationEntityIds: [],
        showSceneLabels: true,
        measureMode: false,
        pendingMeasurementStart: null,
        measurements: [],
        sectionMode: 'none',
        sectionOffset: DEFAULT_WIDTH / 2,
        canUndo: false,
        canRedo: false,
      });
    },
  };
});

function sceneEntityIds(project: RoomProject): Set<string> {
  return new Set([
    ...project.cabinets.map((entity) => entity.id),
    ...project.builtInElements.map((entity) => entity.id),
    ...project.openings.map((entity) => entity.id),
    ...project.appliances.map((entity) => entity.id),
  ]);
}

function staleRevisionResult(
  project: RoomProject,
  expectedRevision?: number,
): SceneCommandResult | null {
  return expectedRevision !== undefined && expectedRevision !== project.revision
    ? failure(`Stale project revision: expected ${expectedRevision}, current ${project.revision}`)
    : null;
}

function firstEntityError(project: RoomProject, entityId: string) {
  return validateRoomProject(project).issues.find(
    (issue) => issue.severity === 'error' && issue.affectedCabinetIds.includes(entityId),
  );
}

function evaluatePreview(project: RoomProject, preview: ScenePreview): ScenePreview {
  const report = validateRoomProject(previewProject(project, preview));
  const previewIds = new Set([
    ...preview.cabinets.map((cabinet) => cabinet.id),
    ...preview.builtInElements.map((element) => element.id),
  ]);
  const errors = report.issues.filter(
    (issue) =>
      issue.severity === 'error' &&
      issue.affectedCabinetIds.some((entityId) => previewIds.has(entityId)),
  );
  return {
    ...preview,
    valid: errors.length === 0,
    messages: errors.map((issue) => issue.message),
  };
}

function cabinetIsInLayoutScope(cabinet: CabinetInstance, preview: ScenePreview): boolean {
  if (preview.kind !== 'layout') return false;
  if (!preview.cabinets.some((candidate) => candidate.wallId === cabinet.wallId)) return false;
  const targetRun = preview.cabinets.some((candidate) => candidate.category === 'wall')
    ? 'wall'
    : 'base';
  return targetRun === 'wall'
    ? cabinet.category === 'wall' ||
        (cabinet.category === 'filler' && cabinet.elevation >= inchesToSixteenths(54))
    : cabinet.category === 'base' ||
        cabinet.category === 'corner' ||
        (cabinet.category === 'filler' && cabinet.elevation < inchesToSixteenths(54));
}

function previewProject(project: RoomProject, preview: ScenePreview): RoomProject {
  const cabinetIds = new Set(preview.cabinets.map((cabinet) => cabinet.id));
  const elementIds = new Set(preview.builtInElements.map((element) => element.id));
  const removedElementIds = new Set(preview.removedBuiltInElementIds);
  return {
    ...project,
    cabinets: [
      ...project.cabinets.filter(
        (cabinet) => !cabinetIds.has(cabinet.id) && !cabinetIsInLayoutScope(cabinet, preview),
      ),
      ...preview.cabinets,
    ],
    builtInElements: [
      ...project.builtInElements.filter(
        (element) => !elementIds.has(element.id) && !removedElementIds.has(element.id),
      ),
      ...preview.builtInElements,
    ],
  };
}

function previewToken(preview: ScenePreview): string {
  const content = JSON.stringify({
    kind: preview.kind,
    expectedRevision: preview.expectedRevision,
    cabinets: preview.cabinets,
    builtInElements: preview.builtInElements,
    removedBuiltInElementIds: preview.removedBuiltInElementIds,
  });
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `preview-${preview.kind}-${(hash >>> 0).toString(36)}`;
}

function cleanBuiltInElements(
  elements: BuiltInElement[],
  removedIds: Set<string>,
): BuiltInElement[] {
  const cleaned: BuiltInElement[] = [];
  for (const element of elements) {
    if (removedIds.has(element.id)) continue;
    if (
      element.origin === 'run_generated' &&
      element.attachedCabinetIds.some((cabinetId) => removedIds.has(cabinetId))
    ) {
      continue;
    }
    const attachedCabinetIds: string[] = [];
    for (const cabinetId of element.attachedCabinetIds) {
      if (!removedIds.has(cabinetId)) attachedCabinetIds.push(cabinetId);
    }
    cleaned.push(
      attachedCabinetIds.length === element.attachedCabinetIds.length
        ? element
        : { ...element, attachedCabinetIds },
    );
  }
  return cleaned;
}

function firstAvailableOffset(
  project: RoomProject,
  wallId: WallId,
  width: Sixteenths,
  elevation: Sixteenths,
  height: Sixteenths,
): Sixteenths {
  const spans: WallSpan[] = [];
  appendEligibleSpans(spans, project.cabinets, wallId, elevation, height);
  appendEligibleSpans(spans, project.builtInElements, wallId, elevation, height);
  appendEligibleSpans(spans, project.openings, wallId, elevation, height);
  appendEligibleSpans(spans, project.appliances, wallId, elevation, height);
  spans.sort((left, right) => left.offsetX - right.offsetX);
  let offset = 0;
  for (const span of spans) {
    if (span.offsetX - offset >= width) return offset;
    offset = Math.max(offset, span.offsetX + span.width);
  }
  return offset;
}

interface WallSpan {
  wallId: WallId;
  offsetX: Sixteenths;
  elevation: Sixteenths;
  width: Sixteenths;
  height: Sixteenths;
}

function appendEligibleSpans(
  target: WallSpan[],
  entities: WallSpan[],
  wallId: WallId,
  elevation: Sixteenths,
  height: Sixteenths,
): void {
  for (const entity of entities) {
    if (
      entity.wallId === wallId &&
      entity.elevation < elevation + height &&
      entity.elevation + entity.height > elevation
    ) {
      target.push(entity);
    }
  }
}

function nextId(project: RoomProject, prefix: string, descriptor: string): string {
  const existing = sceneEntityIds(project);
  const base = `${prefix}-${descriptor.replaceAll(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
  let suffix = project.revision + 1;
  let id = `${base}-${suffix}`;
  while (existing.has(id)) {
    suffix += 1;
    id = `${base}-${suffix}`;
  }
  return id;
}

type MovableSceneEntity = CabinetInstance | BuiltInElement;

function selectedMovableEntities(
  project: RoomProject,
  selectedIds: string[],
): MovableSceneEntity[] {
  const byId = new Map<string, MovableSceneEntity>();
  for (const entity of project.cabinets) byId.set(entity.id, entity);
  for (const entity of project.builtInElements) byId.set(entity.id, entity);
  const selected: MovableSceneEntity[] = [];
  for (const id of selectedIds) {
    const entity = byId.get(id);
    if (entity) selected.push(entity);
  }
  return selected;
}

function replaceMovables(project: RoomProject, replacements: MovableSceneEntity[]): RoomProject {
  const byId = new Map<string, MovableSceneEntity>();
  for (const entity of replacements) byId.set(entity.id, entity);
  return {
    ...project,
    cabinets: project.cabinets.map((entity) => {
      const replacement = byId.get(entity.id);
      return replacement && !('origin' in replacement) ? replacement : entity;
    }),
    builtInElements: project.builtInElements.map((entity) => {
      const replacement = byId.get(entity.id);
      return replacement && 'origin' in replacement ? replacement : entity;
    }),
  };
}

function appendMovables(project: RoomProject, additions: MovableSceneEntity[]): RoomProject {
  const cabinets = [...project.cabinets];
  const builtInElements = [...project.builtInElements];
  for (const entity of additions) {
    if ('origin' in entity) builtInElements.push(entity);
    else cabinets.push(entity);
  }
  return { ...project, cabinets, builtInElements };
}

function uniqueBatchId(
  entity: MovableSceneEntity,
  revision: number,
  index: number,
  usedIds: Set<string>,
): string {
  const prefix = 'origin' in entity ? 'builtin' : 'cab';
  const descriptor = entity.definitionId.replaceAll(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  let suffix = index + 1;
  let id = `${prefix}-copy-${descriptor}-${revision}-${suffix}`;
  while (usedIds.has(id)) {
    suffix += 1;
    id = `${prefix}-copy-${descriptor}-${revision}-${suffix}`;
  }
  usedIds.add(id);
  return id;
}

function batchErrors(project: RoomProject, entityIds: string[]) {
  const ids = new Set(entityIds);
  return validateRoomProject(project).issues.filter(
    (issue) =>
      issue.severity === 'error' && issue.affectedCabinetIds.some((entityId) => ids.has(entityId)),
  );
}

function success(message: string, affectedIds: string[]): SceneCommandResult {
  return { ok: true, message, affectedIds };
}

function failure(message: string): SceneCommandResult {
  return { ok: false, message, affectedIds: [] };
}
