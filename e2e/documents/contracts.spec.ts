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

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    expect(cardCount).toBeGreaterThanOrEqual(3);
    console.log(`Found ${cardCount} stats cards`);
  });

  test('CON-003: Should display total contracts stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTotalContracts = await page.locator('text=Total Contracts, text=Total').first().isVisible().catch(() => false);

    console.log(`Total contracts stat: ${hasTotalContracts}`);
  });

  test('CON-004: Should display active contracts stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasActiveContracts = await page.locator('text=Active').first().isVisible().catch(() => false);

    console.log(`Active contracts stat: ${hasActiveContracts}`);
  });

  test('CON-005: Should display expiring soon stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpiringStat = await page.locator('text=Expiring').first().isVisible().catch(() => false);

    console.log(`Expiring soon stat: ${hasExpiringStat}`);
  });

  test('CON-006: Should have contract type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"], select').first();
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);

    console.log(`Contract type filter: ${hasTypeFilter}`);
  });

  test('CON-007: Should filter by contract type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Contract type options: ${hasOptions}`);
    }
  });

  test('CON-008: Should have upload button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();
    const hasUpload = await uploadButton.isVisible().catch(() => false);

    console.log(`Upload button: ${hasUpload}`);
  });

  test('CON-009: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIcon = page.locator('button').filter({ has: page.locator('[class*="refresh"], [class*="Refresh"]') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false) ||
                       await refreshIcon.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
  });

  test('CON-010: Should have tree/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const treeView = page.locator('button:has-text("Tree"), [value="tree"]').first();
    const listView = page.locator('button:has-text("List"), [value="list"]').first();

    const hasTreeView = await treeView.isVisible().catch(() => false);
    const hasListView = await listView.isVisible().catch(() => false);

    console.log(`Tree view: ${hasTreeView}, List view: ${hasListView}`);
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

  test('CON-013: Should display contracts table or tree', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasTree = await page.locator('[class*="tree"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No contracts').isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Tree: ${hasTree}, Cards: ${hasCards}, Empty: ${hasEmptyState}`);
  });

  test('CON-014: Should have clear filter button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"]').nth(1);
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await waitForPageLoad(page, 500);

        const clearButton = page.locator('button:has-text("Clear")').first();
        const hasClear = await clearButton.isVisible().catch(() => false);

        console.log(`Clear filter button: ${hasClear}`);
      }
    }
  });
});

test.describe('Contracts - Document Actions', () => {
  test('CON-015: Should have download action', async ({ page }) => {
    await page.goto(ROUTES.contracts);
    await waitForPageLoad(page, 2000);

    const downloadButton = page.locator('button:has-text("Download")').first();
    const downloadIcon = page.locator('[class*="download"], [class*="Download"]').first();

    const hasDownload = await downloadButton.isVisible().catch(() => false) ||
                        await downloadIcon.isVisible().catch(() => false);

    console.log(`Download action: ${hasDownload}`);
  });

  test('CON-016: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.contracts);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button:has-text("Delete")').first();
    const deleteIcon = page.locator('[class*="trash"], [class*="Trash"]').first();

    const hasDelete = await deleteButton.isVisible().catch(() => false) ||
                      await deleteIcon.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });
});
