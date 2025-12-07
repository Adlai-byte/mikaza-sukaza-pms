import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '../fixtures/test-data';

/**
 * Page Object for Properties module
 */
export class PropertiesPage extends BasePage {
  readonly createButton: Locator;
  readonly propertyCards: Locator;
  readonly propertyNameInput: Locator;
  readonly addressInput: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Property")').first();
    this.propertyCards = page.locator('[class*="card"]');
    this.propertyNameInput = page.locator('input[name="property_name"], input[placeholder*="name"]').first();
    this.addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
    this.statusFilter = page.locator('[role="combobox"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.properties);
    await this.waitForPageLoad();
  }

  /**
   * Navigate to property details page
   */
  async gotoProperty(propertyId: string): Promise<void> {
    await this.page.goto(`/properties/${propertyId}/view`);
    await this.waitForPageLoad();
  }

  /**
   * Open create property dialog/page
   */
  async openCreateDialog(): Promise<void> {
    await this.createButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if create button is visible
   */
  async isCreateButtonVisible(): Promise<boolean> {
    return await this.createButton.isVisible().catch(() => false);
  }

  /**
   * Get property card count
   */
  async getPropertyCardCount(): Promise<number> {
    return await this.propertyCards.count();
  }

  /**
   * Click on a property card by name
   */
  async clickPropertyCard(propertyName: string): Promise<void> {
    await this.page.locator(`[class*="card"]:has-text("${propertyName}")`).first().click();
  }

  /**
   * Filter properties by status
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
   * Fill property form fields
   */
  async fillPropertyForm(data: { name?: string; address?: string; city?: string }): Promise<void> {
    if (data.name) {
      await this.propertyNameInput.fill(data.name);
    }
    if (data.address) {
      await this.addressInput.fill(data.address);
    }
    if (data.city) {
      await this.fillField('City', data.city);
    }
  }

  /**
   * Submit property form
   */
  async submitForm(): Promise<void> {
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    await submitButton.click();
  }

  /**
   * Verify property list is displayed
   */
  async verifyListDisplayed(): Promise<void> {
    await expect(this.page.locator('text=Properties, text=Property').first()).toBeVisible({ timeout: 15000 });
    const hasTable = await this.table.isVisible().catch(() => false);
    const hasCards = await this.propertyCards.first().isVisible().catch(() => false);
    expect(hasTable || hasCards).toBeTruthy();
  }

  /**
   * Verify property details page
   */
  async verifyDetailsPage(): Promise<void> {
    const hasTitle = await this.pageTitle.isVisible().catch(() => false);
    const hasDetails = await this.page.locator('text=Address, text=Details').first().isVisible().catch(() => false);
    expect(hasTitle || hasDetails).toBeTruthy();
  }

  /**
   * Get first property row action button
   */
  async getFirstRowActionButton(): Promise<Locator> {
    return this.tableRows.first().locator('button').first();
  }

  /**
   * Check if has amenities section
   */
  async hasAmenitiesSection(): Promise<boolean> {
    return await this.page.locator('text=Amenities, text=Features').first().isVisible().catch(() => false);
  }
}
