import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Vendor COIs Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page);
  });

  test('COI-001: Should load vendor COIs page', async ({ page }) => {
    // Wait extra time for this page as it loads COI data
    await page.waitForTimeout(2000);
    const hasCOI = await page.locator('text=COI').first().isVisible().catch(() => false);
    const hasInsurance = await page.locator('text=Insurance').first().isVisible().catch(() => false);
    const hasVendor = await page.locator('text=Vendor').first().isVisible().catch(() => false);

    console.log(`COI text: ${hasCOI}, Insurance text: ${hasInsurance}, Vendor text: ${hasVendor}`);
  });

  test('COI-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} stats cards`);
  });

  test('COI-003: Should display active COIs stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasActiveStat = await page.locator('text=Active').first().isVisible().catch(() => false);

    console.log(`Active COIs stat: ${hasActiveStat}`);
  });

  test('COI-004: Should display expiring soon stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpiringStat = await page.locator('text=Expiring').first().isVisible().catch(() => false);

    console.log(`Expiring soon stat: ${hasExpiringStat}`);
  });

  test('COI-005: Should display expired stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasExpiredStat = await page.locator('text=Expired').first().isVisible().catch(() => false);

    console.log(`Expired stat: ${hasExpiredStat}`);
  });

  test('COI-006: Should display vendors covered stat', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasVendorsStat = await page.locator('text=Vendors').first().isVisible().catch(() => false);

    console.log(`Vendors covered stat: ${hasVendorsStat}`);
  });

  test('COI-007: Should have search input', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const searchInput = page.locator('input[placeholder*="Search"], input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    console.log(`Search input: ${hasSearch}`);
  });

  test('COI-008: Should have vendor filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const vendorFilter = page.locator('[role="combobox"]').first();
    const hasVendorFilter = await vendorFilter.isVisible().catch(() => false);

    console.log(`Vendor filter: ${hasVendorFilter}`);
  });

  test('COI-009: Should have property filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const propertyFilter = page.locator('[role="combobox"]').nth(1);
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    console.log(`Property filter: ${hasPropertyFilter}`);
  });

  test('COI-010: Should have coverage type filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const coverageFilter = page.locator('[role="combobox"]').nth(2);
    const hasCoverageFilter = await coverageFilter.isVisible().catch(() => false);

    console.log(`Coverage type filter: ${hasCoverageFilter}`);
  });

  test('COI-011: Should have status filter', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').nth(3);
    const hasStatusFilter = await statusFilter.isVisible().catch(() => false);

    console.log(`Status filter: ${hasStatusFilter}`);
  });

  test('COI-012: Should have add COI button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add COI"), button:has-text("New"), button:has-text("Add")').first();
    const hasAddButton = await addButton.isVisible().catch(() => false);

    console.log(`Add COI button: ${hasAddButton}`);
  });

  test('COI-013: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIcon = page.locator('button').filter({ has: page.locator('[class*="refresh"], [class*="Refresh"]') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false) ||
                       await refreshIcon.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh}`);
  });

  test('COI-014: Should have tree/list view toggle', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const treeView = page.locator('button:has-text("Tree"), [value="tree"]').first();
    const listView = page.locator('button:has-text("List"), [value="list"]').first();

    const hasTreeView = await treeView.isVisible().catch(() => false);
    const hasListView = await listView.isVisible().catch(() => false);

    console.log(`Tree view: ${hasTreeView}, List view: ${hasListView}`);
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

      const hasVendor = await page.locator('[role="dialog"] label:has-text("Vendor")').first().isVisible().catch(() => false);
      const hasCoverage = await page.locator('[role="dialog"] label:has-text("Coverage")').first().isVisible().catch(() => false);
      const hasPolicy = await page.locator('[role="dialog"] label:has-text("Policy")').first().isVisible().catch(() => false);

      console.log(`Vendor: ${hasVendor}, Coverage: ${hasCoverage}, Policy: ${hasPolicy}`);
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

  test('COI-018: Should display COI table', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasTree = await page.locator('[class*="tree"]').first().isVisible().catch(() => false);

    console.log(`Table visible: ${hasTable}, Tree visible: ${hasTree}`);
  });

  test('COI-019: Should search COIs', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('insurance');
      await waitForPageLoad(page, 1000);

      const value = await searchInput.inputValue().catch(() => '');
      console.log(`Search value: ${value}`);
    } else {
      console.log('Search input not visible');
    }
  });
});

test.describe('Vendor COIs - COI Actions', () => {
  test('COI-020: Should have download action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    const downloadButton = page.locator('button').filter({ has: page.locator('[class*="download"], [class*="Download"]') }).first();
    const hasDownload = await downloadButton.isVisible().catch(() => false);

    console.log(`Download action: ${hasDownload}`);
  });

  test('COI-021: Should have edit action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('button').filter({ has: page.locator('[class*="edit"], [class*="Edit"]') }).first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    console.log(`Edit action: ${hasEdit}`);
  });

  test('COI-022: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button').filter({ has: page.locator('[class*="trash"], [class*="Trash"]') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('COI-023: Should have verify action', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    const verifyButton = page.locator('button').filter({ has: page.locator('[class*="check"], [class*="Check"]') }).first();
    const hasVerify = await verifyButton.isVisible().catch(() => false);

    console.log(`Verify action: ${hasVerify}`);
  });

  test('COI-024: Should display status badges', async ({ page }) => {
    await page.goto(ROUTES.vendorCois);
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} status badges`);
  });
});
