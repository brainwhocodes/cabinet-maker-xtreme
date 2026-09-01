'use client';

import type {
  CabinetConstruction,
  CabinetFrontLayout,
  CabinetInstance,
  HardwarePlacement,
} from '@/domain/geometry/models';
import { inchesToSixteenths } from '@/domain/geometry/units';
import type { EditableCabinetPatch } from '@/state/project-store';
import { Select } from '../atoms/Select';
import { FormField } from '../molecules/FormField';
import { InspectorRow } from '../molecules/InspectorRow';

const CONSTRUCTION_OPTIONS = [
  { value: 'frameless', label: 'Frameless' },
  { value: 'face_frame', label: 'Face frame' },
];

const FRONT_LAYOUT_OPTIONS = [
  { value: 'single_door', label: 'Single door' },
  { value: 'double_door', label: 'Double door' },
  { value: 'door_and_drawer', label: 'Door and drawer' },
  { value: 'drawers', label: 'Drawers' },
  { value: 'open', label: 'Open' },
  { value: 'false_front', label: 'False front' },
];

const HARDWARE_PLACEMENT_OPTIONS = [
  { value: 'auto', label: 'Automatic' },
  { value: 'upper', label: 'Upper, 3 inches from edge' },
  { value: 'center', label: 'Centered' },
  { value: 'lower', label: 'Lower, 3 inches from edge' },
];

interface BuiltEditorProps {
  cabinet: CabinetInstance;
  onUpdate(id: string, patch: EditableCabinetPatch): void;
}

export function BuiltCabinetBuildEditor({ cabinet, onUpdate }: BuiltEditorProps) {
  if (cabinet.source !== 'built') return null;
  const evenShelfElevations = makeEvenShelfElevations(cabinet, cabinet.build.shelfCount);
  return (
    <div className="mb-4">
      <h5 className="is-size-7 has-text-weight-bold has-text-grey uppercase mb-2">
        Built cabinet construction
      </h5>
      <CabinetCaseEditor cabinet={cabinet} onUpdate={onUpdate} />
      <CabinetInteriorEditor
        cabinet={cabinet}
        onUpdate={onUpdate}
        evenShelfElevations={evenShelfElevations}
      />
    </div>
  );
}

function CabinetCaseEditor({ cabinet, onUpdate }: BuiltEditorProps) {
  return (
    <>
      <InspectorRow
        label="Width"
        sixteenths={cabinet.width}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, { width: cabinet.width + inchesToSixteenths(delta) })
        }
        onSetInches={(inches) => onUpdate(cabinet.id, { width: inchesToSixteenths(inches) })}
      />
      <InspectorRow
        label="Height"
        sixteenths={cabinet.height}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, { height: cabinet.height + inchesToSixteenths(delta) })
        }
        onSetInches={(inches) => onUpdate(cabinet.id, { height: inchesToSixteenths(inches) })}
      />
      <InspectorRow
        label="Depth"
        sixteenths={cabinet.depth}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, { depth: cabinet.depth + inchesToSixteenths(delta) })
        }
        onSetInches={(inches) => onUpdate(cabinet.id, { depth: inchesToSixteenths(inches) })}
      />
      <FormField label="Construction">
        <Select
          selectSize="sm"
          options={CONSTRUCTION_OPTIONS}
          value={cabinet.build.construction}
          onChange={(event) =>
            onUpdate(cabinet.id, {
              build: { construction: event.target.value as CabinetConstruction },
            })
          }
        />
      </FormField>
      <InspectorRow
        label="Carcass thickness"
        sixteenths={cabinet.build.carcassThickness}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, {
            build: {
              carcassThickness: cabinet.build.carcassThickness + inchesToSixteenths(delta),
            },
          })
        }
        onSetInches={(inches) =>
          onUpdate(cabinet.id, {
            build: { carcassThickness: inchesToSixteenths(inches) },
          })
        }
      />
      <InspectorRow
        label="Back thickness"
        sixteenths={cabinet.build.backThickness}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, {
            build: {
              backThickness: cabinet.build.backThickness + inchesToSixteenths(delta),
            },
          })
        }
        onSetInches={(inches) =>
          onUpdate(cabinet.id, { build: { backThickness: inchesToSixteenths(inches) } })
        }
      />
      <InspectorRow
        label="Shelf thickness"
        sixteenths={cabinet.build.shelfThickness}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, {
            build: {
              shelfThickness: cabinet.build.shelfThickness + inchesToSixteenths(delta),
            },
          })
        }
        onSetInches={(inches) =>
          onUpdate(cabinet.id, { build: { shelfThickness: inchesToSixteenths(inches) } })
        }
      />
      {cabinet.build.construction === 'face_frame' && (
        <InspectorRow
          label="Face-frame width"
          sixteenths={cabinet.build.faceFrameWidth}
          stepUnits="sixteenth"
          onStepDelta={(delta) =>
            onUpdate(cabinet.id, {
              build: {
                faceFrameWidth: cabinet.build.faceFrameWidth + inchesToSixteenths(delta),
              },
            })
          }
          onSetInches={(inches) =>
            onUpdate(cabinet.id, {
              build: { faceFrameWidth: inchesToSixteenths(inches) },
            })
          }
        />
      )}
      <FormField label="Front layout">
        <Select
          selectSize="sm"
          options={FRONT_LAYOUT_OPTIONS}
          value={cabinet.build.frontLayout}
          onChange={(event) => {
            const frontLayout = event.target.value as CabinetFrontLayout;
            onUpdate(cabinet.id, {
              build: {
                frontLayout,
                drawerCount:
                  frontLayout === 'drawers' || frontLayout === 'door_and_drawer'
                    ? cabinet.build.drawerCount
                    : 0,
              },
            });
          }}
        />
      </FormField>
      {(cabinet.build.frontLayout === 'drawers' ||
        cabinet.build.frontLayout === 'door_and_drawer') && (
        <FormField label="Drawer count">
          <Select
            selectSize="sm"
            options={Array.from({ length: 7 }, (_, count) => ({
              value: count.toString(),
              label: count.toString(),
            }))}
            value={cabinet.build.drawerCount.toString()}
            onChange={(event) =>
              onUpdate(cabinet.id, {
                build: { drawerCount: Number(event.target.value) },
              })
            }
          />
        </FormField>
      )}
    </>
  );
}

function CabinetInteriorEditor({
  cabinet,
  onUpdate,
  evenShelfElevations,
}: BuiltEditorProps & { evenShelfElevations: number[] }) {
  return (
    <>
      <FormField label="Shelf count">
        <Select
          selectSize="sm"
          options={Array.from({ length: 7 }, (_, count) => ({
            value: count.toString(),
            label: count.toString(),
          }))}
          value={cabinet.build.shelfCount.toString()}
          onChange={(event) => {
            const shelfCount = Number(event.target.value);
            const shelfElevations =
              cabinet.build.shelfLayout === 'custom'
                ? makeEvenShelfElevations(cabinet, shelfCount)
                : [];
            onUpdate(cabinet.id, { build: { shelfCount, shelfElevations } });
          }}
        />
      </FormField>
      <FormField label="Shelf layout">
        <Select
          selectSize="sm"
          options={[
            { value: 'even', label: 'Evenly spaced' },
            { value: 'custom', label: 'Custom elevations' },
          ]}
          value={cabinet.build.shelfLayout}
          onChange={(event) => {
            const shelfLayout = event.target.value as 'even' | 'custom';
            onUpdate(cabinet.id, {
              build: {
                shelfLayout,
                shelfElevations: shelfLayout === 'custom' ? evenShelfElevations : [],
              },
            });
          }}
        />
      </FormField>
      {cabinet.build.shelfLayout === 'custom' &&
        cabinet.build.shelfElevations.map((elevation, index) => (
          <InspectorRow
            key={`shelf-elevation-${elevation}`}
            label={`Shelf ${index + 1} elevation`}
            sixteenths={elevation}
            stepUnits="sixteenth"
            onStepDelta={(delta) => {
              const shelfElevations = [...cabinet.build.shelfElevations];
              shelfElevations[index] += inchesToSixteenths(delta);
              onUpdate(cabinet.id, { build: { shelfElevations } });
            }}
            onSetInches={(inches) => {
              const shelfElevations = [...cabinet.build.shelfElevations];
              shelfElevations[index] = inchesToSixteenths(inches);
              onUpdate(cabinet.id, { build: { shelfElevations } });
            }}
          />
        ))}
      <label className="checkbox is-size-7 mb-2">
        <input
          type="checkbox"
          checked={cabinet.build.includeHardware}
          onChange={(event) =>
            onUpdate(cabinet.id, {
              hardwareId: event.target.checked
                ? cabinet.hardwareId === 'no_hardware'
                  ? 'matte_black_bar'
                  : cabinet.hardwareId
                : 'no_hardware',
              build: { includeHardware: event.target.checked },
            })
          }
        />{' '}
        Include hardware
      </label>
      <FormField label="Hardware placement">
        <Select
          selectSize="sm"
          options={HARDWARE_PLACEMENT_OPTIONS}
          value={cabinet.build.hardwarePlacement}
          onChange={(event) =>
            onUpdate(cabinet.id, {
              build: { hardwarePlacement: event.target.value as HardwarePlacement },
            })
          }
        />
      </FormField>
      <div className="is-flex is-flex-direction-column mb-2" style={{ gap: 6 }}>
        <label className="checkbox is-size-7">
          <input
            type="checkbox"
            checked={cabinet.build.leftFinishedEnd}
            onChange={(event) =>
              onUpdate(cabinet.id, {
                build: { leftFinishedEnd: event.target.checked },
              })
            }
          />{' '}
          Finished left end
        </label>
        <label className="checkbox is-size-7">
          <input
            type="checkbox"
            checked={cabinet.build.rightFinishedEnd}
            onChange={(event) =>
              onUpdate(cabinet.id, {
                build: { rightFinishedEnd: event.target.checked },
              })
            }
          />{' '}
          Finished right end
        </label>
      </div>
      <InspectorRow
        label="Toe-kick height"
        sixteenths={cabinet.build.toeKickHeight}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, {
            build: {
              toeKickHeight: Math.max(0, cabinet.build.toeKickHeight + inchesToSixteenths(delta)),
            },
          })
        }
        onSetInches={(inches) =>
          onUpdate(cabinet.id, {
            build: { toeKickHeight: inchesToSixteenths(inches) },
          })
        }
      />
      <InspectorRow
        label="Toe-kick depth"
        sixteenths={cabinet.build.toeKickDepth}
        stepUnits="sixteenth"
        onStepDelta={(delta) =>
          onUpdate(cabinet.id, {
            build: {
              toeKickDepth: Math.max(0, cabinet.build.toeKickDepth + inchesToSixteenths(delta)),
            },
          })
        }
        onSetInches={(inches) =>
          onUpdate(cabinet.id, {
            build: { toeKickDepth: inchesToSixteenths(inches) },
          })
        }
      />
    </>
  );
}

function makeEvenShelfElevations(cabinet: CabinetInstance, shelfCount: number): number[] {
  const interiorMin = cabinet.build.toeKickHeight + cabinet.build.carcassThickness;
  const interiorHeight =
    cabinet.height - cabinet.build.toeKickHeight - 2 * cabinet.build.carcassThickness;
  return Array.from({ length: shelfCount }, (_, index) =>
    Math.round(interiorMin + (interiorHeight * (index + 1)) / (shelfCount + 1)),
  );
}
