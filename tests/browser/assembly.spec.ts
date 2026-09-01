import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('planner and assembly diagrams fill their available workspaces', async ({ page }) => {
  await page.goto('/planner/');
  const plannerCanvas = page.locator('.planner-canvas-container canvas').first();
  await expect(plannerCanvas).toBeVisible();
  const plannerBox = await plannerCanvas.boundingBox();
  expect(plannerBox?.width).toBeGreaterThan(600);
  expect(plannerBox?.height).toBeGreaterThan(500);

  await page.goto('/assemble/');
  await page.getByRole('button', { name: 'Interactive 3D', exact: true }).click();
  const assemblyCanvas = page.locator('canvas').first();
  await expect(assemblyCanvas).toBeVisible();
  const assemblyBox = await assemblyCanvas.boundingBox();
  expect(assemblyBox?.width).toBeGreaterThan(600);
  expect(assemblyBox?.height).toBeGreaterThan(300);
});

test('downloads a valid cabinet-specific assembly PDF', async ({ page }) => {
  await page.goto('/assemble/');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/B30-assembly-guide-r\d+\.pdf$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const bytes = Buffer.concat(chunks);
  expect(bytes.byteLength).toBeGreaterThan(10_000);
  expect(bytes.subarray(0, 4).toString('utf8')).toBe('%PDF');
});

test('assembly guide has no serious automated accessibility violations', async ({ page }) => {
  await page.goto('/assemble/');
  const results = await new AxeBuilder({ page }).exclude('canvas').analyze();
  const seriousViolations = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(seriousViolations).toEqual([]);
});
