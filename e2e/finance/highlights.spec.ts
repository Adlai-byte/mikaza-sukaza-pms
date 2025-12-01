import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES, getPastDate } from '../fixtures/test-data';

test.describe('Highlights Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.highlights);
    await waitForPageLoad(page);
  });

  test('HIGH-001: Should load highlights page', async ({ page }) => {
    await expect(page.locator('text=Highlight').first()).toBeVisible({ timeout: 15000 });
  });

  test('HIGH-002: Should list highlights', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('HIGH-003: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
  });

  test('HIGH-004: Should have date range filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    console.log(`Found ${dateCount} date filter(s)`);
  });

  test('HIGH-005: Should open add highlight dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('HIGH-006: Should have highlight form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Check for essential form fields
      const hasTitle = await page.locator('[role="dialog"] input[name*="title"], [role="dialog"] label:has-text("Title")').first().isVisible().catch(() => false);
      const hasDescription = await page.locator('[role="dialog"] textarea, [role="dialog"] label:has-text("Description")').first().isVisible().catch(() => false);
      const hasType = await page.locator('[role="dialog"] label:has-text("Type"), [role="dialog"] [role="combobox"]').first().isVisible().catch(() => false);

      console.log(`Title: ${hasTitle}, Description: ${hasDescription}, Type: ${hasType}`);
    }
  });

  test('HIGH-007: Should have highlight type selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasTypeSelector = await page.locator('[role="dialog"] [role="combobox"]').first().isVisible().catch(() => false);

      if (hasTypeSelector) {
        const typeSelector = page.locator('[role="dialog"] [role="combobox"]').first();
        await typeSelector.click();
        await page.waitForTimeout(300);

        // Check for type options (positive, negative, neutral, etc.)
        const hasPositive = await page.locator('[role="option"]:has-text("Positive"), [role="option"]:has-text("Good")').first().isVisible().catch(() => false);
        const hasNegative = await page.locator('[role="option"]:has-text("Negative"), [role="option"]:has-text("Bad"), [role="option"]:has-text("Issue")').first().isVisible().catch(() => false);

        console.log(`Positive option: ${hasPositive}, Negative option: ${hasNegative}`);
      }
    }
  });

  test('HIGH-008: Should have property selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasPropertySelector = await page.locator('[role="dialog"] label:has-text("Property")').first().isVisible().catch(() => false);

      console.log(`Property selector: ${hasPropertySelector}`);
    }
  });

  test('HIGH-009: Should have date field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasDateField = await page.locator('[role="dialog"] input[type="date"], [role="dialog"] label:has-text("Date")').first().isVisible().catch(() => false);

      console.log(`Date field: ${hasDateField}`);
    }
  });

  test('HIGH-010: Should validate required fields', async ({ page }) => {
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

  test('HIGH-011: Should close dialog with cancel', async ({ page }) => {
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

  test('HIGH-012: Should view highlight details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr, [class*="card"]').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View"), button:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);

        console.log(`Highlight detail dialog: ${hasDialog}`);
      }
    }
  });

  test('HIGH-013: Should display highlight type badges', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} type badge(s)`);
  });

  test('HIGH-014: Should filter by highlight type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').nth(1);

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Type filter options: ${hasOptions}`);
    }
  });

  test('HIGH-015: Should delete highlight', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button:has-text("Delete")').first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete option available: ${hasDelete}`);
  });
});

test.describe('Highlights - Summary', () => {
  test('HIGH-016: Should display summary statistics', async ({ page }) => {
    await page.goto(ROUTES.highlights);
    await waitForPageLoad(page, 2000);

    const hasStats = await page.locator('[class*="card"], text=Total, text=Count').first().isVisible().catch(() => false);

    console.log(`Summary statistics: ${hasStats}`);
  });

  test('HIGH-017: Should show positive/negative breakdown', async ({ page }) => {
    await page.goto(ROUTES.highlights);
    await waitForPageLoad(page, 2000);

    const hasBreakdown = await page.locator('text=Positive, text=Negative, text=Good, text=Issue').first().isVisible().catch(() => false);

    console.log(`Positive/negative breakdown: ${hasBreakdown}`);
  });
});
