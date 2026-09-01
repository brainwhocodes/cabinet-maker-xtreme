import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getMaterialDefinition } from '@/domain/catalog/materials';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import type { BuiltInElement, RoomProject } from '@/domain/geometry/models';
import { buildCabinetParts } from '@/domain/geometry/part-builder';

export type BOMDataStatus =
  | 'verified'
  | 'search-only'
  | 'stale'
  | 'user-entered'
  | 'material-estimate';

export interface BOMRowItem {
  id: string;
  category:
    | 'cabinet'
    | 'sheet_good'
    | 'trim'
    | 'hardware'
    | 'countertop'
    | 'built_in'
    | 'installation';
  sku?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPriceUSD: number | null;
  totalPriceUSD: number | null;
  retailSearchUrl?: string;
  dataStatus: BOMDataStatus;
  verifiedAt?: string;
  notes?: string;
}

export interface BOMCalculation {
  rows: BOMRowItem[];
  subtotalCabinets: number;
  subtotalTrim: number;
  subtotalHardware: number;
  subtotalInstallation: number;
  knownGrandTotalUSD: number;
  unpricedRowCount: number;
  countertopSqFt: number;
  nextRecommendedAction?: string;
}

interface SheetAggregate {
  faceAreaSqIn: number;
  oversizedParts: string[];
}

export function computeProjectBOM(project: RoomProject): BOMCalculation {
  if (project.cabinets.length === 0 && project.builtInElements.length === 0) {
    return {
      rows: [],
      subtotalCabinets: 0,
      subtotalTrim: 0,
      subtotalHardware: 0,
      subtotalInstallation: 0,
      knownGrandTotalUSD: 0,
      unpricedRowCount: 0,
      countertopSqFt: 0,
      nextRecommendedAction: 'Add a cabinet or built-in element to generate procurement rows.',
    };
  }

  const rows: BOMRowItem[] = [];
  const stockCounts = new Map<string, number>();
  const sheetAggregates = new Map<string, SheetAggregate>();
  let shelfPinCount = 0;
  let visibleHardwareCount = 0;
  let fastenerCount = 0;

  for (const cabinet of project.cabinets) {
    const definition = getCabinetDefinitionByCode(cabinet.definitionId);
    if (!definition) continue;
    const spec = resolveCabinetSpec(definition, cabinet);
    const model = buildCabinetParts(spec);

    if (cabinet.source === 'stock') {
      stockCounts.set(cabinet.definitionId, (stockCounts.get(cabinet.definitionId) ?? 0) + 1);
    } else {
      for (const part of model.parts) {
        if (part.category === 'hardware') {
          visibleHardwareCount += 1;
          continue;
        }
        if (part.category === 'shelf_hardware') {
          shelfPinCount += 1;
          continue;
        }
        const materialId = part.id === 'panel_back_board' ? 'backer_1_4' : 'plywood_3_4';
        const dimensions = [part.widthInches, part.heightInches, part.depthInches].sort(
          (left, right) => right - left,
        );
        const aggregate = sheetAggregates.get(materialId) ?? {
          faceAreaSqIn: 0,
          oversizedParts: [],
        };
        aggregate.faceAreaSqIn += dimensions[0] * dimensions[1];
        if (!fitsSheet(dimensions[0], dimensions[1])) aggregate.oversizedParts.push(part.name);
        sheetAggregates.set(materialId, aggregate);
      }
      fastenerCount += model.parts.filter((part) => part.category === 'carcass').length * 4;
    }

    if (cabinet.source === 'stock') {
      visibleHardwareCount += model.parts.filter((part) => part.category === 'hardware').length;
      shelfPinCount += model.parts.filter((part) => part.category === 'shelf_hardware').length;
    }
  }

  for (const [code, quantity] of [...stockCounts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const definition = getCabinetDefinitionByCode(code);
    if (!definition) continue;
    const mapping = definition.retailMapping;
    const unitPriceUSD = mapping?.estimatedPriceUSD ?? null;
    rows.push({
      id: `bom-cabinet-${code.toLowerCase()}`,
      category: 'cabinet',
      sku: mapping?.sku,
      name: `${definition.name} (${definition.code})`,
      quantity,
      unit: 'ea',
      unitPriceUSD,
      totalPriceUSD: unitPriceUSD === null ? null : unitPriceUSD * quantity,
      retailSearchUrl: mapping?.productUrl,
      dataStatus: 'search-only',
      notes: mapping
        ? 'Search-only catalog mapping. Confirm model, finish, price, and availability.'
        : 'Price unavailable. No verified retailer mapping exists for this stock size.',
    });
  }

  for (const [materialId, aggregate] of [...sheetAggregates.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const material = getMaterialDefinition(materialId);
    const sheetArea = (material.sheetWidthInches ?? 48) * (material.sheetHeightInches ?? 96);
    const quantity = Math.ceil((aggregate.faceAreaSqIn * (1 + material.wasteFactor)) / sheetArea);
    if (quantity === 0) continue;
    rows.push({
      id: `bom-material-${materialId}`,
      category: 'sheet_good',
      name: material.name,
      quantity,
      unit: 'sheet',
      unitPriceUSD: material.estimatedUnitPriceUSD,
      totalPriceUSD:
        material.estimatedUnitPriceUSD === null ? null : material.estimatedUnitPriceUSD * quantity,
      dataStatus: 'material-estimate',
      notes:
        aggregate.oversizedParts.length > 0
          ? `Oversized cut parts exceed a 48 × 96 inch sheet: ${aggregate.oversizedParts.join(', ')}.`
          : `${Math.round(material.wasteFactor * 100)}% sheet waste included.`,
    });
  }

  addHardwareRows(rows, shelfPinCount, visibleHardwareCount, fastenerCount);
  addBuiltInRows(rows, project.builtInElements);

  const subtotalCabinets = subtotal(rows, ['cabinet']);
  const subtotalTrim = subtotal(rows, ['trim', 'countertop', 'built_in', 'sheet_good']);
  const subtotalHardware = subtotal(rows, ['hardware']);
  const subtotalInstallation = subtotal(rows, ['installation']);
  const knownGrandTotalUSD =
    subtotalCabinets + subtotalTrim + subtotalHardware + subtotalInstallation;
  const unpricedRowCount = rows.filter((row) => row.totalPriceUSD === null).length;
  const countertopSqFt = rows
    .filter((row) => row.category === 'countertop')
    .reduce((sum, row) => sum + row.quantity, 0);

  return {
    rows,
    subtotalCabinets,
    subtotalTrim,
    subtotalHardware,
    subtotalInstallation,
    knownGrandTotalUSD,
    unpricedRowCount,
    countertopSqFt,
    nextRecommendedAction:
      unpricedRowCount > 0
        ? `Source current prices for ${unpricedRowCount} unpriced procurement rows.`
        : undefined,
  };
}

function addHardwareRows(
  rows: BOMRowItem[],
  shelfPinCount: number,
  visibleHardwareCount: number,
  fastenerCount: number,
): void {
  if (shelfPinCount > 0) {
    const material = getMaterialDefinition('shelf_pin_pack');
    const quantity = Math.ceil(shelfPinCount / (material.packQuantity ?? 1));
    rows.push(
      materialRow(
        material.id,
        'hardware',
        material.name,
        quantity,
        'pack',
        `${shelfPinCount} pins required.`,
      ),
    );
  }
  if (visibleHardwareCount > 0) {
    const material = getMaterialDefinition('cabinet_hardware_pack');
    rows.push(
      materialRow(
        material.id,
        'hardware',
        material.name,
        visibleHardwareCount,
        'ea',
        `${visibleHardwareCount} configured pulls or knobs.`,
      ),
    );
  }
  if (fastenerCount > 0) {
    const material = getMaterialDefinition('cabinet_fastener_pack');
    const quantity = Math.ceil(fastenerCount / (material.packQuantity ?? 1));
    rows.push(
      materialRow(
        material.id,
        'hardware',
        material.name,
        quantity,
        'pack',
        `${fastenerCount} carcass fasteners from the resolved built models.`,
      ),
    );
  }
}

function addBuiltInRows(rows: BOMRowItem[], elements: BuiltInElement[]): void {
  const countertopElements = elements.filter((element) => element.type === 'countertop');
  if (countertopElements.length > 0) {
    const material = getMaterialDefinition('countertop_sqft');
    const rawSqFt = countertopElements.reduce(
      (sum, element) => sum + ((element.width / 16) * (element.depth / 16)) / 144,
      0,
    );
    const quantity = roundQuantity(rawSqFt * (1 + material.wasteFactor));
    rows.push(
      materialRow(
        material.id,
        'countertop',
        material.name,
        quantity,
        'sq ft',
        '10% countertop waste included.',
      ),
    );
  }

  const trimTypes: Array<{
    type: BuiltInElement['type'];
    materialId: string;
    name: string;
  }> = [
    { type: 'toe_kick', materialId: 'toe_kick_linear', name: 'Finished toe-kick stock' },
    { type: 'crown', materialId: 'crown_linear', name: 'Cabinet crown stock' },
    { type: 'light_rail', materialId: 'light_rail_linear', name: 'Cabinet light-rail stock' },
  ];
  for (const trim of trimTypes) {
    const matching = elements.filter((element) => element.type === trim.type);
    if (matching.length === 0) continue;
    const material = getMaterialDefinition(trim.materialId);
    const linearInches = matching.reduce((sum, element) => sum + element.width / 16, 0);
    const quantity = Math.ceil(
      (linearInches * (1 + material.wasteFactor)) / (material.stockLengthInches ?? 96),
    );
    rows.push(
      materialRow(
        material.id,
        'trim',
        trim.name,
        quantity,
        '96 in piece',
        `${roundQuantity(linearInches)} linear inches before waste.`,
      ),
    );
  }

  const otherTypes: BuiltInElement['type'][] = ['end_panel', 'floating_shelf'];
  for (const type of otherTypes) {
    const matching = elements.filter((element) => element.type === type);
    if (matching.length === 0) continue;
    rows.push({
      id: `bom-built-in-${type}`,
      category: 'built_in',
      name: type === 'end_panel' ? 'Finished end panel' : 'Floating shelf',
      quantity: matching.length,
      unit: 'ea',
      unitPriceUSD: null,
      totalPriceUSD: null,
      dataStatus: 'material-estimate',
      notes: 'Dimensions and finish are carried by the project elements.',
    });
  }
}

function materialRow(
  id: string,
  category: BOMRowItem['category'],
  name: string,
  quantity: number,
  unit: string,
  notes: string,
): BOMRowItem {
  const material = getMaterialDefinition(id);
  return {
    id: `bom-material-${id}`,
    category,
    name,
    quantity,
    unit,
    unitPriceUSD: material.estimatedUnitPriceUSD,
    totalPriceUSD:
      material.estimatedUnitPriceUSD === null ? null : material.estimatedUnitPriceUSD * quantity,
    dataStatus: 'material-estimate',
    notes,
  };
}

function fitsSheet(width: number, height: number): boolean {
  return (width <= 48 && height <= 96) || (width <= 96 && height <= 48);
}

function subtotal(rows: BOMRowItem[], categories: BOMRowItem['category'][]): number {
  const accepted = new Set(categories);
  return rows.reduce(
    (sum, row) => sum + (accepted.has(row.category) ? (row.totalPriceUSD ?? 0) : 0),
    0,
  );
}

function roundQuantity(value: number): number {
  return Number(value.toFixed(2));
}
