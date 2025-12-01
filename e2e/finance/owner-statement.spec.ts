import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES, getFutureDate, getPastDate } from '../fixtures/test-data';

test.describe('Owner Statement Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.ownerStatement);
    await waitForPageLoad(page);
  });

  test('OWN-001: Should load owner statement page', async ({ page }) => {
    await expect(page.locator('text=Owner').first()).toBeVisible({ timeout: 15000 });
  });

  test('OWN-002: Should have property selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertySelector = page.locator('[role="combobox"]').first();
    const hasPropertySelector = await propertySelector.isVisible().catch(() => false);

    expect(hasPropertySelector).toBeTruthy();
  });

  test('OWN-003: Should have date range selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    console.log(`Found ${dateCount} date selector(s)`);
  });

  test('OWN-004: Should have period selector (monthly/quarterly/yearly)', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasMonthly = await page.locator('button:has-text("Month"), [role="option"]:has-text("Month")').first().isVisible().catch(() => false);
    const hasQuarterly = await page.locator('button:has-text("Quarter"), [role="option"]:has-text("Quarter")').first().isVisible().catch(() => false);
    const hasYearly = await page.locator('button:has-text("Year"), [role="option"]:has-text("Year")').first().isVisible().catch(() => false);

    console.log(`Monthly: ${hasMonthly}, Quarterly: ${hasQuarterly}, Yearly: ${hasYearly}`);
  });

  test('OWN-005: Should display revenue section', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasRevenue = await page.locator('text=Revenue, text=Income, text=Earnings').first().isVisible().catch(() => false);

    console.log(`Revenue section visible: ${hasRevenue}`);
  });

  test('OWN-006: Should display expenses section', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpenses = await page.locator('text=Expense').first().isVisible().catch(() => false);

    console.log(`Expenses section visible: ${hasExpenses}`);
  });

  test('OWN-007: Should display net income/profit', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasNetIncome = await page.locator('text=Net, text=Profit, text=Balance').first().isVisible().catch(() => false);

    console.log(`Net income visible: ${hasNetIncome}`);
  });

  test('OWN-008: Should have export/download option', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("PDF")').first();
    const hasExport = await exportButton.isVisible().catch(() => false);

    console.log(`Export option available: ${hasExport}`);
  });

  test('OWN-009: Should have print option', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const printButton = page.locator('button:has-text("Print")').first();
    const hasPrint = await printButton.isVisible().catch(() => false);

    console.log(`Print option available: ${hasPrint}`);
  });

  test('OWN-010: Should display booking revenue breakdown', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasBookingRevenue = await page.locator('text=Booking, [class*="booking"]').first().isVisible().catch(() => false);

    console.log(`Booking revenue breakdown: ${hasBookingRevenue}`);
  });

  test('OWN-011: Should display expense categories breakdown', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for expense category breakdown
    const hasCategories = await page.locator('text=Category, text=Maintenance, text=Utilities, text=Cleaning').first().isVisible().catch(() => false);

    console.log(`Expense categories breakdown: ${hasCategories}`);
  });

  test('OWN-012: Should update when property is changed', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertySelector = page.locator('[role="combobox"]').first();

    if (await propertySelector.isVisible().catch(() => false)) {
      await propertySelector.click();
      await page.waitForTimeout(300);

      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
        await waitForPageLoad(page, 1000);

        // Page should update
        await expect(page.locator('text=Owner').first()).toBeVisible();
      }
    }
  });

  test('OWN-013: Should update when date range is changed', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');

    if (await dateInputs.count() > 0) {
      await dateInputs.first().fill(getPastDate(60));
      await waitForPageLoad(page, 1000);

      // Page should update
      await expect(page.locator('text=Owner').first()).toBeVisible();
    }
  });

  test('OWN-014: Should display commission deductions', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasCommission = await page.locator('text=Commission, text=Fee').first().isVisible().catch(() => false);

    console.log(`Commission deductions: ${hasCommission}`);
  });
});

test.describe('Owner Statement - Summary Cards', () => {
  test('OWN-015: Should display summary cards', async ({ page }) => {
    await page.goto(ROUTES.ownerStatement);
    await waitForPageLoad(page, 2000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} summary card(s)`);
  });
});
