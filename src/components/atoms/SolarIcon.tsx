'use client';

import { Icon } from '@iconify/react';
import type { IconifyIcon } from '@iconify/types';
import addCircleLinear from '@iconify-icons/solar/add-circle-linear';
import arrowLeftLinear from '@iconify-icons/solar/arrow-left-linear';
import arrowRightLinear from '@iconify-icons/solar/arrow-right-linear';
import billListLinear from '@iconify-icons/solar/bill-list-linear';
import boxMinimalisticLinear from '@iconify-icons/solar/box-minimalistic-linear';
import cameraLinear from '@iconify-icons/solar/camera-linear';
import cartLargeLinear from '@iconify-icons/solar/cart-large-linear';
import checkCircleLinear from '@iconify-icons/solar/check-circle-linear';
import clipboardCheckLinear from '@iconify-icons/solar/clipboard-check-linear';
import closeCircleLinear from '@iconify-icons/solar/close-circle-linear';
import dangerTriangleLinear from '@iconify-icons/solar/danger-triangle-linear';
import downloadLinear from '@iconify-icons/solar/download-linear';
import infoCircleLinear from '@iconify-icons/solar/info-circle-linear';
import layersLinear from '@iconify-icons/solar/layers-linear';
import magicWand3Linear from '@iconify-icons/solar/magic-wand-3-linear';
import minimalisticMagnifierLinear from '@iconify-icons/solar/minimalistic-magnifier-linear';
import printerLinear from '@iconify-icons/solar/printer-linear';
import restartLinear from '@iconify-icons/solar/restart-linear';
import rulerLinear from '@iconify-icons/solar/ruler-linear';
import settingsLinear from '@iconify-icons/solar/settings-linear';
import shieldCheckLinear from '@iconify-icons/solar/shield-check-linear';
import toolboxLinear from '@iconify-icons/solar/toolbox-linear';
import trashBinMinimalisticLinear from '@iconify-icons/solar/trash-bin-minimalistic-linear';
import undoLeftLinear from '@iconify-icons/solar/undo-left-linear';
import undoRightLinear from '@iconify-icons/solar/undo-right-linear';
import userSpeakLinear from '@iconify-icons/solar/user-speak-linear';
import widget3Linear from '@iconify-icons/solar/widget-3-linear';

const ICON_BY_NAME: Record<string, IconifyIcon> = {
  'add-circle-linear': addCircleLinear,
  'arrow-left-linear': arrowLeftLinear,
  'arrow-right-linear': arrowRightLinear,
  'bill-list-linear': billListLinear,
  'box-minimalistic-linear': boxMinimalisticLinear,
  'cart-large-linear': cartLargeLinear,
  'camera-linear': cameraLinear,
  'check-circle-linear': checkCircleLinear,
  'clipboard-check-linear': clipboardCheckLinear,
  'close-circle-linear': closeCircleLinear,
  'danger-triangle-linear': dangerTriangleLinear,
  'download-linear': downloadLinear,
  'info-circle-linear': infoCircleLinear,
  'layers-linear': layersLinear,
  'magic-wand-3-linear': magicWand3Linear,
  'minimalistic-magnifer-linear': minimalisticMagnifierLinear,
  'minimalistic-magnifier-linear': minimalisticMagnifierLinear,
  'printer-linear': printerLinear,
  'restart-linear': restartLinear,
  'ruler-linear': rulerLinear,
  'settings-linear': settingsLinear,
  'shield-check-linear': shieldCheckLinear,
  'toolbox-linear': toolboxLinear,
  'trash-bin-minimalistic-linear': trashBinMinimalisticLinear,
  'undo-left-linear': undoLeftLinear,
  'undo-right-linear': undoRightLinear,
  'user-speak-linear': userSpeakLinear,
  'widget-3-linear': widget3Linear,
};

export interface SolarIconProps {
  name: string;
  size?: number | string;
  className?: string;
  color?: string;
  title?: string;
  'aria-hidden'?: boolean;
}

export function SolarIcon({
  name,
  size = 20,
  className = '',
  color,
  title,
  'aria-hidden': ariaHidden = true,
}: SolarIconProps) {
  const iconName = name.startsWith('solar:') ? name.slice(6) : name;
  const icon = ICON_BY_NAME[iconName] ?? boxMinimalisticLinear;

  return (
    <span
      className={`icon is-inline-flex ${className}`}
      style={{ width: size, height: size, color }}
      title={title}
      aria-hidden={ariaHidden}
    >
      <Icon icon={icon} width={size} height={size} />
    </span>
  );
}
