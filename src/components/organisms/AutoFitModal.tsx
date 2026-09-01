'use client';

import { useEffect, useRef, useState } from 'react';
import { type AutoFitProposal, generateAutoFitProposals } from '@/domain/layout/auto-fit';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { SolarIcon } from '../atoms/SolarIcon';
import { FormField } from '../molecules/FormField';
import { ProposalScoreCard } from '../molecules/ProposalScoreCard';

export interface AutoFitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AutoFitModal({ isOpen, onClose }: AutoFitModalProps) {
  const { project, scenePreview, stageAutoFitProposal, commitScenePreview, cancelScenePreview } =
    useProjectStore();

  const [selectedWallId, setSelectedWallId] = useState(
    project.activeWallId || project.walls[0]?.id || 'wall-1',
  );
  const [targetCategory, setTargetCategory] = useState<'base' | 'wall'>('base');
  const [includeSink, setIncludeSink] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      headingRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen) return null;

  const activeWall = project.walls.find((w) => w.id === selectedWallId) || project.walls[0];

  const proposals = generateAutoFitProposals({
    project,
    wallId: selectedWallId,
    wallLength: activeWall ? activeWall.length : project.width,
    targetCategory,
    includeSinkBase: includeSink && targetCategory === 'base',
  });

  const close = () => {
    cancelScenePreview();
    dialogRef.current?.close();
    onClose();
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('[data-auto-fit-trigger]')?.focus(),
    );
  };
  const handleApply = (proposal: AutoFitProposal) => {
    const staged = stageAutoFitProposal(proposal);
    const preview = useProjectStore.getState().scenePreview;
    if (staged.ok && preview) {
      commitScenePreview(preview.token, preview.expectedRevision);
    }
    close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="auto-fit-dialog"
      aria-labelledby="auto-fit-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="modal-card">
        <header className="modal-card-head py-3 px-4">
          <div className="is-flex is-align-items-center" style={{ gap: 8 }}>
            <SolarIcon name="solar:magic-wand-3-linear" size={20} className="has-text-primary" />
            <h3
              id="auto-fit-dialog-title"
              ref={headingRef}
              tabIndex={-1}
              className="modal-card-title is-size-6 has-text-weight-bold mb-0"
            >
              Auto-Fit Wall Layout Optimizer
            </h3>
          </div>
          <button type="button" className="delete" aria-label="close" onClick={close} />
        </header>

        <section className="modal-card-body p-4" style={{ overflowY: 'auto' }}>
          {/* Controls Bar */}
          <div className="columns is-variable is-2 mb-3">
            <div className="column is-4">
              <FormField label="Target Wall">
                <Select
                  selectSize="sm"
                  options={project.walls.map((w) => ({ value: w.id, label: w.name }))}
                  value={selectedWallId}
                  onChange={(e) => setSelectedWallId(e.target.value)}
                />
              </FormField>
            </div>
            <div className="column is-4">
              <FormField label="Cabinet Run Category">
                <Select
                  selectSize="sm"
                  options={[
                    { value: 'base', label: 'Base Cabinets (Lower)' },
                    { value: 'wall', label: 'Wall Cabinets (Upper)' },
                  ]}
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value as 'base' | 'wall')}
                />
              </FormField>
            </div>
            <div className="column is-4 is-flex is-align-items-flex-end">
              {targetCategory === 'base' && (
                <label className="checkbox is-size-7 mb-2">
                  <input
                    type="checkbox"
                    checked={includeSink}
                    onChange={(e) => setIncludeSink(e.target.checked)}
                    className="mr-1"
                  />
                  <span>Center Sink Base (SB36)</span>
                </label>
              )}
            </div>
          </div>

          <p className="is-size-7 has-text-grey mb-3">
            The algorithm solves the layout using standard modular catalog increments (12&quot; to
            36&quot;) and computes symmetrical filler reveals.
          </p>

          {/* Proposals List */}
          <div>
            {proposals.map((prop) => (
              <ProposalScoreCard
                key={prop.id}
                proposal={prop}
                isStaged={
                  scenePreview?.kind === 'layout' &&
                  scenePreview.cabinets.map((cabinet) => cabinet.id).join('|') ===
                    prop.cabinets.map((cabinet) => cabinet.id).join('|')
                }
                onPreview={stageAutoFitProposal}
                onApply={handleApply}
              />
            ))}
          </div>
        </section>

        <footer className="modal-card-foot py-2 px-4 is-flex is-justify-content-space-between">
          <span className="is-size-7 has-text-grey">
            {scenePreview?.kind === 'layout'
              ? 'Active 3D preview staged in viewport'
              : 'Select a proposal to preview or apply'}
          </span>
          <Button size="sm" onClick={close}>
            Cancel
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
