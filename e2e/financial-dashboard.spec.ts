import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Financial Dashboard
 * Tests dashboard loading, charts, filtering, and data accuracy
 */

test.describe('Financial Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // NOTE: Requires authentication
    await page.goto('/financial-dashboard');
  });

  test.skip('should display dashboard page with summary cards', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: /financial.*dashboard/i })).toBeVisible();

    // Check for summary cards
    await expect(page.locator('text=/total.*revenue/i')).toBeVisible();
    await expect(page.locator('text=/total.*expenses/i')).toBeVisible();
    await expect(page.locator('text=/net.*income/i')).toBeVisible();

    // Should show numeric values
    await expect(page.locator('text=/\\$\\d+/').first()).toBeVisible();
  });

  test.skip('should display revenue by property chart', async ({ page }) => {
    // Wait for chart to render
    await expect(page.locator('[data-testid="revenue-by-property-chart"]')
      .or(page.locator('text=/revenue.*by.*property/i'))).toBeVisible();

    // Chart should have data
    // Check for chart elements (bars, labels, etc.)
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test.skip('should display expenses by category chart', async ({ page }) => {
    // Wait for chart to render
    await expect(page.locator('[data-testid="expenses-by-category-chart"]')
      .or(page.locator('text=/expenses.*by.*category/i'))).toBeVisible();

    // Should show categories like maintenance, utilities, etc.
    await expect(page.locator('text=/maintenance|utilities|supplies/i')).toBeVisible();
  });

  test.skip('should display financial over time chart', async ({ page }) => {
    // Wait for line/area chart
    await expect(page.locator('[data-testid="financial-over-time-chart"]')
      .or(page.locator('text=/revenue.*over.*time/i'))).toBeVisible();

    // Should show month labels
    await expect(page.locator('text=/jan|feb|mar|apr/i')).toBeVisible();
  });

  test.skip('should filter data by date range', async ({ page }) => {
    // Get initial revenue value
    const initialRevenue = await page.locator('[data-testid="total-revenue"]').textContent();

    // Open date range picker
    await page.getByRole('button', { name: /date.*range|filter/i }).click();

    // Select last 30 days
    await page.getByRole('button', { name: /last.*30.*days/i }).click();

    // Wait for data to update
    await page.waitForTimeout(1000); // Wait for API call

    // Revenue value should change
    const updatedRevenue = await page.locator('[data-testid="total-revenue"]').textContent();
    expect(updatedRevenue).not.toBe(initialRevenue);
  });

  test.skip('should filter data by custom date range', async ({ page }) => {
    // Open date picker
    await page.getByRole('button', { name: /date.*range/i }).click();

    // Select custom range
    await page.getByRole('button', { name: /custom/i }).click();

    // Set start date
    await page.locator('input[name="date_from"]').fill('2025-01-01');

    // Set end date
    await page.locator('input[name="date_to"]').fill('2025-03-31');

    // Apply filter
    await page.getByRole('button', { name: /apply|filter/i }).click();

    // Wait for data refresh
    await page.waitForTimeout(1000);

    // Dashboard should show filtered data
    await expect(page.locator('text=/jan.*mar/i')).toBeVisible();
  });

  test.skip('should show correct calculations', async ({ page }) => {
    // Get revenue and expenses
    const revenueText = await page.locator('[data-testid="total-revenue"]').textContent();
    const expensesText = await page.locator('[data-testid="total-expenses"]').textContent();
    const netIncomeText = await page.locator('[data-testid="net-income"]').textContent();

    // Extract numeric values
    const revenue = parseFloat(revenueText?.replace(/[^0-9.-]+/g, '') || '0');
    const expenses = parseFloat(expensesText?.replace(/[^0-9.-]+/g, '') || '0');
    const netIncome = parseFloat(netIncomeText?.replace(/[^0-9.-]+/g, '') || '0');

    // Verify calculation
    expect(netIncome).toBeCloseTo(revenue - expenses, 2);
  });

  test.skip('should display invoice statistics', async ({ page }) => {
    // Check for invoice stats
    await expect(page.locator('text=/total.*invoices/i')).toBeVisible();
    await expect(page.locator('text=/paid.*invoices/i')).toBeVisible();
    await expect(page.locator('text=/pending.*invoices/i')).toBeVisible();
    await expect(page.locator('text=/overdue.*invoices/i')).toBeVisible();

    // All should have numeric values
    const invoiceStats = page.locator('[data-testid*="invoice-stat"]');
    await expect(invoiceStats.first()).toContainText(/\d+/);
  });

  test.skip('should display property and booking stats', async ({ page }) => {
    // Check for property stats
    await expect(page.locator('text=/total.*properties/i')).toBeVisible();
    await expect(page.locator('text=/active.*bookings/i')).toBeVisible();

    // Should show counts
    await expect(page.locator('[data-testid="total-properties"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="active-bookings"]')).toContainText(/\d+/);
  });

  test.skip('should sort revenue by property descending', async ({ page }) => {
    // Get property revenue items
    const propertyItems = page.locator('[data-testid="property-revenue-item"]');
    await expect(propertyItems.first()).toBeVisible();

    // Get first two revenue amounts
    const firstRevenue = await propertyItems.nth(0).locator('[data-testid="revenue-amount"]').textContent();
    const secondRevenue = await propertyItems.nth(1).locator('[data-testid="revenue-amount"]').textContent();

    const firstAmount = parseFloat(firstRevenue?.replace(/[^0-9.-]+/g, '') || '0');
    const secondAmount = parseFloat(secondRevenue?.replace(/[^0-9.-]+/g, '') || '0');

    // First should be greater than or equal to second
    expect(firstAmount).toBeGreaterThanOrEqual(secondAmount);
  });

  test.skip('should display expense percentages correctly', async ({ page }) => {
    // Get expense category items
    const categoryItems = page.locator('[data-testid="expense-category-item"]');
    await expect(categoryItems.first()).toBeVisible();

    // Each should show percentage
    await expect(categoryItems.first()).toContainText(/%/);

    // Sum of all percentages should be ~100%
    const percentages = await categoryItems.allTextContents();
    const totalPercentage = percentages.reduce((sum, text) => {
      const match = text.match(/(\d+\.?\d*)%/);
      return sum + (match ? parseFloat(match[1]) : 0);
    }, 0);

    expect(totalPercentage).toBeCloseTo(100, 1);
  });

  test.skip('should export data', async ({ page }) => {
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export|download/i });

    if (await exportButton.isVisible()) {
      // Click export
      await exportButton.click();

      // Should trigger download or show export options
      await expect(page.locator('text=/csv|excel|pdf/i')).toBeVisible();
    }
  });

  test.skip('should refresh data', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.getByRole('button', { name: /refresh|reload/i });

    if (await refreshButton.isVisible()) {
      // Click refresh
      await refreshButton.click();

      // Should show loading state briefly
      await expect(page.locator('[data-testid="loading"]')
        .or(page.locator('text=/loading/i'))).toBeVisible({ timeout: 2000 });

      // Data should reload
      await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    }
  });
});

test.describe('Financial Dashboard - Mobile Responsiveness', () => {
  test.skip('should display correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/financial-dashboard');

    // Summary cards should stack vertically
    await expect(page.locator('[data-testid="summary-card"]').first()).toBeVisible();

    // Charts should be responsive
    await expect(page.locator('svg').first()).toBeVisible();
  });
});
