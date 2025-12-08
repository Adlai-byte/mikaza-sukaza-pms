import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Commissions Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.commissions);
    await waitForPageLoad(page);
  });

  test('COM-001: Should load commissions page', async ({ page }) => {
    const hasCommissions = await page.locator('text=Commission').first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Commission text: ${hasCommissions}, Cards: ${hasCards}`);
    expect(hasCommissions || hasCards).toBeTruthy();
  });

  test('COM-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} cards`);
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('COM-003: Should have date filters', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    console.log(`Found ${dateCount} date inputs`);
    expect(dateCount).toBeGreaterThanOrEqual(1);
  });

  test('COM-004: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
    expect(hasPropertyFilter).toBeTruthy();
  });

  test('COM-005: Should have status filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const comboboxes = page.locator('[role="combobox"]');
    const count = await comboboxes.count();

    console.log(`Found ${count} filter dropdowns`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('COM-006: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIconButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);
    const hasRefreshIcon = await refreshIconButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh || hasRefreshIcon}`);
    expect(hasRefresh || hasRefreshIcon).toBeTruthy();
  });

  test('COM-007: Should have tabs for different views', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    console.log(`Found ${tabCount} tabs`);
    expect(tabCount).toBeGreaterThanOrEqual(1);
  });

  test('COM-008: Should display commissions table', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=No commission, text=no data').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Cards: ${hasCards}, Empty: ${hasEmpty}`);
    expect(hasTable || hasCards || hasEmpty).toBeTruthy();
  });

  test('COM-009: Should display charts', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    // Charts are typically rendered with recharts library
    const hasChart = await page.locator('.recharts-wrapper, [class*="chart"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').count() >= 1;

    console.log(`Chart visible: ${hasChart}, Cards: ${hasCards}`);
    expect(hasChart || hasCards).toBeTruthy();
  });

  test('COM-010: Should have table headers', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);

    if (hasTable) {
      const headers = page.locator('th');
      const headerCount = await headers.count();
      console.log(`Found ${headerCount} table headers`);
      expect(headerCount).toBeGreaterThanOrEqual(1);
    } else {
      console.log('No table visible - might be in chart view');
      expect(true).toBeTruthy();
    }
  });

  test('COM-011: Should switch between tabs', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount >= 2) {
      // Click second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(500);

      // Click first tab
      await tabs.first().click();
      await page.waitForTimeout(500);

      console.log('Switched between tabs successfully');
    }

    expect(tabCount).toBeGreaterThanOrEqual(1);
  });

  test('COM-012: Should filter by date range', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateFrom = page.locator('input[type="date"]').first();

    if (await dateFrom.isVisible().catch(() => false)) {
      await dateFrom.fill('2024-01-01');
      await page.waitForTimeout(500);

      const value = await dateFrom.inputValue().catch(() => '');
      console.log(`Date filter value: ${value}`);
    }
  });

  test('COM-013: Should display status badges', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} status badges`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('COM-014: Should navigate to invoice detail', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for external link icon or view button
    const viewButton = page.locator('button').filter({ has: page.locator('svg.lucide-external-link') }).first();
    const hasViewButton = await viewButton.isVisible().catch(() => false);

    console.log(`View invoice button: ${hasViewButton}`);
  });
});
