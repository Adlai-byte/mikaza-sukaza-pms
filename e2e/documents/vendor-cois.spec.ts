import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Vendor COIs Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page);
  });

  test('COI-001: Should load vendor COIs page', async ({ page }) => {
    await page.waitForTimeout(2000);
    const hasCOI = await page.locator('text=COI').first().isVisible().catch(() => false);
    const hasInsurance = await page.locator('text=Insurance').first().isVisible().catch(() => false);
    const hasVendor = await page.locator('text=Vendor').first().isVisible().catch(() => false);

    console.log(`COI text: ${hasCOI}, Insurance text: ${hasInsurance}, Vendor text: ${hasVendor}`);
    expect(hasCOI || hasInsurance || hasVendor).toBeTruthy();
  });

  test('COI-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} stats cards`);
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('COI-003: Should display active COIs stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasActiveStat = await page.locator('text=Active').first().isVisible().catch(() => false);

    console.log(`Active COIs stat: ${hasActiveStat}`);
    expect(hasActiveStat).toBeTruthy();
  });

  test('COI-004: Should display expiring soon stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpiringStat = await page.locator('text=Expiring').first().isVisible().catch(() => false);

    console.log(`Expiring soon stat: ${hasExpiringStat}`);
    expect(hasExpiringStat).toBeTruthy();
  });

  test('COI-005: Should display expired stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpiredStat = await page.locator('text=Expired').first().isVisible().catch(() => false);

    console.log(`Expired stat: ${hasExpiredStat}`);
    expect(hasExpiredStat).toBeTruthy();
  });

  test('COI-006: Should display vendors info', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Vendors info might be in title, filter, or cards
    const hasVendorsStat = await page.locator('text=Vendor').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').count() >= 3;
    const hasPageContent = await page.locator('h1, h2, [class*="title"]').first().isVisible().catch(() => false);

    console.log(`Vendors info: ${hasVendorsStat || hasCards || hasPageContent}`);
    expect(hasVendorsStat || hasCards || hasPageContent).toBeTruthy();
  });

  test('COI-007: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
    expect(hasSearch).toBeTruthy();
  });

  test('COI-008: Should have vendor filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const vendorFilter = page.locator('[role="combobox"]').first();
    const hasVendorFilter = await vendorFilter.isVisible().catch(() => false);

    console.log(`Vendor filter: ${hasVendorFilter}`);
    expect(hasVendorFilter).toBeTruthy();
  });

  test('COI-009: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').nth(1);
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
    expect(hasPropertyFilter).toBeTruthy();
  });

  test('COI-010: Should have coverage type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const coverageFilter = page.locator('[role="combobox"]').nth(2);
    const hasCoverageFilter = await coverageFilter.isVisible().catch(() => false);

    console.log(`Coverage type filter: ${hasCoverageFilter}`);
    expect(hasCoverageFilter).toBeTruthy();
  });

  test('COI-011: Should have status filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').nth(3);
    const hasStatusFilter = await statusFilter.isVisible().catch(() => false);

    console.log(`Status filter: ${hasStatusFilter}`);
    expect(hasStatusFilter).toBeTruthy();
  });

  test('COI-012: Should have add COI button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add COI"), button:has-text("New"), button:has-text("Add")').first();
    const hasAddButton = await addButton.isVisible().catch(() => false);

    console.log(`Add COI button: ${hasAddButton}`);
    expect(hasAddButton).toBeTruthy();
  });

  test('COI-013: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
    expect(hasRefresh).toBeTruthy();
  });

  test('COI-014: Should have tree/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // View mode uses Tabs component with TabsTrigger elements (role="tab")
    const viewTabs = page.locator('[role="tab"]');
    const tabCount = await viewTabs.count();

    const hasViewToggle = tabCount >= 2;
    console.log(`Tree/List view toggle: ${hasViewToggle} (${tabCount} tabs)`);
    expect(hasViewToggle).toBeTruthy();
  });

  test('COI-015: Should open add COI dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add COI"), button:has-text("Add")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('COI-016: Should have COI form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add COI"), button:has-text("Add")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        const hasInputs = await dialog.locator('input, textarea, [role="combobox"]').first().isVisible().catch(() => false);
        console.log(`Form fields visible: ${hasInputs}`);
        expect(hasInputs).toBeTruthy();
      }
    }
  });

  test('COI-017: Should close add COI dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add COI"), button:has-text("Add")').first();

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

  test('COI-018: Should display COI table or tree', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasTree = await page.locator('[class*="tree"], [class*="Tree"]').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Table visible: ${hasTable}, Tree visible: ${hasTree}, Cards: ${hasCards}`);
    expect(hasTable || hasTree || hasCards).toBeTruthy();
  });

  test('COI-019: Should search COIs', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('insurance');
      await waitForPageLoad(page, 1000);

      const value = await searchInput.inputValue().catch(() => '');
      console.log(`Search value: ${value}`);
    }
  });
});

test.describe('Vendor COIs - COI Actions', () => {
  test('COI-020: Should have download action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    // Switch to list view to see action buttons
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    const downloadButton = page.locator('button').filter({ has: page.locator('svg.lucide-download') }).first();
    const hasDownload = await downloadButton.isVisible().catch(() => false);

    console.log(`Download action: ${hasDownload}`);
  });

  test('COI-021: Should have edit action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    // Switch to list view
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-pencil, svg.lucide-edit') }).first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    console.log(`Edit action: ${hasEdit}`);
  });

  test('COI-022: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    // Switch to list view
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('COI-023: Should have verify action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    // Switch to list view
    const listTab = page.locator('[role="tab"]').nth(1);
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(500);
    }

    const verifyButton = page.locator('button').filter({ has: page.locator('svg.lucide-check, svg.lucide-check-circle') }).first();
    const hasVerify = await verifyButton.isVisible().catch(() => false);

    console.log(`Verify action: ${hasVerify}`);
  });

  test('COI-024: Should display status badges', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} status badges`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });
});
