'use client';

import { captureStudioScreenshot } from '@/rendering/screenshots/capture-canvas';
import { useProjectStore } from '@/state/project-store';
import { SolarIcon } from '../atoms/SolarIcon';
export interface ViewportToolDockProps {
  onOpenAutoFit?: () => void;
}

export function ViewportToolDock({ onOpenAutoFit }: ViewportToolDockProps) {
  const { navigationTool, setNavigationTool, snapEnabled, toggleSnap } = useProjectStore();

  return (
    <div className="planner-viewport-tool-dock" role="toolbar" aria-label="3D Viewport tools">
      <button
        type="button"
        className={`planner-dock-tool-btn ${navigationTool === 'select' ? 'is-active' : ''}`}
        onClick={() => setNavigationTool('select')}
        title="Select & Move Cabinets (Hotkey: V or S)"
        aria-label="Select and move tool"
        aria-pressed={navigationTool === 'select'}
      >
        <span className="planner-dock-tool-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m3 3 7 18 3-7 7-3L3 3z" />
          </svg>
        </span>
        <span className="planner-dock-tool-label">Select</span>
      </button>

      <span className="planner-dock-separator" aria-hidden="true" />

      <button
        type="button"
        className={`planner-dock-tool-btn ${navigationTool === 'orbit' ? 'is-active' : ''}`}
        onClick={() => setNavigationTool('orbit')}
        title="Orbit / Rotate Camera (Hotkey: O)"
        aria-label="Orbit camera tool"
        aria-pressed={navigationTool === 'orbit'}
      >
        <span className="planner-dock-tool-icon">
          <SolarIcon name="solar:refresh-circle-linear" size={18} />
        </span>
        <span className="planner-dock-tool-label">Orbit</span>
      </button>

      <button
        type="button"
        className={`planner-dock-tool-btn ${navigationTool === 'pan' ? 'is-active' : ''}`}
        onClick={() => setNavigationTool('pan')}
        title="Pan Camera (Hotkey: P or Right-Click Drag)"
        aria-label="Pan camera tool"
        aria-pressed={navigationTool === 'pan'}
      >
        <span className="planner-dock-tool-icon">
          <SolarIcon name="solar:hand-shake-linear" size={18} />
        </span>
        <span className="planner-dock-tool-label">Pan</span>
      </button>

      <button
        type="button"
        className={`planner-dock-tool-btn ${navigationTool === 'zoom' ? 'is-active' : ''}`}
        onClick={() => setNavigationTool('zoom')}
        title="Zoom Mode (Scroll wheel or pinch)"
        aria-label="Zoom camera tool"
        aria-pressed={navigationTool === 'zoom'}
      >
        <span className="planner-dock-tool-icon">
          <SolarIcon name="solar:magnifer-linear" size={18} />
        </span>
        <span className="planner-dock-tool-label">Zoom</span>
      </button>

      <button
        type="button"
        className={`planner-dock-tool-btn ${navigationTool === 'walk' ? 'is-active' : ''}`}
        onClick={() => setNavigationTool(navigationTool === 'walk' ? 'select' : 'walk')}
        title="Walkthrough Eye-Level Mode (Hotkey: W, WASD to walk)"
        aria-label="First-person walkthrough mode"
        aria-pressed={navigationTool === 'walk'}
      >
        <span className="planner-dock-tool-icon">
          <SolarIcon name="solar:running-2-linear" size={18} />
        </span>
        <span className="planner-dock-tool-label">Walk</span>
      </button>
      <span className="planner-dock-separator" aria-hidden="true" />

      <button
        type="button"
        className={`planner-dock-tool-btn ${navigationTool === 'measure' ? 'is-active' : ''}`}
        onClick={() => setNavigationTool(navigationTool === 'measure' ? 'orbit' : 'measure')}
        title="Measure Point-to-Point (Hotkey: M)"
        aria-label="Measurement tool"
        aria-pressed={navigationTool === 'measure'}
      >
        <span className="planner-dock-tool-icon">
          <SolarIcon name="solar:ruler-linear" size={18} />
        </span>
        <span className="planner-dock-tool-label">Measure</span>
      </button>

      {onOpenAutoFit && (
        <button
          type="button"
          className="planner-dock-tool-btn"
          onClick={onOpenAutoFit}
          title="Auto-Fit Layout Assistant"
          aria-label="Auto-fit layout"
        >
          <span className="planner-dock-tool-icon">
            <SolarIcon name="solar:magic-stick-3-linear" size={18} />
          </span>
          <span className="planner-dock-tool-label">Auto-fit</span>
        </button>
      )}

      <button
        type="button"
        className={`planner-dock-tool-btn ${snapEnabled ? 'is-active' : ''}`}
        onClick={toggleSnap}
        title={`Magnetic Snapping (${snapEnabled ? 'Enabled' : 'Disabled'})`}
        aria-label="Toggle magnetic snapping"
        aria-pressed={snapEnabled}
      >
        <span className="planner-dock-tool-icon">
          <SolarIcon name="solar:magnet-linear" size={18} />
        </span>
        <span className="planner-dock-tool-label">Snap</span>
      </button>

      <span className="planner-dock-separator" aria-hidden="true" />

      <button
        type="button"
        className="planner-dock-tool-btn"
        onClick={() => captureStudioScreenshot()}
        title="Capture High-Res Viewport Screenshot"
        aria-label="Export viewport screenshot"
      >
        <span className="planner-dock-tool-icon">
          <SolarIcon name="solar:camera-linear" size={18} />
        </span>
        <span className="planner-dock-tool-label">Capture</span>
      </button>
    </div>
  );
}
