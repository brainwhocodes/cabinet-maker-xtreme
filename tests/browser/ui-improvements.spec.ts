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

test('viewport tool dock provides working undo and redo controls', async ({ page }) => {
  await page.goto('/planner/');

  const dock = page.getByRole('toolbar', { name: '3D Viewport tools' });
  const undoBtn = dock.getByRole('button', { name: 'Undo last action' });
  const redoBtn = dock.getByRole('button', { name: 'Redo action' });

  await expect(undoBtn).toBeVisible();
  await expect(undoBtn).toBeDisabled();
  await expect(redoBtn).toBeVisible();
  await expect(redoBtn).toBeDisabled();

  // Move cabinet with keyboard to create history
  await page.keyboard.press('ArrowLeft');
  await expect(undoBtn).toBeEnabled();

  // Click undo
  await undoBtn.click();
  await expect(undoBtn).toBeDisabled();
  await expect(redoBtn).toBeEnabled();

  // Click redo
  await redoBtn.click();
  await expect(undoBtn).toBeEnabled();
});

test('mobile editor layout renders cleanly without topbar overflow at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/planner/');

  const nav = page.getByRole('navigation', { name: 'main navigation' });
  await expect(nav).toBeVisible();

  const [scrollWidth, clientWidth] = await nav.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

  // Mobile tool dock is visible at the bottom
  const dock = page.getByRole('toolbar', { name: '3D Viewport tools' });
  await expect(dock).toBeVisible();

  // Mobile menu toggle button exists and opens the actions menu
  const menuToggle = page.getByRole('button', { name: 'Toggle editor actions menu' });
  await expect(menuToggle).toBeVisible();
  await menuToggle.click();

  const mobileMenu = page.getByRole('menu', { name: 'Editor tools' });
  await expect(mobileMenu).toBeVisible();
  await expect(mobileMenu.getByRole('combobox', { name: 'Camera preset' })).toBeVisible();
  await expect(mobileMenu.getByRole('button', { name: 'Auto-fit' })).toBeVisible();
});

test('door and front options in cabinet select screen update cabinet configuration and 3D appearance', async ({
  page,
}) => {
  await page.goto('/planner/');

  const frontLayout = page.getByLabel('Front Layout');
  const doorSwing = page.getByLabel('Door Swing Configuration');
  const doorStyle = page.getByLabel('Door Style');

  await expect(frontLayout).toBeVisible();
  await expect(doorSwing).toBeVisible();
  await expect(doorStyle).toBeVisible();

  // Switch Door Style to Modern Flat Slab
  await doorStyle.selectOption('slab_modern');
  await expect(doorStyle).toHaveValue('slab_modern');

  // Switch Door Style to Traditional Raised Panel
  await doorStyle.selectOption('raised_panel');
  await expect(doorStyle).toHaveValue('raised_panel');

  // Switch Door Swing to Single Left Hinge
  await doorSwing.selectOption('left');
  await expect(doorSwing).toHaveValue('left');

  // Switch Door Swing to Drawers Tier
  await doorSwing.selectOption('drawers');
  await expect(doorSwing).toHaveValue('drawers');
  await expect(frontLayout).toHaveValue('drawers');

  // Switch Front Layout to Open Shelf
  await frontLayout.selectOption('open');
  await expect(frontLayout).toHaveValue('open');
  await expect(doorSwing).toHaveValue('open_shelf');
});
