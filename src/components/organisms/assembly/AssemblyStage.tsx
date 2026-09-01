'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { AssemblyLineDiagram } from '@/components/molecules/AssemblyLineDiagram';
import type { BuiltCabinetModel, CabinetAssemblyStepDef } from '@/domain/geometry/part-builder';
import { AssemblyDiagramCanvas } from '@/rendering/assembly-scene/AssemblyDiagramCanvas';

export type AssemblyDiagramMode = 'manual' | 'interactive';

export interface AssemblyStageProps {
  model: BuiltCabinetModel;
  step: CabinetAssemblyStepDef;
  mode: AssemblyDiagramMode;
  highlightedPartId?: string;
  onModeChange(mode: AssemblyDiagramMode): void;
  onHighlightPart(partId: string | undefined): void;
}

export function AssemblyStage({
  model,
  step,
  mode,
  highlightedPartId,
  onModeChange,
  onHighlightPart,
}: AssemblyStageProps) {
  const [replayToken, setReplayToken] = useState(0);
  const [explodedPreview, setExplodedPreview] = useState(false);
  const [cameraResetToken, setCameraResetToken] = useState(0);

  const replayStep = () => {
    setExplodedPreview(false);
    setReplayToken((token) => token + 1);
  };

  const resetView = () => {
    setExplodedPreview(false);
    setReplayToken((token) => token + 1);
    setCameraResetToken((token) => token + 1);
    onHighlightPart(undefined);
  };

  return (
    <section className="assembly-stage" aria-label={`Assembly diagram for step ${step.stepNumber}`}>
      <div className="assembly-stage-controls no-print">
        <fieldset className="assembly-stage-mode">
          <legend className="sr-only">Diagram view</legend>
          <button
            type="button"
            aria-pressed={mode === 'manual'}
            onClick={() => onModeChange('manual')}
          >
            Manual
          </button>
          <button
            type="button"
            aria-pressed={mode === 'interactive'}
            onClick={() => onModeChange('interactive')}
          >
            Interactive 3D
          </button>
        </fieldset>
        <div className="assembly-stage-actions">
          {mode === 'interactive' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon="solar:restart-linear"
                onClick={replayStep}
              >
                Replay step
              </Button>
              <Button
                size="sm"
                variant={explodedPreview ? 'primary' : 'secondary'}
                icon="solar:layers-linear"
                aria-pressed={explodedPreview}
                onClick={() => setExplodedPreview((isExploded) => !isExploded)}
              >
                Exploded
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" icon="solar:restart-linear" onClick={resetView}>
            Reset view
          </Button>
        </div>
      </div>

      <div className="assembly-stage-viewport">
        {mode === 'manual' ? (
          <AssemblyLineDiagram
            model={model}
            step={step}
            highlightedPartId={highlightedPartId}
            className="assembly-line-diagram-main"
          />
        ) : (
          <AssemblyDiagramCanvas
            model={model}
            activeStepNumber={step.stepNumber}
            highlightPartId={highlightedPartId}
            replayToken={replayToken}
            explodedPreview={explodedPreview}
            cameraResetToken={cameraResetToken}
            onHighlightPart={onHighlightPart}
          />
        )}
      </div>
    </section>
  );
}
