'use client';
import { useEffect, useState } from 'react';

import { type Sixteenths, sixteenthsToInches } from '@/domain/geometry/units';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

export interface InspectorRowProps {
  label: string;
  sixteenths: Sixteenths;
  onStepDelta: (deltaInches: number) => void;
  onSetInches: (inches: number) => void;
  stepUnits?: 'inch' | 'sixteenth';
}

export function InspectorRow({
  label,
  sixteenths,
  onStepDelta,
  onSetInches,
  stepUnits = 'inch',
}: InspectorRowProps) {
  const stepAmount = stepUnits === 'inch' ? 1 : 0.0625;
  const valueInches = sixteenthsToInches(sixteenths);
  const [draft, setDraft] = useState(() => valueInches.toString());

  useEffect(() => {
    setDraft(valueInches.toString());
  }, [valueInches]);

  const commitDraft = () => {
    const nextValue = Number(draft);
    if (Number.isFinite(nextValue)) {
      onSetInches(Math.max(0, nextValue));
      return;
    }
    setDraft(valueInches.toString());
  };

  return (
    <div
      className="inspector-control-row is-flex is-align-items-center is-justify-content-between py-2"
      style={{ borderBottom: '1px solid var(--color-line)' }}
    >
      <span className="inspector-control-label is-size-7 has-text-grey">{label}</span>
      <div className="inspector-control-inputs is-flex is-align-items-center">
        <div style={{ width: 108 }}>
          <Input
            type="number"
            inputSize="sm"
            value={draft}
            min={0}
            step={stepAmount}
            unitSuffix="in"
            aria-label={`${label} in inches`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setDraft(valueInches.toString());
                event.currentTarget.blur();
              }
            }}
          />
        </div>
        <div className="buttons has-addons mb-0">
          <Button
            size="sm"
            onClick={() => onStepDelta(-stepAmount)}
            title={`Decrease ${label} by ${stepAmount}"`}
            aria-label={`Decrease ${label} by ${stepAmount}"`}
          >
            −
          </Button>
          <Button
            size="sm"
            onClick={() => onStepDelta(stepAmount)}
            title={`Increase ${label} by ${stepAmount}"`}
            aria-label={`Increase ${label} by ${stepAmount}"`}
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
}
