export type EdgeBandingType = 'none' | 'pvc_0_5mm' | 'wood_1mm' | 'pvc_2mm' | 'solid_3mm';

export type EdgeBandingCoverage = 'none' | 'front' | 'all_4' | 'top_bottom' | 'sides';

export interface EdgeBandingOption {
  id: EdgeBandingType;
  name: string;
  thicknessInches: number;
  thicknessMm: number;
  material: string;
}

export const EDGE_BANDING_OPTIONS: Record<EdgeBandingType, EdgeBandingOption> = {
  none: {
    id: 'none',
    name: 'No Edge Banding',
    thicknessInches: 0,
    thicknessMm: 0,
    material: 'none',
  },
  pvc_0_5mm: {
    id: 'pvc_0_5mm',
    name: '0.5mm Standard Iron-on PVC / Melamine',
    thicknessInches: 0.02,
    thicknessMm: 0.5,
    material: 'pvc',
  },
  wood_1mm: {
    id: 'wood_1mm',
    name: '1.0mm Natural Wood Veneer',
    thicknessInches: 0.039,
    thicknessMm: 1.0,
    material: 'veneer',
  },
  pvc_2mm: {
    id: 'pvc_2mm',
    name: '2.0mm Heavy-Duty Impact PVC',
    thicknessInches: 0.079,
    thicknessMm: 2.0,
    material: 'pvc_thick',
  },
  solid_3mm: {
    id: 'solid_3mm',
    name: '3.0mm Solid Hardwood Edge Strip',
    thicknessInches: 0.118,
    thicknessMm: 3.0,
    material: 'hardwood',
  },
};

export interface EdgeBandingConfig {
  type: EdgeBandingType;
  coverage: EdgeBandingCoverage;
}

export interface RawCutDimensionResult {
  finishedWidth: number;
  finishedHeight: number;
  rawWidth: number;
  rawHeight: number;
  deductions: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Automatically calculates raw cut dimensions by subtracting edge banding thickness
 * from finished part dimensions to ensure accurate finished reveals.
 */
export function deductEdgeBanding(
  finishedWidth: number,
  finishedHeight: number,
  config?: EdgeBandingConfig,
): RawCutDimensionResult {
  if (!config || config.type === 'none' || config.coverage === 'none') {
    return {
      finishedWidth,
      finishedHeight,
      rawWidth: finishedWidth,
      rawHeight: finishedHeight,
      deductions: { top: 0, bottom: 0, left: 0, right: 0 },
    };
  }

  const option = EDGE_BANDING_OPTIONS[config.type] ?? EDGE_BANDING_OPTIONS.none;
  const t = option.thicknessInches;

  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;

  switch (config.coverage) {
    case 'front':
      // For standard carcass parts, front edge is height dimension
      top = t;
      break;
    case 'all_4':
      top = t;
      bottom = t;
      left = t;
      right = t;
      break;
    case 'top_bottom':
      top = t;
      bottom = t;
      break;
    case 'sides':
      left = t;
      right = t;
      break;
  }

  return {
    finishedWidth,
    finishedHeight,
    rawWidth: Math.max(0.25, finishedWidth - (left + right)),
    rawHeight: Math.max(0.25, finishedHeight - (top + bottom)),
    deductions: { top, bottom, left, right },
  };
}

export interface EdgeBandingRollSummary {
  type: EdgeBandingType;
  totalLinearInches: number;
  totalLinearFeet: number;
  totalMeters: number;
  rollCount250ft: number;
}

export function calculateEdgeBandingRequirements(
  parts: Array<{ width: number; height: number; edgeBanding?: EdgeBandingConfig }>,
): EdgeBandingRollSummary[] {
  const totalsByBanding = new Map<EdgeBandingType, number>();

  for (const part of parts) {
    const config = part.edgeBanding;
    if (!config || config.type === 'none' || config.coverage === 'none') continue;

    let perimeterInches = 0;
    switch (config.coverage) {
      case 'front':
        perimeterInches = part.height;
        break;
      case 'all_4':
        perimeterInches = (part.width + part.height) * 2;
        break;
      case 'top_bottom':
        perimeterInches = part.width * 2;
        break;
      case 'sides':
        perimeterInches = part.height * 2;
        break;
    }

    const current = totalsByBanding.get(config.type) ?? 0;
    totalsByBanding.set(config.type, current + perimeterInches);
  }

  const results: EdgeBandingRollSummary[] = [];
  for (const [type, inches] of totalsByBanding.entries()) {
    const withWaste = inches * 1.1; // 10% shop trim & overhang waste
    const feet = withWaste / 12;
    const meters = feet * 0.3048;
    results.push({
      type,
      totalLinearInches: Math.round(inches * 10) / 10,
      totalLinearFeet: Math.ceil(feet),
      totalMeters: Math.round(meters * 10) / 10,
      rollCount250ft: Math.ceil(feet / 250),
    });
  }

  return results;
}
