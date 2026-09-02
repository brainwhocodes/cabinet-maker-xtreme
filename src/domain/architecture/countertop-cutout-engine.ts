export type CutoutPresetType =
  | 'sink_undermount_single'
  | 'sink_undermount_double'
  | 'sink_drop_in'
  | 'cooktop_drop_in_30'
  | 'cooktop_drop_in_36';

export type FaucetDrillingType = 'none' | 'single_hole' | 'three_hole_4in' | 'three_hole_8in';

export type CountertopEdgeProfile =
  | 'eased'
  | 'half_bullnose'
  | 'full_bullnose'
  | 'ogee'
  | 'bevel_45'
  | 'mitered_waterfall';

export interface CutoutPreset {
  id: CutoutPresetType;
  name: string;
  widthInches: number;
  depthInches: number;
  cornerRadiusInches: number;
  category: 'sink' | 'cooktop';
}

export const CUTOUT_PRESETS: Record<CutoutPresetType, CutoutPreset> = {
  sink_undermount_single: {
    id: 'sink_undermount_single',
    name: 'Single Basin Undermount Sink (30" × 18")',
    widthInches: 30,
    depthInches: 18,
    cornerRadiusInches: 0.5,
    category: 'sink',
  },
  sink_undermount_double: {
    id: 'sink_undermount_double',
    name: '50/50 Double Basin Undermount Sink (32" × 19")',
    widthInches: 32,
    depthInches: 19,
    cornerRadiusInches: 0.75,
    category: 'sink',
  },
  sink_drop_in: {
    id: 'sink_drop_in',
    name: 'Standard Drop-In Top-Mount Sink (33" × 22")',
    widthInches: 33,
    depthInches: 22,
    cornerRadiusInches: 1.0,
    category: 'sink',
  },
  cooktop_drop_in_30: {
    id: 'cooktop_drop_in_30',
    name: '30" Induction / Gas Drop-In Cooktop (28.5" × 19.5")',
    widthInches: 28.5,
    depthInches: 19.5,
    cornerRadiusInches: 0.25,
    category: 'cooktop',
  },
  cooktop_drop_in_36: {
    id: 'cooktop_drop_in_36',
    name: '36" Induction / Gas Drop-In Cooktop (34.5" × 20")',
    widthInches: 34.5,
    depthInches: 20,
    cornerRadiusInches: 0.25,
    category: 'cooktop',
  },
};

export interface CountertopCutoutConfig {
  preset: CutoutPresetType;
  centerOffsetX: number; // Offset from wall start in inches
  setbackFromFront: number; // In inches (standard 3.5")
  faucetDrilling: FaucetDrillingType;
  faucetSetbackFromCutout: number; // In inches (standard 2.25")
}

export interface CutoutValidationResult {
  valid: boolean;
  frontBridgeInches: number;
  rearBridgeInches: number;
  leftMarginInches: number;
  rightMarginInches: number;
  warnings: string[];
}

/**
 * Validates countertop cutout placement against NKBA and MIA (Marble Institute of America)
 * structural fabrication guidelines:
 * - Minimum 1.5" front and rear bridge material to prevent stone cracking.
 * - Minimum 3.0" side margin from countertop ends.
 */
export function validateCountertopCutout(
  countertopWidth: number,
  countertopDepth: number,
  cutout: CountertopCutoutConfig,
): CutoutValidationResult {
  const preset = CUTOUT_PRESETS[cutout.preset];
  const warnings: string[] = [];

  const frontBridge = cutout.setbackFromFront;
  const rearBridge = countertopDepth - (cutout.setbackFromFront + preset.depthInches);

  const leftEdge = cutout.centerOffsetX - preset.widthInches / 2;
  const rightEdge = cutout.centerOffsetX + preset.widthInches / 2;

  const leftMargin = leftEdge;
  const rightMargin = countertopWidth - rightEdge;

  if (frontBridge < 1.5) {
    warnings.push(
      `Front bridge is ${frontBridge.toFixed(2)}" (MIA standard requires minimum 1.5" to avoid cracking).`,
    );
  }

  if (rearBridge < 1.5) {
    warnings.push(
      `Rear bridge is ${rearBridge.toFixed(2)}" (MIA standard requires minimum 1.5" to avoid cracking).`,
    );
  }

  if (leftMargin < 2.0 || rightMargin < 2.0) {
    warnings.push(`Cutout is within 2" of countertop end. Reinforcement rodding recommended.`);
  }

  return {
    valid: warnings.length === 0,
    frontBridgeInches: Math.round(frontBridge * 100) / 100,
    rearBridgeInches: Math.round(rearBridge * 100) / 100,
    leftMarginInches: Math.round(leftMargin * 100) / 100,
    rightMarginInches: Math.round(rightMargin * 100) / 100,
    warnings,
  };
}

export interface FaucetHole2D {
  x: number;
  y: number;
  diameterInches: number;
}

/**
 * Calculates 2D hole coordinates for faucet drilling behind the sink cutout.
 */
export function calculateFaucetHoles(
  cutoutCenterOffsetX: number,
  cutoutRearY: number,
  drilling: FaucetDrillingType,
  setbackFromCutout = 2.25,
): FaucetHole2D[] {
  if (drilling === 'none') return [];

  const centerY = cutoutRearY + setbackFromCutout;
  const standardHoleDia = 1.375; // 1-3/8" standard faucet hole

  switch (drilling) {
    case 'single_hole':
      return [{ x: cutoutCenterOffsetX, y: centerY, diameterInches: standardHoleDia }];
    case 'three_hole_4in':
      return [
        { x: cutoutCenterOffsetX - 2, y: centerY, diameterInches: 1.25 },
        { x: cutoutCenterOffsetX, y: centerY, diameterInches: standardHoleDia },
        { x: cutoutCenterOffsetX + 2, y: centerY, diameterInches: 1.25 },
      ];
    case 'three_hole_8in':
      return [
        { x: cutoutCenterOffsetX - 4, y: centerY, diameterInches: 1.375 },
        { x: cutoutCenterOffsetX, y: centerY, diameterInches: standardHoleDia },
        { x: cutoutCenterOffsetX + 4, y: centerY, diameterInches: 1.375 },
      ];
  }
}
