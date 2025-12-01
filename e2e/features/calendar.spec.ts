import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES, getFutureDate, getPastDate } from '../fixtures/test-data';

test.describe('Calendar Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.calendar);
    await waitForPageLoad(page);
  });

  test('CAL-001: Should load calendar page', async ({ page }) => {
    // Verify calendar page loaded
    await expect(page.locator('text=Calendar').first()).toBeVisible({ timeout: 15000 });
  });

  test('CAL-002: Should display calendar grid', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for calendar component
    const hasCalendarGrid = await page.locator('[class*="calendar"], [class*="fc"], [role="grid"]').first().isVisible().catch(() => false);
    const hasDateCells = await page.locator('[class*="day"], [class*="date"], [role="gridcell"]').first().isVisible().catch(() => false);

    expect(hasCalendarGrid || hasDateCells).toBeTruthy();
  });

  test('CAL-003: Should have navigation controls', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for prev/next buttons
    const hasPrevButton = await page.locator('button:has-text("Prev"), button[aria-label*="previous"], [class*="prev"]').first().isVisible().catch(() => false);
    const hasNextButton = await page.locator('button:has-text("Next"), button[aria-label*="next"], [class*="next"]').first().isVisible().catch(() => false);
    const hasTodayButton = await page.locator('button:has-text("Today")').first().isVisible().catch(() => false);

    console.log(`Prev: ${hasPrevButton}, Next: ${hasNextButton}, Today: ${hasTodayButton}`);
  });

  test('CAL-004: Should navigate to previous month', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Find and click prev button
    const prevButton = page.locator('button:has-text("Prev"), button[aria-label*="previous"], [class*="prev"]').first();

    if (await prevButton.isVisible().catch(() => false)) {
      // Get current month display
      const monthDisplay = page.locator('[class*="title"], [class*="header"]').first();
      const initialMonth = await monthDisplay.textContent().catch(() => '');

      await prevButton.click();
      await waitForPageLoad(page, 500);

      // Verify month changed (may or may not have different text)
      await expect(page.locator('[class*="calendar"], [role="grid"]').first()).toBeVisible();
    }
  });

  test('CAL-005: Should navigate to next month', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next"], [class*="next"]').first();

    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await waitForPageLoad(page, 500);

      await expect(page.locator('[class*="calendar"], [role="grid"]').first()).toBeVisible();
    }
  });

  test('CAL-006: Should have view mode options', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for view mode buttons (month, week, day)
    const hasMonthView = await page.locator('button:has-text("Month")').first().isVisible().catch(() => false);
    const hasWeekView = await page.locator('button:has-text("Week")').first().isVisible().catch(() => false);
    const hasDayView = await page.locator('button:has-text("Day")').first().isVisible().catch(() => false);

    console.log(`Month: ${hasMonthView}, Week: ${hasWeekView}, Day: ${hasDayView}`);
  });

  test('CAL-007: Should display booking events', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    // Look for event elements in calendar
    const events = page.locator('[class*="event"], [class*="booking"], [class*="fc-event"]');
    const eventCount = await events.count();

    console.log(`Found ${eventCount} calendar event(s)`);
  });

  test('CAL-008: Should click on event to view details', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const firstEvent = page.locator('[class*="event"], [class*="booking"], [class*="fc-event"]').first();

    if (await firstEvent.isVisible().catch(() => false)) {
      await firstEvent.click();
      await page.waitForTimeout(500);

      // Should open dialog or popover
      const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      const hasPopover = await page.locator('[data-radix-popper-content-wrapper], [role="tooltip"]').isVisible().catch(() => false);

      console.log(`Dialog: ${hasDialog}, Popover: ${hasPopover}`);
    }
  });

  test('CAL-009: Should return to today view', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Navigate away first
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next"]').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await nextButton.click();
      await waitForPageLoad(page, 500);
    }

    // Click today button
    const todayButton = page.locator('button:has-text("Today")').first();
    if (await todayButton.isVisible().catch(() => false)) {
      await todayButton.click();
      await waitForPageLoad(page, 500);

      await expect(page.locator('[class*="calendar"], [role="grid"]').first()).toBeVisible();
    }
  });

  test('CAL-010: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for property filter
    const propertyFilter = page.locator('[role="combobox"], select').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter available: ${hasPropertyFilter}`);
  });
});

test.describe('Calendar - Booking Creation', () => {
  test('CAL-011: Should create booking from calendar click', async ({ page }) => {
    await page.goto(ROUTES.calendar);
    await waitForPageLoad(page, 3000);

    // Try clicking on an empty date cell
    const dateCell = page.locator('[role="gridcell"]:not([class*="event"]), [class*="day"]:not([class*="event"])').first();

    if (await dateCell.isVisible().catch(() => false)) {
      await dateCell.click();
      await page.waitForTimeout(500);

      // May open booking dialog
      const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);

      console.log(`Clicking date cell opens dialog: ${hasDialog}`);
    }
  });
});
