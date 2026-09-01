import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function parseColor(value: string): [number, number, number] {
  if (value.startsWith('#')) {
    const rawHex = value.slice(1);
    const hex =
      rawHex.length === 3
        ? rawHex
            .split('')
            .map((character) => `${character}${character}`)
            .join('')
        : rawHex;
    return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as [
      number,
      number,
      number,
    ];
  }

  const channels = value
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (channels?.length !== 3) throw new Error(`Unsupported color: ${value}`);
  return channels as [number, number, number];
}

function contrastRatio(foreground: string, background: string) {
  const [red, green, blue] = parseColor(foreground).map(channelToLinear);
  const foregroundLuminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const [bgRed, bgGreen, bgBlue] = parseColor(background).map(channelToLinear);
  const backgroundLuminance = bgRed * 0.2126 + bgGreen * 0.7152 + bgBlue * 0.0722;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test('AAA palette pairs remain above 7:1', async ({ page }) => {
  await page.goto('/planner/');
  const colors = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name: string) => styles.getPropertyValue(name).trim();
    return {
      text: read('--color-text'),
      muted: read('--color-text-muted'),
      primary: read('--color-primary'),
      primaryDeep: read('--color-primary-deep'),
      primaryLight: read('--color-primary-light'),
      surface: read('--color-surface'),
      success: read('--color-success'),
      successLight: read('--color-success-light'),
      danger: read('--color-danger'),
      dangerLight: read('--color-danger-light'),
      warning: read('--color-warning'),
      warningLight: read('--color-warning-light'),
    };
  });

  const pairs: Array<[string, string]> = [
    [colors.text, colors.surface],
    [colors.muted, colors.surface],
    [colors.primary, colors.surface],
    [colors.surface, colors.primary],
    [colors.primaryDeep, colors.primaryLight],
    [colors.success, colors.successLight],
    [colors.danger, colors.dangerLight],
    [colors.warning, colors.warningLight],
  ];

  for (const [foreground, background] of pairs) {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(7);
  }
});

test('dark system preference cannot invert the light control theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/planner/');

  const controls = [
    page.getByPlaceholder(/Search cabinets/),
    page.getByLabel('X Position (From Left) in inches'),
    page.getByLabel('Door Swing Configuration'),
  ];

  for (const control of controls) {
    const style = await control.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        background: computed.backgroundColor,
        color: computed.color,
        height: element.getBoundingClientRect().height,
      };
    });
    expect(contrastRatio(style.color, style.background)).toBeGreaterThanOrEqual(7);
    expect(style.background).toBe('rgb(255, 255, 255)');
    expect(style.height).toBe(36);
  }
});

test('catalog thumbnails and Add buttons share fixed alignment columns', async ({ page }) => {
  await page.goto('/planner/');

  const buttonBoxes = await page
    .locator('.catalog-item-add')
    .evaluateAll((buttons) => buttons.slice(0, 7).map((button) => button.getBoundingClientRect()));
  const iconBoxes = await page
    .locator('.catalog-item-row .catalog-item-thumbnail')
    .evaluateAll((thumbnails) =>
      thumbnails.slice(0, 7).map((thumbnail) => thumbnail.getBoundingClientRect()),
    );

  const buttonRightEdges = buttonBoxes.map((box) => Math.round(box.right));
  const iconLeftEdges = iconBoxes.map((box) => Math.round(box.left));
  expect(new Set(buttonRightEdges).size).toBe(1);
  expect(new Set(iconLeftEdges).size).toBe(1);
  expect(buttonBoxes.every((box) => Math.round(box.width) === 66)).toBe(true);
  expect(iconBoxes.every((box) => Math.round(box.width) === 72)).toBe(true);
});

test('planner has no enhanced color contrast violations outside WebGL', async ({ page }) => {
  await page.goto('/planner/');
  const results = await new AxeBuilder({ page })
    .exclude('canvas')
    .withRules(['color-contrast-enhanced'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('planner has no critical or serious axe findings outside WebGL', async ({ page }) => {
  await page.goto('/planner/');
  const results = await new AxeBuilder({ page }).exclude('canvas').analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toEqual([]);
});
