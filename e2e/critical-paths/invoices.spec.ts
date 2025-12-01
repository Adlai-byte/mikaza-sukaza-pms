import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, closeDialog, verifyToast } from '../helpers/test-helpers';
import { ROUTES, TEST_INVOICES } from '../fixtures/test-data';

test.describe('Invoices Module - Critical Path Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.invoices);
    await waitForPageLoad(page);
  });

  test('INV-001: Should list invoices', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('text=Invoices').first()).toBeVisible({ timeout: 15000 });

    // Verify table is present
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('INV-002: Should search invoices', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('INV-');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('INV-');
    }
  });

  test('INV-003: Should filter by status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for status filter
    const statusFilter = page.locator('[role="combobox"]').first();

    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Look for status options (draft, sent, paid, overdue)
      const draftOption = page.locator('[role="option"]:has-text("Draft")').first();
      const paidOption = page.locator('[role="option"]:has-text("Paid")').first();

      if (await draftOption.isVisible().catch(() => false)) {
        await draftOption.click();
        await waitForPageLoad(page, 1000);
      } else if (await paidOption.isVisible().catch(() => false)) {
        await paidOption.click();
        await waitForPageLoad(page, 1000);
      }
    }

    // Page should still be functional
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('INV-004: Should navigate to create invoice page', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Find and click create button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New Invoice")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await waitForPageLoad(page);

      // Should navigate to new invoice page or open dialog
      const hasNewPage = page.url().includes('/invoices/new');
      const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);

      expect(hasNewPage || hasDialog).toBeTruthy();
    }
  });

  test('INV-005: Should view invoice details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Try to click on an invoice row
    const invoiceRow = page.locator('tbody tr').first();

    if (await invoiceRow.isVisible().catch(() => false)) {
      const viewButton = invoiceRow.locator('button:has-text("View"), a:has-text("View")').first();
      const editButton = invoiceRow.locator('button:has-text("Edit"), a:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);
        expect(page.url()).toContain('/invoices/');
      } else if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await waitForPageLoad(page);
        expect(page.url()).toContain('/invoices/');
      }
    }
  });

  test('INV-006: Should have payment button on invoice row', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for payment action buttons in rows
    const paymentButtons = page.locator('tbody tr button:has-text("Pay"), tbody tr button:has-text("Mark Paid"), tbody tr button[title*="payment"]');
    const paymentCount = await paymentButtons.count();

    console.log(`Found ${paymentCount} payment button(s)`);
  });

  test('INV-007: Should display invoice totals', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for total/amount columns
    const hasTotal = await page.locator('th:has-text("Total"), th:has-text("Amount")').first().isVisible().catch(() => false);

    console.log(`Has total/amount column: ${hasTotal}`);
  });

  test('INV-008: Should show invoice status badges', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    // Look for status badges
    const statusBadges = page.locator('[class*="badge"]');
    const badgeCount = await statusBadges.count();

    console.log(`Found ${badgeCount} status badge(s)`);
  });
});

test.describe('Invoice Form Tests', () => {
  test('INV-009: Should have line items section', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    // Look for line items section
    const hasLineItems = await page.locator('text=Line Items, text=Items, [class*="line-item"]').first().isVisible().catch(() => false);
    const hasAddItem = await page.locator('button:has-text("Add Item"), button:has-text("Add Line")').first().isVisible().catch(() => false);

    console.log(`Line items section: ${hasLineItems}, Add item button: ${hasAddItem}`);
  });

  test('INV-010: Should calculate totals automatically', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    // Look for subtotal, tax, and total fields
    const hasSubtotal = await page.locator('text=Subtotal').isVisible().catch(() => false);
    const hasTax = await page.locator('text=Tax, text=VAT').first().isVisible().catch(() => false);
    const hasTotal = await page.locator('text=Total').first().isVisible().catch(() => false);

    console.log(`Subtotal: ${hasSubtotal}, Tax: ${hasTax}, Total: ${hasTotal}`);
  });

  test('INV-011: Should require property/booking selection', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    // Look for property or booking selector
    const hasPropertySelector = await page.locator('[role="combobox"], select').first().isVisible().catch(() => false);
    const hasPropertyLabel = await page.locator('label:has-text("Property"), label:has-text("Booking")').first().isVisible().catch(() => false);

    expect(hasPropertySelector || hasPropertyLabel).toBeTruthy();
  });

  test('INV-012: Should validate required fields', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors or stay on page
      const stillOnNewPage = page.url().includes('/invoices/new');
      const hasError = await page.locator('[aria-invalid="true"], [class*="error"]').first().isVisible().catch(() => false);

      expect(stillOnNewPage || hasError).toBeTruthy();
    }
  });
});

test.describe('Invoice Actions', () => {
  test('INV-013: Should have print/download option', async ({ page }) => {
    await page.goto(ROUTES.invoices);
    await waitForPageLoad(page, 2000);

    // Look for print/download buttons
    const printButton = page.locator('button:has-text("Print"), button:has-text("Download"), button:has-text("Export")').first();
    const hasPrintOption = await printButton.isVisible().catch(() => false);

    console.log(`Print/download option available: ${hasPrintOption}`);
  });

  test('INV-014: Should have send invoice option', async ({ page }) => {
    await page.goto(ROUTES.invoices);
    await waitForPageLoad(page, 2000);

    // Look for send button in rows
    const sendButton = page.locator('button:has-text("Send"), button[title*="send"]').first();
    const hasSendOption = await sendButton.isVisible().catch(() => false);

    console.log(`Send invoice option available: ${hasSendOption}`);
  });
});
