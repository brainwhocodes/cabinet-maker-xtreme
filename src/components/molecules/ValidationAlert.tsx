'use client';

import type { ValidationIssue } from '@/domain/validation/rules';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';

export interface ValidationAlertProps {
  issue: ValidationIssue;
  onSelectCabinet?: (cabinetId: string) => void;
}

export function ValidationAlert({ issue, onSelectCabinet }: ValidationAlertProps) {
  const isError = issue.severity === 'error';
  const icon = isError ? 'solar:danger-triangle-linear' : 'solar:info-circle-linear';

  return (
    <div
      className="p-3 mb-2 is-rounded"
      style={{
        backgroundColor: isError
          ? 'var(--color-danger-light, #FAECEB)'
          : 'var(--color-accent-light, #FCF4EB)',
        borderLeft: `3px solid ${isError ? 'var(--color-danger)' : 'var(--color-accent)'}`,
        borderRadius: 6,
      }}
    >
      <div className="is-flex is-align-items-center is-justify-content-between mb-1">
        <Badge variant={isError ? 'danger' : 'warning'} icon={icon} size="sm">
          {issue.title}
        </Badge>
        {issue.affectedCabinetIds.length > 0 && onSelectCabinet && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSelectCabinet(issue.affectedCabinetIds[0])}
            title="Highlight affected cabinet in 3D scene"
            className="is-size-7 p-0"
          >
            Locate
          </Button>
        )}
      </div>
      <p className="is-size-7 has-text-dark mb-1">{issue.message}</p>
      {issue.suggestedAction && (
        <p className="is-size-7 has-text-grey font-italic mb-0">
          <strong>Fix:</strong> {issue.suggestedAction}
        </p>
      )}
    </div>
  );
}
