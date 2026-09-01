'use client';

import {
  formatFractionalInches,
  type Sixteenths,
  sixteenthsToMillimeters,
} from '@/domain/geometry/units';

export interface DimensionDisplayProps {
  sixteenths: Sixteenths;
  showMetric?: boolean;
  className?: string;
  label?: string;
}

export function DimensionDisplay({
  sixteenths,
  showMetric = false,
  className = '',
  label,
}: DimensionDisplayProps) {
  const imperialStr = formatFractionalInches(sixteenths);
  const metricStr = `${sixteenthsToMillimeters(sixteenths)} mm`;

  return (
    <span className={`dimension tabular-nums ${className}`}>
      {label && <span className="has-text-grey mr-1">{label}:</span>}
      <strong className="has-text-weight-semibold">{imperialStr}</strong>
      {showMetric && <span className="has-text-grey-light is-size-7 ml-1">({metricStr})</span>}
    </span>
  );
}
