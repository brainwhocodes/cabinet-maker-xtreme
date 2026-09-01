import { expect, test } from '@playwright/test';

test('planner supports direct measurements and named camera presets', async ({ page }) => {
  await page.goto('/planner/');

  const cameraPreset = page.getByLabel('Camera preset');
  await expect(cameraPreset).toHaveValue('room');
  await cameraPreset.selectOption('wall');
  await expect(cameraPreset).toHaveValue('wall');
  await cameraPreset.selectOption('selection');
  await expect(cameraPreset).toHaveValue('selection');

  const xPosition = page.getByLabel('X Position (From Left) in inches');
  await xPosition.fill('24');
  await expect(xPosition).toHaveValue('24');
});

test('planner side panels become accessible drawers on compact screens', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/planner/');
  await page.getByRole('button', { name: 'Catalog', exact: true }).click();
  await expect(page.getByText('Cabinet catalog', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close cabinet catalog' }).click();

  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(page.getByText('Properties', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close properties' }).click();
});

test('assembly part legend highlights exact parametric parts', async ({ page }) => {
  await page.goto('/assemble/');
  await page.getByText(/^All cabinet parts \(\d+\)$/).click();

  const partButton = page.getByRole('button', {
    name: /panel_side_left Left Side Carcass Panel/,
  });
  await expect(partButton).toHaveAttribute('aria-pressed', 'false');
  await partButton.click();
  await expect(partButton).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear highlight' }).click();
  await expect(partButton).toHaveAttribute('aria-pressed', 'false');
});

test('BOM communicates retailer data freshness honestly', async ({ page }) => {
  await page.goto('/bom/');
  await expect(page.getByRole('columnheader', { name: 'Data status' })).toBeVisible();
  await expect(page.getByText('Search only').first()).toBeVisible();
  await expect(page.getByText(/planning matches, not verified products/i)).toBeVisible();
});

test('launcher uses a real planner workspace screenshot', async ({ page }) => {
  await page.goto('/');
  const preview = page.getByAltText(/CabCraft planner showing the cabinet catalog/i);
  await expect(preview).toBeVisible();
  const naturalWidth = await preview.evaluate((image: HTMLImageElement) => image.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(1_000);
});

test('Three.js surfaces emit no deprecation warnings', async ({ page }) => {
  const deprecations: string[] = [];
  page.on('console', (message) => {
    if (/THREE\\..*deprecated/i.test(message.text())) deprecations.push(message.text());
  });

  await page.goto('/planner/');
  await page.locator('canvas').first().waitFor({ state: 'visible' });
  await page.goto('/assemble/');
  await page.getByRole('button', { name: 'Interactive 3D', exact: true }).click();
  await page.locator('canvas').first().waitFor({ state: 'visible' });

  expect(deprecations).toEqual([]);
});
