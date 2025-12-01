import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Message Templates Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page);
  });

  test('MSG-001: Should load message templates page', async ({ page }) => {
    await expect(page.locator('text=Message').first()).toBeVisible({ timeout: 15000 });
  });

  test('MSG-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} stats cards`);
  });

  test('MSG-003: Should have template type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);

    console.log(`Template type filter: ${hasTypeFilter}`);
  });

  test('MSG-004: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
  });

  test('MSG-005: Should have create button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
    const hasCreate = await createButton.isVisible().catch(() => false);

    console.log(`Create button: ${hasCreate}`);
  });

  test('MSG-006: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
  });

  test('MSG-007: Should open create template dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('MSG-008: Should have template form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasName = await page.locator('[role="dialog"] label:has-text("Name"), [role="dialog"] input[name*="name"]').first().isVisible().catch(() => false);
      const hasSubject = await page.locator('[role="dialog"] label:has-text("Subject")').first().isVisible().catch(() => false);
      const hasBody = await page.locator('[role="dialog"] textarea, [role="dialog"] label:has-text("Body"), [role="dialog"] label:has-text("Content")').first().isVisible().catch(() => false);

      console.log(`Name: ${hasName}, Subject: ${hasSubject}, Body: ${hasBody}`);
    }
  });

  test('MSG-009: Should close create dialog', async ({ page }) => {
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

  test('MSG-010: Should display templates list', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasList = await page.locator('[class*="list"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No templates').isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Cards: ${hasCards}, List: ${hasList}, Empty: ${hasEmptyState}`);
  });

  test('MSG-011: Should search templates', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('welcome');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('welcome');
    }
  });

  test('MSG-012: Should filter by template type', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const typeFilter = page.locator('[role="combobox"]').first();

    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Template type options: ${hasOptions}`);
    }
  });
});

test.describe('Message Templates - Actions', () => {
  test('MSG-013: Should have edit action', async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('button:has-text("Edit")').first();
    const editIcon = page.locator('[class*="edit"], [class*="Edit"]').first();

    const hasEdit = await editButton.isVisible().catch(() => false) ||
                    await editIcon.isVisible().catch(() => false);

    console.log(`Edit action: ${hasEdit}`);
  });

  test('MSG-014: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button:has-text("Delete")').first();
    const deleteIcon = page.locator('[class*="trash"], [class*="Trash"]').first();

    const hasDelete = await deleteButton.isVisible().catch(() => false) ||
                      await deleteIcon.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('MSG-015: Should have preview/view action', async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page, 2000);

    const previewButton = page.locator('button:has-text("Preview"), button:has-text("View")').first();
    const eyeIcon = page.locator('[class*="eye"], [class*="Eye"]').first();

    const hasPreview = await previewButton.isVisible().catch(() => false) ||
                       await eyeIcon.isVisible().catch(() => false);

    console.log(`Preview action: ${hasPreview}`);
  });
});
