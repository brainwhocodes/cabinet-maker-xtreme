'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, MathUtils, Vector3 } from 'three';

export interface WalkthroughRigProps {
  roomWidth: number;
  roomLength: number;
}

export function WalkthroughRig({ roomWidth, roomLength }: WalkthroughRigProps) {
  const { camera, gl, invalidate } = useThree();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isDragging = useRef(false);
  const previousPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const euler = useRef(new Euler(0, 0, 0, 'YXZ'));
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      camera.position.set(roomWidth / 2, 66, roomLength / 2);
      euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
      euler.current.x = 0; // Look level
      camera.quaternion.setFromEuler(euler.current);
      invalidate();
    }
  }, [camera, invalidate, roomLength, roomWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      keysPressed.current[e.key.toLowerCase()] = true;
      invalidate();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      invalidate();
    };

    const canvas = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      previousPointer.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousPointer.current.x;
      const deltaY = e.clientY - previousPointer.current.y;
      previousPointer.current = { x: e.clientX, y: e.clientY };

      euler.current.y -= deltaX * 0.003;
      euler.current.x = MathUtils.clamp(
        euler.current.x - deltaY * 0.003,
        -Math.PI / 3,
        Math.PI / 3,
      );

      camera.quaternion.setFromEuler(euler.current);
      invalidate();
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [camera, gl, invalidate]);

  useFrame((_, delta) => {
    const keys = keysPressed.current;
    const moveVector = new Vector3();
    if (keys.w || keys.arrowup) moveVector.z -= 1;
    if (keys.s || keys.arrowdown) moveVector.z += 1;
    if (keys.a || keys.arrowleft) moveVector.x -= 1;
    if (keys.d || keys.arrowright) moveVector.x += 1;
    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.applyEuler(new Euler(0, euler.current.y, 0, 'YXZ'));
      const speed = 72 * delta; // 72 inches per second (walking pace)
      moveVector.multiplyScalar(speed);

      camera.position.x = MathUtils.clamp(
        camera.position.x + moveVector.x,
        18,
        Math.max(18, roomWidth - 18),
      );
      camera.position.z = MathUtils.clamp(
        camera.position.z + moveVector.z,
        18,
        Math.max(18, roomLength - 18),
      );
      camera.position.y = 66; // Fixed eye height
      invalidate();
    }
  });

  return null;
}
