'use client';

import { useProjectStore } from '@/state/project-store';
import { SolarIcon } from '../atoms/SolarIcon';

export function SelectionActionBar() {
  const {
    project,
    selectedEntityIds,
    primarySelectedEntityId,
    isolationEntityIds,
    duplicateSelection,
    rotateSelection90,
    alignSelection,
    hideSelection,
    distributeSelection,
    isolateSelection,
    showAllEntities,
    removeSelection,
    setCameraPreset,
    convertCabinetToBuilt,
    undo,
    canUndo,
  } = useProjectStore();

  if (selectedEntityIds.length === 0) return null;

  const selectedCabinet = project.cabinets.find((c) => c.id === primarySelectedEntityId);
  const canConvertToBuilt =
    selectedEntityIds.length === 1 && selectedCabinet && selectedCabinet.source === 'stock';

  return (
    <div className="planner-selection-bar" role="toolbar" aria-label="Scene selection actions">
      <div className="planner-selection-badge">
        <span className="planner-selection-count">{selectedEntityIds.length}</span>
        <span className="planner-selection-label">
          {selectedEntityIds.length === 1 ? 'Selected' : 'Selected'}
        </span>
      </div>

      <button
        type="button"
        className="button is-small is-ghost planner-selection-btn"
        onClick={duplicateSelection}
        title="Duplicate selection (Ctrl+D)"
        aria-label="Duplicate selected entities"
      >
        <SolarIcon name="solar:copy-linear" size={15} />
        <span>Duplicate</span>
      </button>

      <button
        type="button"
        className="button is-small is-ghost planner-selection-btn"
        disabled={!canUndo}
        onClick={undo}
        title="Undo last action (Ctrl+Z)"
        aria-label="Undo last action"
      >
        <SolarIcon name="solar:undo-left-linear" size={15} />
        <span>Undo</span>
      </button>
      <button
        type="button"
        className="button is-small is-ghost planner-selection-btn"
        onClick={rotateSelection90}
        title="Rotate / Move to adjacent wall"
        aria-label="Rotate selection 90 degrees"
      >
        <SolarIcon name="solar:restart-linear" size={15} />
        <span>Rotate 90°</span>
      </button>

      <button
        type="button"
        className="button is-small is-ghost planner-selection-btn"
        onClick={() => setCameraPreset('selection')}
        title="Focus 3D camera on selection (Hotkey: F)"
        aria-label="Focus camera on selection"
      >
        <SolarIcon name="solar:maximize-square-3-linear" size={15} />
        <span>Focus</span>
      </button>

      {canConvertToBuilt && (
        <button
          type="button"
          className="button is-small is-ghost planner-selection-btn"
          onClick={() => convertCabinetToBuilt(selectedCabinet.id)}
          title="Convert stock cabinet to customizable built-in"
          aria-label="Convert to custom built cabinet"
        >
          <SolarIcon name="solar:tuning-square-2-linear" size={15} />
          <span>Make Custom</span>
        </button>
      )}

      <label className="planner-selection-select-wrap">
        <span className="sr-only">Align selection</span>
        <select
          aria-label="Align selection"
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            alignSelection(
              event.target.value as 'left' | 'center' | 'right' | 'bottom' | 'middle' | 'top',
            );
            event.target.value = '';
          }}
        >
          <option value="">Align</option>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="bottom">Bottom</option>
          <option value="middle">Middle</option>
          <option value="top">Top</option>
        </select>
      </label>

      <label className="planner-selection-select-wrap">
        <span className="sr-only">Distribute selection</span>
        <select
          aria-label="Distribute selection"
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            distributeSelection(event.target.value as 'equal_gaps' | 'equal_centers');
            event.target.value = '';
          }}
        >
          <option value="">Distribute</option>
          <option value="equal_gaps">Equal gaps</option>
          <option value="equal_centers">Equal centers</option>
        </select>
      </label>

      <button
        type="button"
        className="button is-small is-ghost planner-selection-btn"
        onClick={hideSelection}
        title="Hide selected entities"
        aria-label="Hide selection"
      >
        <SolarIcon name="solar:eye-closed-linear" size={15} />
        <span>Hide</span>
      </button>

      <button
        type="button"
        className="button is-small is-ghost planner-selection-btn"
        onClick={isolationEntityIds.length > 0 ? showAllEntities : isolateSelection}
        title={isolationEntityIds.length > 0 ? 'Show all hidden entities' : 'Isolate selection'}
        aria-label={isolationEntityIds.length > 0 ? 'Show all entities' : 'Isolate selection'}
      >
        <SolarIcon name="solar:eye-linear" size={15} />
        <span>{isolationEntityIds.length > 0 ? 'Show all' : 'Isolate'}</span>
      </button>

      <button
        type="button"
        className="button is-small is-danger is-light planner-selection-btn is-danger-btn"
        onClick={removeSelection}
        title="Remove selected entities (Delete / Backspace)"
        aria-label="Remove selection"
      >
        <SolarIcon name="solar:trash-bin-trash-linear" size={15} />
        <span>Remove</span>
      </button>
    </div>
  );
}
