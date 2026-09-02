export type JoineryType = 'pocket_hole' | 'dado_rabbet' | 'system_32mm' | 'dowel_confirmat';

export interface DrillHole2D {
  id: string;
  x: number;
  y: number;
  diameterInches: number;
  depthInches: number;
  type: 'shelf_pin' | 'hinge_plate' | 'slide_runner' | 'pocket_pilot' | 'dowel';
}

export interface DadoChannel2D {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depthInches: number;
  purpose: 'bottom_deck' | 'fixed_shelf' | 'back_rabbet';
}

export interface PanelMachiningOperations {
  partId: string;
  partName: string;
  width: number;
  height: number;
  holes: DrillHole2D[];
  dados: DadoChannel2D[];
}

/**
 * Generates European 32mm System line boring holes for cabinet side panels:
 * 5mm holes spaced exactly 32mm (1.26") on center, set back 37mm (1.46") from front and rear edges.
 */
export function generate32mmLineBoring(
  panelWidthInches: number,
  panelHeightInches: number,
  startElevationInches = 4.5, // Above toe kick
  endElevationInches = 30.0,
): DrillHole2D[] {
  const holes: DrillHole2D[] = [];
  const pitchInches = 32 / 25.4; // 1.2598"
  const setbackInches = 37 / 25.4; // 1.4567"
  const diameterInches = 5 / 25.4; // ~0.197"
  const depthInches = 0.5; // Half-inch shelf pin depth

  const frontX = Math.round(setbackInches * 1000) / 1000;
  const rearX = Math.round((panelWidthInches - setbackInches) * 1000) / 1000;

  let y = startElevationInches;
  let index = 1;

  while (y <= endElevationInches && y < panelHeightInches - 1.5) {
    const yRounded = Math.round(y * 1000) / 1000;
    // Front line hole
    holes.push({
      id: `hole-front-${index}`,
      x: frontX,
      y: yRounded,
      diameterInches,
      depthInches,
      type: 'shelf_pin',
    });

    // Rear line hole
    holes.push({
      id: `hole-rear-${index}`,
      x: rearX,
      y: yRounded,
      diameterInches,
      depthInches,
      type: 'shelf_pin',
    });

    y += pitchInches;
    index++;
  }

  return holes;
}

/**
 * Generates standard concealed hinge plate mounting holes (two 5mm holes spaced 32mm vertically).
 */
export function generateHingePlateHoles(
  panelHeightInches: number,
  hingeElevationsInches: number[] = [3.5, panelHeightInches - 3.5],
): DrillHole2D[] {
  const holes: DrillHole2D[] = [];
  const setbackInches = 37 / 25.4; // 37mm standard setback
  const pitchInches = 32 / 25.4; // 32mm vertical spacing
  const diameterInches = 5 / 25.4;
  const depthInches = 0.45;

  let plateIndex = 1;
  for (const centerElevation of hingeElevationsInches) {
    const y1 = Math.round((centerElevation - pitchInches / 2) * 1000) / 1000;
    const y2 = Math.round((centerElevation + pitchInches / 2) * 1000) / 1000;

    holes.push({
      id: `hinge-plate-${plateIndex}-lower`,
      x: Math.round(setbackInches * 1000) / 1000,
      y: y1,
      diameterInches,
      depthInches,
      type: 'hinge_plate',
    });

    holes.push({
      id: `hinge-plate-${plateIndex}-upper`,
      x: Math.round(setbackInches * 1000) / 1000,
      y: y2,
      diameterInches,
      depthInches,
      type: 'hinge_plate',
    });

    plateIndex++;
  }

  return holes;
}

/**
 * Generates 1/4" deep dados and rear capture rabbets for side panels in dado joinery mode.
 */
export function generateDadoRabbets(
  panelWidthInches: number,
  panelHeightInches: number,
  deckElevationInches = 4.5,
  materialThicknessInches = 0.75,
): DadoChannel2D[] {
  return [
    // Bottom deck dado
    {
      id: 'dado-bottom-deck',
      x: 0,
      y: deckElevationInches,
      width: panelWidthInches - 0.25, // Leaves 1/4" blind edge
      height: materialThicknessInches,
      depthInches: 0.25,
      purpose: 'bottom_deck',
    },
    // Rear back panel capture rabbet
    {
      id: 'rabbet-rear-back',
      x: panelWidthInches - 0.375, // 3/8" wide rabbet
      y: 0,
      width: 0.375,
      height: panelHeightInches,
      depthInches: 0.25, // 1/4" deep rabbet
      purpose: 'back_rabbet',
    },
  ];
}
