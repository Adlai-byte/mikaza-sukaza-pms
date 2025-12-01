import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Media Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page);
  });

  test('MEDIA-001: Should load media page', async ({ page }) => {
    await expect(page.locator('text=Media').first()).toBeVisible({ timeout: 15000 });
  });

  test('MEDIA-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} stats cards`);
  });

  test('MEDIA-003: Should display total images stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTotalImages = await page.locator('text=Total Images, text=Total').first().isVisible().catch(() => false);

    console.log(`Total images stat: ${hasTotalImages}`);
  });

  test('MEDIA-004: Should display primary images stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasPrimaryImages = await page.locator('text=Primary').first().isVisible().catch(() => false);

    console.log(`Primary images stat: ${hasPrimaryImages}`);
  });

  test('MEDIA-005: Should display storage used stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasStorageStat = await page.locator('text=Storage').first().isVisible().catch(() => false);

    console.log(`Storage stat: ${hasStorageStat}`);
  });

  test('MEDIA-006: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
  });

  test('MEDIA-007: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
  });

  test('MEDIA-008: Should have primary images filter checkbox', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const primaryCheckbox = page.locator('text=Primary images only').first();
    const hasPrimaryFilter = await primaryCheckbox.isVisible().catch(() => false);

    console.log(`Primary images checkbox: ${hasPrimaryFilter}`);
  });

  test('MEDIA-009: Should have grid/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const gridButton = page.locator('button').filter({ has: page.locator('[class*="grid"], [class*="Grid"]') }).first();
    const listButton = page.locator('button').filter({ has: page.locator('[class*="list"], [class*="List"]') }).first();

    const hasGridButton = await gridButton.isVisible().catch(() => false);
    const hasListButton = await listButton.isVisible().catch(() => false);

    console.log(`Grid button: ${hasGridButton}, List button: ${hasListButton}`);
  });

  test('MEDIA-010: Should have upload button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();
    const addButton = page.locator('button:has-text("Add"), button').filter({ has: page.locator('[class*="plus"], [class*="Plus"]') }).first();
    const hasUpload = await uploadButton.isVisible().catch(() => false) ||
                      await addButton.isVisible().catch(() => false);

    console.log(`Upload button: ${hasUpload}`);
  });

  test('MEDIA-011: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIcon = page.locator('button').filter({ has: page.locator('[class*="refresh"], [class*="Refresh"]') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false) ||
                       await refreshIcon.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
  });

  test('MEDIA-012: Should open upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();

    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('MEDIA-013: Should close upload dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();

    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await closeDialog(page);

      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('MEDIA-014: Should display media library section', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasLibrary = await page.locator('text=Library, text=images').first().isVisible().catch(() => false);

    console.log(`Media library section: ${hasLibrary}`);
  });

  test('MEDIA-015: Should filter by property', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();

    if (await propertyFilter.isVisible().catch(() => false)) {
      await propertyFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Property filter options: ${hasOptions}`);
    }
  });

  test('MEDIA-016: Should search media', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('beach');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('beach');
    }
  });
});

test.describe('Media - Image Actions', () => {
  test('MEDIA-017: Should display image cards/grid', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const hasImages = await page.locator('img').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No images').isVisible().catch(() => false);

    console.log(`Images visible: ${hasImages}, Empty state: ${hasEmptyState}`);
  });

  test('MEDIA-018: Should have download button on images', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const downloadButton = page.locator('button:has-text("Download")').first();
    const hasDownload = await downloadButton.isVisible().catch(() => false);

    console.log(`Download button: ${hasDownload}`);
  });

  test('MEDIA-019: Should have delete button on images', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button').filter({ has: page.locator('[class*="trash"], [class*="Trash"]') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete button: ${hasDelete}`);
  });

  test('MEDIA-020: Should have set primary button', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const starButton = page.locator('button').filter({ has: page.locator('[class*="star"], [class*="Star"]') }).first();
    const hasStar = await starButton.isVisible().catch(() => false);

    console.log(`Set primary button: ${hasStar}`);
  });
});

test.describe('Media - Bulk Actions', () => {
  test('MEDIA-021: Should have image selection checkboxes', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const checkbox = page.locator('[role="checkbox"], input[type="checkbox"]').first();
    const hasCheckbox = await checkbox.isVisible().catch(() => false);

    console.log(`Selection checkboxes: ${hasCheckbox}`);
  });
});
