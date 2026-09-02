'use client';

import { Edges, Html, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import {
  type AssemblyPartCallout,
  type AssemblyPartState,
  deriveAssemblyPartCallouts,
  deriveAssemblyPartStates,
} from '@/domain/assembly/step-presentation';
import type { BuiltCabinetModel, CabinetPartMeshSpec } from '@/domain/geometry/part-builder';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import {
  SHARED_UNIT_BOX_GEOMETRY,
  SHARED_UNIT_CYLINDER_GEOMETRY,
} from '@/rendering/shared-geometries';
export interface AssemblyDiagramCanvasProps {
  model: BuiltCabinetModel;
  activeStepNumber: number;
  highlightPartId?: string;
  replayToken: number;
  explodedPreview: boolean;
  cameraResetToken: number;
  onHighlightPart(partId: string): void;
}

interface AnimatedAssemblyPartProps {
  part: CabinetPartMeshSpec;
  state: AssemblyPartState;
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
  activeStepNumber: number;
  replayToken: number;
  explodedPreview: boolean;
  reducedMotion: boolean;
  isStepEmphasized: boolean;
  isUserHighlighted: boolean;
  callout?: AssemblyPartCallout;
  onHighlightPart(partId: string): void;
}

function AnimatedAssemblyPart({
  part,
  state,
  assembledPosition,
  explodedPosition,
  explodedPreview,
  reducedMotion,
  isStepEmphasized,
  isUserHighlighted,
  callout,
  onHighlightPart,
}: AnimatedAssemblyPartProps) {
  const targetPosition =
    state === 'active' && explodedPreview ? explodedPosition : assembledPosition;
  const initialPosition = state === 'active' && !reducedMotion ? explodedPosition : targetPosition;
  const groupRef = useRef<Group>(null);
  const hasStartedRef = useRef(state !== 'active');
  const emphasized = isStepEmphasized || isUserHighlighted;
  const material = emphasized
    ? { color: '#FFF1E8', opacity: 1 }
    : state === 'context'
      ? { color: '#E8EDF2', opacity: 0.3 }
      : state === 'complete'
        ? { color: '#F7F8FA', opacity: 0.55 }
        : { color: '#EAF1F8', opacity: 1 };
  const edgeColor = emphasized ? '#8A3508' : state === 'active' ? '#17212B' : '#738292';
  const edgeWidth = isUserHighlighted ? 2 : isStepEmphasized || state === 'active' ? 1.5 : 0.75;

  useFrame((renderState, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (reducedMotion) {
      group.position.set(...targetPosition);
      return;
    }

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      renderState.invalidate();
      return;
    }

    const deltaX = targetPosition[0] - group.position.x;
    const deltaY = targetPosition[1] - group.position.y;
    const deltaZ = targetPosition[2] - group.position.z;
    if (Math.hypot(deltaX, deltaY, deltaZ) <= 0.01) {
      group.position.set(...targetPosition);
      return;
    }

    const alpha = 1 - Math.exp(-10 * delta);
    group.position.x += deltaX * alpha;
    group.position.y += deltaY * alpha;
    group.position.z += deltaZ * alpha;
    renderState.invalidate();
  });

  return (
    <group ref={groupRef} position={initialPosition}>
      {(() => {
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
            geometry={isCylinder ? SHARED_UNIT_CYLINDER_GEOMETRY : SHARED_UNIT_BOX_GEOMETRY}
            scale={scale}
            rotation={
              part.rotationDegrees?.map((degrees) => (degrees * Math.PI) / 180) as
                | [number, number, number]
                | undefined
            }
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={material.color}
              opacity={material.opacity}
              transparent={material.opacity < 1}
              depthWrite={material.opacity === 1}
              roughness={0.45}
            />
            <Edges color={edgeColor} lineWidth={edgeWidth} />
          </mesh>
        );
      })()}
      {state === 'active' && callout && (
        <Html position={[0, Math.max(part.heightInches / 2, 1) + 1, 0]} center>
          <button
            type="button"
            className="assembly-hotspot"
            aria-label={`Part ${callout.number}: ${callout.label}`}
            onClick={() => onHighlightPart(part.id)}
          >
            {callout.number}
          </button>
        </Html>
      )}
    </group>
  );
}

function ProgressiveCabinetParts({
  model,
  activeStepNumber,
  highlightPartId,
  replayToken,
  explodedPreview,
  onHighlightPart,
}: {
  model: BuiltCabinetModel;
  activeStepNumber: number;
  highlightPartId?: string;
  replayToken: number;
  explodedPreview: boolean;
  onHighlightPart(partId: string): void;
}) {
  const reducedMotion = useReducedMotionPreference();
  const currentStep =
    model.assemblySteps.find((step) => step.stepNumber === activeStepNumber) ??
    model.assemblySteps[0];
  const partStates = useMemo(
    () => deriveAssemblyPartStates(model, activeStepNumber),
    [activeStepNumber, model],
  );
  const calloutByPartId = useMemo(
    () =>
      new Map(
        deriveAssemblyPartCallouts(model, currentStep).map((callout) => [callout.partId, callout]),
      ),
    [currentStep, model],
  );
  const emphasizedPartIds = useMemo(
    () =>
      new Set(
        currentStep.highlightPartIds.filter(
          (partId) => partStates.has(partId) && partStates.get(partId) !== 'future',
        ),
      ),
    [currentStep.highlightPartIds, partStates],
  );

  return (
    <group position={[-model.widthInches / 2, -model.heightInches / 2, -model.depthInches / 2]}>
      {model.parts.map((part) => {
        const state = partStates.get(part.id) ?? 'future';
        if (state === 'future') {
          return null;
        }

        const assembledPosition: [number, number, number] = [...part.positionInches];
        const offset = part.explodedOffsetInches ?? [0, 0, 0];
        const explodedPosition: [number, number, number] = [
          assembledPosition[0] + offset[0],
          assembledPosition[1] + offset[1],
          assembledPosition[2] + offset[2],
        ];
        const key =
          state === 'active'
            ? `${part.id}:${activeStepNumber}:${replayToken}`
            : `${part.id}:${state}`;

        return (
          <AnimatedAssemblyPart
            key={key}
            part={part}
            state={state}
            assembledPosition={assembledPosition}
            explodedPosition={explodedPosition}
            activeStepNumber={activeStepNumber}
            replayToken={replayToken}
            explodedPreview={explodedPreview}
            reducedMotion={reducedMotion}
            isStepEmphasized={emphasizedPartIds.has(part.id)}
            isUserHighlighted={highlightPartId === part.id}
            callout={calloutByPartId.get(part.id)}
            onHighlightPart={onHighlightPart}
          />
        );
      })}
    </group>
  );
}

export function AssemblyDiagramCanvas({
  model,
  activeStepNumber,
  highlightPartId,
  replayToken,
  explodedPreview,
  cameraResetToken,
  onHighlightPart,
}: AssemblyDiagramCanvasProps) {
  return (
    <div className="assembly-diagram-wrapper">
      <Canvas
        frameloop="demand"
        shadows="basic"
        dpr={[1, 1.5]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <OrthographicCamera
          key={`camera:${cameraResetToken}`}
          makeDefault
          position={[40, 30, 50]}
          zoom={6}
          near={-200}
          far={500}
        />
        <ambientLight intensity={0.9} />
        <directionalLight position={[50, 80, 50]} intensity={1.5} />
        <directionalLight position={[-50, 40, -50]} intensity={0.6} />
        <ProgressiveCabinetParts
          model={model}
          activeStepNumber={activeStepNumber}
          highlightPartId={highlightPartId}
          replayToken={replayToken}
          explodedPreview={explodedPreview}
          onHighlightPart={onHighlightPart}
        />
        <OrbitControls
          key={`controls:${cameraResetToken}`}
          makeDefault
          enableRotate
          enablePan
          enableZoom
        />
      </Canvas>
    </div>
  );
}
