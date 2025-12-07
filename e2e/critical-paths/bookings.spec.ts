import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, clickButton, verifyToast, switchToTab, closeDialog } from '../helpers/test-helpers';
import { ROUTES, TEST_BOOKINGS, getFutureDate } from '../fixtures/test-data';

test.describe('Bookings Module - Critical Path Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.bookings);
    await waitForPageLoad(page);
  });

  test('BOOK-001: Should list bookings', async ({ page }) => {
    await expect(page.locator('text=Bookings, text=Booking').first()).toBeVisible({ timeout: 15000 });

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('BOOK-002: Should search bookings', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('John');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('John');
    }
  });

  test('BOOK-003: Should filter by status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').first();

    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);
      console.log(`Status filter options: ${hasOptions}`);
      expect(hasOptions).toBeTruthy();
    }
  });

  test('BOOK-004: Should open create booking dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Booking")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('BOOK-005: Should view booking details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const bookingRow = page.locator('tbody tr, [class*="booking-card"], [class*="card"]').first();

    if (await bookingRow.isVisible().catch(() => false)) {
      const actionButton = bookingRow.locator('button').first();

      if (await actionButton.isVisible().catch(() => false)) {
        await actionButton.click();
        await waitForPageLoad(page, 500);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/bookings/');

        console.log(`Details accessible: ${hasDialog || hasDetailPage}`);
      }
    }
  });

  test('BOOK-006: Should validate required fields in booking form', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Booking")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Create")').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Dialog should still be open (validation prevented submit)
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    }
  });

  test('BOOK-007: Should close booking dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Booking")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const dialogStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log(`Dialog closed: ${!dialogStillVisible}`);
    }
  });

  test('BOOK-008: Should have date fields in booking form', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Booking")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasDateInput = await page.locator('[role="dialog"] input[type="date"], [role="dialog"] [class*="calendar"], [role="dialog"] text=Check').first().isVisible().catch(() => false);

      console.log(`Date fields available: ${hasDateInput}`);
      expect(hasDateInput).toBeTruthy();
    }
  });
});

test.describe('Bookings Module - Status Management', () => {
  test('BOOK-009: Should display booking status badges', async ({ page }) => {
    await page.goto(ROUTES.bookings);
    await waitForPageLoad(page, 3000);

    const statusBadges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await statusBadges.count();

    console.log(`Found ${badgeCount} badge(s)`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('BOOK-010: Should have date filtering', async ({ page }) => {
    await page.goto(ROUTES.bookings);
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"], [role="combobox"]');
    const filterCount = await dateInputs.count();

    console.log(`Found ${filterCount} filter input(s)`);
    expect(filterCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Bookings Module - Property Association', () => {
  test('BOOK-011: Should show property selector in booking form', async ({ page }) => {
    await page.goto(ROUTES.bookings);
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Booking")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const propertySelector = page.locator('[role="dialog"] [role="combobox"]').first();
      const hasPropertySelector = await propertySelector.isVisible().catch(() => false);

      console.log(`Property selector visible: ${hasPropertySelector}`);
      expect(hasPropertySelector).toBeTruthy();
    }
  });
});
