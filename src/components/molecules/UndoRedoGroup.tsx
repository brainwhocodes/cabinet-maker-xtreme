'use client';

import { Button } from '../atoms/Button';

export interface UndoRedoGroupProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  revision: number;
}

export function UndoRedoGroup({ canUndo, canRedo, onUndo, onRedo, revision }: UndoRedoGroupProps) {
  return (
    <div className="is-flex is-align-items-center" style={{ gap: 6 }}>
      <div className="buttons has-addons mb-0">
        <Button
          size="sm"
          icon="solar:undo-left-linear"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo last action (Ctrl+Z)"
          aria-label="Undo last action"
        />
        <Button
          size="sm"
          icon="solar:undo-right-linear"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo action (Ctrl+Y)"
          aria-label="Redo action"
        />
      </div>
      <span className="is-size-7 has-text-grey tabular-nums px-1" title="Project revision version">
        r{revision}
      </span>
    </div>
  );
}
