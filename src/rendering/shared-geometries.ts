import { BoxGeometry, CylinderGeometry } from 'three';

/**
 * Shared unit geometries reused across all 3D viewers (Planner, Assembly, Catalog).
 * Meshes scale these single instances via `scale={[w, h, d]}` rather than allocating
 * hundreds of unique geometries on every render cycle, drastically reducing GPU VBO memory.
 */
export const SHARED_UNIT_BOX_GEOMETRY = new BoxGeometry(1, 1, 1);
export const SHARED_UNIT_CYLINDER_GEOMETRY = new CylinderGeometry(1, 1, 1, 16);
