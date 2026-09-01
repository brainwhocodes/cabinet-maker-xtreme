import { describe, expect, it } from 'vitest';
import {
  formatFractionalInches,
  inchesToSixteenths,
  sixteenthsToInches,
  sixteenthsToMillimeters,
  sixteenthsToThreeUnits,
  UNIT_HALF,
  UNIT_QUARTER,
} from '@/domain/geometry/units';

describe('Unit Math & Fractional Formatting', () => {
  it('converts inches to sixteenths correctly', () => {
    expect(inchesToSixteenths(1)).toBe(16);
    expect(inchesToSixteenths(0.5)).toBe(8);
    expect(inchesToSixteenths(34.5)).toBe(552);
    expect(inchesToSixteenths(24)).toBe(384);
    expect(inchesToSixteenths(0.0625)).toBe(1);
    expect(inchesToSixteenths(0)).toBe(0);
  });

  it('converts sixteenths to decimal inches correctly', () => {
    expect(sixteenthsToInches(16)).toBe(1);
    expect(sixteenthsToInches(552)).toBe(34.5);
    expect(sixteenthsToInches(384)).toBe(24);
    expect(sixteenthsToInches(8)).toBe(0.5);
  });

  it('converts sixteenths to millimeters accurately', () => {
    expect(sixteenthsToMillimeters(16)).toBe(25); // 1 inch = 25.4mm -> 25mm
    expect(sixteenthsToMillimeters(384)).toBe(610); // 24 inches = 609.6mm -> 610mm
    expect(sixteenthsToMillimeters(552)).toBe(876); // 34.5 inches = 876.3mm -> 876mm
  });

  it('converts sixteenths to Three.js units (1 unit = 1 inch)', () => {
    expect(sixteenthsToThreeUnits(16)).toBe(1);
    expect(sixteenthsToThreeUnits(552)).toBe(34.5);
    expect(sixteenthsToThreeUnits(384)).toBe(24);
  });

  it('formats fractional inches into clean human-readable strings', () => {
    expect(formatFractionalInches(16)).toBe('1"');
    expect(formatFractionalInches(384)).toBe('24"');
    expect(formatFractionalInches(552)).toBe('34 1/2"');
    expect(formatFractionalInches(UNIT_QUARTER)).toBe('1/4"');
    expect(formatFractionalInches(UNIT_HALF)).toBe('1/2"');
    expect(formatFractionalInches(16 + 8)).toBe('1 1/2"');
    expect(formatFractionalInches(16 + 4)).toBe('1 1/4"');
    expect(formatFractionalInches(16 + 2)).toBe('1 1/8"');
    expect(formatFractionalInches(16 + 1)).toBe('1 1/16"');
    expect(formatFractionalInches(16 + 12)).toBe('1 3/4"');
    expect(formatFractionalInches(0)).toBe('0"');
    expect(formatFractionalInches(-16)).toBe('-1"');
    expect(formatFractionalInches(-552)).toBe('-34 1/2"');
  });
});
