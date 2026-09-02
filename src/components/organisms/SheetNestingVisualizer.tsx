'use client';

import type { NestedSheet } from '@/domain/manufacturing/nesting-engine';
import { Button } from '../atoms/Button';
import { SolarIcon } from '../atoms/SolarIcon';

export interface SheetNestingVisualizerProps {
  sheet: NestedSheet;
  onExportDxf?: (sheet: NestedSheet) => void;
}

const PART_PALETTE = [
  '#2563EB', // Blue
  '#0D9488', // Teal
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#E11D48', // Rose
  '#059669', // Emerald
  '#4F46E5', // Indigo
  '#EA580C', // Orange
];

export function SheetNestingVisualizer({ sheet, onExportDxf }: SheetNestingVisualizerProps) {
  // SVG coordinate system matches inches (0,0 at top-left)
  const viewBox = `0 0 ${sheet.width} ${sheet.height}`;

  const downloadSvg = () => {
    const svgEl = document.getElementById(`nested-sheet-svg-${sheet.sheetIndex}`);
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sheet-${sheet.sheetIndex}-${sheet.material}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sheet-nesting-card box p-4 mb-5">
      <div className="is-flex is-align-items-center is-justify-content-between mb-3">
        <div>
          <h4 className="title is-6 mb-1">
            Sheet {sheet.sheetIndex}: {sheet.material.replaceAll('_', ' ')}
          </h4>
          <p className="subtitle is-7 has-text-grey">
            {sheet.width}" × {sheet.height}" | {sheet.placedParts.length} parts | Yield:{' '}
            <strong className="has-text-success">{sheet.yieldPercentage}%</strong> (Waste:{' '}
            {Math.round(((sheet.totalAreaSqIn - sheet.usedAreaSqIn) / 144) * 10) / 10} sq ft)
          </p>
        </div>
        <div className="buttons are-small">
          <Button size="sm" variant="secondary" onClick={downloadSvg}>
            <SolarIcon name="solar:download-linear" size={15} />
            <span>Download SVG</span>
          </Button>
          {onExportDxf && (
            <Button size="sm" variant="primary" onClick={() => onExportDxf(sheet)}>
              <SolarIcon name="solar:document-text-linear" size={15} />
              <span>Export DXF</span>
            </Button>
          )}
        </div>
      </div>

      <div
        className="sheet-svg-wrapper"
        style={{
          maxHeight: 540,
          overflow: 'auto',
          background: '#0F172A',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <svg
          id={`nested-sheet-svg-${sheet.sheetIndex}`}
          viewBox={viewBox}
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 480 }}
          role="img"
          aria-label={`Cutting layout for sheet ${sheet.sheetIndex}`}
        >
          <title>{`Sheet ${sheet.sheetIndex} Cutting Layout`}</title>
          {/* Sheet Background */}
          <rect
            x="0"
            y="0"
            width={sheet.width}
            height={sheet.height}
            fill="#1E293B"
            stroke="#475569"
            strokeWidth="0.5"
          />

          {/* Primary Rip/Cut Guidelines */}
          {sheet.ripCuts.map((cut) =>
            cut.axis === 'x' ? (
              <line
                key={`cut-x-${cut.position}-${cut.start}`}
                x1={cut.position}
                y1={cut.start}
                x2={cut.position}
                y2={cut.end}
                stroke="#EF4444"
                strokeWidth="0.25"
                strokeDasharray="1,1"
              />
            ) : (
              <line
                key={`cut-y-${cut.position}-${cut.start}`}
                x1={cut.start}
                y1={cut.position}
                x2={cut.end}
                y2={cut.position}
                stroke="#EF4444"
                strokeWidth="0.25"
                strokeDasharray="1,1"
              />
            ),
          )}

          {/* Placed Cabinet Panels */}
          {sheet.placedParts.map((placed, index) => {
            const color = PART_PALETTE[index % PART_PALETTE.length];
            return (
              <g key={`${placed.part.id}-${placed.x}-${placed.y}`}>
                <rect
                  x={placed.x}
                  y={placed.y}
                  width={placed.width}
                  height={placed.height}
                  fill={color}
                  fillOpacity="0.22"
                  stroke={color}
                  strokeWidth="0.4"
                  rx="0.2"
                />

                {/* Edge Banding Indicator (Dashed outer border if banded) */}
                {placed.part.edgeBanding && placed.part.edgeBanding.coverage !== 'none' && (
                  <rect
                    x={placed.x + 0.15}
                    y={placed.y + 0.15}
                    width={placed.width - 0.3}
                    height={placed.height - 0.3}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="0.25"
                    strokeDasharray="0.8,0.5"
                  />
                )}

                {/* Part Label & Dimensions */}
                {placed.width >= 5 && placed.height >= 4 && (
                  <>
                    <text
                      x={placed.x + placed.width / 2}
                      y={placed.y + placed.height / 2 - 0.6}
                      fill="#F8FAFC"
                      fontSize={Math.min(1.8, Math.max(0.8, placed.height * 0.18))}
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {placed.part.cabinetCode}: {placed.part.name.replace('Panel', '')}
                    </text>
                    <text
                      x={placed.x + placed.width / 2}
                      y={placed.y + placed.height / 2 + 1.2}
                      fill="#94A3B8"
                      fontSize={Math.min(1.4, Math.max(0.65, placed.height * 0.14))}
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {placed.width}" × {placed.height}"{placed.rotated ? ' ↻' : ''}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
