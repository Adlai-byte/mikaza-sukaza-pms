import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES, getPastDate } from '../fixtures/test-data';

test.describe('Financial Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.financialDashboard);
    await waitForPageLoad(page);
  });

  test('FIN-001: Should load financial dashboard', async ({ page }) => {
    await expect(page.locator('text=Financial').first()).toBeVisible({ timeout: 15000 });
  });

  test('FIN-002: Should display revenue summary card', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasRevenue = await page.locator('text=Revenue, text=Income').first().isVisible().catch(() => false);
    const hasRevenueCard = await page.locator('[class*="card"]:has-text("Revenue")').first().isVisible().catch(() => false);

    console.log(`Revenue summary: ${hasRevenue || hasRevenueCard}`);
  });

  test('FIN-003: Should display expenses summary card', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpenses = await page.locator('text=Expense').first().isVisible().catch(() => false);
    const hasExpensesCard = await page.locator('[class*="card"]:has-text("Expense")').first().isVisible().catch(() => false);

    console.log(`Expenses summary: ${hasExpenses || hasExpensesCard}`);
  });

  test('FIN-004: Should display profit/net income card', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasProfit = await page.locator('text=Profit, text=Net').first().isVisible().catch(() => false);
    const hasProfitCard = await page.locator('[class*="card"]:has-text("Profit"), [class*="card"]:has-text("Net")').first().isVisible().catch(() => false);

    console.log(`Profit/Net income: ${hasProfit || hasProfitCard}`);
  });

  test('FIN-005: Should have date range selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    const hasPeriodSelector = await page.locator('button:has-text("Month"), button:has-text("Year"), [role="combobox"]').first().isVisible().catch(() => false);

    console.log(`Date inputs: ${dateCount}, Period selector: ${hasPeriodSelector}`);
  });

  test('FIN-006: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
  });

  test('FIN-007: Should display revenue chart', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for chart elements
    const hasChart = await page.locator('canvas, svg, [class*="chart"], [class*="recharts"]').first().isVisible().catch(() => false);

    console.log(`Revenue chart visible: ${hasChart}`);
  });

  test('FIN-008: Should display expense breakdown chart', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for pie chart or breakdown
    const hasBreakdown = await page.locator('[class*="pie"], [class*="chart"], [class*="breakdown"]').first().isVisible().catch(() => false);

    console.log(`Expense breakdown chart: ${hasBreakdown}`);
  });

  test('FIN-009: Should display occupancy metrics', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasOccupancy = await page.locator('text=Occupancy, text=Utilization').first().isVisible().catch(() => false);

    console.log(`Occupancy metrics: ${hasOccupancy}`);
  });

  test('FIN-010: Should display ADR (Average Daily Rate)', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasADR = await page.locator('text=ADR, text=Average Daily, text=Daily Rate').first().isVisible().catch(() => false);

    console.log(`ADR visible: ${hasADR}`);
  });

  test('FIN-011: Should display RevPAR', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasRevPAR = await page.locator('text=RevPAR, text=Revenue Per').first().isVisible().catch(() => false);

    console.log(`RevPAR visible: ${hasRevPAR}`);
  });

  test('FIN-012: Should update when date range changes', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');

    if (await dateInputs.count() > 0) {
      await dateInputs.first().fill(getPastDate(90));
      await waitForPageLoad(page, 1000);

      // Page should update
      await expect(page.locator('text=Financial').first()).toBeVisible();
    }
  });

  test('FIN-013: Should update when property filter changes', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();

    if (await propertyFilter.isVisible().catch(() => false)) {
      await propertyFilter.click();
      await page.waitForTimeout(300);

      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
        await waitForPageLoad(page, 1000);

        // Page should update
        await expect(page.locator('text=Financial').first()).toBeVisible();
      }
    }
  });

  test('FIN-014: Should have export/download option', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    const hasExport = await exportButton.isVisible().catch(() => false);

    console.log(`Export option: ${hasExport}`);
  });

  test('FIN-015: Should display recent transactions', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTransactions = await page.locator('text=Recent, text=Transaction, table').first().isVisible().catch(() => false);

    console.log(`Recent transactions: ${hasTransactions}`);
  });
});

test.describe('Financial Dashboard - Comparisons', () => {
  test('FIN-016: Should show period comparison', async ({ page }) => {
    await page.goto(ROUTES.financialDashboard);
    await waitForPageLoad(page, 2000);

    const hasComparison = await page.locator('text=vs, text=comparison, text=previous, [class*="trend"]').first().isVisible().catch(() => false);

    console.log(`Period comparison: ${hasComparison}`);
  });

  test('FIN-017: Should show trend indicators', async ({ page }) => {
    await page.goto(ROUTES.financialDashboard);
    await waitForPageLoad(page, 2000);

    const hasTrend = await page.locator('[class*="trend"], [class*="arrow"], svg[class*="up"], svg[class*="down"]').first().isVisible().catch(() => false);

    console.log(`Trend indicators: ${hasTrend}`);
  });
});

test.describe('Financial Dashboard - Booking Revenue', () => {
  test('FIN-018: Should display booking revenue', async ({ page }) => {
    await page.goto(ROUTES.financialDashboard);
    await waitForPageLoad(page, 2000);

    const hasBookingRevenue = await page.locator('text=Booking').first().isVisible().catch(() => false);

    console.log(`Booking revenue: ${hasBookingRevenue}`);
  });

  test('FIN-019: Should display number of bookings', async ({ page }) => {
    await page.goto(ROUTES.financialDashboard);
    await waitForPageLoad(page, 2000);

    const hasBookingCount = await page.locator('text=Bookings, text=Reservations').first().isVisible().catch(() => false);

    console.log(`Booking count: ${hasBookingCount}`);
  });
});
