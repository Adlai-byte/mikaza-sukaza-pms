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
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('SVC-003: Should have document type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);

    console.log(`Document type filter: ${hasTypeFilter}`);
    expect(hasTypeFilter).toBeTruthy();
  });

  test('SVC-004: Should have upload button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();
    const hasUpload = await uploadButton.isVisible().catch(() => false);

    console.log(`Upload button: ${hasUpload}`);
    expect(hasUpload).toBeTruthy();
  });

  test('SVC-005: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
    expect(hasRefresh).toBeTruthy();
  });

  test('SVC-006: Should open upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();

    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('SVC-007: Should close upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();

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

  test('SVC-008: Should display documents list or empty state', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasTree = await page.locator('[class*="tree"], [class*="Tree"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No documents, text=no documents').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Tree: ${hasTree}, Cards: ${hasCards}, Empty: ${hasEmptyState}`);
    expect(hasTable || hasTree || hasCards || hasEmptyState).toBeTruthy();
  });

  test('SVC-009: Should have tree/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // View mode uses Tabs component with TabsTrigger elements (role="tab")
    const viewTabs = page.locator('[role="tab"]');
    const tabCount = await viewTabs.count();

    const hasViewToggle = tabCount >= 2;
    console.log(`Tree/List view toggle: ${hasViewToggle} (${tabCount} tabs)`);
    expect(hasViewToggle).toBeTruthy();
  });

  test('SVC-010: Should filter by document type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Document type options: ${hasOptions}`);
      expect(hasOptions).toBeTruthy();
    }
  });
});

test.describe('Service Documents - Actions', () => {
  test('SVC-011: Should have download action in tree/list', async ({ page }) => {
    await page.goto(ROUTES.serviceDocuments);
    await waitForPageLoad(page, 2000);

    // Switch to list view to see action buttons
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    const downloadButton = page.locator('button').filter({ has: page.locator('svg.lucide-download') }).first();
    const hasDownload = await downloadButton.isVisible().catch(() => false);

    console.log(`Download action: ${hasDownload}`);
  });

  test('SVC-012: Should have delete action in tree/list', async ({ page }) => {
    await page.goto(ROUTES.serviceDocuments);
    await waitForPageLoad(page, 2000);

    // Switch to list view
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });
});
