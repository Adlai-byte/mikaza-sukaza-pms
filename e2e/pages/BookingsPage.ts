import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '../fixtures/test-data';

/**
 * Page Object for Bookings module
 */
export class BookingsPage extends BasePage {
  readonly createButton: Locator;
  readonly statusFilter: Locator;
  readonly bookingCards: Locator;
  readonly dateInputs: Locator;
  readonly propertySelector: Locator;
  readonly guestSelector: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Booking")').first();
    this.statusFilter = page.locator('[role="combobox"]').first();
    this.bookingCards = page.locator('[class*="booking-card"], [class*="card"]');
    this.dateInputs = page.locator('input[type="date"], [class*="calendar"]');
    this.propertySelector = page.locator('[role="dialog"] [role="combobox"]').first();
    this.guestSelector = page.locator('[role="dialog"] [role="combobox"]').nth(1);
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.bookings);
    await this.waitForPageLoad();
  }

  /**
   * Open create booking dialog
   */
  async openCreateDialog(): Promise<void> {
    if (await this.createButton.isVisible().catch(() => false)) {
      await this.createButton.click();
      await this.waitForDialog();
    }
  }

  /**
   * Check if create button is visible
   */
  async isCreateButtonVisible(): Promise<boolean> {
    return await this.createButton.isVisible().catch(() => false);
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.click();
    await this.page.waitForTimeout(300);
    await this.page.locator(`[role="option"]:has-text("${status}")`).click();
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
   * Verify booking list is displayed
   */
  async verifyListDisplayed(): Promise<void> {
    await expect(this.page.locator('text=Bookings, text=Booking').first()).toBeVisible({ timeout: 15000 });
    const hasTable = await this.table.isVisible().catch(() => false);
    const hasCards = await this.bookingCards.first().isVisible().catch(() => false);
    expect(hasTable || hasCards).toBeTruthy();
  }

  /**
   * Check if date fields are present in dialog
   */
  async hasDateFieldsInDialog(): Promise<boolean> {
    return await this.page.locator('[role="dialog"] input[type="date"], [role="dialog"] [class*="calendar"], [role="dialog"] text=Check').first().isVisible().catch(() => false);
  }

  /**
   * Check if property selector is visible in dialog
   */
  async hasPropertySelectorInDialog(): Promise<boolean> {
    return await this.propertySelector.isVisible().catch(() => false);
  }

  /**
   * Submit booking form (without filling - for validation test)
   */
  async submitEmptyForm(): Promise<void> {
    const submitButton = this.page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Create")').first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Close dialog with escape key
   */
  async closeDialogWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.dialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Get first booking row action button
   */
  async clickFirstBookingAction(): Promise<void> {
    const bookingRow = this.page.locator('tbody tr, [class*="booking-card"], [class*="card"]').first();
    if (await bookingRow.isVisible().catch(() => false)) {
      const actionButton = bookingRow.locator('button').first();
      if (await actionButton.isVisible().catch(() => false)) {
        await actionButton.click();
        await this.waitForPageLoad(500);
      }
    }
  }

  /**
   * Check if has date filtering
   */
  async hasDateFiltering(): Promise<boolean> {
    const count = await this.dateInputs.count();
    return count > 0;
  }

  /**
   * Get date filter count
   */
  async getDateFilterCount(): Promise<number> {
    return await this.page.locator('input[type="date"], [role="combobox"]').count();
  }
}
