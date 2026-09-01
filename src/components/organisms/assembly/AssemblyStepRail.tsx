'use client';

import type { CabinetAssemblyStepDef } from '@/domain/geometry/part-builder';

export interface AssemblyStepRailProps {
  steps: CabinetAssemblyStepDef[];
  activeStepNumber: number;
  completedSteps: ReadonlySet<number>;
  onSelectStep(stepNumber: number): void;
}

export function AssemblyStepRail({
  steps,
  activeStepNumber,
  completedSteps,
  onSelectStep,
}: AssemblyStepRailProps) {
  return (
    <nav className="assembly-step-rail no-print" aria-label="Assembly steps">
      <ol>
        {steps.map((step) => {
          const isActive = step.stepNumber === activeStepNumber;
          const isComplete = completedSteps.has(step.stepNumber);
          const state = isActive ? 'active' : isComplete ? 'complete' : 'pending';
          const stateLabel = isActive ? 'current' : isComplete ? 'completed' : 'not completed';

          return (
            <li key={step.stepNumber}>
              <button
                type="button"
                className={`assembly-step-rail-button is-${state}`}
                aria-label={`Step ${step.stepNumber}: ${step.title}, ${stateLabel}`}
                aria-current={isActive ? 'step' : undefined}
                data-assembly-step-state={state}
                onClick={() => onSelectStep(step.stepNumber)}
              >
                <span className="assembly-step-rail-number" aria-hidden="true">
                  {step.stepNumber}
                </span>
                <span className="assembly-step-rail-title">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
