import { spawnSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const HELPER_POSES = [
  'pointing_guide',
  'measuring',
  'drill_safety',
  'check_square',
  'two_person_lift',
  'completion_check',
] as const;

async function openAllParts(page: Page) {
  await page.getByText(/^All cabinet parts \(\d+\)$/).click();
}

test('desktop focus mode renders one rail, stage, and guidance panel above the fold', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/assemble/');

  await expect(page.getByRole('navigation', { name: 'Assembly steps' })).toHaveCount(1);
  await expect(page.locator('.assembly-stage')).toHaveCount(1);
  await expect(page.locator('.assembly-guidance')).toHaveCount(1);
  const stageBox = await page.locator('.assembly-stage').boundingBox();
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  const instructionBox = await page.locator('.assembly-guidance-actions li').first().boundingBox();
  expect((stageBox?.y ?? 0) + (stageBox?.height ?? 0)).toBeLessThanOrEqual(900);
  expect(headingBox?.y).toBeLessThan(900);
  expect(instructionBox?.y).toBeLessThan(900);

  const cadSheet = page.locator('.assembly-line-diagram-main');
  await expect(cadSheet.locator('.assembly-cad-view')).toHaveCount(2);
  await expect(cadSheet.locator('.assembly-cad-view.is-primary')).toHaveAttribute(
    'data-cad-orientation',
    'isometric',
  );
  await expect(cadSheet.locator('.assembly-cad-view.is-secondary')).toHaveAttribute(
    'data-cad-orientation',
    'front',
  );
  await expect(
    cadSheet.locator('.assembly-cad-view.is-primary [data-callout-part-id]'),
  ).toHaveCount(3);
  await expect(
    cadSheet.locator('.assembly-cad-view.is-primary .assembly-cad-balloon polyline'),
  ).toHaveCount(3);
  await expect(cadSheet.locator('.assembly-cad-title-block')).toContainText('Third-angle');
  await expect(cadSheet.locator('[data-part-state="context"]').first()).not.toHaveAttribute(
    'opacity',
  );

  const storyboard = page.locator('.assembly-storyboard');
  await expect(storyboard).toHaveCount(1);
  await expect(storyboard).toBeHidden();
  await page.getByRole('button', { name: 'Overview' }).click();
  await expect(storyboard).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close overview' })).toBeFocused();
});

test('mobile focus mode keeps the full stage and first instruction in the initial viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/assemble/');

  const rail = page.getByRole('navigation', { name: 'Assembly steps' });
  const stage = page.locator('.assembly-stage');
  const guidance = page.locator('.assembly-guidance');
  const [railBox, stageBox, guidanceBox, headingBox, instructionBox] = await Promise.all([
    rail.boundingBox(),
    stage.boundingBox(),
    guidance.boundingBox(),
    page.getByRole('heading', { level: 1 }).boundingBox(),
    page.locator('.assembly-guidance-actions li').first().boundingBox(),
  ]);
  expect(railBox?.y).toBeLessThan(stageBox?.y ?? 0);
  expect(stageBox?.y).toBeLessThan(guidanceBox?.y ?? 0);
  expect(stageBox?.height).toBeGreaterThanOrEqual(280);
  expect(stageBox?.height).toBeLessThanOrEqual(360);
  expect((stageBox?.y ?? 0) + (stageBox?.height ?? 0)).toBeLessThan(844);
  expect(headingBox?.y).toBeLessThan(844);
  expect(instructionBox?.y).toBeLessThan(844);
  expect(
    await rail.locator('ol').evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  await expect(page.getByLabel('More actions')).toBeVisible();
  expect((await page.locator('.assembly-toolbar').boundingBox())?.height).toBe(60);
  const toolbarLayout = await page.locator('.assembly-toolbar').evaluate((element) => {
    const toolbar = element.getBoundingClientRect();
    return {
      direction: getComputedStyle(element).flexDirection,
      childrenFit: Array.from(element.children).every((child) => {
        const box = child.getBoundingClientRect();
        return box.top >= toolbar.top && box.bottom <= toolbar.bottom;
      }),
    };
  });
  expect(toolbarLayout).toEqual({ direction: 'row', childrenFit: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const cadSheet = page.locator('.assembly-line-diagram-main');
  await expect(page.getByRole('button', { name: 'Exploded inventory' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Front elevation' })).toBeVisible();
  await expect(cadSheet.locator('.assembly-cad-view.is-selected')).toHaveAttribute(
    'data-cad-orientation',
    'isometric',
  );
  await page.getByRole('button', { name: 'Front elevation' }).click();
  await expect(cadSheet.locator('.assembly-cad-view.is-selected')).toHaveAttribute(
    'data-cad-orientation',
    'front',
  );
  await expect(cadSheet.locator('.assembly-cad-view.is-selected')).toBeVisible();
  await expect(cadSheet.locator('.assembly-cad-view.is-primary')).toBeHidden();
  await expect(cadSheet.locator('[data-hidden-edge="true"] rect').first()).toHaveAttribute(
    'stroke-dasharray',
    '3 2',
  );
});

test('step-specific CAD sheets add rear, section, cutting-plane, and detail views', async ({
  page,
}) => {
  await page.goto('/assemble/');
  const cadSheet = page.locator('.assembly-line-diagram-main');

  await page.getByRole('button', { name: /^Step 4:/ }).click();
  await expect(cadSheet.locator('.assembly-cad-view.is-primary')).toHaveAttribute(
    'data-cad-orientation',
    'rear',
  );
  await expect(cadSheet.locator('[data-cad-orientation="section-right"]')).toHaveCount(1);
  await expect(cadSheet.locator('[data-sectioned="true"]')).not.toHaveCount(0);
  await expect(cadSheet.locator('[data-cutting-plane="A-A"]')).toHaveCount(1);
  await expect(cadSheet.locator('[data-cad-orientation="section-right"]')).toContainText(
    'Section A–A',
  );

  await page.getByRole('button', { name: /^Step 6:/ }).click();
  await expect(cadSheet.locator('[data-cad-orientation="front-detail"]')).toHaveCount(1);
  await expect(cadSheet.locator('[data-cad-orientation="front-detail"]')).toContainText('Detail A');
  await expect(
    cadSheet.locator('[data-cad-orientation="front-detail"] [data-part-id]'),
  ).toHaveCount(8);
});

test('progressive manual diagrams and the parts disclosure reflect each assembly step', async ({
  page,
}) => {
  await page.goto('/assemble/');
  const mainDiagram = page.locator('.assembly-line-diagram-main .assembly-cad-view.is-primary');

  await expect(mainDiagram.locator('[data-part-state="active"]')).toHaveCount(3);
  await expect(mainDiagram.locator('[data-part-state="context"]')).toHaveCount(17);
  await expect(mainDiagram.locator('[data-callout-part-id]')).toHaveCount(3);
  await expect(mainDiagram.locator('[data-part-id="panel_side_left"] > rect')).toHaveAttribute(
    'stroke-width',
    '1.5',
  );
  await expect(mainDiagram.locator('[data-part-id="door_front_left"] > rect')).toHaveAttribute(
    'stroke',
    '#9AA8B6',
  );
  await expect(mainDiagram.locator('[data-part-id="door_front_left"] > rect')).toHaveAttribute(
    'stroke-width',
    '0.75',
  );

  await page.getByRole('button', { name: /^Step 2:/ }).click();
  await expect(mainDiagram.locator('[data-part-id="panel_side_left"]')).toHaveAttribute(
    'data-part-state',
    'active',
  );
  await expect(mainDiagram.locator('[data-part-id="panel_side_right"]')).toHaveAttribute(
    'data-part-state',
    'active',
  );
  await expect(mainDiagram.locator('[data-part-id="panel_bottom_deck"]')).toHaveAttribute(
    'data-part-state',
    'active',
  );
  await expect(mainDiagram.locator('[data-part-id^="door_"]')).toHaveCount(0);

  const allParts = page.locator('.assembly-all-parts');
  await expect(allParts).not.toHaveAttribute('open', '');
  await openAllParts(page);
  const futureDoor = page.getByRole('button', { name: /door_front_left Left Door/ });
  const activeSide = page.getByRole('button', { name: /panel_side_left Left Side Carcass Panel/ });
  await expect(futureDoor).toBeDisabled();
  await expect(futureDoor).toHaveAttribute('aria-disabled', 'true');
  await expect(activeSide).toBeEnabled();
  await activeSide.click();
  await expect(activeSide).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Step 3:/ }).click();
  await expect(activeSide).toHaveAttribute('aria-pressed', 'false');
  await expect(activeSide).toBeEnabled();
  await expect(mainDiagram.locator('[data-part-id="panel_side_left"] > rect')).toHaveAttribute(
    'stroke',
    '#738292',
  );
  await expect(mainDiagram.locator('[data-part-id="panel_side_left"] > rect')).toHaveAttribute(
    'stroke-width',
    '0.9',
  );
  await activeSide.click();
  await expect(activeSide).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Interactive 3D', exact: true }).click();
  await expect(activeSide).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Manual', exact: true }).click();

  await page.getByRole('button', { name: /^Step 6:/ }).click();
  await expect(mainDiagram.locator('[data-part-state="future"]')).toHaveCount(0);
  await expect(mainDiagram.locator('[data-part-id]')).toHaveCount(20);
  await activeSide.click();
  await expect(activeSide).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('combobox', { name: 'Select cabinet for assembly guide' }).selectOption({
    label: 'SB36 - 36" Sink Base Cabinet',
  });
  await expect(activeSide).toHaveAttribute('aria-pressed', 'false');
});

test('overview closes by button, Escape, and backdrop while restoring focus', async ({ page }) => {
  await page.goto('/assemble/');
  const trigger = page.getByRole('button', { name: 'Overview' });
  const dialog = page.getByRole('dialog', { name: 'Assembly overview' });

  await trigger.click();
  await page.getByRole('button', { name: 'Close overview' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.mouse.click(2, 200);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('dialog fallback traps the page and closes with Escape', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto('/assemble/');
  const trigger = page.getByRole('button', { name: 'Overview' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Assembly overview' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('.assembly-page-content')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.assembly-page-content')).not.toHaveAttribute('inert', '');
  await expect(trigger).toBeFocused();
});

test('interactive mode replays movement, holds exploded targets, and resets selection', async ({
  page,
}) => {
  const issues: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || /THREE\..*deprecated/i.test(message.text())) {
      issues.push(message.text());
    }
  });
  page.on('pageerror', (error) => issues.push(error.message));
  await page.goto('/assemble/');
  await page.getByRole('button', { name: 'Interactive 3D', exact: true }).click();

  const hotspot = page.getByRole('button', { name: /^Part 1:/ });
  await expect(hotspot).toBeVisible();
  await expect(hotspot).toHaveJSProperty('tabIndex', 0);
  await page.waitForTimeout(1_000);
  const assembledBox = await hotspot.boundingBox();
  await page.getByRole('button', { name: 'Replay step' }).click();
  await page.waitForTimeout(40);
  const replayBox = await hotspot.boundingBox();
  expect(Math.abs((replayBox?.x ?? 0) - (assembledBox?.x ?? 0))).toBeGreaterThan(2);
  await page.waitForTimeout(1_000);

  const exploded = page.getByRole('button', { name: 'Exploded' });
  await exploded.click();
  await expect(exploded).toHaveAttribute('aria-pressed', 'true');
  const heldStart = await hotspot.boundingBox();
  await page.waitForTimeout(350);
  const heldEnd = await hotspot.boundingBox();
  expect(Math.abs((heldEnd?.x ?? 0) - (heldStart?.x ?? 0))).toBeLessThan(1);

  await hotspot.click();
  await openAllParts(page);
  const selectedPart = page.getByRole('button', {
    name: /panel_side_left Left Side Carcass Panel/,
  });
  await expect(selectedPart).toHaveAttribute('aria-pressed', 'true');
  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (canvasBox) {
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.5,
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.4,
    );
    await page.mouse.up();
    await page.mouse.wheel(0, -240);
  }
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(exploded).toHaveAttribute('aria-pressed', 'false');
  await expect(selectedPart).toHaveAttribute('aria-pressed', 'false');
  expect(issues).toEqual([]);
});

test('reduced-motion mode snaps replayed parts without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/assemble/');
  await page.getByRole('button', { name: 'Interactive 3D', exact: true }).click();
  const hotspot = page.getByRole('button', { name: /^Part 1:/ });
  await expect(hotspot).toBeVisible();
  const before = await hotspot.boundingBox();
  await page.getByRole('button', { name: 'Replay step' }).click();
  await page.waitForTimeout(40);
  const after = await hotspot.boundingBox();
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('helper assets decode at 1024 square with transparent corners and pass validation', async ({
  page,
}) => {
  await page.goto('/assemble/');
  const assets = await page.evaluate(async (poses) => {
    return Promise.all(
      poses.map(async (pose) => {
        const image = new Image();
        image.src = `/assembly/helpers/${pose}.png`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(image, 0, 0);
        const corners = [
          context.getImageData(0, 0, 1, 1).data[3],
          context.getImageData(image.naturalWidth - 1, 0, 1, 1).data[3],
          context.getImageData(0, image.naturalHeight - 1, 1, 1).data[3],
          context.getImageData(image.naturalWidth - 1, image.naturalHeight - 1, 1, 1).data[3],
        ];
        return { pose, width: image.naturalWidth, height: image.naturalHeight, corners };
      }),
    );
  }, HELPER_POSES);
  for (const asset of assets) {
    expect(asset.width).toBe(1024);
    expect(asset.height).toBe(1024);
    expect(asset.corners).toEqual([0, 0, 0, 0]);
  }

  const validation = spawnSync('python', ['scripts/validate-helper-assets.py'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  expect(validation.status, validation.stderr).toBe(0);
});

test('downloaded manual includes every step and embedded helper images', async ({ page }) => {
  await page.goto('/assemble/');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/B30-assembly-guide-r\d+\.pdf$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  const pdfText = bytes.toString('latin1');
  expect(bytes.subarray(0, 4).toString('utf8')).toBe('%PDF');
  expect(Number(pdfText.match(/\/Count (\d+)/)?.[1])).toBeGreaterThanOrEqual(8);
  expect(pdfText).toContain('/Subtype /Image');
});

test('assembly focus mode has no critical or serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/assemble/');
  const results = await new AxeBuilder({ page }).exclude('canvas').analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toEqual([]);
});
