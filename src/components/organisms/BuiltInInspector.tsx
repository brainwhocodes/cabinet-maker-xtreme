'use client';

import { FINISH_OPTIONS } from '@/domain/catalog/standard-cabinets';
import type { BuiltInElement } from '@/domain/geometry/models';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { ColorSwatch } from '../atoms/ColorSwatch';
import { Select } from '../atoms/Select';
import { FormField } from '../molecules/FormField';
import { InspectorRow } from '../molecules/InspectorRow';

export function BuiltInInspector({ element }: { element: BuiltInElement }) {
  const {
    project,
    configureBuiltInElement,
    removeBuiltInElement,
    clearSceneSelection,
    selectSceneEntity,
  } = useProjectStore();
  const editable = element.origin === 'manual';
  const setDimension = (
    key: 'offsetX' | 'elevation' | 'depthOffset' | 'width' | 'height' | 'depth',
    inches: number,
  ) => configureBuiltInElement(element.id, { [key]: inchesToSixteenths(inches) });

  return (
    <div className="cabinet-inspector p-3 is-flex is-flex-direction-column">
      <div className="cabinet-inspector-header mb-3 pb-2">
        <div className="tags are-small mb-1">
          <span className="tag is-primary is-light">Built-in</span>
          <span className="tag is-light">
            {element.origin === 'manual' ? 'Manual' : 'Run generated'}
          </span>
        </div>
        <h4 className="is-size-6 has-text-weight-bold mb-0">{element.name}</h4>
      </div>

      {editable ? (
        <>
          <FormField label="Target wall">
            <Select
              selectSize="sm"
              value={element.wallId}
              options={project.walls.map((wall) => ({ value: wall.id, label: wall.name }))}
              onChange={(event) =>
                configureBuiltInElement(element.id, { wallId: event.target.value })
              }
            />
          </FormField>
          <InspectorRow
            label="Offset"
            sixteenths={element.offsetX}
            stepUnits="sixteenth"
            onStepDelta={(delta) => setDimension('offsetX', element.offsetX / 16 + delta)}
            onSetInches={(inches) => setDimension('offsetX', inches)}
          />
          <InspectorRow
            label="Elevation"
            sixteenths={element.elevation}
            stepUnits="sixteenth"
            onStepDelta={(delta) => setDimension('elevation', element.elevation / 16 + delta)}
            onSetInches={(inches) => setDimension('elevation', inches)}
          />
          <InspectorRow
            label="Depth offset"
            sixteenths={element.depthOffset}
            stepUnits="sixteenth"
            onStepDelta={(delta) => setDimension('depthOffset', element.depthOffset / 16 + delta)}
            onSetInches={(inches) => setDimension('depthOffset', inches)}
          />
          <InspectorRow
            label="Width"
            sixteenths={element.width}
            stepUnits="sixteenth"
            onStepDelta={(delta) => setDimension('width', element.width / 16 + delta)}
            onSetInches={(inches) => setDimension('width', inches)}
          />
          <InspectorRow
            label="Height"
            sixteenths={element.height}
            stepUnits="sixteenth"
            onStepDelta={(delta) => setDimension('height', element.height / 16 + delta)}
            onSetInches={(inches) => setDimension('height', inches)}
          />
          <InspectorRow
            label="Depth"
            sixteenths={element.depth}
            stepUnits="sixteenth"
            onStepDelta={(delta) => setDimension('depth', element.depth / 16 + delta)}
            onSetInches={(inches) => setDimension('depth', inches)}
          />
          <div className="mb-4 mt-3">
            <h5 className="is-size-7 has-text-weight-bold mb-2">Finish</h5>
            <div className="is-flex is-flex-wrap-wrap" style={{ gap: 8 }}>
              {FINISH_OPTIONS.map((finish) => (
                <ColorSwatch
                  key={finish.id}
                  finish={finish}
                  isSelected={finish.id === element.finishId}
                  onSelect={() => configureBuiltInElement(element.id, { finishId: finish.id })}
                  size="md"
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mb-4">
          <p className="is-size-7 mb-2">
            Derived dimensions: {element.width / 16}&quot; W × {element.height / 16}&quot; H ×{' '}
            {element.depth / 16}&quot; D
          </p>
          <p className="is-size-7 has-text-grey mb-2">
            Use Complete runs to regenerate this finish element.
          </p>
          <div className="buttons are-small">
            {element.attachedCabinetIds.map((cabinetId) => (
              <Button
                key={cabinetId}
                size="sm"
                variant="ghost"
                onClick={() => selectSceneEntity(cabinetId, 'replace')}
              >
                {cabinetId}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="danger"
        size="sm"
        isFullWidth
        icon="solar:trash-bin-minimalistic-linear"
        onClick={() => {
          removeBuiltInElement(element.id);
          clearSceneSelection();
        }}
      >
        Remove built-in element
      </Button>
    </div>
  );
}
