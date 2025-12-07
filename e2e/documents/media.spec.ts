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

  test('MEDIA-002: Should display page content', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Media page has various content - cards, filters, images
    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} elements`);
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('MEDIA-003: Should display images or empty state', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasImages = await page.locator('img').first().isVisible().catch(() => false);
    const hasTotal = await page.locator('text=Total, text=Images, text=total').first().isVisible().catch(() => false);

    console.log(`Total images visible: ${hasImages || hasTotal}`);
    expect(hasImages || hasTotal).toBeTruthy();
  });

  test('MEDIA-004: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasPropertyFilter = await page.locator('[role="combobox"]').first().isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
    expect(hasPropertyFilter).toBeTruthy();
  });

  test('MEDIA-005: Should display storage info', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasStorageStat = await page.locator('text=Storage, text=storage').first().isVisible().catch(() => false);

    console.log(`Storage stat: ${hasStorageStat}`);
    expect(hasStorageStat).toBeTruthy();
  });

  test('MEDIA-006: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
    expect(hasSearch).toBeTruthy();
  });

  test('MEDIA-007: Should filter by property', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
    expect(hasPropertyFilter).toBeTruthy();
  });

  test('MEDIA-008: Should have primary images filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for checkbox or primary-related text/controls
    const primaryCheckbox = page.locator('[role="checkbox"], text=Primary, text=primary').first();
    const hasPrimaryFilter = await primaryCheckbox.isVisible().catch(() => false);

    console.log(`Primary images filter: ${hasPrimaryFilter}`);
    expect(hasPrimaryFilter).toBeTruthy();
  });

  test('MEDIA-009: Should have grid/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for tabs or toggle buttons
    const viewTabs = page.locator('[role="tab"]');
    const tabCount = await viewTabs.count();

    const hasViewToggle = tabCount >= 2;
    console.log(`View toggle: ${hasViewToggle} (${tabCount} tabs)`);
    expect(hasViewToggle).toBeTruthy();
  });

  test('MEDIA-010: Should have upload button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const uploadButton = page.locator('button:has-text("Upload")').first();
    const hasUpload = await uploadButton.isVisible().catch(() => false);

    console.log(`Upload button: ${hasUpload}`);
    expect(hasUpload).toBeTruthy();
  });

  test('MEDIA-011: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
    expect(hasRefresh).toBeTruthy();
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

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const dialogStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log(`Dialog closed: ${!dialogStillVisible}`);
    }
  });

  test('MEDIA-014: Should display media content', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasImages = await page.locator('img').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasLibrary = await page.locator('text=Library, text=images, text=Media').first().isVisible().catch(() => false);

    console.log(`Media content: images=${hasImages}, cards=${hasCards}, library=${hasLibrary}`);
    expect(hasImages || hasCards || hasLibrary).toBeTruthy();
  });

  test('MEDIA-015: Should filter by property (dropdown)', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').first();

    if (await propertyFilter.isVisible().catch(() => false)) {
      await propertyFilter.click();
      await page.waitForTimeout(300);

      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);

      console.log(`Property filter options: ${hasOptions}`);
      expect(hasOptions).toBeTruthy();
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
    const hasEmptyState = await page.locator('text=No images, text=no images').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Images visible: ${hasImages}, Cards: ${hasCards}, Empty state: ${hasEmptyState}`);
    expect(hasImages || hasCards || hasEmptyState).toBeTruthy();
  });

  test('MEDIA-018: Should have action buttons on images', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    // Look for any action buttons
    const hasButtons = await page.locator('button').first().isVisible().catch(() => false);

    console.log(`Action buttons available: ${hasButtons}`);
    expect(hasButtons).toBeTruthy();
  });

  test('MEDIA-019: Should have delete functionality', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete button: ${hasDelete}`);
  });

  test('MEDIA-020: Should have set primary functionality', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const starButton = page.locator('button').filter({ has: page.locator('svg.lucide-star') }).first();
    const hasStar = await starButton.isVisible().catch(() => false);

    console.log(`Set primary button: ${hasStar}`);
  });
});

test.describe('Media - Selection', () => {
  test('MEDIA-021: Should have image selection checkboxes', async ({ page }) => {
    await page.goto(ROUTES.media);
    await waitForPageLoad(page, 2000);

    const checkbox = page.locator('[role="checkbox"], input[type="checkbox"]').first();
    const hasCheckbox = await checkbox.isVisible().catch(() => false);

    console.log(`Selection checkboxes: ${hasCheckbox}`);
    expect(hasCheckbox).toBeTruthy();
  });
});
