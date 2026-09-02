import type { PanelMachiningOperations } from './joinery-engine';
import type { NestedSheet } from './nesting-engine';

/**
 * Generates an AutoCAD R12/2000 ASCII DXF document for CNC router tables.
 * Standardized across CAM tools (Vectric VCarve, Fusion 360, Carbide Create, LightBurn).
 */
export function exportSheetToDxf(sheet: NestedSheet): string {
  const lines: string[] = [];

  // 1. Header & Layer Tables
  lines.push('0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC');
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '5');

  // Layer 0 - Sheet outline
  addDxfLayer(lines, '0', 7); // White
  addDxfLayer(lines, 'OUTLINE_CUT', 4); // Cyan
  addDxfLayer(lines, 'DADO_POCKET', 6); // Magenta
  addDxfLayer(lines, 'DRILL_5MM', 3); // Green
  addDxfLayer(lines, 'PART_LABELS', 5); // Blue

  lines.push('0', 'ENDTAB', '0', 'ENDSEC');

  // 2. Entities
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // Sheet boundary rectangle on Layer 0
  addDxfRect(lines, '0', 0, 0, sheet.width, sheet.height);

  // Placed parts on Layer OUTLINE_CUT
  for (const placed of sheet.placedParts) {
    addDxfRect(lines, 'OUTLINE_CUT', placed.x, placed.y, placed.width, placed.height);

    // Text Label on Layer PART_LABELS
    const labelX = Math.round((placed.x + placed.width / 2) * 100) / 100;
    const labelY = Math.round((placed.y + placed.height / 2) * 100) / 100;
    addDxfText(
      lines,
      'PART_LABELS',
      `${placed.part.cabinetCode}_${placed.part.name.replace(/\s+/g, '_')}`,
      labelX,
      labelY,
      1.2,
    );
  }

  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n');
}

/**
 * Exports machining operations for an individual cabinet panel with dados and 5mm drill holes.
 */
export function exportPanelMachiningToDxf(panel: PanelMachiningOperations): string {
  const lines: string[] = [];

  lines.push('0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC');
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '5');

  addDxfLayer(lines, '0', 7);
  addDxfLayer(lines, 'OUTLINE_CUT', 4);
  addDxfLayer(lines, 'DADO_POCKET', 6);
  addDxfLayer(lines, 'DRILL_5MM', 3);
  addDxfLayer(lines, 'PART_LABELS', 5);

  lines.push('0', 'ENDTAB', '0', 'ENDSEC');
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // Panel outer contour
  addDxfRect(lines, 'OUTLINE_CUT', 0, 0, panel.width, panel.height);

  // Dados and rabbets
  for (const dado of panel.dados) {
    addDxfRect(lines, 'DADO_POCKET', dado.x, dado.y, dado.width, dado.height);
  }

  // 5mm drill holes
  for (const hole of panel.holes) {
    addDxfCircle(lines, 'DRILL_5MM', hole.x, hole.y, hole.diameterInches / 2);
  }

  // Part Label
  addDxfText(lines, 'PART_LABELS', panel.partName, panel.width / 2, panel.height / 2, 1.0);

  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n');
}

/**
 * Triggers a browser file download of the generated DXF content.
 */
export function downloadDxfFile(filename: string, dxfContent: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.dxf') ? filename : `${filename}.dxf`;
  link.click();
  URL.revokeObjectURL(url);
}

function addDxfLayer(lines: string[], name: string, colorIndex: number) {
  lines.push('0', 'LAYER', '2', name, '70', '0', '62', colorIndex.toString(), '6', 'CONTINUOUS');
}

function addDxfRect(lines: string[], layer: string, x: number, y: number, w: number, h: number) {
  lines.push(
    '0',
    'POLYLINE',
    '8',
    layer,
    '66',
    '1',
    '70',
    '1', // Closed polyline
    '0',
    'VERTEX',
    '8',
    layer,
    '10',
    x.toFixed(4),
    '20',
    y.toFixed(4),
    '30',
    '0.0',
    '0',
    'VERTEX',
    '8',
    layer,
    '10',
    (x + w).toFixed(4),
    '20',
    y.toFixed(4),
    '30',
    '0.0',
    '0',
    'VERTEX',
    '8',
    layer,
    '10',
    (x + w).toFixed(4),
    '20',
    (y + h).toFixed(4),
    '30',
    '0.0',
    '0',
    'VERTEX',
    '8',
    layer,
    '10',
    x.toFixed(4),
    '20',
    (y + h).toFixed(4),
    '30',
    '0.0',
    '0',
    'SEQEND',
  );
}

function addDxfCircle(
  lines: string[],
  layer: string,
  centerX: number,
  centerY: number,
  radius: number,
) {
  lines.push(
    '0',
    'CIRCLE',
    '8',
    layer,
    '10',
    centerX.toFixed(4),
    '20',
    centerY.toFixed(4),
    '30',
    '0.0',
    '40',
    radius.toFixed(4),
  );
}

function addDxfText(
  lines: string[],
  layer: string,
  text: string,
  x: number,
  y: number,
  height: number,
) {
  lines.push(
    '0',
    'TEXT',
    '8',
    layer,
    '10',
    x.toFixed(4),
    '20',
    y.toFixed(4),
    '30',
    '0.0',
    '40',
    height.toFixed(4),
    '1',
    text,
    '72',
    '1', // Center horizontal alignment
    '11',
    x.toFixed(4),
    '21',
    y.toFixed(4),
    '31',
    '0.0',
  );
}
