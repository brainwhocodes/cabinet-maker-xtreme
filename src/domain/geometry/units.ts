/**
 * Integer unit math for Cabinet Planner.
 * Base unit: 1/16th of an inch (Sixteenths).
 * 16 units = 1.0 inch.
 * 552 units = 34.5 inches (Standard Base Cabinet height).
 * 384 units = 24.0 inches (Standard Base Cabinet depth).
 */

export type Sixteenths = number; // Integer representing 1/16ths of an inch

export const UNIT_SIXTEENTH = 1;
export const UNIT_EIGHTH = 2;
export const UNIT_QUARTER = 4;
export const UNIT_HALF = 8;
export const UNIT_INCH = 16;
export const UNIT_FOOT = 192; // 12 * 16

/**
 * Converts decimal inches to integer sixteenths of an inch.
 */
export function inchesToSixteenths(inches: number): Sixteenths {
  return Math.round(inches * UNIT_INCH);
}

/**
 * Converts integer sixteenths of an inch to decimal inches.
 */
export function sixteenthsToInches(units: Sixteenths): number {
  return units / UNIT_INCH;
}

/**
 * Converts integer sixteenths of an inch to millimeters (for metric display).
 */
export function sixteenthsToMillimeters(units: Sixteenths): number {
  return Math.round(sixteenthsToInches(units) * 25.4);
}

/**
 * Converts integer sixteenths to Three.js coordinates (1 Three.js unit = 1 inch).
 */
export function sixteenthsToThreeUnits(units: Sixteenths): number {
  return units / UNIT_INCH;
}

/**
 * Formats integer sixteenths into a human-readable fractional string,
 * e.g., 552 -> '34 1/2"', 384 -> '24"', 18 -> '1 1/8"'.
 */
export function formatFractionalInches(units: Sixteenths): string {
  const isNegative = units < 0;
  const absUnits = Math.abs(units);

  const wholeInches = Math.floor(absUnits / UNIT_INCH);
  const remainderSixteenths = absUnits % UNIT_INCH;

  const prefix = isNegative ? '-' : '';

  if (remainderSixteenths === 0) {
    return `${prefix}${wholeInches}"`;
  }

  // Simplify the fraction
  let numerator = remainderSixteenths;
  let denominator = 16;

  while (numerator % 2 === 0 && denominator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }

  if (wholeInches === 0) {
    return `${prefix}${numerator}/${denominator}"`;
  }

  return `${prefix}${wholeInches} ${numerator}/${denominator}"`;
}
