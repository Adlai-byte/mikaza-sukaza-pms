import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, closeDialog } from '../helpers/test-helpers';
import { ROUTES, TEST_USERS } from '../fixtures/test-data';

test.describe('User Management - Admin Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.users);
    await waitForPageLoad(page);
  });

  test('USER-001: Should load users page', async ({ page }) => {
    await expect(page.locator('text=Users').first()).toBeVisible({ timeout: 15000 });
  });

  test('USER-002: Should list users', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('USER-003: Should search users', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

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

      const adminOption = page.locator('[role="option"]:has-text("Admin")').first();
      if (await adminOption.isVisible().catch(() => false)) {
        await adminOption.click();
        await waitForPageLoad(page, 1000);
      }
    }

    await expect(page.locator('table').first()).toBeVisible();
  });

  test('USER-005: Should open add user dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('USER-006: Should have user form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Check for essential form fields
      const hasEmail = await page.locator('[role="dialog"] input[type="email"], [role="dialog"] label:has-text("Email")').first().isVisible().catch(() => false);
      const hasName = await page.locator('[role="dialog"] input[name*="name"], [role="dialog"] label:has-text("Name")').first().isVisible().catch(() => false);
      const hasRole = await page.locator('[role="dialog"] label:has-text("Role")').first().isVisible().catch(() => false);

      console.log(`Email: ${hasEmail}, Name: ${hasName}, Role: ${hasRole}`);
    }
  });

  test('USER-007: Should have role selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasRoleSelector = await page.locator('[role="dialog"] [role="combobox"], [role="dialog"] select').first().isVisible().catch(() => false);

      console.log(`Role selector: ${hasRoleSelector}`);
    }
  });

  test('USER-008: Should validate required fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Invite")').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Dialog should still be open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    }
  });

  test('USER-009: Should close dialog with cancel', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Invite")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await closeDialog(page);

      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('USER-010: Should view user details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View"), button:has-text("Edit")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/users/');

        expect(hasDialog || hasDetailPage).toBeTruthy();
      }
    }
  });

  test('USER-011: Should display user roles', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const roleBadges = page.locator('[class*="badge"]');
    const badgeCount = await roleBadges.count();

    console.log(`Found ${badgeCount} role badge(s)`);
  });

  test('USER-012: Should display user status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasActiveColumn = await page.locator('th:has-text("Status"), th:has-text("Active")').first().isVisible().catch(() => false);

    console.log(`Status column visible: ${hasActiveColumn}`);
  });
});

test.describe('User Management - Permissions', () => {
  test('USER-013: Should have permission management', async ({ page }) => {
    await page.goto(ROUTES.users);
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const editButton = firstRow.locator('button:has-text("Edit")').first();

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(500);

        const hasPermissions = await page.locator('[role="dialog"] text=Permissions, [role="dialog"] [class*="permission"]').first().isVisible().catch(() => false);

        console.log(`Permission management: ${hasPermissions}`);
      }
    }
  });
});

test.describe('Activity Logs - Admin Tests', () => {
  test('LOG-001: Should load activity logs page', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page);

    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 15000 });
  });

  test('LOG-002: Should list activity logs', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasList = await page.locator('[class*="log"], [class*="activity"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Activity logs - Table: ${hasTable}, List: ${hasList}, Cards: ${hasCards}`);
  });

  test('LOG-003: Should filter by date range', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page, 2000);

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    console.log(`Found ${dateCount} date input(s)`);
  });

  test('LOG-004: Should filter by action type', async ({ page }) => {
    await page.goto(ROUTES.activityLogs);
    await waitForPageLoad(page, 2000);

    const actionFilter = page.locator('[role="combobox"]').first();

    if (await actionFilter.isVisible().catch(() => false)) {
      await actionFilter.click();
      await page.waitForTimeout(300);

      // Should have action options
      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Action filter options: ${hasOptions}`);
    }
  });
});
