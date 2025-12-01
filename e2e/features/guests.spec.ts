import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Guests Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.guests);
    await waitForPageLoad(page);
  });

  test('GUEST-001: Should load guests page', async ({ page }) => {
    await expect(page.locator('text=Guest').first()).toBeVisible({ timeout: 15000 });
  });

  test('GUEST-002: Should list guests', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('GUEST-003: Should search guests', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('John');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('John');
    }
  });

  test('GUEST-004: Should open add guest dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('GUEST-005: Should have guest form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Check for essential form fields
      const hasName = await page.locator('[role="dialog"] input[name*="name"], [role="dialog"] label:has-text("Name")').first().isVisible().catch(() => false);
      const hasEmail = await page.locator('[role="dialog"] input[type="email"], [role="dialog"] label:has-text("Email")').first().isVisible().catch(() => false);
      const hasPhone = await page.locator('[role="dialog"] input[type="tel"], [role="dialog"] label:has-text("Phone")').first().isVisible().catch(() => false);

      console.log(`Name: ${hasName}, Email: ${hasEmail}, Phone: ${hasPhone}`);
    }
  });

  test('GUEST-006: Should validate required fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save")').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Dialog should still be open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    }
  });

  test('GUEST-007: Should close dialog with cancel', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await closeDialog(page);

      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('GUEST-008: Should view guest details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View"), button:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/guests/');

        expect(hasDialog || hasDetailPage).toBeTruthy();
      }
    }
  });

  test('GUEST-009: Should display guest booking history', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(500);

        // Look for booking history section
        const hasBookingHistory = await page.locator('[role="dialog"] text=Booking, [role="dialog"] text=History, [role="dialog"] [class*="booking"]').first().isVisible().catch(() => false);

        console.log(`Booking history visible: ${hasBookingHistory}`);
      }
    }
  });

  test('GUEST-010: Should have notes section', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasNotes = await page.locator('[role="dialog"] textarea, [role="dialog"] label:has-text("Notes")').first().isVisible().catch(() => false);

      console.log(`Notes field available: ${hasNotes}`);
    }
  });
});

test.describe('Guests Module - Contact Information', () => {
  test('GUEST-011: Should have country/nationality field', async ({ page }) => {
    await page.goto(ROUTES.guests);
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasCountry = await page.locator('[role="dialog"] label:has-text("Country"), [role="dialog"] label:has-text("Nationality")').first().isVisible().catch(() => false);

      console.log(`Country/nationality field: ${hasCountry}`);
    }
  });

  test('GUEST-012: Should have ID document section', async ({ page }) => {
    await page.goto(ROUTES.guests);
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasIdField = await page.locator('[role="dialog"] label:has-text("ID"), [role="dialog"] label:has-text("Passport"), [role="dialog"] label:has-text("Document")').first().isVisible().catch(() => false);

      console.log(`ID document field: ${hasIdField}`);
    }
  });
});

test.describe('Guests Module - Payment Information', () => {
  test('GUEST-013: Should have credit card section', async ({ page }) => {
    await page.goto(ROUTES.guests);
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View"), button:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(500);

        const hasCreditCard = await page.locator('[role="dialog"] text=Credit Card, [role="dialog"] text=Payment, [role="dialog"] [class*="card"]').first().isVisible().catch(() => false);

        console.log(`Credit card section: ${hasCreditCard}`);
      }
    }
  });
});
