'use client';

import type { BuiltCabinetModel } from '@/domain/geometry/part-builder';
import { AssemblyLineDiagram } from '../molecules/AssemblyLineDiagram';

export interface AssemblyStoryboardProps {
  model: BuiltCabinetModel;
  activeStepNumber: number;
  onSelectStep: (stepNumber: number) => void;
}

export function AssemblyStoryboard({
  model,
  activeStepNumber,
  onSelectStep,
}: AssemblyStoryboardProps) {
  return (
    <section className="assembly-storyboard" aria-labelledby="assembly-storyboard-title">
      <div className="assembly-storyboard-heading">
        <div>
          <span className="assembly-manual-kicker">Quick assembly map</span>
          <h2 id="assembly-storyboard-title">Cabinet sequence</h2>
        </div>
        <p>Select a panel to open its full instruction and interactive model.</p>
      </div>

      <ol className="assembly-storyboard-grid">
        {model.assemblySteps.map((step) => (
          <li key={step.stepNumber}>
            <button
              type="button"
              className={`assembly-storyboard-card ${
                activeStepNumber === step.stepNumber ? 'is-active' : ''
              }`}
              aria-current={activeStepNumber === step.stepNumber ? 'step' : undefined}
              onClick={() => onSelectStep(step.stepNumber)}
            >
              <span className="assembly-storyboard-number">{step.stepNumber}</span>
              <AssemblyLineDiagram model={model} step={step} variant="thumbnail" />
              <strong>{step.title}</strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
