import { z } from 'zod';
import {
  deriveAssemblyPartCallouts,
  splitAssemblyInstruction,
} from '@/domain/assembly/step-presentation';
import { computeProjectBOM } from '@/domain/bom/compute-project-bom';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getPlannerCatalogEntries } from '@/domain/catalog/planner-catalog';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import type { CabinetBuildConfig, RoomProject } from '@/domain/geometry/models';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import { inchesToSixteenths, sixteenthsToInches } from '@/domain/geometry/units';
import { wallLocalToWorld } from '@/domain/geometry/wall-transform';
import { generateAutoFitProposals } from '@/domain/layout/auto-fit';
import { validateRoomProject } from '@/domain/validation/rules';
import { getStructuredAgentGuidance } from '@/domain/webmcp/agent-guidance';
import { captureStudioScreenshot } from '@/rendering/screenshots/capture-canvas';
import {
  type EditableBuiltInElementPatch,
  type EditableCabinetPatch,
  type SceneCommandResult,
  type ScenePreview,
  useProjectStore,
} from '@/state/project-store';

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute(input: Record<string, unknown>): Promise<string>;
}

const finite = z.number().finite();
const positive = finite.positive();
const nonnegative = finite.nonnegative();
const emptySchema = z.strictObject({});
const layoutShapeSchema = z.enum(['single_wall', 'l_shape', 'u_shape', 'galley']);
const doorSwingSchema = z.enum(['left', 'right', 'double', 'drawers', 'open_shelf', 'false_front']);

const buildInputSchema = z.strictObject({
  construction: z.enum(['frameless', 'face_frame']).optional(),
  carcass_thickness_inches: positive.optional(),
  back_thickness_inches: positive.optional(),
  shelf_thickness_inches: positive.optional(),
  face_frame_width_inches: positive.optional(),
  front_layout: z
    .enum(['single_door', 'double_door', 'door_and_drawer', 'drawers', 'open', 'false_front'])
    .optional(),
  drawer_count: z.number().int().min(0).max(6).optional(),
  shelf_count: z.number().int().min(0).max(6).optional(),
  shelf_layout: z.enum(['even', 'custom']).optional(),
  shelf_elevations_inches: z.array(nonnegative).max(6).optional(),
  include_hardware: z.boolean().optional(),
  hardware_placement: z.enum(['auto', 'upper', 'center', 'lower']).optional(),
  left_finished_end: z.boolean().optional(),
  right_finished_end: z.boolean().optional(),
  toe_kick_height_inches: nonnegative.optional(),
  toe_kick_depth_inches: nonnegative.optional(),
  drawer_slide_id: z.string().min(1).optional(),
  hinge_id: z.string().min(1).optional(),
});

const configureCabinetSchema = z.strictObject({
  cabinet_id: z.string().min(1),
  expected_revision: z.number().int().nonnegative(),
  convert_to_built: z.literal(true).optional(),
  wall_id: z.string().min(1).optional(),
  offset_inches: nonnegative.optional(),
  elevation_inches: nonnegative.optional(),
  width_inches: positive.optional(),
  height_inches: positive.optional(),
  depth_inches: positive.optional(),
  door_swing: doorSwingSchema.optional(),
  door_style_id: z.string().min(1).optional(),
  finish_id: z.string().min(1).optional(),
  interior_finish_id: z.string().min(1).optional(),
  hardware_id: z.string().min(1).optional(),
  build: buildInputSchema.optional(),
});

const measurementPointSchema = z.strictObject({
  wall_id: z.string().min(1),
  offset_inches: finite,
  elevation_inches: finite,
});

const inspectionMeasurementSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('create'),
    start: measurementPointSchema,
    end: measurementPointSchema,
    name: z.string().min(1).optional(),
  }),
  z.strictObject({
    action: z.literal('delete'),
    measurement_id: z.string().min(1),
  }),
]);

export function getWebMCPTools(): WebMCPToolDefinition[] {
  return [
    defineTool(
      'get_agent_guidance',
      'Returns the cabinet-planning agent playbook.',
      emptySchema,
      true,
      () => getStructuredAgentGuidance(),
    ),
    defineTool(
      'get_project_summary',
      'Returns current room, entity, selection, and revision state.',
      emptySchema,
      true,
      () => {
        const state = useProjectStore.getState();
        const project = state.project;
        return {
          projectId: project.id,
          name: project.name,
          revision: project.revision,
          layoutShape: project.layoutShape,
          dimensionsInches: {
            width: sixteenthsToInches(project.width),
            length: sixteenthsToInches(project.length),
            ceilingHeight: sixteenthsToInches(project.ceilingHeight),
          },
          activeWallId: project.activeWallId,
          walls: project.walls.map((wall) => ({
            id: wall.id,
            name: wall.name,
            lengthInches: sixteenthsToInches(wall.length),
            normalAngleDegrees: wall.normalAngleDegrees,
          })),
          counts: {
            cabinets: project.cabinets.length,
            builtInElements: project.builtInElements.length,
            openings: project.openings.length,
            appliances: project.appliances.length,
          },
          selectedEntityIds: state.selectedEntityIds,
          primarySelectedEntityId: state.primarySelectedEntityId,
          scenePreview: state.scenePreview,
        };
      },
    ),
    defineTool(
      'list_catalog_options',
      'Lists cabinet, built-in, hardware, and shelving catalog entries with honest price status.',
      z.strictObject({
        kind: z
          .enum(['all', 'cabinet', 'built_in', 'hardware', 'shelving', 'drawer_system', 'hinge'])
          .default('all'),
        search: z.string().default(''),
      }),
      true,
      ({ kind, search }) => {
        const query = search.trim().toLowerCase();
        const entries = getPlannerCatalogEntries().filter(
          (entry) =>
            (kind === 'all' || entry.kind === kind) &&
            (query.length === 0 ||
              [entry.code, entry.name, entry.description, ...entry.searchTerms]
                .join(' ')
                .toLowerCase()
                .includes(query)),
        );
        return {
          count: entries.length,
          items: entries.map((entry) => {
            if (entry.kind === 'cabinet') {
              const definition = entry.cabinetDefinition;
              return {
                id: entry.id,
                kind: entry.kind,
                code: entry.code,
                name: entry.name,
                family: definition.family,
                source: definition.source,
                dimensionsInches: {
                  width: definition.nominalWidthInches,
                  height: definition.nominalHeightInches,
                  depth: definition.nominalDepthInches,
                },
                estimatedPriceUSD: definition.retailMapping?.estimatedPriceUSD ?? null,
                priceStatus: definition.retailMapping
                  ? 'Search-only retailer estimate'
                  : definition.source === 'built_template'
                    ? 'Materials estimate in BOM'
                    : 'Price unavailable',
              };
            }
            if (entry.kind === 'drawer_system') {
              const drawer = entry.drawerBoxOption;
              return {
                id: entry.id,
                kind: entry.kind,
                code: entry.code,
                name: entry.name,
                material: drawer.material,
                slideType: drawer.slideType,
                weightCapacityLbs: drawer.weightCapacityLbs,
                extensionType: drawer.extensionType,
                description: drawer.description,
              };
            }
            if (entry.kind === 'hinge') {
              const hinge = entry.hingeOption;
              return {
                id: entry.id,
                kind: entry.kind,
                code: entry.code,
                name: entry.name,
                openingAngleDegrees: hinge.openingAngleDegrees,
                mountingType: hinge.mountingType,
                softClose: hinge.softClose,
                description: hinge.description,
              };
            }
            return { id: entry.id, kind: entry.kind, code: entry.code, name: entry.name };
          }),
        };
      },
    ),
    defineTool(
      'set_room_dimensions',
      'Creates a new room or resizes the current room through one revision-checked transaction.',
      z.strictObject({
        width_inches: positive,
        length_inches: positive,
        height_inches: positive,
        layout_shape: layoutShapeSchema,
        expected_revision: z.number().int().nonnegative(),
        content_behavior: z.enum(['new_project', 'resize_current']),
      }),
      false,
      (input) => {
        const result = useProjectStore
          .getState()
          .setRoomDimensionsCommand(
            input.width_inches,
            input.length_inches,
            input.height_inches,
            input.layout_shape,
            input.content_behavior,
            input.expected_revision,
          );
        return commandPayload(result);
      },
    ),
    defineTool(
      'analyze_wall_fit',
      'Returns deterministic current-revision auto-fit proposals without mutation.',
      z.strictObject({
        wall_id: z.string().min(1),
        target_run: z.enum(['base', 'wall']),
        include_sink_base: z.boolean().default(false),
      }),
      true,
      ({ wall_id, target_run, include_sink_base }) => {
        const project = useProjectStore.getState().project;
        const wall = requireWall(project, wall_id);
        return {
          revision: project.revision,
          wallId: wall.id,
          proposals: generateAutoFitProposals({
            project,
            wallId: wall.id,
            wallLength: wall.length,
            targetCategory: target_run,
            includeSinkBase: include_sink_base,
          }),
        };
      },
    ),
    defineTool(
      'validate_design',
      'Validates walls, collisions, obstacles, and built-in geometry.',
      emptySchema,
      true,
      () => {
        const project = useProjectStore.getState().project;
        return { revision: project.revision, ...validateRoomProject(project) };
      },
    ),
    defineTool(
      'generate_project_bom',
      'Generates the honest stock and material-estimate BOM.',
      emptySchema,
      true,
      () => {
        const project = useProjectStore.getState().project;
        return { revision: project.revision, ...computeProjectBOM(project) };
      },
    ),
    defineTool(
      'capture_design_screenshot',
      'Captures the registered planner renderer with current visibility and section state.',
      z.strictObject({ include_transient_preview: z.boolean().default(false) }),
      true,
      async ({ include_transient_preview }) =>
        captureStudioScreenshot({ includeTransientPreview: include_transient_preview }),
    ),
    defineTool(
      'get_assembly_overview',
      'Returns exact assembly geometry and steps for a placed cabinet instance.',
      z.strictObject({ cabinet_id: z.string().min(1).optional() }),
      true,
      ({ cabinet_id }) => {
        const state = useProjectStore.getState();
        const cabinet = cabinet_id
          ? state.project.cabinets.find((candidate) => candidate.id === cabinet_id)
          : (state.project.cabinets.find(
              (candidate) => candidate.id === state.primarySelectedEntityId,
            ) ?? state.project.cabinets[0]);
        if (!cabinet) throw new Error('No placed cabinet is available for assembly');
        const definition = getCabinetDefinitionByCode(cabinet.definitionId);
        if (!definition) throw new Error(`Unknown cabinet definition: ${cabinet.definitionId}`);
        const spec = resolveCabinetSpec(definition, cabinet);
        const model = buildCabinetParts(spec);
        return {
          cabinet,
          resolvedSpec: spec,
          parts: model.parts,
          relatedBuiltInElements: state.project.builtInElements.filter((element) =>
            element.attachedCabinetIds.includes(cabinet.id),
          ),
          steps: model.assemblySteps.map((step) => ({
            ...step,
            numberedInstructions: splitAssemblyInstruction(step.actionInstruction),
            activeParts: deriveAssemblyPartCallouts(model, step),
          })),
        };
      },
    ),
    defineTool(
      'configure_cabinet',
      'Configures one cabinet through the validated cabinet command.',
      configureCabinetSchema,
      false,
      (input) => {
        const patch = cabinetPatchFromInput(input);
        const result = useProjectStore
          .getState()
          .configureCabinetWithConversion(
            input.cabinet_id,
            patch,
            input.convert_to_built === true,
            input.expected_revision,
          );
        return commandPayload(result);
      },
    ),
    defineTool(
      'configure_built_in_element',
      'Configures a manual built-in element; generated elements reject edits.',
      z.strictObject({
        element_id: z.string().min(1),
        expected_revision: z.number().int().nonnegative(),
        wall_id: z.string().min(1).optional(),
        offset_inches: finite.optional(),
        elevation_inches: finite.optional(),
        depth_offset_inches: finite.optional(),
        width_inches: positive.optional(),
        height_inches: positive.optional(),
        depth_inches: positive.optional(),
        finish_id: z.string().min(1).optional(),
      }),
      false,
      (input) => {
        const patch: EditableBuiltInElementPatch = {};
        if (input.wall_id !== undefined) patch.wallId = input.wall_id;
        if (input.offset_inches !== undefined) {
          patch.offsetX = inchesToSixteenths(input.offset_inches);
        }
        if (input.elevation_inches !== undefined) {
          patch.elevation = inchesToSixteenths(input.elevation_inches);
        }
        if (input.depth_offset_inches !== undefined) {
          patch.depthOffset = inchesToSixteenths(input.depth_offset_inches);
        }
        if (input.width_inches !== undefined) patch.width = inchesToSixteenths(input.width_inches);
        if (input.height_inches !== undefined) {
          patch.height = inchesToSixteenths(input.height_inches);
        }
        if (input.depth_inches !== undefined) patch.depth = inchesToSixteenths(input.depth_inches);
        if (input.finish_id !== undefined) patch.finishId = input.finish_id;
        const result = useProjectStore
          .getState()
          .configureBuiltInElement(input.element_id, patch, input.expected_revision);
        return commandPayload(result);
      },
    ),
    defineTool(
      'select_scene_entities',
      'Updates view-only scene selection without changing project revision.',
      z.strictObject({
        entity_ids: z.array(z.string().min(1)),
        mode: z.enum(['replace', 'toggle']),
      }),
      false,
      ({ entity_ids, mode }) => {
        const state = useProjectStore.getState();
        for (const id of entity_ids) requireEntity(state.project, id);
        if (mode === 'replace') state.setSceneSelection(entity_ids, entity_ids[0] ?? null);
        else for (const id of entity_ids) state.selectSceneEntity(id, 'toggle');
        return {
          revision: state.project.revision,
          selectedEntityIds: useProjectStore.getState().selectedEntityIds,
          primarySelectedEntityId: useProjectStore.getState().primarySelectedEntityId,
        };
      },
    ),
    defineTool(
      'preview_catalog_placement',
      'Stages an exact catalog placement preview and returns its token.',
      z.strictObject({
        entry_id: z.string().min(1),
        wall_id: z.string().min(1),
        offset_inches: finite.optional(),
        elevation_inches: finite.optional(),
        snap: z.boolean(),
      }),
      false,
      (input) => {
        const state = useProjectStore.getState();
        requireWall(state.project, input.wall_id);
        state.setActiveWall(input.wall_id);
        const started = useProjectStore.getState().startCatalogPlacement(input.entry_id);
        if (!started.ok) return commandPayload(started);
        const preview = useProjectStore.getState().scenePreview;
        const entity = preview?.cabinets[0] ?? preview?.builtInElements[0];
        if (!preview || !entity) throw new Error('Placement preview was not created');
        useProjectStore
          .getState()
          .updateScenePreview(
            input.wall_id,
            input.offset_inches === undefined
              ? entity.offsetX
              : inchesToSixteenths(input.offset_inches),
            input.elevation_inches === undefined
              ? entity.elevation
              : inchesToSixteenths(input.elevation_inches),
            input.snap,
          );
        return previewPayload(useProjectStore.getState().scenePreview);
      },
    ),
    defineTool(
      'preview_scene_transform',
      'Stages a same-wall scene move through the shared snap resolver.',
      z.strictObject({
        entity_ids: z.array(z.string().min(1)).min(1),
        delta_offset_inches: finite,
        delta_elevation_inches: finite,
        snap: z.boolean(),
      }),
      false,
      (input) => {
        const result = useProjectStore
          .getState()
          .startSceneMovePreview(
            input.entity_ids,
            inchesToSixteenths(input.delta_offset_inches),
            inchesToSixteenths(input.delta_elevation_inches),
            input.snap,
          );
        if (!result.ok) return commandPayload(result);
        return previewPayload(useProjectStore.getState().scenePreview);
      },
    ),
    defineTool(
      'preview_auto_fit_proposal',
      'Stages a deterministic proposal ID at an exact project revision.',
      z.strictObject({
        proposal_id: z.string().min(1),
        expected_revision: z.number().int().nonnegative(),
      }),
      false,
      ({ proposal_id, expected_revision }) => {
        const state = useProjectStore.getState();
        requireRevision(state.project, expected_revision);
        const proposal = allAutoFitProposals(state.project).find(
          (candidate) => candidate.id === proposal_id,
        );
        if (!proposal) throw new Error(`Auto-fit proposal not found: ${proposal_id}`);
        const result = state.stageAutoFitProposal(proposal);
        if (!result.ok) return commandPayload(result);
        return previewPayload(useProjectStore.getState().scenePreview);
      },
    ),
    defineTool(
      'commit_scene_preview',
      'Commits one exact tokenized scene preview.',
      z.strictObject({
        token: z.string().min(1),
        expected_revision: z.number().int().nonnegative(),
      }),
      false,
      ({ token, expected_revision }) =>
        commandPayload(useProjectStore.getState().commitScenePreview(token, expected_revision)),
    ),
    defineTool(
      'cancel_scene_preview',
      'Cancels the transient scene preview without mutation.',
      emptySchema,
      false,
      () => {
        useProjectStore.getState().cancelScenePreview();
        return {
          ok: true,
          message: 'Scene preview cancelled',
          revision: useProjectStore.getState().project.revision,
        };
      },
    ),
    defineTool(
      'duplicate_scene_selection',
      'Duplicates the selected same-wall movable entities in one transaction.',
      z.strictObject({
        entity_ids: z.array(z.string().min(1)).min(1).optional(),
        expected_revision: z.number().int().nonnegative(),
      }),
      false,
      ({ entity_ids, expected_revision }) => {
        const state = useProjectStore.getState();
        requireRevision(state.project, expected_revision);
        if (entity_ids) {
          for (const id of entity_ids) requireEntity(state.project, id);
          state.setSceneSelection(entity_ids, entity_ids[0]);
        }
        return commandPayload(useProjectStore.getState().duplicateSelection());
      },
    ),
    defineTool(
      'remove_scene_selection',
      'Removes selected scene entities in one revision-checked transaction.',
      z.strictObject({
        entity_ids: z.array(z.string().min(1)).min(1).optional(),
        expected_revision: z.number().int().nonnegative(),
      }),
      false,
      ({ entity_ids, expected_revision }) => {
        const state = useProjectStore.getState();
        requireRevision(state.project, expected_revision);
        if (entity_ids) {
          for (const id of entity_ids) requireEntity(state.project, id);
          state.setSceneSelection(entity_ids, entity_ids[0]);
        }
        return commandPayload(useProjectStore.getState().removeSelection());
      },
    ),
    defineTool(
      'align_distribute_scene_selection',
      'Aligns or distributes selected same-wall movable entities.',
      z.strictObject({
        entity_ids: z.array(z.string().min(1)).min(1).optional(),
        operation: z.enum([
          'left',
          'center',
          'right',
          'bottom',
          'middle',
          'top',
          'equal_gaps',
          'equal_centers',
        ]),
        expected_revision: z.number().int().nonnegative(),
      }),
      false,
      ({ entity_ids, operation, expected_revision }) => {
        const state = useProjectStore.getState();
        requireRevision(state.project, expected_revision);
        if (entity_ids) {
          for (const id of entity_ids) requireEntity(state.project, id);
          state.setSceneSelection(entity_ids, entity_ids[0]);
        }
        const result = operation.startsWith('equal_')
          ? useProjectStore
              .getState()
              .distributeSelection(operation as 'equal_gaps' | 'equal_centers')
          : useProjectStore
              .getState()
              .alignSelection(
                operation as 'left' | 'center' | 'right' | 'bottom' | 'middle' | 'top',
              );
        return commandPayload(result);
      },
    ),
    defineTool(
      'set_scene_inspection',
      'Updates view-only visibility, section, and measurement state.',
      z.strictObject({
        hidden_ids: z.array(z.string().min(1)).optional(),
        isolate_ids: z.array(z.string().min(1)).optional(),
        section_mode: z.enum(['none', 'cabinet_front', 'room_plane']).optional(),
        section_offset_inches: finite.optional(),
        measurement: inspectionMeasurementSchema.optional(),
      }),
      false,
      (input) => {
        const state = useProjectStore.getState();
        const visibility = state.setInspectionVisibility(input.hidden_ids, input.isolate_ids);
        if (!visibility.ok) return commandPayload(visibility);
        if (input.section_mode) state.setSectionMode(input.section_mode);
        if (input.section_offset_inches !== undefined) {
          state.setSectionOffset(inchesToSixteenths(input.section_offset_inches));
        }
        const measurementInput = input.measurement;
        if (measurementInput?.action === 'delete') {
          if (
            !state.measurements.some(
              (measurement) => measurement.id === measurementInput.measurement_id,
            )
          ) {
            throw new Error(`Measurement not found: ${measurementInput.measurement_id}`);
          }
          state.deleteMeasurement(measurementInput.measurement_id);
        } else if (measurementInput?.action === 'create') {
          const start = measurementPointFromInput(state.project, measurementInput.start);
          const end = measurementPointFromInput(state.project, measurementInput.end);
          state.createMeasurement(start, end, measurementInput.name);
        }
        const current = useProjectStore.getState();
        return {
          revision: current.project.revision,
          hiddenEntityIds: current.hiddenEntityIds,
          isolationEntityIds: current.isolationEntityIds,
          sectionMode: current.sectionMode,
          sectionOffsetInches: sixteenthsToInches(current.sectionOffset),
          measurements: current.measurements,
        };
      },
    ),
    defineTool(
      'complete_built_in_runs',
      'Stages exact generated run finishes for review and tokenized commit.',
      z.strictObject({
        wall_id: z.string().min(1),
        cabinet_ids: z.array(z.string().min(1)).min(1).optional(),
        expected_revision: z.number().int().nonnegative(),
      }),
      false,
      ({ wall_id, cabinet_ids, expected_revision }) => {
        const result = useProjectStore
          .getState()
          .completeBuiltInRuns(wall_id, cabinet_ids, expected_revision);
        if (!result.ok) return commandPayload(result);
        return previewPayload(useProjectStore.getState().scenePreview);
      },
    ),
  ];
}

function defineTool<T>(
  name: string,
  description: string,
  schema: z.ZodType<T>,
  readOnly: boolean,
  execute: (input: T) => unknown | Promise<unknown>,
): WebMCPToolDefinition {
  return {
    name,
    description,
    inputSchema: z.toJSONSchema(schema) as Record<string, unknown>,
    annotations: { readOnlyHint: readOnly },
    execute: async (rawInput) => {
      try {
        const input = schema.parse(rawInput);
        const output = await execute(input);
        useProjectStore
          .getState()
          .logWebMCPActivity(name, rawInput, summarizeOutput(output), false);
        return JSON.stringify(output, null, 2);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        useProjectStore.getState().logWebMCPActivity(name, rawInput, message, true);
        throw error;
      }
    },
  };
}

function cabinetPatchFromInput(
  input: z.infer<typeof configureCabinetSchema>,
): EditableCabinetPatch {
  const patch: EditableCabinetPatch = {};
  if (input.wall_id !== undefined) patch.wallId = input.wall_id;
  if (input.offset_inches !== undefined) patch.offsetX = inchesToSixteenths(input.offset_inches);
  if (input.elevation_inches !== undefined) {
    patch.elevation = inchesToSixteenths(input.elevation_inches);
  }
  if (input.width_inches !== undefined) patch.width = inchesToSixteenths(input.width_inches);
  if (input.height_inches !== undefined) patch.height = inchesToSixteenths(input.height_inches);
  if (input.depth_inches !== undefined) patch.depth = inchesToSixteenths(input.depth_inches);
  if (input.door_swing !== undefined) patch.doorSwing = input.door_swing;
  if (input.door_style_id !== undefined) patch.doorStyleId = input.door_style_id;
  if (input.finish_id !== undefined) patch.finishId = input.finish_id;
  if (input.interior_finish_id !== undefined) patch.interiorFinishId = input.interior_finish_id;
  if (input.hardware_id !== undefined) patch.hardwareId = input.hardware_id;
  if (input.build !== undefined) patch.build = buildPatchFromInput(input.build);
  return patch;
}

function buildPatchFromInput(input: z.infer<typeof buildInputSchema>): Partial<CabinetBuildConfig> {
  const patch: Partial<CabinetBuildConfig> = {};
  if (input.construction !== undefined) patch.construction = input.construction;
  if (input.carcass_thickness_inches !== undefined) {
    patch.carcassThickness = inchesToSixteenths(input.carcass_thickness_inches);
  }
  if (input.back_thickness_inches !== undefined) {
    patch.backThickness = inchesToSixteenths(input.back_thickness_inches);
  }
  if (input.shelf_thickness_inches !== undefined) {
    patch.shelfThickness = inchesToSixteenths(input.shelf_thickness_inches);
  }
  if (input.face_frame_width_inches !== undefined) {
    patch.faceFrameWidth = inchesToSixteenths(input.face_frame_width_inches);
  }
  if (input.front_layout !== undefined) patch.frontLayout = input.front_layout;
  if (input.drawer_count !== undefined) patch.drawerCount = input.drawer_count;
  if (input.shelf_count !== undefined) patch.shelfCount = input.shelf_count;
  if (input.shelf_layout !== undefined) patch.shelfLayout = input.shelf_layout;
  if (input.shelf_elevations_inches !== undefined) {
    patch.shelfElevations = input.shelf_elevations_inches.map(inchesToSixteenths);
  }
  if (input.include_hardware !== undefined) patch.includeHardware = input.include_hardware;
  if (input.hardware_placement !== undefined) {
    patch.hardwarePlacement = input.hardware_placement;
  }
  if (input.left_finished_end !== undefined) {
    patch.leftFinishedEnd = input.left_finished_end;
  }
  if (input.right_finished_end !== undefined) {
    patch.rightFinishedEnd = input.right_finished_end;
  }
  if (input.toe_kick_height_inches !== undefined) {
    patch.toeKickHeight = inchesToSixteenths(input.toe_kick_height_inches);
  }
  if (input.drawer_slide_id !== undefined) patch.drawerSlideId = input.drawer_slide_id;
  if (input.hinge_id !== undefined) patch.hingeId = input.hinge_id;
  if (input.toe_kick_depth_inches !== undefined) {
    patch.toeKickDepth = inchesToSixteenths(input.toe_kick_depth_inches);
  }
  return patch;
}

function commandPayload(result: SceneCommandResult) {
  return { ...result, revision: useProjectStore.getState().project.revision };
}

function previewPayload(preview: ScenePreview | null) {
  if (!preview) throw new Error('Scene preview is not available');
  return {
    token: preview.token,
    kind: preview.kind,
    expectedRevision: preview.expectedRevision,
    valid: preview.valid,
    messages: preview.messages,
    cabinets: preview.cabinets,
    builtInElements: preview.builtInElements,
    removedBuiltInElementIds: preview.removedBuiltInElementIds,
    snapGuides: preview.snapGuides,
  };
}

function requireRevision(project: RoomProject, expectedRevision: number): void {
  if (project.revision !== expectedRevision) {
    throw new Error(
      `Stale project revision: expected ${expectedRevision}, current ${project.revision}`,
    );
  }
}

function requireWall(project: RoomProject, wallId: string) {
  const wall = project.walls.find((candidate) => candidate.id === wallId);
  if (!wall) throw new Error(`Unknown wall: ${wallId}`);
  return wall;
}

function requireEntity(project: RoomProject, entityId: string): void {
  const exists =
    project.cabinets.some((entity) => entity.id === entityId) ||
    project.builtInElements.some((entity) => entity.id === entityId) ||
    project.openings.some((entity) => entity.id === entityId) ||
    project.appliances.some((entity) => entity.id === entityId);
  if (!exists) throw new Error(`Scene entity not found: ${entityId}`);
}

function allAutoFitProposals(project: RoomProject) {
  return project.walls.flatMap((wall) =>
    (['base', 'wall'] as const).flatMap((targetCategory) =>
      generateAutoFitProposals({
        project,
        wallId: wall.id,
        wallLength: wall.length,
        targetCategory,
      }),
    ),
  );
}

function measurementPointFromInput(
  project: RoomProject,
  input: z.infer<typeof measurementPointSchema>,
) {
  const wall = requireWall(project, input.wall_id);
  const offsetX = inchesToSixteenths(input.offset_inches);
  const elevation = inchesToSixteenths(input.elevation_inches);
  return {
    world: wallLocalToWorld(wall, { offsetX, elevation, depthOffset: 0 }),
    wallId: wall.id,
    wallOffset: offsetX,
  };
}

function summarizeOutput(output: unknown): string {
  if (typeof output === 'string') return output;
  if (output && typeof output === 'object' && 'message' in output) {
    return String((output as { message: unknown }).message);
  }
  return 'Completed successfully';
}
