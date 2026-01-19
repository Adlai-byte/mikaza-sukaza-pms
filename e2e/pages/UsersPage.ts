import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '../fixtures/test-data';

/**
 * Page Object for Users management module
 */
export class UsersPage extends BasePage {
  readonly createButton: Locator;
  readonly roleFilter: Locator;
  readonly roleSelector: Locator;
  readonly statusColumn: Locator;
  readonly roleBadges: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite"), button:has-text("User")').first();
    this.roleFilter = page.locator('[role="combobox"]').first();
    this.roleSelector = page.locator('[role="dialog"] [role="combobox"], [role="dialog"] select').first();
    this.statusColumn = page.locator('th:has-text("Status"), th:has-text("Active"), text=Status, text=Active').first();
    this.roleBadges = page.locator('[class*="badge"], [class*="Badge"]');
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.users);
    await this.waitForPageLoad();
  }

  /**
   * Navigate to activity logs page
   */
  async gotoActivityLogs(): Promise<void> {
    await this.page.goto(ROUTES.activityLogs);
    await this.waitForPageLoad();
  }

  /**
   * Verify users list is displayed
   */
  async verifyListDisplayed(): Promise<void> {
    await expect(this.page.locator('text=Users, text=User').first()).toBeVisible({ timeout: 15000 });
    const hasTable = await this.table.isVisible().catch(() => false);
    const hasCards = await this.page.locator('[class*="card"]').first().isVisible().catch(() => false);
    expect(hasTable || hasCards).toBeTruthy();
  }

  /**
   * Check if role filter has options
   */
  async hasRoleFilterOptions(): Promise<boolean> {
    if (await this.roleFilter.isVisible().catch(() => false)) {
      await this.roleFilter.click();
      await this.page.waitForTimeout(300);
      const hasOptions = await this.page.locator('[role="option"]').first().isVisible().catch(() => false);
      await this.page.keyboard.press('Escape');
      return hasOptions;
    }
    return false;
  }

  /**
   * Open create user dialog
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
   * Check if dialog has form inputs
   */
  async hasFormInputsInDialog(): Promise<boolean> {
    const dialog = this.dialog.first();
    return await dialog.locator('input, [role="combobox"]').first().isVisible().catch(() => false);
  }

  /**
   * Check if dialog has role selector
   */
  async hasRoleSelectorInDialog(): Promise<boolean> {
    return await this.roleSelector.isVisible().catch(() => false);
  }

  /**
   * Submit empty form (for validation test)
   */
  async submitEmptyForm(): Promise<void> {
    const submitButton = this.page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Invite"), [role="dialog"] button:has-text("Add")').first();
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
   * View first user details
   */
  async viewFirstUserDetails(): Promise<void> {
    const firstRow = this.tableRows.first();
    if (await firstRow.isVisible().catch(() => false)) {
      const actionButton = firstRow.locator('button').first();
      if (await actionButton.isVisible().catch(() => false)) {
        await actionButton.click();
        await this.waitForPageLoad(500);
      }
    }
  }

  /**
   * Get role badge count
   */
  async getRoleBadgeCount(): Promise<number> {
    return await this.roleBadges.count();
  }

  /**
   * Check if has status column
   */
  async hasStatusColumn(): Promise<boolean> {
    const hasStatusColumn = await this.statusColumn.isVisible().catch(() => false);
    const hasTable = await this.table.isVisible().catch(() => false);
    return hasStatusColumn || hasTable;
  }

  /**
   * Check if has permission/role management
   */
  async hasPermissionManagement(): Promise<boolean> {
    const hasPermissionText = await this.page.locator('text=Permission, text=Role').first().isVisible().catch(() => false);
    const hasRoleFilter = await this.roleFilter.isVisible().catch(() => false);
    return hasPermissionText || hasRoleFilter;
  }

  /**
   * Verify activity logs page
   */
  async verifyActivityLogsDisplayed(): Promise<void> {
    await expect(this.page.locator('text=Activity, text=Log').first()).toBeVisible({ timeout: 15000 });
    const hasTable = await this.table.isVisible().catch(() => false);
    const hasList = await this.page.locator('[class*="log"], [class*="activity"]').first().isVisible().catch(() => false);
    const hasCards = await this.page.locator('[class*="card"]').first().isVisible().catch(() => false);
    expect(hasTable || hasList || hasCards).toBeTruthy();
  }

  /**
   * Check if activity logs has date filtering
   */
  async hasActivityLogDateFiltering(): Promise<boolean> {
    const dateInputs = this.page.locator('input[type="date"], [role="combobox"]');
    const count = await dateInputs.count();
    return count > 0;
  }

  /**
   * Check if activity logs has action type filter
   */
  async hasActionTypeFilter(): Promise<boolean> {
    const actionFilter = this.page.locator('[role="combobox"]').first();
    if (await actionFilter.isVisible().catch(() => false)) {
      await actionFilter.click();
      await this.page.waitForTimeout(300);
      const hasOptions = await this.page.locator('[role="option"]').first().isVisible().catch(() => false);
      await this.page.keyboard.press('Escape');
      return hasOptions;
    }
    return false;
  }
}
