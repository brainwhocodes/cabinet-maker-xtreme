'use client';

import { Button } from '@/components/atoms/Button';
import { HelperCharacter } from '@/components/atoms/HelperCharacter';
import { SolarIcon } from '@/components/atoms/SolarIcon';
import { AssemblyPartLegend } from '@/components/molecules/AssemblyPartLegend';
import {
  type AssemblyPartCallout,
  type AssemblyPartState,
  splitAssemblyInstruction,
} from '@/domain/assembly/step-presentation';
import type { BuiltCabinetModel, CabinetAssemblyStepDef } from '@/domain/geometry/part-builder';

export interface AssemblyGuidancePanelProps {
  model: BuiltCabinetModel;
  step: CabinetAssemblyStepDef;
  cabinetName: string;
  partStates: ReadonlyMap<string, AssemblyPartState>;
  callouts: AssemblyPartCallout[];
  highlightedPartId?: string;
  isCompleted: boolean;
  onHighlightPart(partId: string | undefined): void;
  onToggleComplete(): void;
  onPrevious?: () => void;
  onNext?: () => void;
}

function RequirementList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="assembly-guidance-requirement">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function AssemblyGuidancePanel({
  model,
  step,
  cabinetName,
  partStates,
  callouts,
  highlightedPartId,
  isCompleted,
  onHighlightPart,
  onToggleComplete,
  onPrevious,
  onNext,
}: AssemblyGuidancePanelProps) {
  const instructions = splitAssemblyInstruction(step.actionInstruction);

  return (
    <article className="assembly-guidance" aria-labelledby="assembly-guidance-title">
      <header className="assembly-guidance-header">
        <div>
          <p>
            {cabinetName} · Step {step.stepNumber} of {model.assemblySteps.length}
          </p>
          <h1 id="assembly-guidance-title">{step.title}</h1>
        </div>
        <HelperCharacter pose={step.helperPose} size={160} className="assembly-helper-image" />
      </header>

      <section className="assembly-guidance-actions" aria-labelledby="assembly-actions-title">
        <h2 id="assembly-actions-title">What to do</h2>
        <ol>
          {instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
      </section>

      {callouts.length > 0 && (
        <section className="assembly-guidance-callouts" aria-labelledby="assembly-callouts-title">
          <h2 id="assembly-callouts-title">Parts in this step</h2>
          <ol>
            {callouts.map((callout) => (
              <li key={callout.partId} value={callout.number}>
                {callout.label}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="assembly-guidance-requirements">
        <RequirementList title="Tools" items={step.requiredToolNames} />
        <RequirementList title="Fasteners and supplies" items={step.requiredMaterialNames} />
      </div>

      <section className="assembly-guidance-note is-safety" aria-labelledby="assembly-safety-title">
        <SolarIcon name="solar:danger-triangle-linear" size={20} />
        <div>
          <h2 id="assembly-safety-title">Safety</h2>
          <p>{step.safetyNote}</p>
        </div>
      </section>

      <section
        className="assembly-guidance-note is-quality"
        aria-labelledby="assembly-quality-title"
      >
        <SolarIcon name="solar:shield-check-linear" size={20} />
        <div>
          <h2 id="assembly-quality-title">Check your work</h2>
          <p>{step.checkWorkNote}</p>
        </div>
      </section>

      <details className="assembly-all-parts">
        <summary>All cabinet parts ({model.parts.length})</summary>
        <AssemblyPartLegend
          parts={model.parts}
          partStates={partStates}
          highlightedPartId={highlightedPartId}
          onHighlight={onHighlightPart}
        />
      </details>

      <Button
        size="md"
        variant={isCompleted ? 'success' : 'secondary'}
        icon={isCompleted ? 'solar:check-circle-linear' : 'solar:clipboard-check-linear'}
        className="assembly-guidance-complete no-print"
        aria-pressed={isCompleted}
        onClick={onToggleComplete}
      >
        {isCompleted ? 'Step completed' : 'Mark step complete'}
      </Button>

      <div className="assembly-guidance-navigation no-print">
        <Button
          size="md"
          variant="secondary"
          icon="solar:arrow-left-linear"
          disabled={!onPrevious}
          onClick={onPrevious}
        >
          Previous step
        </Button>
        <Button
          size="md"
          variant="primary"
          icon="solar:arrow-right-linear"
          iconPosition="right"
          disabled={!onNext}
          onClick={onNext}
        >
          Next step
        </Button>
      </div>
    </article>
  );
}
