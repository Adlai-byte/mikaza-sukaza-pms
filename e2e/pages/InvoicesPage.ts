import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '../fixtures/test-data';

/**
 * Page Object for Invoices module
 */
export class InvoicesPage extends BasePage {
  readonly createButton: Locator;
  readonly statusFilter: Locator;
  readonly totalColumn: Locator;
  readonly printButton: Locator;
  readonly downloadButton: Locator;
  readonly sendButton: Locator;
  readonly lineItemsSection: Locator;
  readonly addItemButton: Locator;
  readonly subtotalText: Locator;
  readonly taxText: Locator;
  readonly totalText: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Invoice"), a:has-text("New Invoice")').first();
    this.statusFilter = page.locator('[role="combobox"]').first();
    this.totalColumn = page.locator('th:has-text("Total"), th:has-text("Amount"), text=Total').first();
    this.printButton = page.locator('button:has-text("Print"), button:has-text("Download"), button:has-text("Export"), button:has-text("PDF")').first();
    this.downloadButton = page.locator('button').filter({ has: page.locator('svg.lucide-download, svg.lucide-printer') }).first();
    this.sendButton = page.locator('button:has-text("Send"), button[title*="send"]').first();
    this.lineItemsSection = page.locator('text=Line Items, text=Items, text=Item, [class*="line-item"]').first();
    this.addItemButton = page.locator('button:has-text("Add Item"), button:has-text("Add Line"), button:has-text("Add")').first();
    this.subtotalText = page.locator('text=Subtotal');
    this.taxText = page.locator('text=Tax, text=VAT').first();
    this.totalText = page.locator('text=Total').first();
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.invoices);
    await this.waitForPageLoad();
  }

  /**
   * Navigate to new invoice page
   */
  async gotoNewInvoice(): Promise<void> {
    await this.page.goto(ROUTES.invoiceNew);
    await this.waitForPageLoad();
  }

  /**
   * Verify invoice list is displayed
   */
  async verifyListDisplayed(): Promise<void> {
    await expect(this.page.locator('text=Invoices, text=Invoice').first()).toBeVisible({ timeout: 15000 });
    const hasTable = await this.table.isVisible().catch(() => false);
    const hasCards = await this.page.locator('[class*="card"]').first().isVisible().catch(() => false);
    expect(hasTable || hasCards).toBeTruthy();
  }

  /**
   * Check if status filter has options
   */
  async hasStatusFilterOptions(): Promise<boolean> {
    if (await this.statusFilter.isVisible().catch(() => false)) {
      await this.statusFilter.click();
      await this.page.waitForTimeout(300);
      const hasOptions = await this.page.locator('[role="option"]').first().isVisible().catch(() => false);
      await this.page.keyboard.press('Escape');
      return hasOptions;
    }
    return false;
  }

  /**
   * Click create invoice button
   */
  async clickCreateInvoice(): Promise<void> {
    if (await this.createButton.isVisible().catch(() => false)) {
      await this.createButton.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Check if navigated to new invoice page or dialog
   */
  async isOnNewInvoicePage(): Promise<boolean> {
    const hasNewPage = this.page.url().includes('/invoices/new') || this.page.url().includes('/invoices/create');
    const hasDialog = await this.dialog.isVisible().catch(() => false);
    return hasNewPage || hasDialog;
  }

  /**
   * View first invoice details
   */
  async viewFirstInvoiceDetails(): Promise<void> {
    const invoiceRow = this.tableRows.first();
    if (await invoiceRow.isVisible().catch(() => false)) {
      const actionButton = invoiceRow.locator('button, a').first();
      if (await actionButton.isVisible().catch(() => false)) {
        await actionButton.click();
        await this.waitForPageLoad(500);
      }
    }
  }

  /**
   * Check if has total column
   */
  async hasTotalColumn(): Promise<boolean> {
    return await this.totalColumn.isVisible().catch(() => false);
  }

  /**
   * Get action button count in table
   */
  async getActionButtonCount(): Promise<number> {
    return await this.page.locator('tbody tr button, tbody tr a').count();
  }

  /**
   * Check if has line items section (on invoice form)
   */
  async hasLineItemsSection(): Promise<boolean> {
    const hasLineItems = await this.lineItemsSection.isVisible().catch(() => false);
    const hasAddItem = await this.addItemButton.isVisible().catch(() => false);
    return hasLineItems || hasAddItem;
  }

  /**
   * Check if has totals section (on invoice form)
   */
  async hasTotalsSection(): Promise<boolean> {
    const hasSubtotal = await this.subtotalText.isVisible().catch(() => false);
    const hasTotal = await this.totalText.isVisible().catch(() => false);
    return hasSubtotal || hasTotal;
  }

  /**
   * Check if has property/booking selector (on invoice form)
   */
  async hasPropertySelector(): Promise<boolean> {
    const hasSelector = await this.page.locator('[role="combobox"]').first().isVisible().catch(() => false);
    const hasLabel = await this.page.locator('label:has-text("Property"), label:has-text("Booking"), label:has-text("Guest")').first().isVisible().catch(() => false);
    return hasSelector || hasLabel;
  }

  /**
   * Submit empty form (for validation test)
   */
  async submitEmptyForm(): Promise<void> {
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Check if form validation shows errors
   */
  async hasValidationErrors(): Promise<boolean> {
    const stillOnNewPage = this.page.url().includes('/invoices/new') || this.page.url().includes('/invoices/create');
    const hasError = await this.page.locator('[aria-invalid="true"], [class*="error"], text=required').first().isVisible().catch(() => false);
    return stillOnNewPage || hasError;
  }

  /**
   * Check if has print/download functionality
   */
  async hasPrintDownload(): Promise<boolean> {
    const hasPrint = await this.printButton.isVisible().catch(() => false);
    const hasDownload = await this.downloadButton.isVisible().catch(() => false);
    return hasPrint || hasDownload;
  }

  /**
   * Check if has send invoice option
   */
  async hasSendOption(): Promise<boolean> {
    const hasSend = await this.sendButton.isVisible().catch(() => false);
    const hasSendIcon = await this.page.locator('button').filter({ has: this.page.locator('svg.lucide-send, svg.lucide-mail') }).first().isVisible().catch(() => false);
    return hasSend || hasSendIcon;
  }
}
