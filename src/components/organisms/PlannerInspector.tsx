'use client';

import { inchesToSixteenths } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { DimensionDisplay } from '../atoms/DimensionDisplay';
import { Select } from '../atoms/Select';
import { FormField } from '../molecules/FormField';
import { BuiltInInspector } from './BuiltInInspector';
import { CabinetInspector } from './CabinetInspector';
import { OpeningApplianceInspector } from './OpeningApplianceInspector';

export function PlannerInspector() {
  const {
    project,
    selectedEntityIds,
    primarySelectedEntityId,
    configureCabinet,
    removeCabinet,
    clearSceneSelection,
    setActiveWall,
    addOpening,
    addAppliance,
    duplicateSelection,
    alignSelection,
    distributeSelection,
    removeSelection,
    completeBuiltInRuns,
  } = useProjectStore();

  if (selectedEntityIds.length > 1) {
    return (
      <div className="cabinet-inspector p-3">
        <h4 className="is-size-6 has-text-weight-bold mb-2">
          {selectedEntityIds.length} entities selected
        </h4>
        <p className="is-size-7 has-text-grey mb-3">
          Align and distribute compatible entities on one wall.
        </p>
        <div className="buttons is-flex is-flex-direction-column">
          <Button size="sm" variant="secondary" isFullWidth onClick={duplicateSelection}>
            Duplicate selection
          </Button>
          <Select
            selectSize="sm"
            aria-label="Batch alignment"
            value=""
            options={[
              { value: '', label: 'Align selection' },
              { value: 'left', label: 'Align left' },
              { value: 'center', label: 'Align center' },
              { value: 'right', label: 'Align right' },
              { value: 'bottom', label: 'Align bottom' },
              { value: 'middle', label: 'Align middle' },
              { value: 'top', label: 'Align top' },
            ]}
            onChange={(event) => {
              if (event.target.value) {
                alignSelection(
                  event.target.value as 'left' | 'center' | 'right' | 'bottom' | 'middle' | 'top',
                );
              }
            }}
          />
          <Select
            selectSize="sm"
            aria-label="Batch distribution"
            value=""
            options={[
              { value: '', label: 'Distribute selection' },
              { value: 'equal_gaps', label: 'Equal gaps' },
              { value: 'equal_centers', label: 'Equal centers' },
            ]}
            onChange={(event) => {
              if (event.target.value) {
                distributeSelection(event.target.value as 'equal_gaps' | 'equal_centers');
              }
            }}
          />
          <Button size="sm" variant="danger" isFullWidth onClick={removeSelection}>
            Remove selection
          </Button>
        </div>
      </div>
    );
  }

  const cabinet = project.cabinets.find((entity) => entity.id === primarySelectedEntityId);
  if (cabinet) {
    return (
      <CabinetInspector
        cabinet={cabinet}
        onUpdate={(id, patch) => configureCabinet(id, patch)}
        onRemove={(id) => removeCabinet(id)}
        onDeselect={clearSceneSelection}
      />
    );
  }

  const builtIn = project.builtInElements.find((entity) => entity.id === primarySelectedEntityId);
  if (builtIn) return <BuiltInInspector element={builtIn} />;

  const opening = project.openings.find((entity) => entity.id === primarySelectedEntityId);
  if (opening) {
    return <OpeningApplianceInspector selection={{ kind: 'opening', entity: opening }} />;
  }

  const appliance = project.appliances.find((entity) => entity.id === primarySelectedEntityId);
  if (appliance) {
    return <OpeningApplianceInspector selection={{ kind: 'appliance', entity: appliance }} />;
  }

  const activeWall =
    project.walls.find((wall) => wall.id === project.activeWallId) ?? project.walls[0];
  let nextOffset = 0;
  for (const entity of project.cabinets) {
    if (entity.wallId === activeWall?.id) {
      nextOffset = Math.max(nextOffset, entity.offsetX + entity.width);
    }
  }
  for (const entity of project.openings) {
    if (entity.wallId === activeWall?.id) {
      nextOffset = Math.max(nextOffset, entity.offsetX + entity.width);
    }
  }
  for (const entity of project.appliances) {
    if (entity.wallId === activeWall?.id) {
      nextOffset = Math.max(nextOffset, entity.offsetX + entity.width);
    }
  }

  return (
    <div className="cabinet-inspector p-3 is-flex is-flex-direction-column">
      <h4 className="is-size-6 has-text-weight-bold mb-3">Room and active wall</h4>
      <div className="inspector-dimensions box p-2 mb-3 has-background-light">
        <div className="inspector-dimension-stat">
          <span>Width</span>
          <DimensionDisplay sixteenths={project.width} />
        </div>
        <div className="inspector-dimension-stat">
          <span>Length</span>
          <DimensionDisplay sixteenths={project.length} />
        </div>
        <div className="inspector-dimension-stat">
          <span>Ceiling</span>
          <DimensionDisplay sixteenths={project.ceilingHeight} />
        </div>
      </div>
      <FormField label="Target wall">
        <Select
          selectSize="sm"
          value={activeWall?.id ?? ''}
          options={project.walls.map((wall) => ({ value: wall.id, label: wall.name }))}
          onChange={(event) => setActiveWall(event.target.value)}
        />
      </FormField>
      {activeWall && (
        <p className="is-size-7 has-text-grey mb-3">
          Wall length: <DimensionDisplay sixteenths={activeWall.length} />
        </p>
      )}
      <div className="buttons is-flex is-flex-direction-column">
        <Button
          size="sm"
          variant="secondary"
          isFullWidth
          onClick={() =>
            addOpening({
              wallId: activeWall.id,
              type: 'door',
              name: 'New door opening',
              offsetX: Math.min(nextOffset, activeWall.length - inchesToSixteenths(36)),
              elevation: 0,
              width: inchesToSixteenths(36),
              height: inchesToSixteenths(80),
              depth: inchesToSixteenths(4.5),
            })
          }
        >
          Add opening
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isFullWidth
          onClick={() =>
            addAppliance({
              wallId: activeWall.id,
              type: 'dishwasher',
              name: 'New appliance',
              offsetX: Math.min(nextOffset, activeWall.length - inchesToSixteenths(24)),
              elevation: 0,
              width: inchesToSixteenths(24),
              height: inchesToSixteenths(34.5),
              depth: inchesToSixteenths(24),
            })
          }
        >
          Add appliance
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isFullWidth
          onClick={() => completeBuiltInRuns(activeWall.id, undefined, project.revision)}
        >
          Complete runs
        </Button>
      </div>
    </div>
  );
}
