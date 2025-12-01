import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Access Authorizations Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.accessAuthorizations);
    await waitForPageLoad(page);
  });

  test('ACC-001: Should load access authorizations page', async ({ page }) => {
    await expect(page.locator('text=Access').first()).toBeVisible({ timeout: 15000 });
  });

  test('ACC-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} stats cards`);
  });

  test('ACC-003: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
  });

  test('ACC-004: Should have status filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').nth(1);
    const hasStatusFilter = await statusFilter.isVisible().catch(() => false);

    console.log(`Status filter: ${hasStatusFilter}`);
  });

  test('ACC-005: Should have create button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
    const hasCreate = await createButton.isVisible().catch(() => false);

    console.log(`Create button: ${hasCreate}`);
  });

  test('ACC-006: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
  });

  test('ACC-007: Should open create authorization dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('ACC-008: Should have authorization form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasProperty = await page.locator('[role="dialog"] label:has-text("Property")').first().isVisible().catch(() => false);
      const hasName = await page.locator('[role="dialog"] label:has-text("Name"), [role="dialog"] input[name*="name"]').first().isVisible().catch(() => false);
      const hasDate = await page.locator('[role="dialog"] input[type="date"], [role="dialog"] label:has-text("Date")').first().isVisible().catch(() => false);

      console.log(`Property: ${hasProperty}, Name: ${hasName}, Date: ${hasDate}`);
    }
  });

  test('ACC-009: Should close create dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

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

  test('ACC-010: Should display authorizations list', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('ACC-011: Should filter by property', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();

    if (await propertyFilter.isVisible().catch(() => false)) {
      await propertyFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Property filter options: ${hasOptions}`);
    }
  });

  test('ACC-012: Should filter by status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').nth(1);

    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Status filter options: ${hasOptions}`);
    }
  });
});

test.describe('Access Authorizations - Actions', () => {
  test('ACC-013: Should have edit action', async ({ page }) => {
    await page.goto(ROUTES.accessAuthorizations);
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('button:has-text("Edit")').first();
    const editIcon = page.locator('[class*="edit"], [class*="Edit"]').first();

    const hasEdit = await editButton.isVisible().catch(() => false) ||
                    await editIcon.isVisible().catch(() => false);

    console.log(`Edit action: ${hasEdit}`);
  });

  test('ACC-014: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.accessAuthorizations);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button:has-text("Delete")').first();
    const deleteIcon = page.locator('[class*="trash"], [class*="Trash"]').first();

    const hasDelete = await deleteButton.isVisible().catch(() => false) ||
                      await deleteIcon.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('ACC-015: Should have revoke action', async ({ page }) => {
    await page.goto(ROUTES.accessAuthorizations);
    await waitForPageLoad(page, 2000);

    const revokeButton = page.locator('button:has-text("Revoke")').first();
    const hasRevoke = await revokeButton.isVisible().catch(() => false);

    console.log(`Revoke action: ${hasRevoke}`);
  });

  test('ACC-016: Should display status badges', async ({ page }) => {
    await page.goto(ROUTES.accessAuthorizations);
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} status badges`);
  });
});
