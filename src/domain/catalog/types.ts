import type { CabinetCategory, CabinetFrontLayout, DoorSwing } from '../geometry/models';
import type { Sixteenths } from '../geometry/units';

export interface FinishOption {
  id: string;
  name: string;
  colorHex: string;
  roughness: number;
  woodGrain?: boolean;
}

export interface DoorStyleOption {
  id: string;
  name: string;
  stileWidthInches: number; // For shaker frame stile width
  bevelDepthInches: number;
}

export interface HardwareOption {
  id: string;
  name: string;
  type: 'pull' | 'knob' | 'cup_pull' | 'edge_pull' | 'none';
  primitive: 'box' | 'cylinder';
  widthInches: number;
  heightInches: number;
  depthInches: number;
  radiusInches?: number;
  colorHex: string;
  metalness: number;
}

export interface DrawerBoxOption {
  id: string;
  name: string;
  slideType: 'undermount_soft_close' | 'side_mount_ball_bearing' | 'push_to_open' | 'wood_runner';
  material: 'solid_wood_dovetail' | 'metal_box_slim' | 'plywood_standard';
  weightCapacityLbs: number;
  extensionType: 'full_extension' | 'three_quarter_extension';
  description: string;
}

export interface HingeOption {
  id: string;
  name: string;
  openingAngleDegrees: number;
  mountingType:
    | 'concealed_soft_close'
    | 'wide_angle_165'
    | 'pie_corner_bifold'
    | 'face_frame_compact';
  softClose: boolean;
  description: string;
}

export interface RetailItemMapping {
  retailer: string; // e.g. 'Home Depot'
  productName: string;
  sku: string;
  estimatedPriceUSD: number;
  productUrl: string;
  isVerifiedSample: boolean;
}

export type CabinetDefinitionSource = 'stock' | 'built_template';
export type CabinetFamily =
  | 'standard_base'
  | 'sink_base'
  | 'drawer_base'
  | 'wall'
  | 'tall'
  | 'filler'
  | 'lazy_susan_corner'
  | 'appliance_bridge'
  | 'bookcase'
  | 'bench'
  | 'media';

export interface CabinetDefinition {
  id: string;
  code: string; // e.g. 'B30', 'SB36', 'W3036', 'DB18', 'LS36', 'U2484'
  source: CabinetDefinitionSource;
  family: CabinetFamily;
  name: string;
  category: CabinetCategory;
  description: string;
  nominalWidthInches: number;
  nominalHeightInches: number;
  nominalDepthInches: number;
  width: Sixteenths;
  height: Sixteenths;
  depth: Sixteenths;
  defaultDoorSwing: DoorSwing;
  frontLayout: CabinetFrontLayout;
  hasDrawers: boolean;
  drawerCount: number;
  shelfCount: number;
  hasSinkCutout?: boolean;
  retailMapping?: RetailItemMapping;
}
