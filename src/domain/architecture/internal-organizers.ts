export type OrganizerType =
  | 'roll_out_trays_2'
  | 'roll_out_trays_3'
  | 'trash_pullout_double_35qt'
  | 'trash_pullout_double_50qt'
  | 'cutlery_divider_insert'
  | 'spice_pullout_rack';

export interface OrganizerOption {
  id: OrganizerType;
  name: string;
  category: 'pull_out' | 'drawer_insert' | 'waste';
  minCabinetWidth: number;
  maxCabinetWidth: number;
  estimatedPriceUSD: number;
  description: string;
}

export const ORGANIZER_CATALOG: Record<OrganizerType, OrganizerOption> = {
  roll_out_trays_2: {
    id: 'roll_out_trays_2',
    name: 'Two-Tier Roll-Out Hardwood Trays',
    category: 'pull_out',
    minCabinetWidth: 15,
    maxCabinetWidth: 36,
    estimatedPriceUSD: 149,
    description: 'Dovetail solid birch pull-out trays on full-extension soft-close slides.',
  },
  roll_out_trays_3: {
    id: 'roll_out_trays_3',
    name: 'Three-Tier Roll-Out Hardwood Trays',
    category: 'pull_out',
    minCabinetWidth: 18,
    maxCabinetWidth: 36,
    estimatedPriceUSD: 219,
    description: 'Three height-adjustable dovetail trays for tall base pantry storage.',
  },
  trash_pullout_double_35qt: {
    id: 'trash_pullout_double_35qt',
    name: 'Double 35-Quart Waste & Recycling Pull-Out',
    category: 'waste',
    minCabinetWidth: 18,
    maxCabinetWidth: 24,
    estimatedPriceUSD: 189,
    description: 'Heavy-duty bottom-mount slide system with twin 35-quart polymer bins.',
  },
  trash_pullout_double_50qt: {
    id: 'trash_pullout_double_50qt',
    name: 'Double 50-Quart High-Capacity Waste Pull-Out',
    category: 'waste',
    minCabinetWidth: 21,
    maxCabinetWidth: 27,
    estimatedPriceUSD: 229,
    description: 'Extra-deep waste pull-out with dual 50-quart tall bins.',
  },
  cutlery_divider_insert: {
    id: 'cutlery_divider_insert',
    name: 'Solid Walnut Tiered Cutlery Drawer Organizer',
    category: 'drawer_insert',
    minCabinetWidth: 15,
    maxCabinetWidth: 36,
    estimatedPriceUSD: 69,
    description: 'Two-tier sliding solid walnut utensil and flatware organizer.',
  },
  spice_pullout_rack: {
    id: 'spice_pullout_rack',
    name: 'Full-Height 3-Tier Pull-Out Spice Rack',
    category: 'pull_out',
    minCabinetWidth: 9,
    maxCabinetWidth: 12,
    estimatedPriceUSD: 139,
    description: 'Slim chrome and maple pull-out organizer for oils and spices.',
  },
};

export interface LightingSummary {
  linearFeetRequired: number;
  channelPieces96in: number;
  driverWattageRequired: number;
  estimatedCostUSD: number;
}

/**
 * Calculates under-cabinet continuous recessed LED lighting requirements
 * across all wall cabinets in the project.
 */
export function calculateUnderCabinetLighting(
  wallCabinets: Array<{ width: number }>,
): LightingSummary {
  const totalInches = wallCabinets.reduce((sum, c) => sum + c.width / 16, 0);
  const feet = Math.ceil(totalInches / 12);
  const channels = Math.ceil(totalInches / 96);

  // Standard 4.5 Watts per linear foot + 20% driver safety headroom
  const rawWatts = feet * 4.5 * 1.2;
  const standardDriverWatts = rawWatts <= 60 ? 60 : rawWatts <= 100 ? 100 : 150;

  // $12/ft for high CRI 90+ LED tape + $15 per 96" channel + $45 driver
  const cost = feet * 12 + channels * 15 + 45;

  return {
    linearFeetRequired: feet,
    channelPieces96in: channels,
    driverWattageRequired: standardDriverWatts,
    estimatedCostUSD: cost,
  };
}
