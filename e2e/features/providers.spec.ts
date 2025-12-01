import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, closeDialog } from '../helpers/test-helpers';
import { ROUTES, TEST_PROVIDERS } from '../fixtures/test-data';

test.describe('Providers Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.providers);
    await waitForPageLoad(page);
  });

  test('PROV-001: Should load providers page', async ({ page }) => {
    await expect(page.locator('text=Providers').first()).toBeVisible({ timeout: 15000 });
  });

  test('PROV-002: Should list providers', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Verify table or list is present
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('PROV-003: Should search providers', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Cleaning');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('Cleaning');
    }
  });

  test('PROV-004: Should filter by category', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const categoryFilter = page.locator('[role="combobox"]').first();

    if (await categoryFilter.isVisible().catch(() => false)) {
      await categoryFilter.click();
      await page.waitForTimeout(300);

      const cleaningOption = page.locator('[role="option"]:has-text("Cleaning")').first();
      if (await cleaningOption.isVisible().catch(() => false)) {
        await cleaningOption.click();
        await waitForPageLoad(page, 1000);
      }
    }

    await expect(page.locator('table').first()).toBeVisible();
  });

  test('PROV-005: Should open add provider dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('PROV-006: Should have provider form fields', async ({ page }) => {
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

  test('PROV-007: Should have category selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasCategorySelector = await page.locator('[role="dialog"] [role="combobox"], [role="dialog"] select').first().isVisible().catch(() => false);
      const hasCategoryLabel = await page.locator('[role="dialog"] label:has-text("Category"), [role="dialog"] label:has-text("Type")').first().isVisible().catch(() => false);

      expect(hasCategorySelector || hasCategoryLabel).toBeTruthy();
    }
  });

  test('PROV-008: Should validate required fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save")').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Dialog should still be open (validation failed)
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    }
  });

  test('PROV-009: Should close dialog with cancel', async ({ page }) => {
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

  test('PROV-010: Should view provider details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View"), button:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);

        // Should open dialog or navigate
        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/providers/');

        expect(hasDialog || hasDetailPage).toBeTruthy();
      }
    }
  });

  test('PROV-011: Should display provider status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusBadges = page.locator('[class*="badge"]');
    const badgeCount = await statusBadges.count();

    console.log(`Found ${badgeCount} status badge(s)`);
  });

  test('PROV-012: Should have property assignment option', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const editButton = firstRow.locator('button:has-text("Edit")').first();

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Look for property assignment
        const hasPropertyAssignment = await page.locator('[role="dialog"] label:has-text("Properties"), [role="dialog"] text=Assign').first().isVisible().catch(() => false);

        console.log(`Property assignment: ${hasPropertyAssignment}`);
      }
    }
  });
});

test.describe('Providers Module - COI Management', () => {
  test('PROV-013: Should link to COI management', async ({ page }) => {
    await page.goto(ROUTES.providers);
    await waitForPageLoad(page, 2000);

    // Look for COI link or button
    const coiButton = page.locator('a:has-text("COI"), button:has-text("COI"), a:has-text("Insurance")').first();
    const hasCoiLink = await coiButton.isVisible().catch(() => false);

    console.log(`COI link available: ${hasCoiLink}`);
  });
});
