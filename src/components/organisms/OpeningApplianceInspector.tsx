'use client';

import type { Appliance, Opening } from '@/domain/geometry/models';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { FormField } from '../molecules/FormField';
import { InspectorRow } from '../molecules/InspectorRow';

export type OpeningApplianceSelection =
  | { kind: 'opening'; entity: Opening }
  | { kind: 'appliance'; entity: Appliance };

export function OpeningApplianceInspector({ selection }: { selection: OpeningApplianceSelection }) {
  const {
    project,
    updateOpening,
    removeOpening,
    updateAppliance,
    removeAppliance,
    clearSceneSelection,
  } = useProjectStore();
  const { entity, kind } = selection;
  const update = (patch: Partial<Omit<Opening, 'id'>> | Partial<Omit<Appliance, 'id'>>) =>
    kind === 'opening'
      ? updateOpening(entity.id, patch as Partial<Omit<Opening, 'id'>>)
      : updateAppliance(entity.id, patch as Partial<Omit<Appliance, 'id'>>);
  const setDimension = (
    key: 'offsetX' | 'elevation' | 'width' | 'height' | 'depth',
    inches: number,
  ) => update({ [key]: inchesToSixteenths(inches) });

  return (
    <div className="cabinet-inspector p-3 is-flex is-flex-direction-column">
      <div className="cabinet-inspector-header mb-3 pb-2">
        <span className="tag is-primary is-light is-size-7 mb-1">
          {kind === 'opening' ? 'Opening' : 'Appliance'}
        </span>
        <h4 className="is-size-6 has-text-weight-bold mb-0">{entity.name}</h4>
      </div>
      <FormField label="Target wall">
        <Select
          selectSize="sm"
          value={entity.wallId}
          options={project.walls.map((wall) => ({ value: wall.id, label: wall.name }))}
          onChange={(event) => update({ wallId: event.target.value })}
        />
      </FormField>
      <InspectorRow
        label="Offset"
        sixteenths={entity.offsetX}
        stepUnits="sixteenth"
        onStepDelta={(delta) => setDimension('offsetX', entity.offsetX / 16 + delta)}
        onSetInches={(inches) => setDimension('offsetX', inches)}
      />
      <InspectorRow
        label="Elevation"
        sixteenths={entity.elevation}
        stepUnits="sixteenth"
        onStepDelta={(delta) => setDimension('elevation', entity.elevation / 16 + delta)}
        onSetInches={(inches) => setDimension('elevation', inches)}
      />
      <InspectorRow
        label="Width"
        sixteenths={entity.width}
        stepUnits="sixteenth"
        onStepDelta={(delta) => setDimension('width', entity.width / 16 + delta)}
        onSetInches={(inches) => setDimension('width', inches)}
      />
      <InspectorRow
        label="Height"
        sixteenths={entity.height}
        stepUnits="sixteenth"
        onStepDelta={(delta) => setDimension('height', entity.height / 16 + delta)}
        onSetInches={(inches) => setDimension('height', inches)}
      />
      <InspectorRow
        label="Depth"
        sixteenths={entity.depth}
        stepUnits="sixteenth"
        onStepDelta={(delta) => setDimension('depth', entity.depth / 16 + delta)}
        onSetInches={(inches) => setDimension('depth', inches)}
      />
      <Button
        variant="danger"
        size="sm"
        isFullWidth
        icon="solar:trash-bin-minimalistic-linear"
        onClick={() => {
          kind === 'opening' ? removeOpening(entity.id) : removeAppliance(entity.id);
          clearSceneSelection();
        }}
      >
        Remove {kind}
      </Button>
    </div>
  );
}
