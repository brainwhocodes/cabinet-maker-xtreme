'use client';

import { useEffect, useState } from 'react';
import { inchesToSixteenths, sixteenthsToInches } from '@/domain/geometry/units';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';

export function SceneInspectionPanel() {
  const {
    project,
    selectedEntityIds,
    hiddenEntityIds,
    isolationEntityIds,
    showSceneLabels,
    measureMode,
    pendingMeasurementStart,
    measurements,
    sectionMode,
    sectionOffset,
    hideSelection,
    isolateSelection,
    showAllEntities,
    toggleSceneLabels,
    setMeasureMode,
    cancelMeasurement,
    renameMeasurement,
    deleteMeasurement,
    setSectionMode,
    setSectionOffset,
    setCameraPreset,
  } = useProjectStore();

  return (
    <aside className="planner-inspection-panel" aria-label="Scene inspection tools">
      <div
        className="planner-inspection-actions"
        role="toolbar"
        aria-label="Visibility and measurement"
      >
        <Button
          size="sm"
          variant={measureMode ? 'primary' : 'secondary'}
          aria-pressed={measureMode}
          onClick={() => (measureMode ? cancelMeasurement() : setMeasureMode(true))}
        >
          Measure
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={selectedEntityIds.length === 0}
          onClick={hideSelection}
        >
          Hide
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={selectedEntityIds.length === 0}
          onClick={isolateSelection}
        >
          Isolate
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={hiddenEntityIds.length === 0 && isolationEntityIds.length === 0}
          onClick={showAllEntities}
        >
          Show all
        </Button>
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={showSceneLabels}
          onClick={toggleSceneLabels}
        >
          Labels
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setCameraPreset('room')}>
          Reset camera
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={selectedEntityIds.length === 0}
          onClick={() => setCameraPreset('selection')}
        >
          Focus selection
        </Button>
      </div>

      <label className="planner-section-control">
        <span>Section mode</span>
        <select
          value={sectionMode}
          onChange={(event) =>
            setSectionMode(event.target.value as 'none' | 'cabinet_front' | 'room_plane')
          }
        >
          <option value="none">None</option>
          <option value="cabinet_front">Cabinet front cutaway</option>
          <option value="room_plane">Room plane</option>
        </select>
      </label>
      {sectionMode === 'room_plane' && (
        <div className="planner-section-control is-range">
          <span id="planner-section-offset-label">Plane offset</span>
          <label>
            <span className="sr-only">Room section plane offset slider</span>
            <input
              type="range"
              min={0}
              max={sixteenthsToInches(project.width)}
              step={0.0625}
              value={sixteenthsToInches(sectionOffset)}
              aria-labelledby="planner-section-offset-label"
              onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;
                if (Number.isFinite(value)) setSectionOffset(inchesToSixteenths(value));
              }}
            />
          </label>
          <label>
            <span className="sr-only">Room section plane offset in inches</span>
            <input
              type="number"
              min={0}
              max={sixteenthsToInches(project.width)}
              step={0.0625}
              value={sixteenthsToInches(sectionOffset)}
              onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;
                if (Number.isFinite(value)) setSectionOffset(inchesToSixteenths(value));
              }}
            />
          </label>
        </div>
      )}

      {(measureMode || measurements.length > 0) && (
        <div className="planner-measurement-list">
          <strong>
            {pendingMeasurementStart ? 'Select the measurement end point' : 'Measurements'}
          </strong>
          {measurements.map((measurement) => (
            <MeasurementRow
              key={measurement.id}
              measurement={measurement}
              onRename={(name) => renameMeasurement(measurement.id, name)}
              onDelete={() => deleteMeasurement(measurement.id)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function MeasurementRow({
  measurement,
  onRename,
  onDelete,
}: {
  measurement: { name: string; distanceInches: number };
  onRename(name: string): void;
  onDelete(): void;
}) {
  const [draft, setDraft] = useState(measurement.name);
  useEffect(() => setDraft(measurement.name), [measurement.name]);
  const commit = () => onRename(draft);
  return (
    <div className="planner-measurement-row">
      <input
        value={draft}
        aria-label={`Rename ${measurement.name}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <span>{Number(measurement.distanceInches.toFixed(4))}&quot;</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        aria-label={`Delete ${measurement.name}`}
      >
        Delete
      </Button>
    </div>
  );
}
