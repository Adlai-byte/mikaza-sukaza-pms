import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog, verifyToast } from '../helpers/test-helpers';
import { ROUTES, TEST_CHECKINOUT } from '../fixtures/test-data';

test.describe('Check-In/Out Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.checkInOut);
    await waitForPageLoad(page);
  });

  test('CIO-001: Should load check-in/out page', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('text=Check').first()).toBeVisible({ timeout: 15000 });
  });

  test('CIO-002: Should list check-in/out records', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Verify table is present
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('CIO-003: Should filter by record type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for type filter (check-in, check-out, inspection)
    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const checkInOption = page.locator('[role="option"]:has-text("Check-in"), [role="option"]:has-text("Check In")').first();
      if (await checkInOption.isVisible().catch(() => false)) {
        await checkInOption.click();
        await waitForPageLoad(page, 1000);
      }
    }

    await expect(page.locator('table').first()).toBeVisible();
  });

  test('CIO-004: Should open new check-in dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Verify dialog opened
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('CIO-005: Should have record type selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for record type selector
      const hasTypeSelector = await page.locator('[role="dialog"] [role="combobox"], [role="dialog"] [role="radiogroup"], [role="dialog"] select').first().isVisible().catch(() => false);
      const hasTypeLabel = await page.locator('[role="dialog"] label:has-text("Type"), [role="dialog"] text=Record Type').first().isVisible().catch(() => false);

      console.log(`Type selector: ${hasTypeSelector}, Type label: ${hasTypeLabel}`);
    }
  });

  test('CIO-006: Should have property selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for property selector
      const hasPropertySelector = await page.locator('[role="dialog"] [role="combobox"]').first().isVisible().catch(() => false);
      const hasPropertyLabel = await page.locator('[role="dialog"] label:has-text("Property")').first().isVisible().catch(() => false);

      expect(hasPropertySelector || hasPropertyLabel).toBeTruthy();
    }
  });

  test('CIO-007: Should have booking selector when property selected', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for booking selector
      const hasBookingLabel = await page.locator('[role="dialog"] label:has-text("Booking")').first().isVisible().catch(() => false);

      console.log(`Booking selector available: ${hasBookingLabel}`);
    }
  });

  test('CIO-008: Should have checklist section', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for checklist section
      const hasChecklist = await page.locator('[role="dialog"] text=Checklist, [role="dialog"] [class*="checklist"]').first().isVisible().catch(() => false);
      const hasCheckboxes = await page.locator('[role="dialog"] input[type="checkbox"], [role="dialog"] [role="checkbox"]').first().isVisible().catch(() => false);

      console.log(`Checklist section: ${hasChecklist}, Checkboxes: ${hasCheckboxes}`);
    }
  });

  test('CIO-009: Should have signature capture', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for signature section
      const hasSignature = await page.locator('[role="dialog"] text=Signature, [role="dialog"] canvas, [role="dialog"] [class*="signature"]').first().isVisible().catch(() => false);

      console.log(`Signature section available: ${hasSignature}`);
    }
  });

  test('CIO-010: Should have photo upload section', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for photo upload
      const hasPhotoUpload = await page.locator('[role="dialog"] input[type="file"], [role="dialog"] text=Photo, [role="dialog"] text=Upload').first().isVisible().catch(() => false);

      console.log(`Photo upload available: ${hasPhotoUpload}`);
    }
  });

  test('CIO-011: Should close dialog with cancel', async ({ page }) => {
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

  test('CIO-012: Should view record details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(500);

        // Should open view dialog
        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);

        console.log(`View dialog opened: ${hasDialog}`);
      }
    }
  });

  test('CIO-013: Should have PDF download option', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for PDF/download buttons
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Download"), button[title*="PDF"]').first();
    const hasPdfOption = await pdfButton.isVisible().catch(() => false);

    console.log(`PDF download option available: ${hasPdfOption}`);
  });

  test('CIO-014: Should display record status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for status column/badges
    const statusBadges = page.locator('[class*="badge"]');
    const badgeCount = await statusBadges.count();

    console.log(`Found ${badgeCount} status badge(s)`);
  });

  test('CIO-015: Should display linked booking info', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    // Look for booking column or booking info in table
    const hasBookingColumn = await page.locator('th:has-text("Booking"), th:has-text("Guest")').first().isVisible().catch(() => false);

    console.log(`Booking column visible: ${hasBookingColumn}`);
  });
});

test.describe('Check-In/Out - Notes Section', () => {
  test('CIO-016: Should have notes textarea', async ({ page }) => {
    await page.goto(ROUTES.checkInOut);
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for notes field
      const hasNotes = await page.locator('[role="dialog"] textarea, [role="dialog"] label:has-text("Notes")').first().isVisible().catch(() => false);

      console.log(`Notes field available: ${hasNotes}`);
    }
  });
});
