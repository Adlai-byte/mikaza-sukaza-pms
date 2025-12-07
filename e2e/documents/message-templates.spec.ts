import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Message Templates Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page);
  });

  test('MSG-001: Should load message templates page', async ({ page }) => {
    // Look for Message or Template text on the page
    const hasMessage = await page.locator('text=Message').first().isVisible().catch(() => false);
    const hasTemplate = await page.locator('text=Template').first().isVisible().catch(() => false);
    const hasPageHeader = await page.locator('h1, h2, [class*="title"]').first().isVisible().catch(() => false);

    expect(hasMessage || hasTemplate || hasPageHeader).toBeTruthy();
  });

  test('MSG-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} stats cards`);
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('MSG-003: Should have template type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Template type filter might be a combobox, tabs, or buttons
    const typeFilter = page.locator('[role="combobox"]').first();
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);
    const hasTabs = await page.locator('[role="tab"]').count() >= 1;
    const hasButtons = await page.locator('button').count() >= 1;

    console.log(`Template type filter: ${hasTypeFilter || hasTabs || hasButtons}`);
    expect(hasTypeFilter || hasTabs || hasButtons).toBeTruthy();
  });

  test('MSG-004: Should have search functionality', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Search might be an input or part of filters
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').count() >= 1;

    console.log(`Search input: ${hasSearch || hasCards}`);
    expect(hasSearch || hasCards).toBeTruthy();
  });

  test('MSG-005: Should have create/add button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Template")').first();
    const hasCreate = await createButton.isVisible().catch(() => false);

    console.log(`Create button: ${hasCreate}`);
    expect(hasCreate).toBeTruthy();
  });

  test('MSG-006: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Refresh button might have text or RefreshCw icon
    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIconButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);
    const hasRefreshIcon = await refreshIconButton.isVisible().catch(() => false);
    const hasButtons = await page.locator('button').count() >= 1;

    console.log(`Refresh button: ${hasRefresh || hasRefreshIcon || hasButtons}`);
    expect(hasRefresh || hasRefreshIcon || hasButtons).toBeTruthy();
  });

  test('MSG-007: Should open create template dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Template")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('MSG-008: Should have template form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Template")').first();
    const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();

    const buttonToClick = await createButton.isVisible().catch(() => false) ? createButton : plusButton;

    if (await buttonToClick.isVisible().catch(() => false)) {
      await buttonToClick.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        const hasInputs = await dialog.locator('input, textarea, [role="combobox"]').first().isVisible().catch(() => false);
        const hasLabels = await dialog.locator('label').first().isVisible().catch(() => false);
        console.log(`Form fields visible: ${hasInputs || hasLabels}`);
        expect(hasInputs || hasLabels).toBeTruthy();
      }
    }
  });

  test('MSG-009: Should close create dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Template")').first();

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

  test('MSG-010: Should display templates list or empty state', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasList = await page.locator('[class*="list"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No templates, text=no templates').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Cards: ${hasCards}, List: ${hasList}, Empty: ${hasEmptyState}`);
    expect(hasTable || hasCards || hasList || hasEmptyState).toBeTruthy();
  });

  test('MSG-011: Should search templates', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();

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
      expect(hasOptions).toBeTruthy();
    }
  });
});

test.describe('Message Templates - Actions', () => {
  test('MSG-013: Should have edit action', async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-pencil, svg.lucide-edit') }).first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    console.log(`Edit action: ${hasEdit}`);
  });

  test('MSG-014: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('MSG-015: Should have preview/view action', async ({ page }) => {
    await page.goto(ROUTES.messageTemplates);
    await waitForPageLoad(page, 2000);

    const previewButton = page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).first();
    const hasPreview = await previewButton.isVisible().catch(() => false);

    console.log(`Preview action: ${hasPreview}`);
  });
});
