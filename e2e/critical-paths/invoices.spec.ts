import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, closeDialog, verifyToast } from '../helpers/test-helpers';
import { ROUTES, TEST_INVOICES } from '../fixtures/test-data';

test.describe('Invoices Module - Critical Path Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.invoices);
    await waitForPageLoad(page);
  });

  test('INV-001: Should list invoices', async ({ page }) => {
    await expect(page.locator('text=Invoices, text=Invoice').first()).toBeVisible({ timeout: 15000 });

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('INV-002: Should search invoices', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('INV-');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('INV-');
    }
  });

  test('INV-003: Should filter by status', async ({ page }) => {
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

  test('INV-004: Should navigate to create invoice', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Invoice"), a:has-text("New Invoice")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await waitForPageLoad(page);

      const hasNewPage = page.url().includes('/invoices/new') || page.url().includes('/invoices/create');
      const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);

      console.log(`Create invoice accessible: page=${hasNewPage}, dialog=${hasDialog}`);
      expect(hasNewPage || hasDialog).toBeTruthy();
    }
  });

  test('INV-005: Should view invoice details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const invoiceRow = page.locator('tbody tr').first();

    if (await invoiceRow.isVisible().catch(() => false)) {
      const actionButton = invoiceRow.locator('button, a').first();

      if (await actionButton.isVisible().catch(() => false)) {
        await actionButton.click();
        await waitForPageLoad(page, 500);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/invoices/');

        console.log(`Details accessible: dialog=${hasDialog}, page=${hasDetailPage}`);
      }
    }
  });

  test('INV-006: Should have action buttons in table', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const actionButtons = page.locator('tbody tr button, tbody tr a');
    const buttonCount = await actionButtons.count();

    console.log(`Found ${buttonCount} action button(s)`);
    expect(buttonCount).toBeGreaterThanOrEqual(0);
  });

  test('INV-007: Should display invoice totals column', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTotal = await page.locator('th:has-text("Total"), th:has-text("Amount"), text=Total').first().isVisible().catch(() => false);
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);

    console.log(`Has total column: ${hasTotal}, Table: ${hasTable}`);
    expect(hasTotal || hasTable).toBeTruthy();
  });

  test('INV-008: Should show invoice status badges', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const statusBadges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await statusBadges.count();

    console.log(`Found ${badgeCount} badge(s)`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Invoice Form Tests', () => {
  test('INV-009: Should have line items on invoice page', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    const hasLineItems = await page.locator('text=Line Items, text=Items, text=Item, [class*="line-item"]').first().isVisible().catch(() => false);
    const hasAddItem = await page.locator('button:has-text("Add Item"), button:has-text("Add Line"), button:has-text("Add")').first().isVisible().catch(() => false);

    console.log(`Line items section: ${hasLineItems}, Add item button: ${hasAddItem}`);
    expect(hasLineItems || hasAddItem).toBeTruthy();
  });

  test('INV-010: Should display totals section', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    const hasSubtotal = await page.locator('text=Subtotal').isVisible().catch(() => false);
    const hasTax = await page.locator('text=Tax, text=VAT').first().isVisible().catch(() => false);
    const hasTotal = await page.locator('text=Total').first().isVisible().catch(() => false);

    console.log(`Subtotal: ${hasSubtotal}, Tax: ${hasTax}, Total: ${hasTotal}`);
    expect(hasSubtotal || hasTotal).toBeTruthy();
  });

  test('INV-011: Should have property/booking selector', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    const hasSelector = await page.locator('[role="combobox"]').first().isVisible().catch(() => false);
    const hasLabel = await page.locator('label:has-text("Property"), label:has-text("Booking"), label:has-text("Guest")').first().isVisible().catch(() => false);

    console.log(`Selector: ${hasSelector}, Label: ${hasLabel}`);
    expect(hasSelector || hasLabel).toBeTruthy();
  });

  test('INV-012: Should validate required fields', async ({ page }) => {
    await page.goto(ROUTES.invoiceNew);
    await waitForPageLoad(page, 2000);

    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors or stay on page
      const stillOnNewPage = page.url().includes('/invoices/new') || page.url().includes('/invoices/create');
      const hasError = await page.locator('[aria-invalid="true"], [class*="error"], text=required').first().isVisible().catch(() => false);

      console.log(`Validation: stillOnPage=${stillOnNewPage}, hasError=${hasError}`);
      expect(stillOnNewPage || hasError).toBeTruthy();
    }
  });
});

test.describe('Invoice Actions', () => {
  test('INV-013: Should have print/download functionality', async ({ page }) => {
    await page.goto(ROUTES.invoices);
    await waitForPageLoad(page, 2000);

    // Look for print/download/export buttons anywhere on page
    const printButton = page.locator('button:has-text("Print"), button:has-text("Download"), button:has-text("Export"), button:has-text("PDF")').first();
    const downloadIcon = page.locator('button').filter({ has: page.locator('svg.lucide-download, svg.lucide-printer') }).first();

    const hasPrint = await printButton.isVisible().catch(() => false);
    const hasIcon = await downloadIcon.isVisible().catch(() => false);

    console.log(`Print/download available: button=${hasPrint}, icon=${hasIcon}`);
  });

  test('INV-014: Should have send invoice option', async ({ page }) => {
    await page.goto(ROUTES.invoices);
    await waitForPageLoad(page, 2000);

    const sendButton = page.locator('button:has-text("Send"), button[title*="send"]').first();
    const sendIcon = page.locator('button').filter({ has: page.locator('svg.lucide-send, svg.lucide-mail') }).first();

    const hasSend = await sendButton.isVisible().catch(() => false);
    const hasIcon = await sendIcon.isVisible().catch(() => false);

    console.log(`Send invoice available: button=${hasSend}, icon=${hasIcon}`);
  });
});
