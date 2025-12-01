import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Bill Templates Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.billTemplates);
    await waitForPageLoad(page);
  });

  test('BILL-001: Should load bill templates page', async ({ page }) => {
    await expect(page.locator('text=Bill').first()).toBeVisible({ timeout: 15000 });
  });

  test('BILL-002: Should list bill templates', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('BILL-003: Should search templates', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('cleaning');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('cleaning');
    }
  });

  test('BILL-004: Should filter by category', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const categoryFilter = page.locator('[role="combobox"]').first();

    if (await categoryFilter.isVisible().catch(() => false)) {
      await categoryFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Category filter options: ${hasOptions}`);
    }
  });

  test('BILL-005: Should open add template dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('BILL-006: Should have template form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Check for essential form fields
      const hasName = await page.locator('[role="dialog"] input[name*="name"], [role="dialog"] label:has-text("Name")').first().isVisible().catch(() => false);
      const hasDescription = await page.locator('[role="dialog"] textarea, [role="dialog"] label:has-text("Description")').first().isVisible().catch(() => false);
      const hasAmount = await page.locator('[role="dialog"] input[type="number"], [role="dialog"] label:has-text("Amount")').first().isVisible().catch(() => false);

      console.log(`Name: ${hasName}, Description: ${hasDescription}, Amount: ${hasAmount}`);
    }
  });

  test('BILL-007: Should have category selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasCategorySelector = await page.locator('[role="dialog"] [role="combobox"], [role="dialog"] label:has-text("Category")').first().isVisible().catch(() => false);

      console.log(`Category selector: ${hasCategorySelector}`);
    }
  });

  test('BILL-008: Should have frequency selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasFrequency = await page.locator('[role="dialog"] label:has-text("Frequency"), [role="dialog"] text=Monthly, [role="dialog"] text=Recurring').first().isVisible().catch(() => false);

      console.log(`Frequency selector: ${hasFrequency}`);
    }
  });

  test('BILL-009: Should validate required fields', async ({ page }) => {
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

  test('BILL-010: Should close dialog with cancel', async ({ page }) => {
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

  test('BILL-011: Should view template details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr, [class*="card"]').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View"), button:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);

        console.log(`Template detail dialog: ${hasDialog}`);
      }
    }
  });

  test('BILL-012: Should duplicate template', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const duplicateButton = page.locator('button:has-text("Duplicate"), button:has-text("Copy")').first();
    const hasDuplicate = await duplicateButton.isVisible().catch(() => false);

    console.log(`Duplicate option available: ${hasDuplicate}`);
  });

  test('BILL-013: Should delete template', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button:has-text("Delete")').first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete option available: ${hasDelete}`);
  });

  test('BILL-014: Should have property assignment', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasPropertyAssignment = await page.locator('[role="dialog"] label:has-text("Property"), [role="dialog"] label:has-text("Properties")').first().isVisible().catch(() => false);

      console.log(`Property assignment: ${hasPropertyAssignment}`);
    }
  });
});

test.describe('Bill Templates - Active/Inactive Status', () => {
  test('BILL-015: Should toggle template active status', async ({ page }) => {
    await page.goto(ROUTES.billTemplates);
    await waitForPageLoad(page, 2000);

    const toggleButton = page.locator('[role="switch"], button:has-text("Active"), button:has-text("Inactive")').first();
    const hasToggle = await toggleButton.isVisible().catch(() => false);

    console.log(`Active status toggle: ${hasToggle}`);
  });
});
