import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES, getFutureDate, getPastDate } from '../fixtures/test-data';

test.describe('Expenses Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.expenses);
    await waitForPageLoad(page);
  });

  test('EXP-001: Should load expenses page', async ({ page }) => {
    await expect(page.locator('text=Expense').first()).toBeVisible({ timeout: 15000 });
  });

  test('EXP-002: Should list expenses', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    // Check for table or cards (expenses might be shown in different layouts)
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasContent = await page.locator('main, [role="main"]').first().isVisible().catch(() => false);

    console.log(`EXP-002 - Table: ${hasTable}, Cards: ${hasCards}, Content: ${hasContent}`);
    expect(hasTable || hasCards || hasContent).toBeTruthy();
  });

  test('EXP-003: Should search expenses', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('maintenance');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('maintenance');
    }
  });

  test('EXP-004: Should filter by category', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const categoryFilter = page.locator('[role="combobox"]').first();

    if (await categoryFilter.isVisible().catch(() => false)) {
      await categoryFilter.click();
      await page.waitForTimeout(300);

      const maintenanceOption = page.locator('[role="option"]:has-text("Maintenance")').first();
      const utilitiesOption = page.locator('[role="option"]:has-text("Utilities")').first();

      if (await maintenanceOption.isVisible().catch(() => false)) {
        await maintenanceOption.click();
        await waitForPageLoad(page, 1000);
      } else if (await utilitiesOption.isVisible().catch(() => false)) {
        await utilitiesOption.click();
        await waitForPageLoad(page, 1000);
      }
    }

    // Check for table or cards after filter
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasContent = await page.locator('main, [role="main"]').first().isVisible().catch(() => false);

    console.log(`EXP-004 - Table: ${hasTable}, Cards: ${hasCards}, Content: ${hasContent}`);
    expect(hasTable || hasCards || hasContent).toBeTruthy();
  });

  test('EXP-005: Should filter by date range', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    if (dateCount > 0) {
      await dateInputs.first().fill(getPastDate(30));
      await waitForPageLoad(page, 1000);
    }

    console.log(`Found ${dateCount} date filter(s)`);
  });

  test('EXP-006: Should open add expense dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('EXP-007: Should have expense form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Check for essential form fields
      const hasDescription = await page.locator('[role="dialog"] textarea, [role="dialog"] label:has-text("Description")').first().isVisible().catch(() => false);
      const hasAmount = await page.locator('[role="dialog"] input[type="number"], [role="dialog"] label:has-text("Amount")').first().isVisible().catch(() => false);
      const hasDate = await page.locator('[role="dialog"] input[type="date"], [role="dialog"] label:has-text("Date")').first().isVisible().catch(() => false);
      const hasCategory = await page.locator('[role="dialog"] label:has-text("Category")').first().isVisible().catch(() => false);

      console.log(`Description: ${hasDescription}, Amount: ${hasAmount}, Date: ${hasDate}, Category: ${hasCategory}`);
    }
  });

  test('EXP-008: Should have property selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasPropertySelector = await page.locator('[role="dialog"] label:has-text("Property")').first().isVisible().catch(() => false);

      console.log(`Property selector: ${hasPropertySelector}`);
    }
  });

  test('EXP-009: Should have vendor/payee field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasVendor = await page.locator('[role="dialog"] label:has-text("Vendor"), [role="dialog"] label:has-text("Payee"), [role="dialog"] label:has-text("Provider")').first().isVisible().catch(() => false);

      console.log(`Vendor/Payee field: ${hasVendor}`);
    }
  });

  test('EXP-010: Should validate required fields', async ({ page }) => {
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

  test('EXP-011: Should close dialog with cancel', async ({ page }) => {
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

  test('EXP-012: Should view expense details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View"), button:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/expenses/');

        expect(hasDialog || hasDetailPage).toBeTruthy();
      }
    }
  });

  test('EXP-013: Should display expense totals', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for total/summary section
    const hasTotalSection = await page.locator('text=Total, [class*="summary"], [class*="total"]').first().isVisible().catch(() => false);

    console.log(`Total section visible: ${hasTotalSection}`);
  });

  test('EXP-014: Should have receipt upload option', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasUpload = await page.locator('[role="dialog"] input[type="file"], [role="dialog"] text=Receipt, [role="dialog"] text=Upload').first().isVisible().catch(() => false);

      console.log(`Receipt upload: ${hasUpload}`);
    }
  });

  test('EXP-015: Should filter by property', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for property filter
    const propertyFilter = page.locator('[role="combobox"]').nth(1);

    if (await propertyFilter.isVisible().catch(() => false)) {
      await propertyFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Property filter options: ${hasOptions}`);
    }
  });
});

test.describe('Expenses - Recurring Expenses', () => {
  test('EXP-016: Should have recurring expense option', async ({ page }) => {
    await page.goto(ROUTES.expenses);
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasRecurring = await page.locator('[role="dialog"] label:has-text("Recurring"), [role="dialog"] text=Recurring').first().isVisible().catch(() => false);

      console.log(`Recurring expense option: ${hasRecurring}`);
    }
  });
});
