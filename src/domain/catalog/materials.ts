export interface MaterialDefinition {
  id: string;
  name: string;
  unit: 'sheet' | 'linear_piece' | 'square_foot' | 'each' | 'pack';
  sheetWidthInches?: 48;
  sheetHeightInches?: 96;
  stockLengthInches?: 96;
  packQuantity?: number;
  wasteFactor: number;
  estimatedUnitPriceUSD: number | null;
}

export const MATERIAL_DEFINITIONS: MaterialDefinition[] = [
  {
    id: 'plywood_3_4',
    name: '3/4-inch cabinet plywood sheet',
    unit: 'sheet',
    sheetWidthInches: 48,
    sheetHeightInches: 96,
    wasteFactor: 0.15,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'backer_1_4',
    name: '1/4-inch cabinet backer sheet',
    unit: 'sheet',
    sheetWidthInches: 48,
    sheetHeightInches: 96,
    wasteFactor: 0.15,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'toe_kick_linear',
    name: 'Toe-kick finish stock, 96 inch',
    unit: 'linear_piece',
    stockLengthInches: 96,
    wasteFactor: 0.1,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'crown_linear',
    name: 'Cabinet crown stock, 96 inch',
    unit: 'linear_piece',
    stockLengthInches: 96,
    wasteFactor: 0.1,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'light_rail_linear',
    name: 'Cabinet light-rail stock, 96 inch',
    unit: 'linear_piece',
    stockLengthInches: 96,
    wasteFactor: 0.1,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'countertop_sqft',
    name: 'Countertop material',
    unit: 'square_foot',
    wasteFactor: 0.1,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'shelf_pin_pack',
    name: '5mm shelf-pin pack',
    unit: 'pack',
    packQuantity: 20,
    wasteFactor: 0,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'cabinet_fastener_pack',
    name: 'Cabinet assembly fastener pack',
    unit: 'pack',
    packQuantity: 50,
    wasteFactor: 0,
    estimatedUnitPriceUSD: null,
  },
  {
    id: 'cabinet_hardware_pack',
    name: 'Cabinet pull or knob hardware',
    unit: 'each',
    wasteFactor: 0,
    estimatedUnitPriceUSD: null,
  },
];

export function getMaterialDefinition(id: string): MaterialDefinition {
  const material = MATERIAL_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!material) throw new Error(`Unknown material definition: ${id}`);
  return material;
}
