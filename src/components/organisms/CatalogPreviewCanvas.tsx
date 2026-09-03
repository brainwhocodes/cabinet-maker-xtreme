'use client';

import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import type { PlannerCatalogEntry } from '@/domain/catalog/planner-catalog';
import {
  type CatalogPreviewPrimitive,
  getCatalogPreviewPrimitives,
} from '@/domain/catalog/preview-geometry';
import type { CabinetInstance } from '@/domain/geometry/models';
import { CatalogItemThumbnail } from '../molecules/CatalogItemThumbnail';

export function CatalogPreviewCanvas({
  entry,
  selectedCabinet,
}: {
  entry: PlannerCatalogEntry;
  selectedCabinet?: CabinetInstance;
}) {
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  useEffect(() => {
    setWebGLAvailable(isWebGLSupported());
  }, []);
  if (webGLAvailable !== true) {
    return (
      <div className="catalog-preview-fallback" role="status">
        <CatalogItemThumbnail entry={entry} selectedCabinet={selectedCabinet} />
        <span>
          {webGLAvailable === false
            ? 'Interactive preview unavailable'
            : 'Loading interactive preview'}
        </span>
      </div>
    );
  }
  return (
    <PreviewErrorBoundary
      fallback={
        <div className="catalog-preview-fallback" role="status">
          <CatalogItemThumbnail entry={entry} selectedCabinet={selectedCabinet} />
          <span>Interactive preview unavailable</span>
        </div>
      }
    >
      <div
        className="catalog-preview-canvas"
        role="img"
        aria-label={`${entry.name} interactive 3D preview`}
      >
        <Canvas
          frameloop="demand"
          orthographic
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          fallback={
            <div className="catalog-preview-fallback" role="status">
              <CatalogItemThumbnail entry={entry} selectedCabinet={selectedCabinet} />
              <span>Interactive preview unavailable</span>
            </div>
          }
        >
          <CatalogPreviewScene entry={entry} selectedCabinet={selectedCabinet} />
        </Canvas>
      </div>
    </PreviewErrorBoundary>
  );
}

function CatalogPreviewScene({
  entry,
  selectedCabinet,
}: {
  entry: PlannerCatalogEntry;
  selectedCabinet?: CabinetInstance;
}) {
  const { invalidate } = useThree();
  const primitives = useMemo(
    () => getCatalogPreviewPrimitives(entry, selectedCabinet),
    [entry, selectedCabinet],
  );
  const groupRef = useRef<Group>(null);
  const movingGroupRef = useRef<Group>(null);
  const hingeDoorGroupRef = useRef<Group>(null);
  const bounds = useMemo(() => primitiveBounds(primitives), [primitives]);
  const maxDimension = Math.max(bounds.width, bounds.height, bounds.depth, 1);
  const scale = 52 / maxDimension;

  const isDrawer = entry.kind === 'drawer_system';
  const isHinge = entry.kind === 'hinge';
  const hingeAngle = isHinge ? entry.hingeOption.openingAngleDegrees : 0;

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (isDrawer && movingGroupRef.current) {
      // Cycle: extend forward, hold open, soft-close retract, hold closed
      const cycle = (Math.sin(elapsed * 1.8) + 1) / 2;
      const ease = cycle < 0.5 ? 4 * cycle * cycle * cycle : 1 - (-2 * cycle + 2) ** 3 / 2;
      movingGroupRef.current.position.z = ease * 12;
      invalidate();
    } else if (isHinge && hingeDoorGroupRef.current) {
      const cycle = (Math.sin(elapsed * 1.5) + 1) / 2;
      const ease = cycle < 0.5 ? 2 * cycle * cycle : 1 - (-2 * cycle + 2) ** 2 / 2;
      const targetRad = ((hingeAngle * Math.PI) / 180) * ease;
      hingeDoorGroupRef.current.rotation.y = -targetRad;
      invalidate();
    }
  });

  const staticPrimitives = isDrawer
    ? primitives.filter((p) => p.id.includes('_slide_'))
    : isHinge
      ? primitives.filter((p) => p.id.includes('_plate') || p.id.includes('_arm'))
      : primitives;

  const movingPrimitives = isDrawer
    ? primitives.filter((p) => !p.id.includes('_slide_'))
    : isHinge
      ? primitives.filter((p) => p.id.includes('_cup'))
      : [];

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[40, 65, 55]} intensity={2} />
      <directionalLight position={[-35, 25, -15]} intensity={0.7} />
      <OrthographicCamera makeDefault position={[75, 55, 75]} zoom={2.1} near={0.1} far={500} />
      <group
        ref={groupRef}
        scale={scale}
        position={[-bounds.centerX * scale, -bounds.centerY * scale, -bounds.centerZ * scale]}
      >
        {staticPrimitives.map((primitive) => (
          <PreviewPrimitive key={primitive.id} primitive={primitive} />
        ))}
        {isDrawer && movingPrimitives.length > 0 && (
          <group ref={movingGroupRef}>
            {movingPrimitives.map((primitive) => (
              <PreviewPrimitive key={primitive.id} primitive={primitive} />
            ))}
          </group>
        )}
        {isHinge && movingPrimitives.length > 0 && (
          <group ref={hingeDoorGroupRef} position={[0, 0, 0]}>
            {movingPrimitives.map((primitive) => (
              <PreviewPrimitive key={primitive.id} primitive={primitive} />
            ))}
            {/* Virtual demo door panel attached to hinge cup */}
            <mesh position={[-3.5, 0, 0.35]}>
              <boxGeometry args={[7, 12, 0.75]} />
              <meshStandardMaterial color="#EFE3D3" roughness={0.45} opacity={0.8} transparent />
            </mesh>
          </group>
        )}
      </group>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping={false}
        minZoom={1.2}
        maxZoom={5}
        onChange={() => invalidate()}
      />
    </>
  );
}

function PreviewPrimitive({ primitive }: { primitive: CatalogPreviewPrimitive }) {
  const rotation = primitive.rotationDegrees?.map((degrees) => (degrees * Math.PI) / 180) as
    | [number, number, number]
    | undefined;
  return (
    <mesh position={primitive.positionInches} rotation={rotation} castShadow receiveShadow>
      {primitive.primitive === 'cylinder' ? (
        <cylinderGeometry
          args={[
            primitive.radiusInches ?? primitive.widthInches / 2,
            primitive.radiusInches ?? primitive.widthInches / 2,
            primitive.heightInches,
            16,
          ]}
        />
      ) : (
        <boxGeometry
          args={[primitive.widthInches, primitive.heightInches, primitive.depthInches]}
        />
      )}
      <meshStandardMaterial
        color={primitive.color}
        metalness={primitive.metalness ?? 0}
        roughness={primitive.roughness ?? 0.55}
      />
    </mesh>
  );
}

function primitiveBounds(primitives: CatalogPreviewPrimitive[]) {
  if (primitives.length === 0) {
    return { width: 1, height: 1, depth: 1, centerX: 0, centerY: 0, centerZ: 0 };
  }
  const minX = Math.min(
    ...primitives.map((primitive) => primitive.positionInches[0] - primitive.widthInches / 2),
  );
  const maxX = Math.max(
    ...primitives.map((primitive) => primitive.positionInches[0] + primitive.widthInches / 2),
  );
  const minY = Math.min(
    ...primitives.map((primitive) => primitive.positionInches[1] - primitive.heightInches / 2),
  );
  const maxY = Math.max(
    ...primitives.map((primitive) => primitive.positionInches[1] + primitive.heightInches / 2),
  );
  const minZ = Math.min(
    ...primitives.map((primitive) => primitive.positionInches[2] - primitive.depthInches / 2),
  );
  const maxZ = Math.max(
    ...primitives.map((primitive) => primitive.positionInches[2] + primitive.depthInches / 2),
  );
  return {
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,

    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

class PreviewErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function isWebGLSupported(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
