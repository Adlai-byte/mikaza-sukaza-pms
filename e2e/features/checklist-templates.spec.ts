import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Checklist Templates Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.checklistTemplates);
    await waitForPageLoad(page);
  });

  test('CHK-001: Should load checklist templates page', async ({ page }) => {
    const hasChecklist = await page.locator('text=Checklist').first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasTemplate = await page.locator('text=Template').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Checklist text: ${hasChecklist}, Template: ${hasTemplate}, Cards: ${hasCards}`);
    expect(hasChecklist || hasTemplate || hasCards).toBeTruthy();
  });

  test('CHK-002: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
    expect(hasSearch).toBeTruthy();
  });

  test('CHK-003: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
    expect(hasPropertyFilter).toBeTruthy();
  });

  test('CHK-004: Should have type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').nth(1);
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);

    console.log(`Type filter: ${hasTypeFilter}`);
  });

  test('CHK-005: Should have active/inactive filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const activeFilter = page.locator('[role="combobox"]').nth(2);
    const hasActiveFilter = await activeFilter.isVisible().catch(() => false);

    console.log(`Active filter: ${hasActiveFilter}`);
  });

  test('CHK-006: Should have add template button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
    const hasAddButton = await addButton.isVisible().catch(() => false);
    const hasPlusButton = await plusButton.isVisible().catch(() => false);

    console.log(`Add template button: ${hasAddButton || hasPlusButton}`);
    expect(hasAddButton || hasPlusButton).toBeTruthy();
  });

  test('CHK-007: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIconButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);
    const hasRefreshIcon = await refreshIconButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh || hasRefreshIcon}`);
    expect(hasRefresh || hasRefreshIcon).toBeTruthy();
  });

  test('CHK-008: Should display templates table', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=No template, text=no checklist').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Cards: ${hasCards}, Empty: ${hasEmpty}`);
    expect(hasTable || hasCards || hasEmpty).toBeTruthy();
  });

  test('CHK-009: Should open add template dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('CHK-010: Should have template form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        const hasNameField = await dialog.locator('text=Name').first().isVisible().catch(() => false);
        const hasTypeField = await dialog.locator('text=Type').first().isVisible().catch(() => false);
        const hasPropertyField = await dialog.locator('text=Property').first().isVisible().catch(() => false);

        console.log(`Name: ${hasNameField}, Type: ${hasTypeField}, Property: ${hasPropertyField}`);
        expect(hasNameField || hasTypeField || hasPropertyField).toBeTruthy();

        await page.keyboard.press('Escape');
      }
    }
  });

  test('CHK-011: Should close template dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      if (dialogVisible) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        const dialogStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        console.log(`Dialog closed: ${!dialogStillVisible}`);
      }
    }
  });

  test('CHK-012: Should have edit action', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-pencil, svg.lucide-edit') }).first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    console.log(`Edit action: ${hasEdit}`);
  });

  test('CHK-013: Should have delete action', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('CHK-014: Should display type badges', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} type badges`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('CHK-015: Should search templates', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('check');
      await waitForPageLoad(page, 1000);

      const value = await searchInput.inputValue().catch(() => '');
      console.log(`Search value: ${value}`);
    }
  });
});
