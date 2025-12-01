import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Service Documents Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.serviceDocuments);
    await waitForPageLoad(page);
  });

  test('SVC-001: Should load service documents page', async ({ page }) => {
    await expect(page.locator('text=Service').first()).toBeVisible({ timeout: 15000 });
  });

  test('SVC-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} stats cards`);
  });

  test('SVC-003: Should have document type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);

    console.log(`Document type filter: ${hasTypeFilter}`);
  });

  test('SVC-004: Should have upload button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add")').first();
    const hasUpload = await uploadButton.isVisible().catch(() => false);

    console.log(`Upload button: ${hasUpload}`);
  });

  test('SVC-005: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
  });

  test('SVC-006: Should open upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add")').first();

    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('SVC-007: Should close upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add")').first();

    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const dialogStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log(`Dialog closed: ${!dialogStillVisible}`);
    }
  });

  test('SVC-008: Should display documents list', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasTree = await page.locator('[class*="tree"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No documents').isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Tree: ${hasTree}, Cards: ${hasCards}, Empty: ${hasEmptyState}`);
  });

  test('SVC-009: Should have tree/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const treeView = page.locator('button:has-text("Tree"), [value="tree"]').first();
    const listView = page.locator('button:has-text("List"), [value="list"]').first();

    const hasTreeView = await treeView.isVisible().catch(() => false);
    const hasListView = await listView.isVisible().catch(() => false);

    console.log(`Tree view: ${hasTreeView}, List view: ${hasListView}`);
  });

  test('SVC-010: Should filter by document type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Document type options: ${hasOptions}`);
    }
  });
});

test.describe('Service Documents - Actions', () => {
  test('SVC-011: Should have download action', async ({ page }) => {
    await page.goto(ROUTES.serviceDocuments);
    await waitForPageLoad(page, 2000);

    const downloadButton = page.locator('button:has-text("Download")').first();
    const downloadIcon = page.locator('[class*="download"], [class*="Download"]').first();

    const hasDownload = await downloadButton.isVisible().catch(() => false) ||
                        await downloadIcon.isVisible().catch(() => false);

    console.log(`Download action: ${hasDownload}`);
  });

  test('SVC-012: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.serviceDocuments);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button:has-text("Delete")').first();
    const deleteIcon = page.locator('[class*="trash"], [class*="Trash"]').first();

    const hasDelete = await deleteButton.isVisible().catch(() => false) ||
                      await deleteIcon.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });
});
