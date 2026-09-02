import { jsPDF } from 'jspdf';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import type { RoomProject } from '@/domain/geometry/models';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import { deductEdgeBanding, type EdgeBandingConfig } from './edge-banding';

export interface CuttingTicket {
  ticketId: string;
  cabinetId: string;
  cabinetCode: string;
  cabinetName: string;
  partId: string;
  partName: string;
  material: string;
  finishedWidth: number;
  finishedHeight: number;
  rawWidth: number;
  rawHeight: number;
  edgeBandingSummary: string;
  barcodeValue: string;
}

/**
 * Extracts and calculates cutting tickets for all cabinet parts in the project.
 */
export function generateCuttingTickets(project: RoomProject): CuttingTicket[] {
  const tickets: CuttingTicket[] = [];
  let counter = 1;

  for (const cab of project.cabinets) {
    const def = getCabinetDefinitionByCode(cab.definitionId);
    if (!def) continue;

    const spec = resolveCabinetSpec(def, cab);
    const model = buildCabinetParts(spec);

    for (const part of model.parts) {
      if (part.category === 'hardware' || part.category === 'shelf_hardware') continue;

      const isBacker = part.id === 'panel_back_board' || part.id.startsWith('corner_back_');
      const material = isBacker
        ? '1/4" Backer Board'
        : `3/4" Plywood (${spec.finish.name} / ${spec.interiorFinish.name})`;

      const isSide = part.id.includes('side');
      const isShelfOrDeck = part.category === 'shelf' || part.id.includes('deck');

      const edgeBandingConfig: EdgeBandingConfig | undefined =
        isShelfOrDeck || isSide ? { type: 'pvc_2mm', coverage: 'front' } : undefined;

      const dims = [part.widthInches, part.heightInches, part.depthInches].sort((a, b) => b - a);
      const finishedLength = Math.round(dims[0] * 100) / 100;
      const finishedWidth = Math.round(dims[1] * 100) / 100;

      const raw = deductEdgeBanding(finishedWidth, finishedLength, edgeBandingConfig);

      const bandingLabel = edgeBandingConfig
        ? `${edgeBandingConfig.type} on ${edgeBandingConfig.coverage}`
        : 'None';

      const padCounter = counter.toString().padStart(3, '0');
      tickets.push({
        ticketId: `TICK-${padCounter}`,
        cabinetId: cab.id,
        cabinetCode: cab.definitionId,
        cabinetName: def.name,
        partId: part.id,
        partName: part.name,
        material,
        finishedWidth,
        finishedHeight: finishedLength,
        rawWidth: Math.round(raw.rawWidth * 100) / 100,
        rawHeight: Math.round(raw.rawHeight * 100) / 100,
        edgeBandingSummary: bandingLabel,
        barcodeValue: `CAB-${cab.definitionId}-${part.id.toUpperCase()}`,
      });

      counter++;
    }
  }

  return tickets;
}

/**
 * Generates a printable shop label PDF document (6 labels per letter page).
 */
export function downloadCuttingTicketsPdf(tickets: CuttingTicket[], projectName = 'Project'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter', // 8.5" x 11"
  });

  const labelsPerPage = 6;
  const labelWidth = 3.8;
  const labelHeight = 3.1;
  const marginX = 0.35;
  const marginY = 0.5;
  const gapX = 0.2;
  const gapY = 0.25;

  let labelIndex = 0;

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const posOnPage = labelIndex % labelsPerPage;

    if (i > 0 && posOnPage === 0) {
      doc.addPage();
    }

    const col = posOnPage % 2;
    const row = Math.floor(posOnPage / 2);
    const x = marginX + col * (labelWidth + gapX);
    const y = marginY + row * (labelHeight + gapY);
    // Label border
    doc.setDrawColor(180, 190, 200);
    doc.setLineWidth(0.015);
    doc.roundedRect(x, y, labelWidth, labelHeight, 0.1, 0.1, 'S');

    // Header bar
    doc.setFillColor(30, 41, 59);
    doc.rect(x, y, labelWidth, 0.45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${t.cabinetCode}: ${t.ticketId}`, x + 0.15, y + 0.28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(t.cabinetName, x + labelWidth - 0.15, y + 0.28, { align: 'right' });

    // Part details
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(t.partName, x + 0.15, y + 0.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Material: ${t.material}`, x + 0.15, y + 1.05);

    // Cut Dimensions Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x + 0.15, y + 1.25, labelWidth - 0.3, 0.75, 0.05, 0.05, 'F');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7);
    doc.text('RAW CUT SIZE', x + 0.3, y + 1.45);
    doc.text('FINISHED SIZE', x + 2.1, y + 1.45);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${t.rawWidth}" × ${t.rawHeight}"`, x + 0.3, y + 1.78);
    doc.text(`${t.finishedWidth}" × ${t.finishedHeight}"`, x + 2.1, y + 1.78);

    // Edge Banding & Tracking
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Edge Banding: ${t.edgeBandingSummary}`, x + 0.15, y + 2.3);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(`* ${t.barcodeValue} *`, x + 0.15, y + 2.7);

    labelIndex++;
  }

  doc.save(`${projectName.toLowerCase().replace(/\s+/g, '-')}-cutting-tickets.pdf`);
}
