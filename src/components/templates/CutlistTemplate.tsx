'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import {
  downloadCuttingTicketsPdf,
  generateCuttingTickets,
} from '@/domain/manufacturing/cutting-tickets';
import { downloadDxfFile, exportSheetToDxf } from '@/domain/manufacturing/dxf-exporter';
import {
  calculateEdgeBandingRequirements,
  type EdgeBandingConfig,
} from '@/domain/manufacturing/edge-banding';
import {
  type CutPart,
  type GrainDirection,
  nestCutParts,
} from '@/domain/manufacturing/nesting-engine';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { SolarIcon } from '../atoms/SolarIcon';
import { SheetNestingVisualizer } from '../organisms/SheetNestingVisualizer';

export function CutlistTemplate() {
  const { project } = useProjectStore();
  const [activeMaterial, setActiveMaterial] = useState<string>('all');

  // Extract all cut parts from project cabinets
  const cutParts = useMemo(() => {
    const parts: CutPart[] = [];

    for (const cab of project.cabinets) {
      const def = getCabinetDefinitionByCode(cab.definitionId);
      if (!def) continue;

      const spec = resolveCabinetSpec(def, cab);
      const model = buildCabinetParts(spec);

      for (const part of model.parts) {
        // Skip hardware and shelf pins
        if (part.category === 'hardware' || part.category === 'shelf_hardware') continue;

        const isBacker = part.id === 'panel_back_board' || part.id.startsWith('corner_back_');
        const material = isBacker ? 'backer_1_4' : 'plywood_3_4';

        const isSide = part.id.includes('side');
        const isShelfOrDeck = part.category === 'shelf' || part.id.includes('deck');

        const grain: GrainDirection = isSide ? 'lengthwise' : 'either';

        const edgeBanding: EdgeBandingConfig | undefined =
          isShelfOrDeck || isSide ? { type: 'pvc_2mm', coverage: 'front' } : undefined;

        // Use flat rectangular sheet dimensions (sort descending for length/width)
        const dims = [part.widthInches, part.heightInches, part.depthInches].sort((a, b) => b - a);
        const length = dims[0];
        const width = dims[1];

        parts.push({
          id: `${cab.id}-${part.id}`,
          name: part.name,
          cabinetCode: cab.definitionId,
          width: Math.round(width * 100) / 100,
          height: Math.round(length * 100) / 100,
          material,
          grain,
          edgeBanding,
        });
      }
    }

    return parts;
  }, [project.cabinets]);

  // Run 2D nesting
  const nestingResult = useMemo(() => {
    const filter = activeMaterial === 'all' ? undefined : activeMaterial;
    return nestCutParts(cutParts, filter, {
      sheetWidth: 48,
      sheetHeight: 96,
      kerf: 0.125,
      trimMargin: 0.5,
    });
  }, [activeMaterial, cutParts]);

  // Calculate edge banding requirements
  const edgeBandingSummary = useMemo(() => {
    return calculateEdgeBandingRequirements(cutParts);
  }, [cutParts]);

  const downloadCsv = () => {
    const headers = [
      'Cabinet',
      'Part Name',
      'Finished Width (in)',
      'Finished Length (in)',
      'Material',
      'Grain',
      'Edge Banding',
    ];
    const rows = cutParts.map((p) => [
      p.cabinetCode,
      `"${p.name}"`,
      p.width,
      p.height,
      p.material,
      p.grain,
      p.edgeBanding ? `${p.edgeBanding.type} (${p.edgeBanding.coverage})` : 'none',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cabcraft-cutlist-${project.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="cutlist-layout is-flex is-flex-direction-column"
      style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header */}
      <header
        className="page-toolbar navbar px-4 is-flex is-align-items-center is-justify-content-between"
        style={{
          borderBottom: '1px solid var(--color-line)',
          backgroundColor: 'var(--color-surface)',
          minHeight: 56,
        }}
      >
        <div className="page-toolbar-title is-flex is-align-items-center">
          <Link prefetch={false} href="/planner/" className="button is-small is-ghost pl-0">
            <SolarIcon name="solar:arrow-left-linear" size={18} className="mr-1" />
            <span>Back to 3D Planner</span>
          </Link>
          <span className="has-text-grey-light">/</span>
          <span className="has-text-weight-bold is-size-6">
            {project.name} Cut List & 2D Nesting
          </span>
        </div>

        <div className="page-toolbar-actions is-flex is-align-items-center" style={{ gap: 8 }}>
          <Button size="sm" variant="secondary" onClick={downloadCsv}>
            <SolarIcon name="solar:download-linear" size={15} />
            <span>Export CSV</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const tickets = generateCuttingTickets(project);
              downloadCuttingTicketsPdf(tickets, project.name);
            }}
          >
            <SolarIcon name="solar:printer-linear" size={15} />
            <span>Cutting Tickets</span>
          </Button>
          <Link prefetch={false} href="/bom/" className="button is-small is-ghost">
            <span>View BOM</span>
          </Link>
          <Link prefetch={false} href="/assemble/" className="button is-small is-primary">
            <span>Assembly Guide</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="section p-4 is-flex-grow-1">
        <div className="container" style={{ maxWidth: 1100 }}>
          {/* Summary Banner */}
          <div className="box p-4 mb-4 has-background-white">
            <div className="columns is-mobile is-multiline is-vcentered">
              <div className="column is-3-tablet is-6-mobile">
                <span className="is-size-7 has-text-grey is-uppercase has-font-weight-semibold">
                  Total Plywood Sheets
                </span>
                <p className="title is-4 has-text-info">{nestingResult.totalSheets}</p>
                <p className="is-size-7 has-text-grey">48" × 96" Standard</p>
              </div>
              <div className="column is-3-tablet is-6-mobile">
                <span className="is-size-7 has-text-grey is-uppercase has-font-weight-semibold">
                  Overall Material Yield
                </span>
                <p className="title is-4 has-text-success">
                  {nestingResult.overallYieldPercentage}%
                </p>
                <p className="is-size-7 has-text-grey">1/8" kerf & 1/2" trim margin</p>
              </div>
              <div className="column is-3-tablet is-6-mobile">
                <span className="is-size-7 has-text-grey is-uppercase has-font-weight-semibold">
                  Total Panel Parts
                </span>
                <p className="title is-4">{cutParts.length}</p>
                <p className="is-size-7 has-text-grey">From {project.cabinets.length} cabinets</p>
              </div>
              <div className="column is-3-tablet is-6-mobile">
                <span className="is-size-7 has-text-grey is-uppercase has-font-weight-semibold">
                  Edge Banding Rolls
                </span>
                <p className="title is-4 has-text-warning-dark">
                  {edgeBandingSummary[0]?.totalLinearFeet ?? 0}'
                </p>
                <p className="is-size-7 has-text-grey">
                  {edgeBandingSummary[0]?.rollCount250ft ?? 0} roll(s) of 250ft
                </p>
              </div>
            </div>
          </div>

          {/* Material Filter Tabs */}
          <div className="tabs is-boxed mb-4">
            <ul>
              <li className={activeMaterial === 'all' ? 'is-active' : ''}>
                <button
                  type="button"
                  className="button is-ghost"
                  onClick={() => setActiveMaterial('all')}
                >
                  All Materials ({cutParts.length})
                </button>
              </li>
              <li className={activeMaterial === 'plywood_3_4' ? 'is-active' : ''}>
                <button
                  type="button"
                  className="button is-ghost"
                  onClick={() => setActiveMaterial('plywood_3_4')}
                >
                  3/4" Carcass Plywood (
                  {cutParts.filter((p) => p.material === 'plywood_3_4').length})
                </button>
              </li>
              <li className={activeMaterial === 'backer_1_4' ? 'is-active' : ''}>
                <button
                  type="button"
                  className="button is-ghost"
                  onClick={() => setActiveMaterial('backer_1_4')}
                >
                  1/4" Backer Board ({cutParts.filter((p) => p.material === 'backer_1_4').length})
                </button>
              </li>
            </ul>
          </div>

          {/* Nested Sheet Diagrams */}
          {nestingResult.sheets.length === 0 ? (
            <div className="notification is-light has-text-centered p-6">
              <h4 className="title is-5 mb-2">No Cut Parts Found</h4>
              <p className="has-text-grey">
                Add cabinets to your 3D layout in the planner to generate sheet nesting diagrams.
              </p>
            </div>
          ) : (
            nestingResult.sheets.map((sheet) => (
              <SheetNestingVisualizer
                key={`sheet-${sheet.sheetIndex}-${sheet.material}`}
                sheet={sheet}
                onExportDxf={(s) =>
                  downloadDxfFile(`sheet-${s.sheetIndex}-${s.material}.dxf`, exportSheetToDxf(s))
                }
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
