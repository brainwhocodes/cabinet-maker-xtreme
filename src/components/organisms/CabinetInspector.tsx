'use client';

import {
  DOOR_STYLES,
  FINISH_OPTIONS,
  getCabinetDefinitionByCode,
  HARDWARE_OPTIONS,
  INTERIOR_FINISH_OPTIONS,
} from '@/domain/catalog/standard-cabinets';
import type { CabinetInstance, DoorSwing } from '@/domain/geometry/models';
import { inchesToSixteenths } from '@/domain/geometry/units';
import { captureStudioScreenshot } from '@/rendering/screenshots/capture-canvas';
import { type EditableCabinetPatch, useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { ColorSwatch } from '../atoms/ColorSwatch';
import { DimensionDisplay } from '../atoms/DimensionDisplay';
import { Select } from '../atoms/Select';
import { SolarIcon } from '../atoms/SolarIcon';
import { FormField } from '../molecules/FormField';
import { InspectorRow } from '../molecules/InspectorRow';
import { BuiltCabinetBuildEditor } from './BuiltCabinetBuildEditor';

const DOOR_SWING_OPTIONS = [
  { value: 'left', label: 'Single Left Hinge' },
  { value: 'right', label: 'Single Right Hinge' },
  { value: 'double', label: 'Double Doors (Pair)' },
  { value: 'drawers', label: '3-Drawer Tier' },
  { value: 'open_shelf', label: 'Open Shelf / Filler' },
];

export interface CabinetInspectorProps {
  cabinet: CabinetInstance | null;
  onUpdate: (id: string, updates: EditableCabinetPatch) => void;
  onRemove: (id: string) => void;
  onDeselect: () => void;
}

export function CabinetInspector({
  cabinet,
  onUpdate,
  onRemove,
  onDeselect,
}: CabinetInspectorProps) {
  const { project, convertCabinetToBuilt } = useProjectStore();

  if (!cabinet) {
    return (
      <div
        className="p-4 is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered has-text-grey"
        style={{
          width: 320,
          height: '100%',
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-line)',
        }}
      >
        <SolarIcon name="solar:widget-3-linear" size={40} className="mb-3 has-text-grey-light" />
        <h4 className="is-size-6 has-text-weight-semibold mb-1">No Cabinet Selected</h4>
        <p className="is-size-7">
          Click any cabinet in the 3D scene, or select one from the catalog to inspect and edit
          properties.
        </p>
      </div>
    );
  }

  const def = getCabinetDefinitionByCode(cabinet.definitionId);
  const retailMapping = def?.retailMapping;

  return (
    <div
      className="cabinet-inspector p-3 is-flex is-flex-direction-column"
      style={{
        width: 320,
        height: '100%',
        backgroundColor: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-line)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        className="cabinet-inspector-header is-flex is-align-items-center is-justify-content-between mb-3 pb-2"
        style={{ borderBottom: '1px solid var(--color-line)' }}
      >
        <div className="cabinet-inspector-title">
          <div className="tags are-small mb-0">
            <span className="tag is-primary is-light has-text-weight-bold">
              {cabinet.definitionId}
            </span>
            <span className="tag is-light">{cabinet.source === 'stock' ? 'Stock' : 'Built'}</span>
          </div>
          <span className="is-size-6 has-text-weight-bold">{cabinet.name}</span>
        </div>
        <button
          type="button"
          className="delete is-small"
          onClick={onDeselect}
          title="Deselect"
          aria-label="Deselect cabinet"
        />
      </div>

      {/* Dimensions Summary */}
      <div className="inspector-dimensions box p-2 mb-3 has-background-light">
        <div className="inspector-dimension-stat">
          <span>Width</span>
          <DimensionDisplay sixteenths={cabinet.width} />
        </div>
        <div className="inspector-dimension-stat">
          <span>Height</span>
          <DimensionDisplay sixteenths={cabinet.height} />
        </div>
        <div className="inspector-dimension-stat">
          <span>Depth</span>
          <DimensionDisplay sixteenths={cabinet.depth} />
        </div>
      </div>

      {cabinet.source === 'stock' && (
        <div className="mb-4">
          <Button
            size="sm"
            variant="secondary"
            isFullWidth
            onClick={() => convertCabinetToBuilt(cabinet.id)}
          >
            Create built version
          </Button>
          <p className="is-size-7 has-text-grey mt-1">
            Stock dimensions stay locked until converted.
          </p>
        </div>
      )}

      {/* Position Steppers */}
      <div className="mb-4">
        <h5 className="is-size-7 has-text-weight-bold has-text-grey uppercase mb-2">
          Wall Position
        </h5>
        <FormField label="Target wall">
          <Select
            aria-label="Target wall"
            selectSize="sm"
            value={cabinet.wallId}
            options={project.walls.map((wall) => ({ value: wall.id, label: wall.name }))}
            onChange={(event) => onUpdate(cabinet.id, { wallId: event.target.value })}
          />
        </FormField>
        <InspectorRow
          label="X Position (From Left)"
          sixteenths={cabinet.offsetX}
          onStepDelta={(delta) =>
            onUpdate(cabinet.id, { offsetX: Math.max(0, cabinet.offsetX + delta * 16) })
          }
          onSetInches={(inches) => onUpdate(cabinet.id, { offsetX: inchesToSixteenths(inches) })}
        />
        <InspectorRow
          label="Floor Elevation (Z)"
          sixteenths={cabinet.elevation}
          onStepDelta={(delta) =>
            onUpdate(cabinet.id, { elevation: Math.max(0, cabinet.elevation + delta * 16) })
          }
          onSetInches={(inches) => onUpdate(cabinet.id, { elevation: inchesToSixteenths(inches) })}
        />
      </div>

      <BuiltCabinetBuildEditor cabinet={cabinet} onUpdate={onUpdate} />

      {/* Configuration & Options */}
      <div className="mb-4">
        <h5 className="is-size-7 has-text-weight-bold has-text-grey uppercase mb-2">
          Door & Front Options
        </h5>
        <FormField label="Door Swing Configuration">
          <Select
            selectSize="sm"
            aria-label="Door Swing Configuration"
            options={DOOR_SWING_OPTIONS}
            value={cabinet.doorSwing}
            onChange={(e) => onUpdate(cabinet.id, { doorSwing: e.target.value as DoorSwing })}
          />
        </FormField>

        <FormField label="Door Style">
          <Select
            aria-label="Door Style"
            selectSize="sm"
            options={DOOR_STYLES.map((d) => ({ value: d.id, label: d.name }))}
            value={cabinet.doorStyleId}
            onChange={(e) => onUpdate(cabinet.id, { doorStyleId: e.target.value })}
          />
        </FormField>
      </div>

      {/* Exterior Finish (Outer) */}
      <div className="mb-4">
        <div className="is-flex is-align-items-center is-justify-content-between mb-2">
          <h5 className="is-size-7 has-text-weight-bold has-text-grey uppercase mb-0">
            Exterior Finish (Outer)
          </h5>
          <span className="is-size-7 has-text-grey font-italic">Doors & Sides</span>
        </div>
        <div className="is-flex is-align-items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          {FINISH_OPTIONS.map((f) => (
            <ColorSwatch
              key={f.id}
              finish={f}
              isSelected={cabinet.finishId === f.id}
              onSelect={() => onUpdate(cabinet.id, { finishId: f.id })}
              size="md"
            />
          ))}
        </div>
      </div>

      {/* Interior Finish (Inner) */}
      <div className="mb-4">
        <div className="is-flex is-align-items-center is-justify-content-between mb-2">
          <h5 className="is-size-7 has-text-weight-bold has-text-grey uppercase mb-0">
            Interior Finish (Inner)
          </h5>
          <span className="is-size-7 has-text-grey font-italic">Shelves & Deck</span>
        </div>
        <div className="is-flex is-align-items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          {INTERIOR_FINISH_OPTIONS.map((f) => (
            <ColorSwatch
              key={f.id}
              finish={f}
              isSelected={(cabinet.interiorFinishId || 'natural_birch') === f.id}
              onSelect={() => onUpdate(cabinet.id, { interiorFinishId: f.id })}
              size="md"
            />
          ))}
        </div>
        <div className="mt-2">
          <Button
            size="sm"
            variant="ghost"
            icon="solar:camera-linear"
            className="p-0 is-size-7"
            onClick={() =>
              captureStudioScreenshot({
                filename: `CabCraft_${cabinet.definitionId}_${cabinet.finishId}_finish.png`,
                download: true,
              })
            }
            title="Capture screenshot of this finish in the 3D room"
          >
            Download Finish Snapshot
          </Button>
        </div>
      </div>

      {/* Hardware */}
      <div className="mb-4">
        <h5 className="is-size-7 has-text-weight-bold has-text-grey uppercase mb-2">
          Hardware Pulls
        </h5>
        <Select
          selectSize="sm"
          options={HARDWARE_OPTIONS.map((h) => ({ value: h.id, label: h.name }))}
          value={cabinet.hardwareId}
          onChange={(e) => onUpdate(cabinet.id, { hardwareId: e.target.value })}
          aria-label="Hardware Pulls"
        />
      </div>

      {/* Retail Info */}
      {def && (
        <div
          className="box p-3 mb-4 has-background-white"
          style={{ border: '1px solid var(--color-line)', borderRadius: 6 }}
        >
          {retailMapping ? (
            <>
              <div className="inspector-retailer-heading is-flex is-align-items-center is-justify-content-between mb-1">
                <span className="is-size-7 has-text-weight-bold">{retailMapping.retailer}</span>
                <span className="is-size-7 has-text-primary has-text-weight-bold">
                  ${retailMapping.estimatedPriceUSD}
                </span>
              </div>
              <p className="is-size-7 has-text-grey mb-2">{retailMapping.productName}</p>
              <a
                href={retailMapping.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button is-small is-fullwidth is-outlined is-link"
              >
                <SolarIcon name="solar:cart-large-linear" size={14} className="mr-1" />
                <span>Search Retailer SKU</span>
              </a>
            </>
          ) : (
            <>
              <p className="is-size-7 has-text-weight-bold mb-1">
                {def.source === 'built_template'
                  ? 'Materials estimate in BOM'
                  : 'Price unavailable'}
              </p>
              <p className="is-size-7 has-text-grey mb-0">
                No verified retailer mapping is available for this definition.
              </p>
            </>
          )}
        </div>
      )}

      {/* Remove Button */}
      <div className="mt-auto pt-2">
        <Button
          variant="danger"
          size="sm"
          isFullWidth
          icon="solar:trash-bin-minimalistic-linear"
          onClick={() => onRemove(cabinet.id)}
        >
          Remove Cabinet
        </Button>
      </div>
    </div>
  );
}
