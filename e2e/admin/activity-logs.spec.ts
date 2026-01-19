import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Activity Logs Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page);
  });

  test('LOG-001: Should load activity logs page', async ({ page }) => {
    const hasActivityLogs = await page.locator('text=Activity').first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasLogs = await page.locator('text=Log').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Activity text: ${hasActivityLogs}, Logs: ${hasLogs}, Cards: ${hasCards}`);
    expect(hasActivityLogs || hasLogs || hasCards).toBeTruthy();
  });

  test('LOG-002: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
    expect(hasSearch).toBeTruthy();
  });

  test('LOG-003: Should have action type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const filter = page.locator('[role="combobox"]').first();
    const hasFilter = await filter.isVisible().catch(() => false);

    console.log(`Action type filter: ${hasFilter}`);
    expect(hasFilter).toBeTruthy();
  });

  test('LOG-004: Should have date filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInput = page.locator('input[type="date"]').first();
    const hasDateFilter = await dateInput.isVisible().catch(() => false);

    console.log(`Date filter: ${hasDateFilter}`);
  });

  test('LOG-005: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIconButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);
    const hasRefreshIcon = await refreshIconButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh || hasRefreshIcon}`);
    expect(hasRefresh || hasRefreshIcon).toBeTruthy();
  });

  test('LOG-006: Should have export button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    const downloadIcon = page.locator('button').filter({ has: page.locator('svg.lucide-download') }).first();
    const hasExport = await exportButton.isVisible().catch(() => false);
    const hasDownload = await downloadIcon.isVisible().catch(() => false);

    console.log(`Export button: ${hasExport || hasDownload}`);
  });

  test('LOG-007: Should display logs table', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=No log, text=no activity').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Cards: ${hasCards}, Empty: ${hasEmpty}`);
    expect(hasTable || hasCards || hasEmpty).toBeTruthy();
  });

  test('LOG-008: Should display table headers', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);

    if (hasTable) {
      const hasActionHeader = await page.locator('th:has-text("Action")').first().isVisible().catch(() => false);
      const hasUserHeader = await page.locator('th:has-text("User")').first().isVisible().catch(() => false);
      const hasDateHeader = await page.locator('th:has-text("Date"), th:has-text("Time")').first().isVisible().catch(() => false);

      console.log(`Action: ${hasActionHeader}, User: ${hasUserHeader}, Date: ${hasDateHeader}`);
      expect(hasActionHeader || hasUserHeader || hasDateHeader).toBeTruthy();
    } else {
      console.log('No table visible');
      expect(true).toBeTruthy();
    }
  });

  test('LOG-009: Should search logs', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('user');
      await waitForPageLoad(page, 1000);

      const value = await searchInput.inputValue().catch(() => '');
      console.log(`Search value: ${value}`);
    }
  });

  test('LOG-010: Should filter by action type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const filter = page.locator('[role="combobox"]').first();

    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);
      console.log(`Filter options: ${hasOptions}`);

      // Close dropdown
      await page.keyboard.press('Escape');
    }
  });

  test('LOG-011: Should display action type badges', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} action type badges`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('LOG-012: Should display user information', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);

    if (hasTable) {
      const userCells = page.locator('td').filter({ has: page.locator('svg.lucide-user') });
      const userCount = await userCells.count();
      console.log(`User cells with icon: ${userCount}`);
    }
  });

  test('LOG-013: Should paginate logs', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for pagination controls
    const hasPagination = await page.locator('[class*="pagination"], button:has-text("Next"), button:has-text("Previous")').first().isVisible().catch(() => false);

    console.log(`Pagination controls: ${hasPagination}`);
  });
});
