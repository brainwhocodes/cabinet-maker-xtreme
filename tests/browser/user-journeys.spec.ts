import { expect, test } from '@playwright/test';

test.describe('End-to-End User Journeys', () => {
  test('Journey 1: Precision Viewport, 3D Manipulator, Live Clearance & Dock Tools', async ({
    page,
  }) => {
    await page.goto('/planner/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Floating Viewport Dock & Tools
    const dock = page.locator('.planner-viewport-tool-dock');
    await expect(dock).toBeVisible();

    const selectBtn = dock.getByRole('button', { name: 'Select and move tool' });
    const orbitBtn = dock.getByRole('button', { name: 'Orbit camera tool' });
    const panBtn = dock.getByRole('button', { name: 'Pan camera tool' });
    const walkBtn = dock.getByRole('button', { name: 'First-person walkthrough mode' });
    const measureBtn = dock.getByRole('button', { name: 'Measurement tool' });
    const captureBtn = dock.getByRole('button', { name: 'Export viewport screenshot' });

    await expect(selectBtn).toBeVisible();
    await expect(orbitBtn).toBeVisible();
    await expect(panBtn).toBeVisible();
    await expect(walkBtn).toBeVisible();
    await expect(measureBtn).toBeVisible();
    await expect(captureBtn).toBeVisible();

    // 2. Verify Default Selected Cabinet, 3D Dimension Badges & Contextual Bar
    const selectionBar = page.locator('.planner-selection-bar');
    await expect(selectionBar).toBeVisible();
    await expect(selectionBar.locator('.planner-selection-count')).toHaveText('1');
    await expect(selectionBar.locator('.planner-selection-label')).toHaveText('Selected');
    // 3. Verify Nominal 3D Dimension Badges
    await expect(page.getByText(/30" W/)).toBeVisible();
    await expect(page.getByText(/34 1\/2" H/)).toBeVisible();

    // 4. Test View Transitions with Keyboard
    await page.keyboard.press('2'); // Top view
    await expect(page.getByRole('button', { name: 'Top', exact: true })).toHaveClass(/is-primary/);

    await page.keyboard.press('1'); // 3D view
    await expect(page.getByRole('button', { name: '3D View', exact: true })).toHaveClass(
      /is-primary/,
    );

    // 5. Test Walk mode activation with keyboard shortcut 'w'
    await page.keyboard.press('w');
    await expect(walkBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch back to select mode with keyboard shortcut 'v'
    await page.keyboard.press('v');
    await expect(selectBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('Journey 2: 2D Cut List, Sheet Nesting & Digital Fabrication (/cutlist)', async ({
    page,
  }) => {
    await page.goto('/cutlist/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Page Title & Summary Banner
    await expect(page.getByText(/Cut List & 2D Nesting/)).toBeVisible();
    await expect(page.getByText('Total Plywood Sheets')).toBeVisible();
    await expect(page.getByText('Overall Material Yield')).toBeVisible();
    await expect(page.getByText('Total Panel Parts')).toBeVisible();
    await expect(page.getByText('Edge Banding Rolls')).toBeVisible();

    // 2. Verify Material Tabs
    const tabs = page.locator('.tabs ul li');
    await expect(tabs).toHaveCount(3);
    await expect(page.getByRole('button', { name: /All Materials/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /3\/4" Carcass Plywood/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /1\/4" Backer Board/ })).toBeVisible();

    // 3. Verify Nested Sheet Diagrams
    const sheetCards = page.locator('.sheet-nesting-card');
    await expect(sheetCards.first()).toBeVisible();
    const svgDiagram = sheetCards.first().locator('svg[id^="nested-sheet-svg"]');
    await expect(svgDiagram).toBeVisible();
    await expect(sheetCards.first().getByRole('button', { name: 'Export DXF' })).toBeVisible();

    // 4. Test CSV Export Button
    const exportCsvBtn = page.getByRole('button', { name: 'Export CSV' });
    await expect(exportCsvBtn).toBeVisible();

    // 5. Test Cutting Tickets Button
    const ticketsBtn = page.getByRole('button', { name: 'Cutting Tickets' });
    await expect(ticketsBtn).toBeVisible();
  });

  test('Journey 3: WebMCP Agent Automation & Dynamic Clash Detection', async ({ page }) => {
    await page.goto('/planner/');
    await page.waitForLoadState('domcontentloaded');

    // Open WebMCP Activity Drawer
    const agentBtn = page.getByRole('button', { name: /Agent \(\d+\)/ });
    await expect(agentBtn).toBeVisible();
    await agentBtn.click();
    const drawer = page.locator('.webmcp-activity-drawer');
    // Switch to Playbook tab to verify rules
    await page.getByRole('button', { name: 'Agent Playbook & Rules' }).click();
    await expect(drawer.getByText(/Recommended Agent Workflow Sequence/)).toBeVisible();
    // Close drawer
    await drawer.getByRole('button', { name: 'close' }).click();
    await expect(drawer).not.toBeVisible();
  });
});
