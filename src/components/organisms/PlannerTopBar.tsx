'use client';

import Link from 'next/link';
import { useState } from 'react';
import { validateRoomProject } from '@/domain/validation/rules';
import { captureStudioScreenshot } from '@/rendering/screenshots/capture-canvas';
import { useProjectStore } from '@/state/project-store';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { SolarIcon } from '../atoms/SolarIcon';
import { UndoRedoGroup } from '../molecules/UndoRedoGroup';

const CAMERA_PRESET_OPTIONS = [
  { value: 'room', label: 'Room' },
  { value: 'wall', label: 'Wall' },
  { value: 'selection', label: 'Selection' },
];

export interface PlannerTopBarProps {
  onOpenAutoFit: () => void;
}

export function PlannerTopBar({ onOpenAutoFit }: PlannerTopBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    project,
    undo,
    redo,
    canUndo,
    canRedo,
    viewMode,
    setViewMode,
    cameraPreset,
    setCameraPreset,
    showDimensions,
    toggleDimensions,
    toggleWebMCPDrawer,
    webMCPLogs,
    completeBuiltInRuns,
  } = useProjectStore();

  const validation = validateRoomProject(project);
  const recentErrors = validation.errorCount;
  const recentWarnings = validation.warningCount;

  return (
    <nav
      className="navbar px-4 px-2-mobile is-flex is-align-items-center is-justify-content-between"
      style={{
        borderBottom: '1px solid var(--color-line)',
        backgroundColor: 'var(--color-surface)',
        minHeight: 56,
        zIndex: 20,
      }}
      aria-label="main navigation"
    >
      {/* Brand & Project Info */}
      <div className="is-flex is-align-items-center" style={{ gap: 8 }}>
        <Link
          prefetch={false}
          href="/"
          className="is-flex is-align-items-center has-text-dark"
          style={{ gap: 8 }}
        >
          <span
            className="is-flex is-align-items-center is-justify-content-center has-background-primary has-text-white"
            style={{ width: 32, height: 32, borderRadius: 8, fontWeight: 'bold' }}
          >
            <SolarIcon name="solar:box-minimalistic-linear" size={18} />
          </span>
          <span
            className="has-text-weight-bold is-size-6 is-hidden-mobile"
            style={{ letterSpacing: '-0.02em' }}
          >
            CabCraft 3D
          </span>
        </Link>

        <span className="has-text-grey-light is-hidden-mobile">/</span>

        <span className="is-size-7 has-text-weight-semibold has-text-dark is-hidden-mobile">
          {project.name}
        </span>

        <UndoRedoGroup
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          revision={project.revision}
        />
      </div>

      {/* Center View Controls */}
      {/* Center View Controls */}
      <div className="planner-topbar-desktop">
        <div className="buttons has-addons mb-0">
          <Button
            size="sm"
            variant={viewMode === 'perspective' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('perspective')}
            title="3D Perspective View"
          >
            3D View
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'top' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('top')}
            title="2D Top-Down Blueprint"
          >
            Top
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'elevation' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('elevation')}
            title="2D Front Wall Elevation"
          >
            Wall
          </Button>
        </div>
        <div style={{ width: 112 }}>
          <Select
            selectSize="sm"
            aria-label="Camera preset"
            options={CAMERA_PRESET_OPTIONS}
            value={cameraPreset}
            onChange={(event) =>
              setCameraPreset(event.target.value as 'room' | 'wall' | 'selection')
            }
          />
        </div>

        <Button
          size="sm"
          variant={showDimensions ? 'secondary' : 'ghost'}
          icon="solar:ruler-linear"
          onClick={toggleDimensions}
          title="Toggle Dimension Annotations"
        >
          {showDimensions ? 'Dims' : 'Dims off'}
        </Button>

        <Button
          size="sm"
          variant="secondary"
          icon="solar:magic-wand-3-linear"
          data-auto-fit-trigger
          onClick={onOpenAutoFit}
          title="Run Auto-Fit Wall Algorithm"
        >
          Auto-fit
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon="solar:layers-linear"
          data-complete-runs-trigger
          onClick={() => completeBuiltInRuns(project.activeWallId, undefined, project.revision)}
          title="Preview countertops, panels, toe kicks, crown, and light rail"
        >
          Complete runs
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon="solar:camera-linear"
          onClick={() => captureStudioScreenshot({ download: true })}
          title="Capture and download high-resolution 3D design snapshot"
        >
          Snapshot
        </Button>
      </div>

      {/* Right Navigation & Status Actions */}
      {/* Right Navigation & Status Actions */}
      <div className="planner-topbar-desktop">
        {/* Validation Status Pill */}
        <div className="is-flex is-align-items-center" style={{ gap: 4 }}>
          {recentErrors > 0 ? (
            <Badge variant="danger" icon="solar:danger-triangle-linear" size="sm">
              {recentErrors} Error{recentErrors > 1 ? 's' : ''}
            </Badge>
          ) : recentWarnings > 0 ? (
            <Badge variant="warning" icon="solar:info-circle-linear" size="sm">
              {recentWarnings} Warning{recentWarnings > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge variant="success" icon="solar:check-circle-linear" size="sm">
              NKBA Valid
            </Badge>
          )}
        </div>

        {/* WebMCP Agent Activity Trigger */}
        <Button
          size="sm"
          variant="secondary"
          icon="solar:user-speak-linear"
          onClick={toggleWebMCPDrawer}
          title="Inspect WebMCP Agent Tools & Logs"
        >
          Agent ({webMCPLogs.length})
        </Button>

        {/* Links to Cut List, BOM and Assembly */}
        <Link prefetch={false} href="/cutlist/" className="button is-small is-ghost">
          <SolarIcon name="solar:layers-linear" size={16} className="mr-1" />
          <span>Cut List</span>
        </Link>

        <Link prefetch={false} href="/bom/" className="button is-small is-primary is-outlined">
          <SolarIcon name="solar:bill-list-linear" size={16} className="mr-1" />
          <span>BOM</span>
        </Link>
        <Link prefetch={false} href="/assemble/" className="button is-small is-primary">
          <SolarIcon name="solar:clipboard-check-linear" size={16} className="mr-1" />
          <span>Assemble</span>
        </Link>
      </div>
      {/* Mobile Toggle & View Controls */}
      <div className="planner-topbar-mobile-toggle is-align-items-center" style={{ gap: 6 }}>
        <div className="buttons has-addons mb-0">
          <Button
            size="sm"
            variant={viewMode === 'perspective' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('perspective')}
            title="3D Perspective View"
          >
            3D
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'top' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('top')}
            title="2D Top-Down Blueprint"
          >
            Top
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'elevation' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('elevation')}
            title="2D Front Wall Elevation"
          >
            Wall
          </Button>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon="solar:settings-linear"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          title="More tools and actions"
          aria-label="Toggle editor actions menu"
          aria-expanded={isMobileMenuOpen}
        />
      </div>

      {/* Mobile Actions Dropdown */}
      {isMobileMenuOpen && (
        <div className="planner-topbar-mobile-menu" role="menu" aria-label="Editor tools">
          <div className="planner-topbar-mobile-row">
            <span className="is-size-7 has-text-weight-bold has-text-grey mr-2">Camera:</span>
            <div style={{ flex: 1, minWidth: 120 }}>
              <Select
                selectSize="sm"
                aria-label="Camera preset"
                options={CAMERA_PRESET_OPTIONS}
                value={cameraPreset}
                onChange={(event) =>
                  setCameraPreset(event.target.value as 'room' | 'wall' | 'selection')
                }
              />
            </div>
            <Button
              size="sm"
              variant={showDimensions ? 'secondary' : 'ghost'}
              icon="solar:ruler-linear"
              onClick={toggleDimensions}
              title="Toggle Dimension Annotations"
            >
              {showDimensions ? 'Dims' : 'Dims off'}
            </Button>
          </div>

          <div className="planner-topbar-mobile-row">
            <Button
              size="sm"
              variant="secondary"
              icon="solar:magic-wand-3-linear"
              data-auto-fit-trigger
              onClick={() => {
                onOpenAutoFit();
                setIsMobileMenuOpen(false);
              }}
            >
              Auto-fit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="solar:layers-linear"
              data-complete-runs-trigger
              onClick={() => {
                completeBuiltInRuns(project.activeWallId, undefined, project.revision);
                setIsMobileMenuOpen(false);
              }}
            >
              Complete runs
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="solar:camera-linear"
              onClick={() => {
                captureStudioScreenshot({ download: true });
                setIsMobileMenuOpen(false);
              }}
            >
              Snapshot
            </Button>
          </div>

          <div className="planner-topbar-mobile-row">
            <Button
              size="sm"
              variant="secondary"
              icon="solar:user-speak-linear"
              onClick={() => {
                toggleWebMCPDrawer();
                setIsMobileMenuOpen(false);
              }}
            >
              Agent ({webMCPLogs.length})
            </Button>
            <div className="is-flex is-align-items-center" style={{ gap: 4 }}>
              {recentErrors > 0 ? (
                <Badge variant="danger" icon="solar:danger-triangle-linear" size="sm">
                  {recentErrors} Error{recentErrors > 1 ? 's' : ''}
                </Badge>
              ) : recentWarnings > 0 ? (
                <Badge variant="warning" icon="solar:info-circle-linear" size="sm">
                  {recentWarnings} Warning{recentWarnings > 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="success" icon="solar:check-circle-linear" size="sm">
                  NKBA Valid
                </Badge>
              )}
            </div>
          </div>

          <div
            className="planner-topbar-mobile-row"
            style={{ borderTop: '1px solid var(--color-line)', paddingTop: 8 }}
          >
            <Link prefetch={false} href="/cutlist/" className="button is-small is-ghost">
              <SolarIcon name="solar:layers-linear" size={16} className="mr-1" />
              <span>Cut List</span>
            </Link>
            <Link prefetch={false} href="/bom/" className="button is-small is-primary is-outlined">
              <SolarIcon name="solar:bill-list-linear" size={16} className="mr-1" />
              <span>BOM</span>
            </Link>
            <Link prefetch={false} href="/assemble/" className="button is-small is-primary">
              <SolarIcon name="solar:clipboard-check-linear" size={16} className="mr-1" />
              <span>Assemble</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
