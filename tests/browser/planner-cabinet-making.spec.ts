import { expect, type Locator, type Page, test } from '@playwright/test';

async function expectAlignedCatalogSearch(page: Page) {
  const searchbox = page.getByRole('searchbox', { name: 'Search cabinet catalog' });
  const leadingIcon = page.locator('.catalog-search-leading');

  await expect(searchbox).toBeVisible();
  await expect(leadingIcon).toBeVisible();

  const [inputBox, iconBox] = await Promise.all([
    searchbox.boundingBox(),
    leadingIcon.boundingBox(),
  ]);
  expect(inputBox).not.toBeNull();
  expect(iconBox).not.toBeNull();

  const inputCenter = inputBox!.y + inputBox!.height / 2;
  const iconCenter = iconBox!.y + iconBox!.height / 2;
  expect(Math.abs(inputCenter - iconCenter)).toBeLessThanOrEqual(1);

  await searchbox.fill('drawer base cabinet');
  const clearButton = page.getByRole('button', { name: 'Clear search' });
  await expect(clearButton).toBeVisible();

  const metrics = await searchbox.evaluate((input) => {
    const styles = getComputedStyle(input);
    const rect = input.getBoundingClientRect();
    return {
      contentLeft: rect.left + Number.parseFloat(styles.paddingLeft),
      contentRight: rect.right - Number.parseFloat(styles.paddingRight),
    };
  });
  const [updatedIconBox, clearBox] = await Promise.all([
    leadingIcon.boundingBox(),
    clearButton.boundingBox(),
  ]);

  expect(updatedIconBox).not.toBeNull();
  expect(clearBox).not.toBeNull();
  expect(metrics.contentLeft).toBeGreaterThanOrEqual(updatedIconBox!.x + updatedIconBox!.width);
  expect(metrics.contentRight).toBeLessThanOrEqual(clearBox!.x);
}

async function openCompactCatalog(page: Page): Promise<Locator> {
  const catalogButton = page.getByRole('button', { name: 'Catalog', exact: true });
  await catalogButton.click();
  const heading = page.getByText('Cabinet catalog', { exact: true });
  await expect(heading).toBeVisible();
  return heading;
}

test('catalog search icon stays aligned in the 320px desktop rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  const catalog = page.locator('.catalog-rail');
  await expect(catalog).toBeVisible();
  const catalogBox = await catalog.boundingBox();
  expect(catalogBox).not.toBeNull();
  expect(catalogBox!.width).toBeCloseTo(320, 0);

  await expectAlignedCatalogSearch(page);
});

test('catalog search icon stays aligned at a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/planner/');
  await openCompactCatalog(page);
  await expectAlignedCatalogSearch(page);
});

test('catalog placement stages, cancels, and commits through the placement bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  const addBase = page.getByRole('button', { name: 'Add 12" Standard Base Cabinet' });
  await addBase.click();
  const placement = page.getByRole('region', { name: 'Catalog placement' });
  await expect(placement).toBeVisible();
  await expect(placement).toContainText('Valid placement');
  await page.keyboard.press('Escape');
  await expect(placement).toBeHidden();
  await expect(page.getByRole('button', { name: /Scene table/ })).toContainText('(5)');

  await addBase.click();
  await placement.getByLabel('Target wall').selectOption('wall-2');
  await placement.getByLabel('Offset (in)').fill('12');
  await placement.getByLabel('Offset (in)').press('Enter');
  await page.getByRole('button', { name: 'Place', exact: true }).click();
  await expect(placement).toBeHidden();
  await expect(page.getByRole('button', { name: /Scene table/ })).toContainText('(6)');
});

test('keyboard movement commits an exact one-inch move', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: /Scene table/ }).click();
  const b30Row = page.locator('tbody tr').filter({ hasText: 'B30' }).first();
  await expect(b30Row.locator('td').nth(4)).toHaveText('17"');
});

test('catalog uses geometry thumbnails and one shared interactive preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  await expect(page.locator('.catalog-item-row .catalog-item-thumbnail').first()).toBeVisible();
  await expect(page.locator('.catalog-preview-canvas canvas')).toHaveCount(1);

  await page.getByLabel('Cabinet category').selectOption('built-ins');
  const countertopRow = page
    .locator('.catalog-item-row')
    .filter({ hasText: 'Standard countertop' });
  await expect(countertopRow.locator('.catalog-item-thumbnail')).toBeVisible();
  await countertopRow.getByRole('button', { name: 'Preview Standard countertop' }).click();
  const sharedPreview = page.getByRole('region', { name: 'Previewing Standard countertop' });
  await expect(sharedPreview).toBeFocused();
  await expect(sharedPreview).toHaveClass(/is-pinned/);
  await expect(page.locator('.catalog-preview-heading')).toContainText('Standard countertop');

  await page.getByRole('tab', { name: 'Hardware', exact: true }).click();
  await expect(
    page
      .locator('.catalog-item-row')
      .filter({ hasText: 'Minimalist Round Knob' })
      .locator('.catalog-item-thumbnail'),
  ).toBeVisible();
  const knobRow = page.locator('.catalog-item-row').filter({ hasText: 'Minimalist Round Knob' });
  await knobRow.getByRole('button', { name: /Preview .*Minimalist Round Knob/ }).click();
  await expect(page.locator('.catalog-hardware-facts')).toContainText('cylinder');
  await expect(page.locator('.catalog-hardware-facts')).toContainText('0.625"');

  await page.getByRole('tab', { name: 'Cabinets', exact: true }).click();
  await page.getByLabel('Cabinet category').selectOption('shelves');
  await expect(
    page
      .locator('.catalog-item-row')
      .filter({ hasText: 'Two adjustable shelves' })
      .locator('.catalog-item-thumbnail'),
  ).toBeVisible();
});

test('hardware and shelf rows apply to the selected cabinet', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  await page.getByRole('tab', { name: 'Hardware', exact: true }).click();
  await page
    .getByRole('button', { name: /Apply 3" Matte Black Cup Pull to 30" Standard Base Cabinet/ })
    .click();
  const cupPullRow = page.locator('.catalog-item-row').filter({ hasText: 'Matte Black Cup Pull' });
  await expect(cupPullRow).toHaveClass(/is-selected/);

  await page.getByRole('tab', { name: 'Cabinets', exact: true }).click();
  await page.getByLabel('Cabinet category').selectOption('shelves');
  await page
    .getByRole('button', {
      name: /Apply Three adjustable shelves to 30" Standard Base Cabinet/,
    })
    .click();
  const shelfRow = page
    .locator('.catalog-item-row')
    .filter({ hasText: 'Three adjustable shelves' });
  await expect(shelfRow).toHaveClass(/is-selected/);
});

test('catalog retains static thumbnails and actions when WebGL is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  await expect(page.getByText('Interactive preview unavailable').first()).toBeVisible();
  await expect(page.locator('.catalog-item-row .catalog-item-thumbnail').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add 12" Standard Base Cabinet' })).toBeEnabled();
});

test('compact drawers are inert while closed and restore trigger focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/planner/');

  const catalogPanel = page.locator('.planner-catalog-panel');
  const propertiesPanel = page.locator('.planner-inspector-panel');
  await expect(catalogPanel).toHaveAttribute('inert', '');
  await expect(propertiesPanel).toHaveAttribute('inert', '');

  const catalogTrigger = page.getByRole('button', { name: 'Catalog', exact: true });
  await catalogTrigger.click();
  await expect(page.getByText('Cabinet catalog', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(catalogPanel).toHaveAttribute('inert', '');
  await expect(catalogTrigger).toBeFocused();

  const propertiesTrigger = page.getByRole('button', { name: 'Properties', exact: true });
  await expect(propertiesTrigger).toBeEnabled();
  await propertiesTrigger.click();
  await expect(propertiesPanel.getByText('Properties', { exact: true })).toBeFocused();
  const closeProperties = page.getByRole('button', { name: 'Close properties' });
  const closeBox = await closeProperties.boundingBox();
  expect(closeBox?.width).toBeGreaterThanOrEqual(44);
  expect(closeBox?.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Escape');
  await expect(propertiesPanel).toHaveAttribute('inert', '');
  await expect(propertiesTrigger).toBeFocused();
});

test('run completion review cancels previews and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  const trigger = page.getByRole('button', { name: 'Complete runs', exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Review built-in run finishes' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review built-in run finishes' })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('inspection controls expose visibility, section, and camera equivalents', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner/');

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Labels', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByLabel('Section mode').selectOption('room_plane');
  await expect(page.getByLabel('Room section plane offset in inches')).toBeVisible();
  await page.getByRole('button', { name: 'Focus selection' }).click();
  await page.getByRole('button', { name: 'Reset camera' }).click();
  await page.getByRole('button', { name: 'Hide', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Show all', exact: true })).toBeEnabled();

  const toolbarBox = await page.locator('.planner-inspection-panel').boundingBox();
  const validationBox = await page.locator('.validation-panel').boundingBox();
  const canvasBox = await page.locator('.planner-canvas-container').boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(validationBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(
    Math.abs(toolbarBox!.y + toolbarBox!.height / 2 - (canvasBox!.y + canvasBox!.height / 2)),
  ).toBeLessThanOrEqual(2);
  expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
  expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(validationBox!.y);

  const actionBoxes = await page
    .locator('.planner-inspection-actions .button')
    .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect()));
  expect(new Set(actionBoxes.map((box) => Math.round(box.left))).size).toBe(1);
  expect(
    actionBoxes.every((box, index) => index === 0 || box.top > actionBoxes[index - 1].top),
  ).toBe(true);
});
