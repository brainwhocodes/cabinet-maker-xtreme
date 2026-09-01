import type { BuiltInElementType } from '../geometry/models';
import type { Sixteenths } from '../geometry/units';
import { inchesToSixteenths } from '../geometry/units';
import {
  DRAWER_BOX_OPTIONS,
  HARDWARE_OPTIONS,
  HINGE_OPTIONS,
  STANDARD_CABINET_CATALOG,
} from './standard-cabinets';
import type { CabinetDefinition, DrawerBoxOption, HardwareOption, HingeOption } from './types';

export interface BuiltInElementDefinition {
  id: string;
  type: BuiltInElementType;
  name: string;
  description: string;
  defaultWidth: Sixteenths;
  defaultHeight: Sixteenths;
  defaultDepth: Sixteenths;
  defaultDepthOffset: Sixteenths;
  defaultFinishId: string;
  profileAnchor: 'wall' | 'cabinet_front';
}

export interface ShelfPackageOption {
  id: 'shelf_0_open' | 'shelf_1_adjustable' | 'shelf_2_adjustable' | 'shelf_3_adjustable';
  name: string;
  count: 0 | 1 | 2 | 3;
  layout: 'even';
}

export interface PlannerCatalogEntryBase {
  id: string;
  code: string;
  name: string;
  description: string;
  searchTerms: string[];
}

export type PlannerCatalogEntry =
  | (PlannerCatalogEntryBase & {
      kind: 'cabinet';
      cabinetDefinition: CabinetDefinition;
    })
  | (PlannerCatalogEntryBase & {
      kind: 'built_in';
      builtInDefinition: BuiltInElementDefinition;
    })
  | (PlannerCatalogEntryBase & {
      kind: 'hardware';
      hardwareOption: HardwareOption;
    })
  | (PlannerCatalogEntryBase & {
      kind: 'shelving';
      shelfPackage: ShelfPackageOption;
    })
  | (PlannerCatalogEntryBase & {
      kind: 'drawer_system';
      drawerBoxOption: DrawerBoxOption;
    })
  | (PlannerCatalogEntryBase & {
      kind: 'hinge';
      hingeOption: HingeOption;
    });

const BUILT_IN_DEFINITIONS: BuiltInElementDefinition[] = [
  builtIn(
    'countertop_standard',
    'countertop',
    'Standard countertop',
    'Manual countertop slab.',
    36,
    1.5,
    25.5,
    0,
    'natural_oak',
    'wall',
  ),
  builtIn(
    'end_panel_base',
    'end_panel',
    'Base finished end panel',
    'Finished panel for an exposed base-cabinet end.',
    0.75,
    34.5,
    24,
    0,
    'polar_white',
    'wall',
  ),
  builtIn(
    'end_panel_wall',
    'end_panel',
    'Wall finished end panel',
    'Finished panel for an exposed wall-cabinet end.',
    0.75,
    30,
    12,
    0,
    'polar_white',
    'wall',
  ),
  builtIn(
    'end_panel_tall',
    'end_panel',
    'Tall finished end panel',
    'Finished panel for an exposed tall-cabinet end.',
    0.75,
    84,
    24,
    0,
    'polar_white',
    'wall',
  ),
  builtIn(
    'toe_kick_standard',
    'toe_kick',
    'Standard toe-kick skin',
    'Continuous finished skin for a recessed base run.',
    96,
    4.5,
    0.25,
    20.75,
    'polar_white',
    'cabinet_front',
  ),
  builtIn(
    'crown_standard',
    'crown',
    'Standard crown molding',
    'Top molding for wall and tall cabinet runs.',
    96,
    2.5,
    0.75,
    11.25,
    'polar_white',
    'cabinet_front',
  ),
  builtIn(
    'light_rail_standard',
    'light_rail',
    'Standard light rail',
    'Bottom molding for a wall-cabinet run.',
    96,
    1.5,
    0.75,
    11.25,
    'polar_white',
    'cabinet_front',
  ),
  builtIn(
    'floating_shelf_24',
    'floating_shelf',
    '24-inch floating shelf',
    'Wall-mounted open shelf.',
    24,
    1.25,
    10,
    0,
    'natural_oak',
    'wall',
  ),
];

const SHELF_PACKAGES: ShelfPackageOption[] = [
  { id: 'shelf_0_open', name: 'Open cabinet, no shelves', count: 0, layout: 'even' },
  { id: 'shelf_1_adjustable', name: 'One adjustable shelf', count: 1, layout: 'even' },
  { id: 'shelf_2_adjustable', name: 'Two adjustable shelves', count: 2, layout: 'even' },
  { id: 'shelf_3_adjustable', name: 'Three adjustable shelves', count: 3, layout: 'even' },
];

const PLANNER_CATALOG_ENTRIES: PlannerCatalogEntry[] = [
  ...STANDARD_CABINET_CATALOG.map((cabinetDefinition) => ({
    id: `catalog-${cabinetDefinition.code.toLowerCase()}`,
    code: cabinetDefinition.code,
    name: cabinetDefinition.name,
    description: cabinetDefinition.description,
    searchTerms: [
      cabinetDefinition.code,
      cabinetDefinition.name,
      cabinetDefinition.description,
      cabinetDefinition.family.replaceAll('_', ' '),
      cabinetDefinition.category,
      cabinetDefinition.source === 'stock' ? 'stock cabinet' : 'built template custom',
    ],
    kind: 'cabinet' as const,
    cabinetDefinition,
  })),
  ...BUILT_IN_DEFINITIONS.map((builtInDefinition) => ({
    id: `catalog-${builtInDefinition.id}`,
    code: builtInDefinition.id,
    name: builtInDefinition.name,
    description: builtInDefinition.description,
    searchTerms: [
      builtInDefinition.id.replaceAll('_', ' '),
      builtInDefinition.name,
      builtInDefinition.description,
      builtInDefinition.type.replaceAll('_', ' '),
      'built in',
    ],
    kind: 'built_in' as const,
    builtInDefinition,
  })),
  ...HARDWARE_OPTIONS.map((hardwareOption) => ({
    id: `catalog-hardware-${hardwareOption.id}`,
    code: hardwareOption.id,
    name: hardwareOption.name,
    description:
      hardwareOption.type === 'none'
        ? 'Remove visible pulls and knobs.'
        : `${hardwareOption.type.replaceAll('_', ' ')} hardware option.`,
    searchTerms: [hardwareOption.id.replaceAll('_', ' '), hardwareOption.name, hardwareOption.type],
    kind: 'hardware' as const,
    hardwareOption,
  })),
  ...SHELF_PACKAGES.map((shelfPackage) => ({
    id: `catalog-${shelfPackage.id}`,
    code: shelfPackage.id,
    name: shelfPackage.name,
    description:
      shelfPackage.count === 0
        ? 'Keep the cabinet interior open.'
        : `${shelfPackage.count} evenly spaced adjustable ${shelfPackage.count === 1 ? 'shelf' : 'shelves'}.`,
    searchTerms: [
      shelfPackage.id.replaceAll('_', ' '),
      shelfPackage.name,
      'shelf shelving adjustable',
    ],
    kind: 'shelving' as const,
    shelfPackage,
  })),
  ...DRAWER_BOX_OPTIONS.map((drawerBoxOption) => ({
    id: `catalog-drawer-${drawerBoxOption.id}`,
    code: drawerBoxOption.id,
    name: drawerBoxOption.name,
    description: drawerBoxOption.description,
    searchTerms: [
      drawerBoxOption.id.replaceAll('_', ' '),
      drawerBoxOption.name,
      drawerBoxOption.material.replaceAll('_', ' '),
      drawerBoxOption.slideType.replaceAll('_', ' '),
      'drawer slide runner dovetail',
    ],
    kind: 'drawer_system' as const,
    drawerBoxOption,
  })),
  ...HINGE_OPTIONS.map((hingeOption) => ({
    id: `catalog-hinge-${hingeOption.id}`,
    code: hingeOption.id,
    name: hingeOption.name,
    description: hingeOption.description,
    searchTerms: [
      hingeOption.id.replaceAll('_', ' '),
      hingeOption.name,
      hingeOption.mountingType.replaceAll('_', ' '),
      'hinge soft close concealed european clip on',
    ],
    kind: 'hinge' as const,
    hingeOption,
  })),
];

export function getPlannerCatalogEntries(): PlannerCatalogEntry[] {
  return PLANNER_CATALOG_ENTRIES;
}

function builtIn(
  id: string,
  type: BuiltInElementType,
  name: string,
  description: string,
  width: number,
  height: number,
  depth: number,
  depthOffset: number,
  defaultFinishId: string,
  profileAnchor: BuiltInElementDefinition['profileAnchor'],
): BuiltInElementDefinition {
  return {
    id,
    type,
    name,
    description,
    defaultWidth: inchesToSixteenths(width),
    defaultHeight: inchesToSixteenths(height),
    defaultDepth: inchesToSixteenths(depth),
    defaultDepthOffset: inchesToSixteenths(depthOffset),
    defaultFinishId,
    profileAnchor,
  };
}
