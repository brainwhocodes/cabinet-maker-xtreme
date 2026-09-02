'use client';

import {
  Edges,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Html,
  Line,
  OrbitControls,
} from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { MOUSE, Plane, Vector3 } from 'three';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { FINISH_OPTIONS, getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import {
  type Appliance,
  type BoundingBox3D,
  type BuiltInElement,
  type CabinetInstance,
  getCabinetBoundingBox,
  type Opening,
  type Wall,
} from '@/domain/geometry/models';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import {
  formatFractionalInches,
  inchesToSixteenths,
  sixteenthsToInches,
  sixteenthsToThreeUnits,
} from '@/domain/geometry/units';
import {
  getWallRotationRadians,
  getWorldBoundingBox,
  wallLocalToWorld,
  worldToWallLocal,
} from '@/domain/geometry/wall-transform';
import { registerPlannerCaptureHandle } from '@/rendering/screenshots/capture-canvas';
import {
  SHARED_UNIT_BOX_GEOMETRY,
  SHARED_UNIT_CYLINDER_GEOMETRY,
} from '@/rendering/shared-geometries';
import { type Measurement, useProjectStore } from '@/state/project-store';

function CabinetMeshGroup({
  cabinet,
  wall,
  isSelected,
  onSelect,
  onMoveStatus,
  showLabel,
  showDimensions = false,
  frontCutaway,
  clippingPlanes,
  isGhost = false,
}: {
  cabinet: CabinetInstance;
  wall: Wall;
  isSelected: boolean;
  onSelect?: (id: string, mode: 'replace' | 'toggle') => void;
  onMoveStatus?(message: string): void;
  showLabel: boolean;
  showDimensions?: boolean;
  frontCutaway: boolean;
  clippingPlanes: Plane[];
  isGhost?: boolean;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    grabOffset: number;
    grabElevation: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const dragPlane = useMemo(() => new Plane(), []);
  const dragPlaneNormal = useMemo(() => new Vector3(), []);
  const dragPlaneOrigin = useMemo(() => new Vector3(), []);
  const dragHitPoint = useMemo(() => new Vector3(), []);
  const {
    selectedEntityIds,
    navigationTool,
    startSceneMovePreview,
    updateScenePreview,
    commitScenePreview,
    cancelScenePreview,
  } = useProjectStore();
  const definition = getCabinetDefinitionByCode(cabinet.definitionId);
  if (!definition) return null;

  const model = buildCabinetParts(resolveCabinetSpec(definition, cabinet));
  const outerColor = isGhost ? '#60A5FA' : model.finish.colorHex;
  const innerColor = isGhost ? '#93C5FD' : model.interiorFinish.colorHex;
  const finishOpacity = isGhost ? 0.6 : 1;
  const interiorOpacity = isGhost ? 0.5 : 1;
  const hardwareOpacity = isGhost ? 0.5 : 1;
  const visibleParts =
    frontCutaway && isSelected
      ? model.parts.filter(
          (part) =>
            part.category !== 'door' && part.category !== 'drawer' && part.category !== 'hardware',
        )
      : model.parts;

  const cancelDrag = () => {
    if (dragRef.current?.dragging) {
      cancelScenePreview();
      onMoveStatus?.('Move cancelled');
    }
    dragRef.current = null;
  };

  return (
    <group
      position={[
        sixteenthsToThreeUnits(cabinet.offsetX),
        sixteenthsToThreeUnits(cabinet.elevation),
        0,
      ]}
      onClick={(event) => {
        if (navigationTool !== 'select') return;
        event.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onSelect?.(cabinet.id, event.ctrlKey || event.metaKey ? 'toggle' : 'replace');
      }}
      onPointerDown={(event) => {
        if (isGhost || navigationTool !== 'select') return;
        event.stopPropagation();
        onSelect?.(cabinet.id, event.ctrlKey || event.metaKey ? 'toggle' : 'replace');
        const local = worldToWallLocal(wall, {
          x: inchesToSixteenths(event.point.x),
          y: inchesToSixteenths(event.point.y),
          z: inchesToSixteenths(event.point.z),
        });
        dragRef.current = {
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          grabOffset: local.offsetX - cabinet.offsetX,
          grabElevation: local.elevation - cabinet.elevation,
          dragging: false,
        };
        (event.target as unknown as Element).setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || isGhost) return;
        const distance = Math.hypot(
          event.clientX - drag.startClientX,
          event.clientY - drag.startClientY,
        );
        if (!drag.dragging && distance < 4) return;
        if (!drag.dragging) {
          const ids = selectedEntityIds.includes(cabinet.id) ? selectedEntityIds : [cabinet.id];
          const started = startSceneMovePreview(ids, 0, 0, true);
          if (!started.ok) {
            onMoveStatus?.(started.message);
            dragRef.current = null;
            return;
          }
          drag.dragging = true;
          suppressClickRef.current = true;
        }

        const rotation = getWallRotationRadians(wall);
        dragPlane.setFromNormalAndCoplanarPoint(
          dragPlaneNormal.set(Math.sin(rotation), 0, Math.cos(rotation)),
          dragPlaneOrigin.set(
            sixteenthsToInches(wall.start.x),
            0,
            sixteenthsToInches(wall.start.y),
          ),
        );
        const hit = event.ray.intersectPlane(dragPlane, dragHitPoint);
        if (!hit) return;
        const local = worldToWallLocal(wall, {
          x: inchesToSixteenths(hit.x),
          y: inchesToSixteenths(hit.y),
          z: inchesToSixteenths(hit.z),
        });
        updateScenePreview(
          wall.id,
          local.offsetX - drag.grabOffset,
          local.elevation - drag.grabElevation,
          true,
        );
        onMoveStatus?.('Move preview updated');
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
        if (drag.dragging) {
          const preview = useProjectStore.getState().scenePreview;
          const result = preview
            ? commitScenePreview(preview.token, preview.expectedRevision)
            : { ok: false, message: 'Move preview unavailable' };
          if (!result.ok) cancelScenePreview();
          onMoveStatus?.(result.message);
        }
        dragRef.current = null;
      }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
    >
      <mesh
        position={[model.widthInches / 2, model.heightInches / 2, model.depthInches / 2]}
        geometry={SHARED_UNIT_BOX_GEOMETRY}
        scale={[model.widthInches, model.heightInches, model.depthInches]}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {visibleParts.map((part) => {
        const isFinish = part.materialRole === 'finish';
        const isHardware = part.materialRole === 'hardware';
        const rotation = part.rotationDegrees?.map((degrees) => (degrees * Math.PI) / 180) as
          | [number, number, number]
          | undefined;
        const isCylinder = part.primitive === 'cylinder';
        const scale: [number, number, number] = isCylinder
          ? [
              (part.radiusInches ?? part.widthInches / 2) * 2,
              part.heightInches,
              (part.radiusInches ?? part.widthInches / 2) * 2,
            ]
          : [part.widthInches, part.heightInches, part.depthInches];

        return (
          <mesh
            key={part.id}
            position={part.positionInches}
            rotation={rotation}
            geometry={isCylinder ? SHARED_UNIT_CYLINDER_GEOMETRY : SHARED_UNIT_BOX_GEOMETRY}
            scale={scale}
            castShadow
            receiveShadow
            raycast={() => null}
          >
            {isFinish ? (
              <meshStandardMaterial
                color={outerColor}
                roughness={model.finish.roughness}
                transparent={isGhost}
                opacity={finishOpacity}
                clippingPlanes={clippingPlanes}
              />
            ) : isHardware ? (
              <meshStandardMaterial
                color={model.hardware.colorHex}
                metalness={model.hardware.metalness}
                roughness={0.2}
                transparent={isGhost}
                opacity={hardwareOpacity}
                clippingPlanes={clippingPlanes}
              />
            ) : (
              <meshStandardMaterial
                color={innerColor}
                roughness={model.interiorFinish.roughness}
                transparent={isGhost}
                opacity={interiorOpacity}
                clippingPlanes={clippingPlanes}
              />
            )}
          </mesh>
        );
      })}

      {isSelected && (
        <mesh
          position={[model.widthInches / 2, model.heightInches / 2, model.depthInches / 2]}
          geometry={SHARED_UNIT_BOX_GEOMETRY}
          scale={[model.widthInches + 0.5, model.heightInches + 0.5, model.depthInches + 0.5]}
          raycast={() => null}
        >
          <meshBasicMaterial
            color="#38BDF8"
            transparent
            opacity={0.06}
            depthWrite={false}
            clippingPlanes={clippingPlanes}
          />
          <Edges color="#38BDF8" threshold={15} />
        </mesh>
      )}

      {isSelected && showDimensions && (
        <>
          <Html
            position={[model.widthInches / 2, -2.5, model.depthInches + 1]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="planner-3d-dim-badge is-width" aria-hidden="true">
              <span>{formatFractionalInches(inchesToSixteenths(model.widthInches))} W</span>
            </div>
          </Html>
          <Html
            position={[-3, model.heightInches / 2, model.depthInches / 2]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="planner-3d-dim-badge is-height" aria-hidden="true">
              <span>{formatFractionalInches(inchesToSixteenths(model.heightInches))} H</span>
            </div>
          </Html>
        </>
      )}

      {showLabel && (
        <Html
          position={[model.widthInches / 2, model.heightInches + 3, model.depthInches / 2]}
          center
        >
          <span className={`planner-scene-label ${isSelected ? 'is-selected' : ''}`}>
            {cabinet.definitionId}
          </span>
        </Html>
      )}
    </group>
  );
}

function OpeningMesh({
  opening,
  isSelected,
  showLabel,
  clippingPlanes,
  onSelect,
}: {
  opening: Opening;
  isSelected: boolean;
  showLabel: boolean;
  clippingPlanes: Plane[];
  onSelect(id: string, mode: 'replace' | 'toggle'): void;
}) {
  const { navigationTool } = useProjectStore();
  const width = sixteenthsToInches(opening.width);
  const height = sixteenthsToInches(opening.height);
  const depth = Math.max(0.5, sixteenthsToInches(opening.depth));
  return (
    <group
      position={[sixteenthsToInches(opening.offsetX), sixteenthsToInches(opening.elevation), 0]}
      onClick={(event) => {
        if (navigationTool !== 'select') return;
        event.stopPropagation();
        onSelect(opening.id, event.ctrlKey || event.metaKey ? 'toggle' : 'replace');
      }}
    >
      <mesh
        position={[width / 2, height / 2, depth / 2]}
        geometry={SHARED_UNIT_BOX_GEOMETRY}
        scale={[width, height, depth]}
      >
        <meshStandardMaterial
          color="#B7D5E8"
          transparent
          opacity={0.35}
          roughness={0.8}
          clippingPlanes={clippingPlanes}
        />
        <Edges color={isSelected ? '#E56A2F' : '#2D5F9A'} />
      </mesh>
      {showLabel && (
        <Html position={[width / 2, height + 2, depth / 2]} center>
          <span className="planner-scene-label is-opening">{opening.name}</span>
        </Html>
      )}
    </group>
  );
}

function ApplianceMesh({
  appliance,
  isSelected,
  showLabel,
  clippingPlanes,
  onSelect,
}: {
  appliance: Appliance;
  isSelected: boolean;
  showLabel: boolean;
  clippingPlanes: Plane[];
  onSelect(id: string, mode: 'replace' | 'toggle'): void;
}) {
  const { navigationTool } = useProjectStore();
  const width = sixteenthsToInches(appliance.width);
  const height = sixteenthsToInches(appliance.height);
  const depth = sixteenthsToInches(appliance.depth);
  return (
    <group
      position={[sixteenthsToInches(appliance.offsetX), sixteenthsToInches(appliance.elevation), 0]}
      onClick={(event) => {
        if (navigationTool !== 'select') return;
        event.stopPropagation();
        onSelect(appliance.id, event.ctrlKey || event.metaKey ? 'toggle' : 'replace');
      }}
    >
      <mesh
        position={[width / 2, height / 2, depth / 2]}
        geometry={SHARED_UNIT_BOX_GEOMETRY}
        scale={[width, height, depth]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#8794A3"
          metalness={0.35}
          roughness={0.5}
          clippingPlanes={clippingPlanes}
        />
        <Edges color={isSelected ? '#E56A2F' : '#485665'} />
      </mesh>
      {showLabel && (
        <Html position={[width / 2, height + 2, depth / 2]} center>
          <span className="planner-scene-label is-appliance">{appliance.name}</span>
        </Html>
      )}
    </group>
  );
}

function BuiltInElementMesh({
  element,
  wall,
  isSelected,
  onSelect,
  onMoveStatus,
  showLabel,
  clippingPlanes,
  isGhost = false,
}: {
  element: BuiltInElement;
  wall: Wall;
  isSelected: boolean;
  onSelect?: (id: string, mode: 'replace' | 'toggle') => void;
  onMoveStatus?(message: string): void;
  showLabel: boolean;
  clippingPlanes: Plane[];
  isGhost?: boolean;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    grabOffset: number;
    grabElevation: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const dragPlane = useMemo(() => new Plane(), []);
  const dragPlaneNormal = useMemo(() => new Vector3(), []);
  const dragPlaneOrigin = useMemo(() => new Vector3(), []);
  const dragHitPoint = useMemo(() => new Vector3(), []);
  const {
    selectedEntityIds,
    navigationTool,
    startSceneMovePreview,
    updateScenePreview,
    commitScenePreview,
    cancelScenePreview,
  } = useProjectStore();
  const width = sixteenthsToInches(element.width);
  const height = sixteenthsToInches(element.height);
  const depth = sixteenthsToInches(element.depth);
  const finish = FINISH_OPTIONS.find((option) => option.id === element.finishId);

  const cancelDrag = () => {
    if (dragRef.current?.dragging) {
      cancelScenePreview();
      onMoveStatus?.('Move cancelled');
    }
    dragRef.current = null;
  };

  return (
    <group
      position={[
        sixteenthsToInches(element.offsetX),
        sixteenthsToInches(element.elevation),
        sixteenthsToInches(element.depthOffset),
      ]}
      onClick={(event) => {
        if (navigationTool !== 'select') return;
        event.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onSelect?.(element.id, event.ctrlKey || event.metaKey ? 'toggle' : 'replace');
      }}
      onPointerDown={(event) => {
        if (isGhost || navigationTool !== 'select') return;
        event.stopPropagation();
        onSelect?.(element.id, event.ctrlKey || event.metaKey ? 'toggle' : 'replace');
        const local = worldToWallLocal(wall, {
          x: inchesToSixteenths(event.point.x),
          y: inchesToSixteenths(event.point.y),
          z: inchesToSixteenths(event.point.z),
        });
        dragRef.current = {
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          grabOffset: local.offsetX - element.offsetX,
          grabElevation: local.elevation - element.elevation,
          dragging: false,
        };
        (event.target as unknown as Element).setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || isGhost) return;
        const distance = Math.hypot(
          event.clientX - drag.startClientX,
          event.clientY - drag.startClientY,
        );
        if (!drag.dragging && distance < 4) return;
        if (!drag.dragging) {
          const ids = selectedEntityIds.includes(element.id) ? selectedEntityIds : [element.id];
          const started = startSceneMovePreview(ids, 0, 0, true);
          if (!started.ok) {
            onMoveStatus?.(started.message);
            dragRef.current = null;
            return;
          }
          drag.dragging = true;
          suppressClickRef.current = true;
        }
        const rotation = getWallRotationRadians(wall);
        dragPlane.setFromNormalAndCoplanarPoint(
          dragPlaneNormal.set(Math.sin(rotation), 0, Math.cos(rotation)),
          dragPlaneOrigin.set(
            sixteenthsToInches(wall.start.x),
            0,
            sixteenthsToInches(wall.start.y),
          ),
        );
        const hit = event.ray.intersectPlane(dragPlane, dragHitPoint);
        if (!hit) return;
        const local = worldToWallLocal(wall, {
          x: inchesToSixteenths(hit.x),
          y: inchesToSixteenths(hit.y),
          z: inchesToSixteenths(hit.z),
        });
        updateScenePreview(
          wall.id,
          local.offsetX - drag.grabOffset,
          local.elevation - drag.grabElevation,
          true,
        );
        onMoveStatus?.('Move preview updated');
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
        if (drag.dragging) {
          const preview = useProjectStore.getState().scenePreview;
          const result = preview
            ? commitScenePreview(preview.token, preview.expectedRevision)
            : { ok: false, message: 'Move preview unavailable' };
          if (!result.ok) cancelScenePreview();
          onMoveStatus?.(result.message);
        }
        dragRef.current = null;
      }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
    >
      <mesh
        position={[width / 2, height / 2, depth / 2]}
        geometry={SHARED_UNIT_BOX_GEOMETRY}
        scale={[width, height, depth]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={isGhost ? '#60A5FA' : (finish?.colorHex ?? '#D6DCE4')}
          roughness={finish?.roughness ?? 0.65}
          transparent={isGhost}
          opacity={isGhost ? 0.55 : 1}
          clippingPlanes={clippingPlanes}
        />
        <Edges color={isSelected ? '#E56A2F' : '#5B6673'} />
      </mesh>
      {showLabel && (
        <Html position={[width / 2, height + 1.5, depth / 2]} center>
          <span className="planner-scene-label">{element.name}</span>
        </Html>
      )}
    </group>
  );
}

interface WallSceneGroupProps {
  wall: Wall;
  cabinets: CabinetInstance[];
  openings: Opening[];
  appliances: Appliance[];
  builtInElements: BuiltInElement[];
  ghostCabinets: CabinetInstance[];
  ghostBuiltInElements: BuiltInElement[];
  selectedEntityIds: ReadonlySet<string>;
  showDimensions: boolean;
  showLabels: boolean;
  frontCutaway: boolean;
  clippingPlanes: Plane[];
  onSelectEntity(id: string, mode: 'replace' | 'toggle'): void;
  onClearSelection(): void;
  onMoveStatus(message: string): void;
}

function WallSceneGroup({
  wall,
  cabinets,
  openings,
  appliances,
  builtInElements,
  ghostCabinets,
  ghostBuiltInElements,
  selectedEntityIds,
  showDimensions,
  showLabels,
  frontCutaway,
  clippingPlanes,
  onSelectEntity,
  onClearSelection,
  onMoveStatus,
}: WallSceneGroupProps) {
  const {
    scenePreview,
    measureMode,
    updateScenePreview,
    commitScenePreview,
    cancelScenePreview,
    addMeasurementPoint,
  } = useProjectStore();
  const wallLength = sixteenthsToInches(wall.length);
  const wallHeight = sixteenthsToInches(wall.height);
  const wallThickness = sixteenthsToInches(wall.thickness);

  const updatePlacementAtPoint = (point: Vector3) => {
    if (scenePreview?.kind !== 'placement') return;
    const local = worldToWallLocal(wall, {
      x: inchesToSixteenths(point.x),
      y: inchesToSixteenths(point.y),
      z: inchesToSixteenths(point.z),
    });
    updateScenePreview(wall.id, local.offsetX, local.elevation, true);
  };

  return (
    <group
      name={`wall-group-${wall.id}`}
      position={[sixteenthsToInches(wall.start.x), 0, sixteenthsToInches(wall.start.y)]}
      rotation={[0, getWallRotationRadians(wall), 0]}
    >
      <mesh
        position={[wallLength / 2, wallHeight / 2, -wallThickness / 2]}
        receiveShadow
        onPointerMove={(event) => updatePlacementAtPoint(event.point)}
        onClick={(event) => {
          event.stopPropagation();
          if (measureMode) {
            const local = worldToWallLocal(wall, {
              x: inchesToSixteenths(event.point.x),
              y: inchesToSixteenths(event.point.y),
              z: inchesToSixteenths(event.point.z),
            });
            const offsetX = Math.round(local.offsetX / 8) * 8;
            const elevation = Math.round(local.elevation / 8) * 8;
            const world = wallLocalToWorld(wall, {
              offsetX,
              elevation,
              depthOffset: 0,
            });
            const result = addMeasurementPoint({
              world,
              wallId: wall.id,
              wallOffset: offsetX,
            });
            onMoveStatus(result.message);
            return;
          }
          const preview = useProjectStore.getState().scenePreview;
          if (preview?.kind === 'placement') {
            updatePlacementAtPoint(event.point);
            const current = useProjectStore.getState().scenePreview;
            if (!current) return;
            const result = commitScenePreview(current.token, current.expectedRevision);
            if (!result.ok) cancelScenePreview();
            onMoveStatus(result.message);
          } else {
            onClearSelection();
          }
        }}
      >
        <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#E8ECF1" roughness={0.9} clippingPlanes={clippingPlanes} />
      </mesh>

      {openings.map((opening) => (
        <OpeningMesh
          key={opening.id}
          opening={opening}
          isSelected={selectedEntityIds.has(opening.id)}
          showLabel={showLabels}
          clippingPlanes={clippingPlanes}
          onSelect={onSelectEntity}
        />
      ))}
      {appliances.map((appliance) => (
        <ApplianceMesh
          key={appliance.id}
          appliance={appliance}
          isSelected={selectedEntityIds.has(appliance.id)}
          showLabel={showLabels}
          clippingPlanes={clippingPlanes}
          onSelect={onSelectEntity}
        />
      ))}
      {cabinets.map((cabinet) => (
        <CabinetMeshGroup
          key={cabinet.id}
          cabinet={cabinet}
          wall={wall}
          isSelected={selectedEntityIds.has(cabinet.id)}
          showLabel={showLabels}
          showDimensions={showDimensions}
          frontCutaway={frontCutaway}
          clippingPlanes={clippingPlanes}
          onSelect={onSelectEntity}
          onMoveStatus={onMoveStatus}
        />
      ))}
      {builtInElements.map((element) => (
        <BuiltInElementMesh
          key={element.id}
          element={element}
          wall={wall}
          isSelected={selectedEntityIds.has(element.id)}
          showLabel={showLabels}
          clippingPlanes={clippingPlanes}
          onSelect={onSelectEntity}
          onMoveStatus={onMoveStatus}
        />
      ))}
      {ghostCabinets.map((cabinet) => (
        <CabinetMeshGroup
          key={`ghost-${cabinet.id}`}
          cabinet={cabinet}
          wall={wall}
          isSelected={false}
          showLabel={false}
          frontCutaway={false}
          clippingPlanes={clippingPlanes}
          isGhost
        />
      ))}
      {ghostBuiltInElements.map((element) => (
        <BuiltInElementMesh
          key={`ghost-${element.id}`}
          element={element}
          wall={wall}
          isSelected={false}
          showLabel={false}
          clippingPlanes={clippingPlanes}
          isGhost
        />
      ))}

      {scenePreview?.snapGuides.map((guide) =>
        guide.axis === 'offset' ? (
          <mesh
            key={`${guide.axis}-${guide.value}-${guide.source}-${guide.sourceId ?? ''}`}
            position={[sixteenthsToInches(guide.value), wallHeight / 2, 2]}
          >
            <boxGeometry args={[0.08, wallHeight, 0.08]} />
            <meshBasicMaterial color="#E56A2F" clippingPlanes={clippingPlanes} />
          </mesh>
        ) : (
          <mesh
            key={`${guide.axis}-${guide.value}-${guide.source}-${guide.sourceId ?? ''}`}
            position={[wallLength / 2, sixteenthsToInches(guide.value), 2]}
          >
            <boxGeometry args={[wallLength, 0.08, 0.08]} />
            <meshBasicMaterial color="#E56A2F" clippingPlanes={clippingPlanes} />
          </mesh>
        ),
      )}

      {showDimensions && (
        <Html position={[wallLength / 2, -4, 2]} center>
          <span className="planner-scene-label is-dimension">
            {wall.name}: {formatFractionalInches(wall.length)}
          </span>
        </Html>
      )}
    </group>
  );
}

function MeasurementLine({ measurement }: { measurement: Measurement }) {
  const start: [number, number, number] = [
    sixteenthsToInches(measurement.start.world.x),
    sixteenthsToInches(measurement.start.world.y),
    sixteenthsToInches(measurement.start.world.z),
  ];
  const end: [number, number, number] = [
    sixteenthsToInches(measurement.end.world.x),
    sixteenthsToInches(measurement.end.world.y),
    sixteenthsToInches(measurement.end.world.z),
  ];
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  return (
    <group>
      <Line points={[start, end]} color="#E56A2F" lineWidth={1.5} />
      <Line
        points={[
          [start[0], start[1] - 1.5, start[2]],
          [start[0], start[1] + 1.5, start[2]],
        ]}
        color="#E56A2F"
        lineWidth={1}
      />
      <Line
        points={[
          [end[0], end[1] - 1.5, end[2]],
          [end[0], end[1] + 1.5, end[2]],
        ]}
        color="#E56A2F"
        lineWidth={1}
      />
      <Html position={midpoint} center>
        <span className="planner-scene-label is-dimension">
          {measurement.name}: {Number(measurement.distanceInches.toFixed(4))}&quot;
        </span>
      </Html>
    </group>
  );
}

interface CameraRigProps {
  roomWidth: number;
  roomHeight: number;
  roomLength: number;
  activeWall?: Wall;
  selectedWorldBounds?: BoundingBox3D;
  selectedWall?: Wall;
  viewMode: 'perspective' | 'top' | 'elevation';
  controlsEnabled: boolean;
  onOrbitChange?: (isOrbiting: boolean, target: [number, number, number]) => void;
}

function CameraRig({
  roomWidth,
  roomHeight,
  roomLength,
  activeWall,
  selectedWorldBounds,
  selectedWall,
  viewMode,
  controlsEnabled,
  onOrbitChange,
}: CameraRigProps) {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { cameraPreset, cameraTransitionToken, navigationTool } = useProjectStore();

  const activeWallRef = useRef(activeWall);
  activeWallRef.current = activeWall;
  const selectedWorldBoundsRef = useRef(selectedWorldBounds);
  selectedWorldBoundsRef.current = selectedWorldBounds;
  const selectedWallRef = useRef(selectedWall);
  selectedWallRef.current = selectedWall;
  const cameraPresetRef = useRef(cameraPreset);
  cameraPresetRef.current = cameraPreset;

  const isTransitioningRef = useRef(false);
  const transitionProgressRef = useRef(0);
  const startPosRef = useRef(new Vector3());
  const targetPosRef = useRef(new Vector3());
  const startTargetRef = useRef(new Vector3());
  const targetLookAtRef = useRef(new Vector3());
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (cameraTransitionToken < 0) return;
    const currentPreset = cameraPresetRef.current;
    const currentWall = activeWallRef.current;
    const currentBounds = selectedWorldBoundsRef.current;
    const currentSelectedWall = selectedWallRef.current;

    let target: [number, number, number] = [roomWidth / 2, roomHeight / 3, roomLength / 2];
    let position: [number, number, number] = [roomWidth + 65, roomHeight + 25, roomLength + 90];

    if (viewMode === 'top') {
      target = [roomWidth / 2, 0, roomLength / 2];
      position = [roomWidth / 2, Math.max(roomWidth, roomLength) * 1.5 + 40, roomLength / 2];
    } else if (viewMode === 'elevation' || currentPreset === 'wall') {
      if (currentWall) {
        const wallCenter = wallLocalToWorld(currentWall, {
          offsetX: currentWall.length / 2,
          elevation: currentWall.height / 2,
          depthOffset: 0,
        });
        target = [
          sixteenthsToInches(wallCenter.x),
          sixteenthsToInches(wallCenter.y),
          sixteenthsToInches(wallCenter.z),
        ];
        const rotation = getWallRotationRadians(currentWall);
        const distance = Math.max(sixteenthsToInches(currentWall.length) * 1.1, 140);
        position = [
          target[0] + Math.sin(rotation) * distance,
          target[1],
          target[2] + Math.cos(rotation) * distance,
        ];
      }
    } else if (currentPreset === 'selection' && currentBounds && currentSelectedWall) {
      target = [
        sixteenthsToInches((currentBounds.min.x + currentBounds.max.x) / 2),
        sixteenthsToInches((currentBounds.min.y + currentBounds.max.y) / 2),
        sixteenthsToInches((currentBounds.min.z + currentBounds.max.z) / 2),
      ];
      const rotation = getWallRotationRadians(currentSelectedWall);
      position = [
        target[0] + Math.sin(rotation) * 80 + 20,
        target[1] + 35,
        target[2] + Math.cos(rotation) * 80 + 35,
      ];
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      camera.position.set(...position);
      camera.lookAt(...target);
      controlsRef.current?.target.set(...target);
      controlsRef.current?.update();
      invalidate();
      return;
    }

    startPosRef.current.copy(camera.position);
    targetPosRef.current.set(...position);
    startTargetRef.current.copy(
      controlsRef.current?.target ?? new Vector3(roomWidth / 2, roomHeight / 3, roomLength / 2),
    );
    targetLookAtRef.current.set(...target);
    transitionProgressRef.current = 0;
    isTransitioningRef.current = true;
    invalidate();
  }, [camera, cameraTransitionToken, invalidate, roomHeight, roomLength, roomWidth, viewMode]);

  useFrame((_, delta) => {
    if (isTransitioningRef.current) {
      transitionProgressRef.current += delta * 3.2;
      const t = Math.min(1, transitionProgressRef.current);
      const ease = 1 - (1 - t) ** 3;

      camera.position.lerpVectors(startPosRef.current, targetPosRef.current, ease);
      const currentTarget = new Vector3().lerpVectors(
        startTargetRef.current,
        targetLookAtRef.current,
        ease,
      );
      controlsRef.current?.target.copy(currentTarget);
      controlsRef.current?.update();
      invalidate();

      if (t >= 1) {
        isTransitioningRef.current = false;
      }
    } else if (controlsRef.current?.update()) {
      invalidate();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={controlsEnabled}
      enableDamping={true}
      dampingFactor={0.08}
      rotateSpeed={0.9}
      panSpeed={0.9}
      zoomSpeed={1.1}
      minDistance={12}
      maxDistance={450}
      enableRotate={viewMode === 'perspective' && navigationTool === 'orbit'}
      enablePan={navigationTool === 'pan'}
      enableZoom={true}
      mouseButtons={{
        LEFT:
          navigationTool === 'orbit'
            ? MOUSE.ROTATE
            : navigationTool === 'pan'
              ? MOUSE.PAN
              : navigationTool === 'zoom'
                ? MOUSE.DOLLY
                : undefined,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      maxPolarAngle={viewMode === 'top' ? 0.01 : Math.PI / 2 - 0.02}
      minPolarAngle={viewMode === 'top' ? 0 : 0.05}
      onStart={() => {
        if (controlsRef.current) {
          const tgt = controlsRef.current.target;
          onOrbitChange?.(true, [tgt.x, tgt.y, tgt.z]);
        }
      }}
      onEnd={() => {
        if (controlsRef.current) {
          const tgt = controlsRef.current.target;
          onOrbitChange?.(false, [tgt.x, tgt.y, tgt.z]);
        }
      }}
      onChange={() => {
        invalidate();
        if (controlsRef.current) {
          const tgt = controlsRef.current.target;
          onOrbitChange?.(true, [tgt.x, tgt.y, tgt.z]);
        }
      }}
    />
  );
}

function OrbitReticle({
  visible,
  position,
}: {
  visible: boolean;
  position: [number, number, number];
}) {
  if (!visible) return null;
  return (
    <group position={position}>
      <Html center style={{ pointerEvents: 'none' }}>
        <div className="planner-orbit-reticle" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <title>Orbit Reticle</title>
            <circle
              cx="18"
              cy="18"
              r="12"
              stroke="rgba(96, 165, 250, 0.75)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle cx="18" cy="18" r="2.5" fill="rgba(96, 165, 250, 0.9)" />
            <line
              x1="18"
              y1="2"
              x2="18"
              y2="8"
              stroke="rgba(96, 165, 250, 0.85)"
              strokeWidth="1.5"
            />
            <line
              x1="18"
              y1="28"
              x2="18"
              y2="34"
              stroke="rgba(96, 165, 250, 0.85)"
              strokeWidth="1.5"
            />
            <line
              x1="2"
              y1="18"
              x2="8"
              y2="18"
              stroke="rgba(96, 165, 250, 0.85)"
              strokeWidth="1.5"
            />
            <line
              x1="28"
              y1="18"
              x2="34"
              y2="18"
              stroke="rgba(96, 165, 250, 0.85)"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </Html>
    </group>
  );
}

function PlannerCaptureRegistrar({
  setIncludeTransientPreview,
}: {
  setIncludeTransientPreview(include: boolean): void;
}) {
  const { gl, invalidate } = useThree();
  useEffect(
    () =>
      registerPlannerCaptureHandle({
        canvas: gl.domElement,
        prepareFrame: async (includeTransientPreview) => {
          setIncludeTransientPreview(includeTransientPreview);
          await nextAnimationFrame();
          invalidate();
          await nextAnimationFrame();
        },
        restoreFrame: () => {
          setIncludeTransientPreview(true);
          requestAnimationFrame(() => invalidate());
        },
      }),
    [gl, invalidate, setIncludeTransientPreview],
  );
  return null;
}

function SceneContent({
  onMoveStatus,
  includeTransientPreview,
  onOrbitChange,
  orbitTarget,
  isOrbiting,
}: {
  onMoveStatus(message: string): void;
  includeTransientPreview: boolean;
  onOrbitChange?(isOrbiting: boolean, target: [number, number, number]): void;
  orbitTarget: [number, number, number];
  isOrbiting: boolean;
}) {
  const {
    project,
    selectedEntityIds,
    primarySelectedEntityId,
    selectSceneEntity,
    clearSceneSelection,
    scenePreview,
    hiddenEntityIds,
    isolationEntityIds,
    showSceneLabels,
    measurements,
    sectionMode,
    sectionOffset,
    viewMode,
    showDimensions,
  } = useProjectStore();
  const selectedCabinet = project.cabinets.find(
    (cabinet) => cabinet.id === primarySelectedEntityId,
  );
  const selectedEntity =
    selectedCabinet ??
    project.builtInElements.find((entity) => entity.id === primarySelectedEntityId) ??
    project.openings.find((entity) => entity.id === primarySelectedEntityId) ??
    project.appliances.find((entity) => entity.id === primarySelectedEntityId);
  const selectedWall = selectedEntity
    ? project.walls.find((wall) => wall.id === selectedEntity.wallId)
    : undefined;
  const selectedLocalBounds: BoundingBox3D | undefined = selectedCabinet
    ? getCabinetBoundingBox(selectedCabinet)
    : selectedEntity
      ? {
          min: {
            x: selectedEntity.offsetX,
            y: selectedEntity.elevation,
            z: 'depthOffset' in selectedEntity ? selectedEntity.depthOffset : 0,
          },
          max: {
            x: selectedEntity.offsetX + selectedEntity.width,
            y: selectedEntity.elevation + selectedEntity.height,
            z:
              ('depthOffset' in selectedEntity ? selectedEntity.depthOffset : 0) +
              selectedEntity.depth,
          },
        }
      : undefined;
  const selectedWorldBounds =
    selectedWall && selectedLocalBounds
      ? getWorldBoundingBox(selectedWall, selectedLocalBounds)
      : undefined;
  const activeWall = project.walls.find((wall) => wall.id === project.activeWallId);
  const roomWidth = sixteenthsToInches(project.width);
  const roomLength = sixteenthsToInches(project.length);
  const roomHeight = sixteenthsToInches(project.ceilingHeight);
  const clippingPlanes = useMemo(
    () =>
      sectionMode === 'room_plane'
        ? [new Plane(new Vector3(-1, 0, 0), sixteenthsToInches(sectionOffset))]
        : [],
    [sectionMode, sectionOffset],
  );
  const renderPreview =
    scenePreview?.kind === 'placement' && !scenePreview.valid && !includeTransientPreview
      ? null
      : scenePreview;
  const previewCabinetIds = new Set(renderPreview?.cabinets.map((cabinet) => cabinet.id) ?? []);
  const previewBuiltInIds = new Set(
    renderPreview?.builtInElements.map((element) => element.id) ?? [],
  );
  const isVisible = (id: string) =>
    !hiddenEntityIds.includes(id) &&
    (isolationEntityIds.length === 0 || isolationEntityIds.includes(id));

  const selectedEntityIdSet = new Set(selectedEntityIds);
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[100, 150, 100]} intensity={1.2} castShadow />
      <directionalLight position={[-100, 100, -50]} intensity={0.4} />

      <Grid
        args={[Math.max(300, roomWidth * 1.5), Math.max(300, roomLength * 1.5)]}
        cellSize={12}
        sectionSize={36}
        cellColor="#243342"
        sectionColor="#2D5F9A"
        fadeDistance={400}
        position={[roomWidth / 2, 0, roomLength / 2]}
      />

      {project.walls.map((wall) => (
        <WallSceneGroup
          key={wall.id}
          wall={wall}
          cabinets={project.cabinets.filter(
            (cabinet) =>
              cabinet.wallId === wall.id &&
              isVisible(cabinet.id) &&
              !previewCabinetIds.has(cabinet.id),
          )}
          openings={project.openings.filter(
            (opening) => opening.wallId === wall.id && isVisible(opening.id),
          )}
          appliances={project.appliances.filter(
            (appliance) => appliance.wallId === wall.id && isVisible(appliance.id),
          )}
          builtInElements={project.builtInElements.filter(
            (element) =>
              element.wallId === wall.id &&
              isVisible(element.id) &&
              !previewBuiltInIds.has(element.id),
          )}
          ghostCabinets={
            renderPreview?.cabinets.filter((cabinet) => cabinet.wallId === wall.id) ?? []
          }
          ghostBuiltInElements={
            renderPreview?.builtInElements.filter((element) => element.wallId === wall.id) ?? []
          }
          selectedEntityIds={selectedEntityIdSet}
          showDimensions={showDimensions}
          showLabels={showSceneLabels}
          frontCutaway={sectionMode === 'cabinet_front'}
          clippingPlanes={clippingPlanes}
          onSelectEntity={selectSceneEntity}
          onClearSelection={clearSceneSelection}
          onMoveStatus={onMoveStatus}
        />
      ))}

      {measurements.map((measurement) => (
        <MeasurementLine key={measurement.id} measurement={measurement} />
      ))}

      <CameraRig
        roomWidth={roomWidth}
        roomHeight={roomHeight}
        roomLength={roomLength}
        activeWall={activeWall}
        selectedWorldBounds={selectedWorldBounds}
        selectedWall={selectedWall}
        viewMode={viewMode}
        controlsEnabled={scenePreview?.kind !== 'move'}
        onOrbitChange={onOrbitChange}
      />
      <OrbitReticle visible={isOrbiting} position={orbitTarget} />
      <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
        <GizmoViewport axisColors={['#EF4444', '#10B981', '#3B82F6']} labelColor="#FFFFFF" />
      </GizmoHelper>
    </>
  );
}

function PlacementBar({ onStatus }: { onStatus(message: string): void }) {
  const {
    project,
    scenePreview,
    setActiveWall,
    updateScenePreview,
    commitScenePreview,
    cancelScenePreview,
  } = useProjectStore();
  const entity = scenePreview?.cabinets[0] ?? scenePreview?.builtInElements[0];
  const [offsetDraft, setOffsetDraft] = useState('');
  const [elevationDraft, setElevationDraft] = useState('');

  useEffect(() => {
    if (!entity) return;
    setOffsetDraft(sixteenthsToInches(entity.offsetX).toString());
    setElevationDraft(sixteenthsToInches(entity.elevation).toString());
  }, [entity]);

  if (scenePreview?.kind !== 'placement' || !entity) return null;

  const commitDrafts = () => {
    const offset = Number.parseFloat(offsetDraft);
    const elevation = Number.parseFloat(elevationDraft);
    if (!Number.isFinite(offset) || !Number.isFinite(elevation)) {
      onStatus('Enter finite placement dimensions');
      return;
    }
    updateScenePreview(
      entity.wallId,
      inchesToSixteenths(offset),
      inchesToSixteenths(elevation),
      false,
    );
  };

  const place = () => {
    commitDrafts();
    const preview = useProjectStore.getState().scenePreview;
    if (!preview) return;
    const result = commitScenePreview(preview.token, preview.expectedRevision);
    onStatus(result.message);
  };

  return (
    <section className="planner-placement-bar" aria-label="Catalog placement">
      <label>
        <span>Target wall</span>
        <select
          value={entity.wallId}
          onChange={(event) => {
            setActiveWall(event.target.value);
            updateScenePreview(event.target.value, entity.offsetX, entity.elevation, false);
          }}
        >
          {project.walls.map((wall) => (
            <option key={wall.id} value={wall.id}>
              {wall.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Offset (in)</span>
        <input
          type="number"
          step="0.0625"
          value={offsetDraft}
          onChange={(event) => setOffsetDraft(event.target.value)}
          onBlur={commitDrafts}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitDrafts();
          }}
        />
      </label>
      <label>
        <span>Elevation (in)</span>
        <input
          type="number"
          step="0.0625"
          value={elevationDraft}
          onChange={(event) => setElevationDraft(event.target.value)}
          onBlur={commitDrafts}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitDrafts();
          }}
        />
      </label>
      <div className={scenePreview.valid ? 'has-text-success' : 'has-text-danger'}>
        {scenePreview.valid
          ? scenePreview.snapGuides.length > 0
            ? `Valid, snapped to ${scenePreview.snapGuides.map((guide) => guide.source).join(', ')}`
            : 'Valid placement'
          : (scenePreview.messages[0] ?? 'Placement blocked')}
      </div>
      <button
        type="button"
        className="button is-small is-primary"
        disabled={!scenePreview.valid}
        onClick={place}
      >
        Place
      </button>
      <button
        type="button"
        className="button is-small"
        onClick={() => {
          cancelScenePreview();
          onStatus('Placement cancelled');
        }}
      >
        Cancel
      </button>
    </section>
  );
}

export function PlannerCanvas() {
  const {
    project,
    selectedEntityIds,
    undo,
    redo,
    clearSceneSelection,
    viewMode,
    startSceneMovePreview,
    updateScenePreview,
    commitScenePreview,
    cancelScenePreview,
    cancelMeasurement,
    navigationTool,
  } = useProjectStore();
  const [showControlsGuide, setShowControlsGuide] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Planner ready');
  const [includeTransientPreview, setIncludeTransientPreview] = useState(true);
  const [rendererStatus, setRendererStatus] = useState<'ready' | 'lost'>('ready');
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [orbitTarget, setOrbitTarget] = useState<[number, number, number]>([0, 0, 0]);
  const orbitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOrbitChange = (active: boolean, target: [number, number, number]) => {
    setOrbitTarget(target);
    if (active) {
      clearTimeout(orbitTimeoutRef.current!);
      setIsOrbiting(true);
      orbitTimeoutRef.current = setTimeout(() => {
        setIsOrbiting(false);
      }, 450);
    } else {
      clearTimeout(orbitTimeoutRef.current!);
      orbitTimeoutRef.current = setTimeout(() => {
        setIsOrbiting(false);
      }, 180);
    }
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleLost = (event: Event) => {
      event.preventDefault();
      setRendererStatus('lost');
      setStatus('3D context lost. Semantic controls remain available.');
    };
    const handleRestored = () => {
      setRendererStatus('ready');
      setStatus('3D context restored');
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
        event.preventDefault();
        if (key === 'y' || (key === 'z' && event.shiftKey)) {
          redo();
          setStatus('Redo applied');
        } else {
          undo();
          setStatus('Undo applied');
        }
        return;
      }
      const liveState = useProjectStore.getState();
      const preview = liveState.scenePreview;
      if (event.key === 'Escape' && liveState.measureMode) {
        event.preventDefault();
        cancelMeasurement();
        setStatus('Measurement cancelled');
        return;
      }
      if (event.key === 'Escape' && preview) {
        event.preventDefault();
        cancelScenePreview();
        setStatus('Preview cancelled');
        return;
      }
      if (event.key === 'Enter' && preview?.kind === 'placement') {
        event.preventDefault();
        const result = commitScenePreview(preview.token, preview.expectedRevision);
        setStatus(result.message);
        return;
      }
      if (key === 'f' && liveState.selectedEntityIds.length > 0) {
        event.preventDefault();
        liveState.setCameraPreset('selection');
        setStatus('Focused on selection');
        return;
      }
      if (key === 'h' || key === 'home' || (key === 'r' && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        liveState.setCameraPreset('room');
        liveState.setViewMode('perspective');
        setStatus('Reset to 3D room view');
        return;
      }
      if (key === '1') {
        event.preventDefault();
        liveState.setViewMode('perspective');
        setStatus('3D Perspective view');
        return;
      }
      if (key === '2') {
        event.preventDefault();
        liveState.setViewMode('top');
        setStatus('Top Blueprint view');
        return;
      }
      if (key === '3') {
        event.preventDefault();
        liveState.setViewMode('elevation');
        setStatus('Wall Elevation view');
        return;
      }
      if ((key === 'v' || key === 's') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        liveState.setNavigationTool('select');
        setStatus('Select and move tool active');
        return;
      }
      if (key === 'o' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        liveState.setNavigationTool('orbit');
        setStatus('Orbit tool active');
        return;
      }
      if (key === 'p' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        liveState.setNavigationTool('pan');
        setStatus('Pan tool active');
        return;
      }
      if (key === 'm' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        const next = liveState.navigationTool === 'measure' ? 'orbit' : 'measure';
        liveState.setNavigationTool(next);
        setStatus(next === 'measure' ? 'Measure tool active' : 'Orbit tool active');
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'd') {
        event.preventDefault();
        const result = liveState.duplicateSelection();
        setStatus(result.message);
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        if (liveState.selectedEntityIds.length > 0) {
          event.preventDefault();
          const result = liveState.removeSelection();
          setStatus(result.message);
          return;
        }
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

      const step = event.altKey
        ? 1
        : event.shiftKey
          ? inchesToSixteenths(3)
          : inchesToSixteenths(1);
      const deltaOffset = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const deltaElevation = event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0;
      if (preview?.kind === 'placement') {
        const entity = preview.cabinets[0] ?? preview.builtInElements[0];
        if (!entity) return;
        event.preventDefault();
        updateScenePreview(
          entity.wallId,
          entity.offsetX + deltaOffset,
          entity.elevation + deltaElevation,
          true,
        );
        setStatus('Placement preview moved');
        return;
      }

      const movableIds = selectedEntityIds.filter(
        (id) =>
          project.cabinets.some((cabinet) => cabinet.id === id) ||
          project.builtInElements.some((element) => element.id === id),
      );
      if (movableIds.length === 0) return;
      event.preventDefault();
      const started = startSceneMovePreview(movableIds, deltaOffset, deltaElevation, true);
      const current = useProjectStore.getState().scenePreview;
      const result =
        started.ok && current
          ? commitScenePreview(current.token, current.expectedRevision)
          : started;
      setStatus(result.message);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cancelMeasurement,
    cancelScenePreview,
    commitScenePreview,
    project,
    redo,
    selectedEntityIds,
    undo,
    startSceneMovePreview,
    updateScenePreview,
  ]);
  const cameraConfig = useMemo(() => {
    if (viewMode === 'top') {
      return { position: [72, 260, 72] as [number, number, number], fov: 42 };
    }
    if (viewMode === 'elevation') {
      return { position: [72, 56, 250] as [number, number, number], fov: 38 };
    }
    return { position: [185, 120, 235] as [number, number, number], fov: 50 };
  }, [viewMode]);

  const canvasCursor = isOrbiting
    ? 'grabbing'
    : navigationTool === 'select'
      ? 'default'
      : navigationTool === 'pan'
        ? 'all-scroll'
        : navigationTool === 'zoom'
          ? 'zoom-in'
          : navigationTool === 'measure'
            ? 'crosshair'
            : 'grab';

  return (
    <section
      className="planner-canvas-container"
      style={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        backgroundColor: 'var(--color-canvas-bg)',
        position: 'relative',
        cursor: canvasCursor,
      }}
      aria-label="Interactive 3D planner canvas"
    >
      <Canvas
        ref={canvasRef}
        camera={cameraConfig}
        fallback={
          <div className="planner-webgl-fallback" role="status">
            <strong>3D preview unavailable</strong>
            <span>Use the scene list and numeric property controls to continue planning.</span>
          </div>
        }
        frameloop="demand"
        shadows="basic"
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          setRendererStatus('ready');
        }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onPointerMissed={() => {
          if (navigationTool === 'select') clearSceneSelection();
        }}
      >
        <PlannerCaptureRegistrar setIncludeTransientPreview={setIncludeTransientPreview} />
        <SceneContent
          onMoveStatus={setStatus}
          includeTransientPreview={includeTransientPreview}
          onOrbitChange={handleOrbitChange}
          orbitTarget={orbitTarget}
          isOrbiting={isOrbiting}
        />
      </Canvas>
      <PlacementBar onStatus={setStatus} />
      <div className="planner-canvas-hud-controls">
        <button
          type="button"
          className="button is-small is-ghost planner-controls-guide-trigger"
          onClick={() => setShowControlsGuide((open) => !open)}
          aria-expanded={showControlsGuide}
          aria-label="3D model navigation and controls guide"
        >
          3D Controls Guide
        </button>
      </div>
      {showControlsGuide && (
        <section
          className="planner-controls-guide box p-3"
          aria-label="3D viewport controls reference"
        >
          <div className="is-flex is-align-items-center is-justify-content-between mb-2">
            <strong className="is-size-7">3D Model Controls</strong>
            <button
              type="button"
              className="delete is-small"
              aria-label="Close controls reference"
              onClick={() => setShowControlsGuide(false)}
            />
          </div>
          <ul className="is-size-7">
            <li>
              <strong>Rotate / Orbit:</strong> Left Click & Drag canvas
            </li>
            <li>
              <strong>Pan:</strong> Right Click & Drag or Shift + Left Drag
            </li>
            <li>
              <strong>Zoom:</strong> Mouse Wheel or Pinch
            </li>
            <li>
              <strong>Select:</strong> Left Click on cabinet (Ctrl/Cmd to multi-select)
            </li>
            <li>
              <strong>Move:</strong> Drag cabinet along wall or use Arrow keys
            </li>
            <li>
              <strong>Deselect:</strong> Click empty canvas or press Escape
            </li>
            <li>
              <strong>Quick Orient:</strong> Click axis bubbles on bottom-left 3D widget
            </li>
          </ul>
        </section>
      )}
      {rendererStatus === 'lost' && (
        <div className="planner-webgl-status" role="status">
          3D context lost. Semantic controls remain available.
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {status}
      </div>
    </section>
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
