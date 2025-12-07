import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object containing common functionality shared across all pages
 */
export abstract class BasePage {
  readonly page: Page;

  // Common selectors
  readonly spinner: Locator;
  readonly mainContent: Locator;
  readonly pageTitle: Locator;
  readonly toast: Locator;
  readonly dialog: Locator;
  readonly alertDialog: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.spinner = page.locator('[class*="spinner"], [class*="loading"], [class*="skeleton"]').first();
    this.mainContent = page.locator('main, [role="main"], #root > div').first();
    this.pageTitle = page.locator('h1').first();
    this.toast = page.locator('[role="alert"], [data-sonner-toast]');
    this.dialog = page.locator('[role="dialog"]');
    this.alertDialog = page.locator('[role="alertdialog"]');
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    this.table = page.locator('table').first();
    this.tableRows = page.locator('tbody tr');
  }

  /**
   * Navigate to the page route
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(timeout = 5000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');

    try {
      await this.spinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // No spinner found or already hidden
    }

    try {
      await this.mainContent.waitFor({ state: 'visible', timeout });
    } catch {
      // Fallback: page might not have main element
    }
  }

  /**
   * Verify page title is visible
   */
  async verifyPageTitle(expectedText: string, timeout = 15000): Promise<void> {
    await expect(this.page.locator(`text=${expectedText}`).first()).toBeVisible({ timeout });
  }

  /**
   * Search in the table
   */
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    try {
      await this.spinner.waitFor({ state: 'visible', timeout: 500 });
      await this.spinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  /**
   * Get table row count
   */
  async getTableRowCount(): Promise<number> {
    await this.waitForPageLoad();
    return await this.tableRows.count();
  }

  /**
   * Click a table row by text content
   */
  async clickTableRow(text: string): Promise<void> {
    await this.page.locator(`tr:has-text("${text}"), [role="row"]:has-text("${text}")`).first().click();
  }

  /**
   * Click a button by text
   */
  async clickButton(text: string): Promise<void> {
    await this.page.locator(`button:has-text("${text}")`).first().click();
  }

  /**
   * Verify toast message appears
   */
  async verifyToast(message: string, timeout = 5000): Promise<void> {
    const toastLocator = this.page.locator(`[role="alert"]:has-text("${message}"), [data-sonner-toast]:has-text("${message}")`);
    await expect(toastLocator.first()).toBeVisible({ timeout });
  }

  /**
   * Close any open dialog
   */
  async closeDialog(): Promise<void> {
    const closeButton = this.dialog.first().locator('button:has-text("Close"), button:has-text("Cancel")').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await this.dialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Confirm alert dialog
   */
  async confirmDialog(): Promise<void> {
    const confirmButton = this.alertDialog.first().locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), button:has-text("OK")').first();
    await confirmButton.click();
    await this.alertDialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Cancel alert dialog
   */
  async cancelDialog(): Promise<void> {
    const cancelButton = this.alertDialog.first().locator('button:has-text("Cancel"), button:has-text("No")').first();
    await cancelButton.click();
    await this.alertDialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Select a dropdown option
   */
  async selectOption(label: string, optionText: string): Promise<void> {
    const comboboxSelectors = [
      `label:has-text("${label}") + [role="combobox"]`,
      `label:has-text("${label}") ~ [role="combobox"]`,
      `[aria-label="${label}"]`,
    ];

    for (const selector of comboboxSelectors) {
      const combobox = this.page.locator(selector).first();
      if (await combobox.isVisible().catch(() => false)) {
        await combobox.click();
        const option = this.page.locator(`[role="option"]:has-text("${optionText}")`).first();
        await option.waitFor({ state: 'visible', timeout: 5000 });
        await option.click();
        await option.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
        return;
      }
    }

    throw new Error(`Could not find dropdown with label: ${label}`);
  }

  /**
   * Fill a form field by label
   */
  async fillField(label: string, value: string): Promise<void> {
    const selectors = [
      `label:has-text("${label}") + input`,
      `label:has-text("${label}") ~ input`,
      `label:has-text("${label}") + textarea`,
      `label:has-text("${label}") ~ textarea`,
      `input[placeholder*="${label}"]`,
      `textarea[placeholder*="${label}"]`,
    ];

    for (const selector of selectors) {
      const field = this.page.locator(selector).first();
      if (await field.isVisible().catch(() => false)) {
        await field.fill(value);
        return;
      }
    }

    throw new Error(`Could not find field with label: ${label}`);
  }

  /**
   * Check if text is visible on page
   */
  async isTextVisible(text: string): Promise<boolean> {
    try {
      return await this.page.locator(`text=${text}`).first().isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for dialog to appear
   */
  async waitForDialog(timeout = 5000): Promise<void> {
    await this.dialog.first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if dialog is visible
   */
  async isDialogVisible(): Promise<boolean> {
    return await this.dialog.first().isVisible().catch(() => false);
  }

  /**
   * Switch to a tab
   */
  async switchToTab(tabText: string): Promise<void> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabText}")`);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 }).catch(() => {});
    const tabPanel = this.page.locator('[role="tabpanel"]').first();
    await tabPanel.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }

  /**
   * Get badge elements
   */
  async getBadges(): Promise<Locator> {
    return this.page.locator('[class*="badge"], [class*="Badge"]');
  }

  /**
   * Get count of badges
   */
  async getBadgeCount(): Promise<number> {
    const badges = await this.getBadges();
    return await badges.count();
  }
}
