'use client';

import { Html, Line } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { CylinderGeometry, MeshBasicMaterial, Plane, Vector3 } from 'three';
import type { CabinetInstance, Wall } from '@/domain/geometry/models';
import {
  formatFractionalInches,
  inchesToSixteenths,
  sixteenthsToInches,
} from '@/domain/geometry/units';
import { getWallRotationRadians, worldToWallLocal } from '@/domain/geometry/wall-transform';
import { playSnapSound } from '@/rendering/audio-feedback';
import { useProjectStore } from '@/state/project-store';

const ARROW_GEOMETRY = new CylinderGeometry(0.3, 0.3, 6, 12);
const CONE_GEOMETRY = new CylinderGeometry(0, 0.9, 2.5, 16);

const RED_MATERIAL = new MeshBasicMaterial({ color: '#EF4444', depthTest: false });
const GREEN_MATERIAL = new MeshBasicMaterial({ color: '#10B981', depthTest: false });
const BLUE_MATERIAL = new MeshBasicMaterial({ color: '#3B82F6', depthTest: false });
const CYAN_MATERIAL = new MeshBasicMaterial({
  color: '#06B6D4',
  depthTest: false,
  transparent: true,
  opacity: 0.6,
});

export interface TransformManipulatorProps {
  cabinet: CabinetInstance;
  wall: Wall;
  onStatus?(message: string): void;
}

export function TransformManipulator({ cabinet, wall, onStatus }: TransformManipulatorProps) {
  const {
    project,
    snapEnabled,
    updateScenePreview,
    startSceneMovePreview,
    commitScenePreview,
    cancelScenePreview,
    configureCabinet,
  } = useProjectStore();

  const [_hoveredAxis, setHoveredAxis] = useState<'x' | 'y' | 'z' | 'xy' | null>(null);
  const [editingClearance, setEditingClearance] = useState<'left' | 'right' | 'elevation' | null>(
    null,
  );
  const [inputValue, setInputValue] = useState('');

  const widthIn = sixteenthsToInches(cabinet.width);
  const heightIn = sixteenthsToInches(cabinet.height);
  const depthIn = sixteenthsToInches(cabinet.depth);
  const wallLenIn = sixteenthsToInches(wall.length);
  const offsetIn = sixteenthsToInches(cabinet.offsetX);

  // Compute neighboring obstacles on the same wall for live clearance strings
  const { leftObstacleEnd, rightObstacleStart } = useMemo(() => {
    let maxLeft = 0;
    let minRight = wallLenIn;

    for (const other of project.cabinets) {
      if (other.id === cabinet.id || other.wallId !== wall.id) continue;
      const otherStart = sixteenthsToInches(other.offsetX);
      const otherEnd = otherStart + sixteenthsToInches(other.width);
      if (otherEnd <= offsetIn + 0.1 && otherEnd > maxLeft) {
        maxLeft = otherEnd;
      }
      if (otherStart >= offsetIn + widthIn - 0.1 && otherStart < minRight) {
        minRight = otherStart;
      }
    }

    for (const op of project.openings) {
      if (op.wallId !== wall.id) continue;
      const opStart = sixteenthsToInches(op.offsetX);
      const opEnd = opStart + sixteenthsToInches(op.width);
      if (opEnd <= offsetIn + 0.1 && opEnd > maxLeft) {
        maxLeft = opEnd;
      }
      if (opStart >= offsetIn + widthIn - 0.1 && opStart < minRight) {
        minRight = opStart;
      }
    }
    return { leftObstacleEnd: maxLeft, rightObstacleStart: minRight };
  }, [cabinet.id, offsetIn, widthIn, project, wall.id, wallLenIn]);
  const leftClearance = Math.max(0, offsetIn - leftObstacleEnd);
  const rightClearance = Math.max(0, rightObstacleStart - (offsetIn + widthIn));

  // Drag interaction refs
  const dragRef = useRef<{
    axis: 'x' | 'y' | 'z' | 'xy';
    pointerId: number;
    startClientX: number;
    startClientY: number;
    initialOffset: number;
    initialElevation: number;
    initialDepthOffset: number;
    lastSnapped?: boolean;
  } | null>(null);

  const dragPlane = useMemo(() => new Plane(), []);
  const dragPlaneNormal = useMemo(() => new Vector3(), []);
  const dragPlaneOrigin = useMemo(() => new Vector3(), []);
  const dragHitPoint = useMemo(() => new Vector3(), []);

  const handlePointerDown = (
    axis: 'x' | 'y' | 'z' | 'xy',
    event: {
      stopPropagation: () => void;
      pointerId: number;
      clientX: number;
      clientY: number;
      target: unknown;
    },
  ) => {
    event.stopPropagation();
    const started = startSceneMovePreview([cabinet.id], 0, 0, snapEnabled);
    if (!started.ok) return;

    dragRef.current = {
      axis,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialOffset: cabinet.offsetX,
      initialElevation: cabinet.elevation,
      initialDepthOffset: 0,
    };

    const targetEl = event.target as { setPointerCapture?: (id: number) => void };
    targetEl.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: {
    pointerId: number;
    clientX: number;
    clientY: number;
    ray: { intersectPlane: (plane: Plane, target: Vector3) => Vector3 | null };
  }) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rotation = getWallRotationRadians(wall);
    dragPlane.setFromNormalAndCoplanarPoint(
      dragPlaneNormal.set(Math.sin(rotation), 0, Math.cos(rotation)),
      dragPlaneOrigin.set(sixteenthsToInches(wall.start.x), 0, sixteenthsToInches(wall.start.y)),
    );

    const hit = event.ray.intersectPlane(dragPlane, dragHitPoint);
    if (!hit) return;

    const local = worldToWallLocal(wall, {
      x: inchesToSixteenths(hit.x),
      y: inchesToSixteenths(hit.y),
      z: inchesToSixteenths(hit.z),
    });

    let newOffsetX = cabinet.offsetX;
    let newElevation = cabinet.elevation;

    if (drag.axis === 'x' || drag.axis === 'xy') {
      newOffsetX = local.offsetX;
    }
    if (drag.axis === 'y' || drag.axis === 'xy') {
      let candidateElevation = local.elevation;
      // Elevation smart snaps (0", 34.5", 36", 54", 84", 96")
      if (snapEnabled) {
        const standardSnaps = [0, 34.5, 36, 54, 84, 96].map(inchesToSixteenths);
        for (const snapVal of standardSnaps) {
          if (Math.abs(candidateElevation - snapVal) <= inchesToSixteenths(1.5)) {
            candidateElevation = snapVal;
            if (!drag.lastSnapped) {
              playSnapSound();
              drag.lastSnapped = true;
            }
            break;
          }
        }
      }
      newElevation = candidateElevation;
    }

    updateScenePreview(wall.id, newOffsetX, newElevation, snapEnabled);
    onStatus?.(
      `Position: Offset ${sixteenthsToInches(newOffsetX).toFixed(1)}", Elevation ${sixteenthsToInches(newElevation).toFixed(1)}"`,
    );
  };

  const handlePointerUp = (event: { pointerId: number; target: unknown }) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const targetEl = event.target as { releasePointerCapture?: (id: number) => void };
    targetEl.releasePointerCapture?.(event.pointerId);

    const preview = useProjectStore.getState().scenePreview;
    if (preview) {
      const res = commitScenePreview(preview.token, preview.expectedRevision);
      onStatus?.(res.message);
    } else {
      cancelScenePreview();
    }
    dragRef.current = null;
  };

  const commitDirectEdit = () => {
    const parsed = Number.parseFloat(inputValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEditingClearance(null);
      return;
    }

    if (editingClearance === 'left') {
      const newOffset = inchesToSixteenths(leftObstacleEnd + parsed);
      configureCabinet(cabinet.id, { offsetX: newOffset });
      onStatus?.(`Left clearance updated to ${parsed}"`);
    } else if (editingClearance === 'right') {
      const newOffset = inchesToSixteenths(rightObstacleStart - widthIn - parsed);
      configureCabinet(cabinet.id, { offsetX: newOffset });
      onStatus?.(`Right clearance updated to ${parsed}"`);
    } else if (editingClearance === 'elevation') {
      const newElevation = inchesToSixteenths(parsed);
      configureCabinet(cabinet.id, { elevation: newElevation });
      onStatus?.(`Elevation updated to ${parsed}"`);
    }

    setEditingClearance(null);
    setInputValue('');
  };

  return (
    <group position={[widthIn / 2, heightIn / 2, depthIn / 2]}>
      {/* 1. X-Axis Translation Arrow (Red) */}
      <group
        position={[widthIn / 2 + 3, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        onPointerOver={() => setHoveredAxis('x')}
        onPointerOut={() => setHoveredAxis(null)}
        onPointerDown={(e) => handlePointerDown('x', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <mesh geometry={ARROW_GEOMETRY} material={RED_MATERIAL} />
        <mesh position={[0, 3.5, 0]} geometry={CONE_GEOMETRY} material={RED_MATERIAL} />
      </group>

      {/* 2. Y-Axis Translation Arrow (Green) */}
      <group
        position={[0, heightIn / 2 + 3, 0]}
        onPointerOver={() => setHoveredAxis('y')}
        onPointerOut={() => setHoveredAxis(null)}
        onPointerDown={(e) => handlePointerDown('y', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <mesh geometry={ARROW_GEOMETRY} material={GREEN_MATERIAL} />
        <mesh position={[0, 3.5, 0]} geometry={CONE_GEOMETRY} material={GREEN_MATERIAL} />
      </group>

      {/* 3. Z-Axis Translation Arrow (Blue) */}
      <group
        position={[0, 0, depthIn / 2 + 3]}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerOver={() => setHoveredAxis('z')}
        onPointerOut={() => setHoveredAxis(null)}
        onPointerDown={(e) => handlePointerDown('z', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <mesh geometry={ARROW_GEOMETRY} material={BLUE_MATERIAL} />
        <mesh position={[0, 3.5, 0]} geometry={CONE_GEOMETRY} material={BLUE_MATERIAL} />
      </group>

      {/* 4. Center XY Planar Drag Handle (Cyan) */}
      <mesh
        position={[widthIn / 2 + 0.8, heightIn / 2 + 0.8, 0]}
        geometry={ARROW_GEOMETRY}
        scale={[0.8, 0.8, 0.8]}
        material={CYAN_MATERIAL}
        onPointerOver={() => setHoveredAxis('xy')}
        onPointerOut={() => setHoveredAxis(null)}
        onPointerDown={(e) => handlePointerDown('xy', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* 5. Live Clearance Dimension Strings */}
      {/* Left Clearance Line & Badge */}
      {leftClearance > 0.5 && (
        <group position={[-widthIn / 2, -heightIn / 2 + 2, depthIn / 2]}>
          <Line
            points={[
              [0, 0, 0],
              [-leftClearance, 0, 0],
            ]}
            color="#38BDF8"
            dashed
            dashScale={2}
            lineWidth={1.5}
          />
          <Html position={[-leftClearance / 2, 2, 0]} center>
            {editingClearance === 'left' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitDirectEdit();
                }}
                className="planner-clearance-input-form"
              >
                <input
                  type="number"
                  step="0.125"
                  ref={(el) => el?.focus()}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={commitDirectEdit}
                  className="planner-clearance-input"
                  placeholder={leftClearance.toFixed(1)}
                />
              </form>
            ) : (
              <button
                type="button"
                className="planner-clearance-badge"
                onClick={() => {
                  setEditingClearance('left');
                  setInputValue(leftClearance.toFixed(2));
                }}
                title="Click to edit distance to left obstacle"
              >
                {formatFractionalInches(inchesToSixteenths(leftClearance))}
              </button>
            )}
          </Html>
        </group>
      )}

      {/* Right Clearance Line & Badge */}
      {rightClearance > 0.5 && (
        <group position={[widthIn / 2, -heightIn / 2 + 2, depthIn / 2]}>
          <Line
            points={[
              [0, 0, 0],
              [rightClearance, 0, 0],
            ]}
            color="#38BDF8"
            dashed
            dashScale={2}
            lineWidth={1.5}
          />
          <Html position={[rightClearance / 2, 2, 0]} center>
            {editingClearance === 'right' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitDirectEdit();
                }}
                className="planner-clearance-input-form"
              >
                <input
                  type="number"
                  step="0.125"
                  ref={(el) => el?.focus()}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={commitDirectEdit}
                  className="planner-clearance-input"
                  placeholder={rightClearance.toFixed(1)}
                />
              </form>
            ) : (
              <button
                type="button"
                className="planner-clearance-badge"
                onClick={() => {
                  setEditingClearance('right');
                  setInputValue(rightClearance.toFixed(2));
                }}
                title="Click to edit distance to right obstacle"
              >
                {formatFractionalInches(inchesToSixteenths(rightClearance))}
              </button>
            )}
          </Html>
        </group>
      )}
    </group>
  );
}
