'use client';

import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { DimensionDisplay } from '../atoms/DimensionDisplay';

export function RunCompletionDialog() {
  const { scenePreview, commitScenePreview, cancelScenePreview } = useProjectStore();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const preview = scenePreview?.kind === 'run_finish' ? scenePreview : null;

  useEffect(() => {
    if (!preview) return;
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      headingRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [preview]);

  const close = () => {
    cancelScenePreview();
    restoreCompleteRunsFocus();
  };

  if (!preview) return null;

  return (
    <dialog
      ref={dialogRef}
      className="run-completion-dialog"
      aria-labelledby="run-completion-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="run-completion-dialog-header">
        <h3 id="run-completion-title" ref={headingRef} tabIndex={-1}>
          Review built-in run finishes
        </h3>
        <button
          type="button"
          className="delete"
          aria-label="Cancel built-in run completion"
          onClick={close}
        />
      </div>
      <div className="run-completion-dialog-body">
        <p className={preview.valid ? 'has-text-success' : 'has-text-danger'}>
          {preview.valid
            ? `${preview.builtInElements.length} finish elements ready to apply.`
            : (preview.messages[0] ?? 'Run finish proposal is blocked.')}
        </p>
        <ul>
          {preview.builtInElements.map((element) => (
            <li key={element.id}>
              <strong>{element.name}</strong> <DimensionDisplay sixteenths={element.width} /> ×{' '}
              <DimensionDisplay sixteenths={element.height} /> ×{' '}
              <DimensionDisplay sixteenths={element.depth} />
            </li>
          ))}
        </ul>
        {preview.removedBuiltInElementIds.length > 0 && (
          <div>
            <strong>Remove stale generated elements</strong>
            <ul>
              {preview.removedBuiltInElementIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="run-completion-dialog-actions">
        <Button size="sm" variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!preview.valid}
          onClick={() => {
            commitScenePreview(preview.token, preview.expectedRevision);
            restoreCompleteRunsFocus();
          }}
        >
          Apply run finishes
        </Button>
      </div>
    </dialog>
  );
}

function restoreCompleteRunsFocus(): void {
  requestAnimationFrame(() =>
    document.querySelector<HTMLButtonElement>('[data-complete-runs-trigger]')?.focus(),
  );
}
