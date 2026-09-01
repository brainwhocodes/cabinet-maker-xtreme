'use client';

import type { ValidationReport } from '@/domain/validation/rules';
import { Badge } from '../atoms/Badge';
import { SolarIcon } from '../atoms/SolarIcon';
import { ValidationAlert } from '../molecules/ValidationAlert';

export interface ValidationPanelProps {
  report: ValidationReport;
  onSelectCabinet: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ValidationPanel({
  report,
  onSelectCabinet,
  isOpen,
  onToggle,
}: ValidationPanelProps) {
  return (
    <div
      className="validation-panel has-background-white"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 320,
        right: 320,
        zIndex: 15,
        borderTop: '1px solid var(--color-line)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        transition: 'max-height 0.25s ease',
        maxHeight: isOpen ? 260 : 36,
        overflow: 'hidden',
      }}
    >
      {/* Drawer Toggle Header */}
      <button
        type="button"
        className="button is-ghost p-2 is-fullwidth is-flex is-justify-content-between is-align-items-center"
        style={{ height: 36, borderBottom: isOpen ? '1px solid var(--color-line)' : 'none' }}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="planner-validation-content"
      >
        <div className="is-flex is-align-items-center" style={{ gap: 8 }}>
          <SolarIcon name="solar:shield-check-linear" size={16} className="has-text-primary" />
          <span className="is-size-7 has-text-weight-bold has-text-dark">
            NKBA & Clearance Diagnostics
          </span>
          <div className="is-flex" style={{ gap: 4 }}>
            {report.errorCount > 0 && (
              <Badge variant="danger" size="sm">
                {report.errorCount} Error{report.errorCount > 1 ? 's' : ''}
              </Badge>
            )}
            {report.warningCount > 0 && (
              <Badge variant="warning" size="sm">
                {report.warningCount} Warning{report.warningCount > 1 ? 's' : ''}
              </Badge>
            )}
            {report.isValid && (
              <Badge variant="success" size="sm">
                All Checks Passed
              </Badge>
            )}
          </div>
        </div>

        <span className="is-size-7 has-text-grey">{isOpen ? 'Collapse ▼' : 'Expand ▲'}</span>
      </button>

      {/* Expanded Issue List */}
      {isOpen && (
        <div
          id="planner-validation-content"
          className="p-3"
          style={{ height: 220, overflowY: 'auto' }}
        >
          {report.issues.length === 0 ? (
            <div className="has-text-centered py-4 has-text-success">
              <SolarIcon name="solar:check-circle-linear" size={28} className="mb-1" />
              <p className="is-size-7 has-text-weight-semibold">
                No architectural or clearance violations detected. Layout meets NKBA standard
                guidelines.
              </p>
            </div>
          ) : (
            report.issues.map((issue) => (
              <ValidationAlert key={issue.id} issue={issue} onSelectCabinet={onSelectCabinet} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
