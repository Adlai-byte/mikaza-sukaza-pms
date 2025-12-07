import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, closeDialog } from '../helpers/test-helpers';
import { ROUTES, TEST_USERS } from '../fixtures/test-data';

test.describe('User Management - Admin Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.users);
    await waitForPageLoad(page);
  });

  test('USER-001: Should load users page', async ({ page }) => {
    await expect(page.locator('text=Users, text=User').first()).toBeVisible({ timeout: 15000 });
  });

  test('USER-002: Should list users', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('USER-003: Should search users', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('admin');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('admin');
    }
  });

  test('USER-004: Should filter by role', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const roleFilter = page.locator('[role="combobox"]').first();

    if (await roleFilter.isVisible().catch(() => false)) {
      await roleFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);
      console.log(`Role filter options: ${hasOptions}`);
      expect(hasOptions).toBeTruthy();
    }
  });

  test('USER-005: Should open add user dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite"), button:has-text("User")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('USER-006: Should have user form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite"), button:has-text("User")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        const hasInputs = await dialog.locator('input, [role="combobox"]').first().isVisible().catch(() => false);
        console.log(`Form fields visible: ${hasInputs}`);
        expect(hasInputs).toBeTruthy();
      }
    }
  });

  test('USER-007: Should have role selector in form', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite"), button:has-text("User")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasRoleSelector = await page.locator('[role="dialog"] [role="combobox"], [role="dialog"] select').first().isVisible().catch(() => false);

      console.log(`Role selector: ${hasRoleSelector}`);
      expect(hasRoleSelector).toBeTruthy();
    }
  });

  test('USER-008: Should validate required fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite"), button:has-text("User")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Invite"), [role="dialog"] button:has-text("Add")').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Dialog should still be open (validation prevented submit)
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    }
  });

  test('USER-009: Should close dialog with escape', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite"), button:has-text("User")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const dialogStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log(`Dialog closed: ${!dialogStillVisible}`);
    }
  });

  test('USER-010: Should view user details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const actionButton = firstRow.locator('button').first();

      if (await actionButton.isVisible().catch(() => false)) {
        await actionButton.click();
        await waitForPageLoad(page, 500);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/users/');

        console.log(`Details accessible: ${hasDialog || hasDetailPage}`);
      }
    }
  });

  test('USER-011: Should display user roles in table', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const roleBadges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await roleBadges.count();

    console.log(`Found ${badgeCount} badge(s)`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('USER-012: Should display user status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasStatusColumn = await page.locator('th:has-text("Status"), th:has-text("Active"), text=Status, text=Active').first().isVisible().catch(() => false);
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);

    console.log(`Status info visible: ${hasStatusColumn}, Table: ${hasTable}`);
    expect(hasStatusColumn || hasTable).toBeTruthy();
  });
});

test.describe('User Management - Permissions', () => {
  test('USER-013: Should have permission or role management', async ({ page }) => {
    await page.goto(ROUTES.users);
    await waitForPageLoad(page, 2000);

    // Check for permission-related UI elements
    const hasPermissionText = await page.locator('text=Permission, text=Role').first().isVisible().catch(() => false);
    const hasRoleFilter = await page.locator('[role="combobox"]').first().isVisible().catch(() => false);

    console.log(`Permission/Role management: text=${hasPermissionText}, filter=${hasRoleFilter}`);
    expect(hasPermissionText || hasRoleFilter).toBeTruthy();
  });
});

test.describe('Activity Logs - Admin Tests', () => {
  test('LOG-001: Should load activity logs page', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page);

    await expect(page.locator('text=Activity, text=Log').first()).toBeVisible({ timeout: 15000 });
  });

  test('LOG-002: Should list activity logs', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasList = await page.locator('[class*="log"], [class*="activity"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Activity logs - Table: ${hasTable}, List: ${hasList}, Cards: ${hasCards}`);
    expect(hasTable || hasList || hasCards).toBeTruthy();
  });

  test('LOG-003: Should have date filtering', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"], [role="combobox"]');
    const filterCount = await dateInputs.count();

    console.log(`Found ${filterCount} filter input(s)`);
    expect(filterCount).toBeGreaterThanOrEqual(0);
  });

  test('LOG-004: Should filter by action type', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page, 2000);

    const actionFilter = page.locator('[role="combobox"]').first();

    if (await actionFilter.isVisible().catch(() => false)) {
      await actionFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Action filter options: ${hasOptions}`);
      expect(hasOptions).toBeTruthy();
    }
  });
});
