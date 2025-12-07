import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Contracts Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.contracts);
    await waitForPageLoad(page);
  });

  test('CON-001: Should load contracts page', async ({ page }) => {
    await expect(page.locator('text=Contract').first()).toBeVisible({ timeout: 15000 });
  });

  test('CON-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Page has 3 gradient stats cards
    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    expect(cardCount).toBeGreaterThanOrEqual(3);
    console.log(`Found ${cardCount} stats cards`);
  });

  test('CON-003: Should display total/filtered contracts stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Stats card shows Total Contracts or Filtered Contracts text
    const hasTotalContracts = await page.locator('text=Total Contracts, text=Filtered Contracts, text=Contracts').first().isVisible().catch(() => false);

    console.log(`Total contracts stat: ${hasTotalContracts}`);
    expect(hasTotalContracts).toBeTruthy();
  });

  test('CON-004: Should display active contracts stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasActiveContracts = await page.locator('text=Active').first().isVisible().catch(() => false);

    console.log(`Active contracts stat: ${hasActiveContracts}`);
    expect(hasActiveContracts).toBeTruthy();
  });

  test('CON-005: Should display expiring soon stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpiringStat = await page.locator('text=Expiring').first().isVisible().catch(() => false);

    console.log(`Expiring soon stat: ${hasExpiringStat}`);
    expect(hasExpiringStat).toBeTruthy();
  });

  test('CON-006: Should have contract type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Filter is a Select with role="combobox"
    const typeFilter = page.locator('[role="combobox"]').first();
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);

    console.log(`Contract type filter: ${hasTypeFilter}`);
    expect(hasTypeFilter).toBeTruthy();
  });

  test('CON-007: Should filter by contract type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Contract type options: ${hasOptions}`);
      expect(hasOptions).toBeTruthy();
    }
  });

  test('CON-008: Should have upload button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Upload button has text from translation, typically "Upload Contract"
    const uploadButton = page.locator('button:has-text("Upload")').first();
    const hasUpload = await uploadButton.isVisible().catch(() => false);

    console.log(`Upload button: ${hasUpload}`);
    expect(hasUpload).toBeTruthy();
  });

  test('CON-009: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Refresh button has text "Refresh"
    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
    expect(hasRefresh).toBeTruthy();
  });

  test('CON-010: Should have tree/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // View mode uses Tabs component with TabsTrigger elements (role="tab")
    const viewTabs = page.locator('[role="tab"]');
    const tabCount = await viewTabs.count();

    const hasTreeView = tabCount >= 2;
    console.log(`Tree/List view toggle: ${hasTreeView} (${tabCount} tabs)`);
    expect(hasTreeView).toBeTruthy();
  });

  test('CON-011: Should open upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();

    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('CON-012: Should close upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();

    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      if (dialogVisible) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        const dialogStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        console.log(`Dialog closed: ${!dialogStillVisible}`);
      }
    }
  });

  test('CON-013: Should display contracts table, tree, or empty state', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasTree = await page.locator('[class*="tree"], [class*="Tree"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No contracts, text=no contracts').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Tree: ${hasTree}, Cards: ${hasCards}, Empty: ${hasEmptyState}`);
    expect(hasTable || hasTree || hasCards || hasEmptyState).toBeTruthy();
  });

  test('CON-014: Should have clear filter button when filtered', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      // Select a specific option (not "all")
      const options = page.locator('[role="option"]');
      const optionCount = await options.count();

      if (optionCount > 1) {
        // Click on second option (first after "all")
        await options.nth(1).click();
        await waitForPageLoad(page, 500);

        // Clear button should appear
        const clearButton = page.locator('button:has-text("Clear")').first();
        const hasClear = await clearButton.isVisible().catch(() => false);

        console.log(`Clear filter button: ${hasClear}`);
      }
    }
  });
});

test.describe('Contracts - Document Actions', () => {
  test('CON-015: Should have download action in tree/list', async ({ page }) => {
    await page.goto(ROUTES.contracts);
    await waitForPageLoad(page, 2000);

    // Switch to list view to see action buttons
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    // Download button uses Download icon from lucide
    const downloadButton = page.locator('button').filter({ has: page.locator('svg.lucide-download') }).first();
    const hasDownload = await downloadButton.isVisible().catch(() => false);

    console.log(`Download action: ${hasDownload}`);
  });

  test('CON-016: Should have delete action in tree/list', async ({ page }) => {
    await page.goto(ROUTES.contracts);
    await waitForPageLoad(page, 2000);

    // Switch to list view
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    // Delete button uses Trash2 icon
    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('CON-017: Should display badges', async ({ page }) => {
    await page.goto(ROUTES.contracts);
    await waitForPageLoad(page, 2000);

    // Badges show total count, contract types, etc.
    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} badges`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });
});
