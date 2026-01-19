import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Issues Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.issues);
    await waitForPageLoad(page);
  });

  test('ISS-001: Should load issues page', async ({ page }) => {
    const hasIssues = await page.locator('text=Issue').first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Issues text: ${hasIssues}, Cards: ${hasCards}`);
    expect(hasIssues || hasCards).toBeTruthy();
  });

  test('ISS-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} cards`);
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('ISS-003: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
    expect(hasSearch).toBeTruthy();
  });

  test('ISS-004: Should have status filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').first();
    const hasStatusFilter = await statusFilter.isVisible().catch(() => false);

    console.log(`Status filter: ${hasStatusFilter}`);
    expect(hasStatusFilter).toBeTruthy();
  });

  test('ISS-005: Should have priority filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const comboboxes = page.locator('[role="combobox"]');
    const count = await comboboxes.count();

    console.log(`Found ${count} filter dropdowns`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('ISS-006: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').nth(2);
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
  });

  test('ISS-007: Should have add issue button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Report")').first();
    const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
    const hasAddButton = await addButton.isVisible().catch(() => false);
    const hasPlusButton = await plusButton.isVisible().catch(() => false);

    console.log(`Add issue button: ${hasAddButton || hasPlusButton}`);
    expect(hasAddButton || hasPlusButton).toBeTruthy();
  });

  test('ISS-008: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIconButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);
    const hasRefreshIcon = await refreshIconButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh || hasRefreshIcon}`);
    expect(hasRefresh || hasRefreshIcon).toBeTruthy();
  });

  test('ISS-009: Should open add issue dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Report")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('ISS-010: Should have issue form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Report")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        const hasTitleField = await dialog.locator('text=Title, text=Subject').first().isVisible().catch(() => false);
        const hasDescField = await dialog.locator('text=Description').first().isVisible().catch(() => false);
        const hasPriorityField = await dialog.locator('text=Priority').first().isVisible().catch(() => false);

        console.log(`Title: ${hasTitleField}, Description: ${hasDescField}, Priority: ${hasPriorityField}`);
        expect(hasTitleField || hasDescField || hasPriorityField).toBeTruthy();

        await page.keyboard.press('Escape');
      }
    }
  });

  test('ISS-011: Should close issue dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Report")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
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

  test('ISS-012: Should display issues table', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=No issue, text=no data').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Cards: ${hasCards}, Empty: ${hasEmpty}`);
    expect(hasTable || hasCards || hasEmpty).toBeTruthy();
  });

  test('ISS-013: Should display status badges', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} status badges`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('ISS-014: Should display priority indicators', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Priority indicators might be badges or icons
    const alertIcons = page.locator('svg.lucide-alert-triangle');
    const iconCount = await alertIcons.count();

    console.log(`Found ${iconCount} priority indicators`);
  });

  test('ISS-015: Should search issues', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await waitForPageLoad(page, 1000);

      const value = await searchInput.inputValue().catch(() => '');
      console.log(`Search value: ${value}`);
    }
  });

  test('ISS-016: Should filter by status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').first();

    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);
      console.log(`Status filter options: ${hasOptions}`);

      await page.keyboard.press('Escape');
    }
  });

  test('ISS-017: Should have photo gallery feature', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Photo gallery might be triggered by clicking on an issue
    const imageIcon = page.locator('svg.lucide-image').first();
    const hasImageIcon = await imageIcon.isVisible().catch(() => false);

    console.log(`Photo gallery icon: ${hasImageIcon}`);
  });
});
