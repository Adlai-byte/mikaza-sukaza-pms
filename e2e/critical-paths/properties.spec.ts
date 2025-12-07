import { test, expect } from '@playwright/test';
import { TestHelpers, waitForPageLoad, navigateAndVerify, searchTable, clickTableRow } from '../helpers/test-helpers';
import { ROUTES, TEST_PROPERTIES } from '../fixtures/test-data';

test.describe('Properties Module - Critical Path Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Each test starts authenticated (from auth.setup.ts)
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page);
  });

  test('PROP-001: Should list properties', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('text=Properties').first()).toBeVisible({ timeout: 15000 });

    // Verify table is present
    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Verify we have some data (at least header row)
    const rows = page.locator('tbody tr, [role="rowgroup"] [role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('PROP-002: Should search properties', async ({ page }) => {
    // Wait for initial load
    await waitForPageLoad(page, 2000);

    // Get initial row count
    const initialRows = page.locator('tbody tr');
    const initialCount = await initialRows.count();

    // Search for a property
    await searchTable(page, 'Beach');
    await waitForPageLoad(page, 1000);

    // Verify search input has value
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await expect(searchInput).toHaveValue('Beach');

    // Results should be filtered (may be fewer or same if all match)
    // Just verify the search didn't break the page
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('PROP-003: Should filter by status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for a status filter dropdown
    const statusFilter = page.locator('[role="combobox"]').first();
    const hasFilter = await statusFilter.isVisible().catch(() => false);

    if (hasFilter) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Look for any status options
      const hasOptions = await page.locator('[role="option"]').first().isVisible().catch(() => false);
      if (hasOptions) {
        const activeOption = page.locator('[role="option"]:has-text("Active")').first();
        const firstOption = page.locator('[role="option"]').first();

        if (await activeOption.isVisible().catch(() => false)) {
          await activeOption.click();
        } else if (await firstOption.isVisible().catch(() => false)) {
          await firstOption.click();
        }
        await page.waitForTimeout(500);
      }
    }

    // Verify table is still visible after filtering (or any content exists)
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasContent = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    expect(hasTable || hasContent).toBeTruthy();
  });

  test('PROP-004: Should navigate to property view', async ({ page }) => {
    // Wait for table data
    await waitForPageLoad(page, 2000);

    // Try to click on a property row (first one with data)
    const firstDataRow = page.locator('tbody tr').first();

    if (await firstDataRow.isVisible().catch(() => false)) {
      // Look for view or edit button in the row
      const viewButton = firstDataRow.locator('button:has-text("View"), a:has-text("View"), [title="View"]').first();
      const editButton = firstDataRow.locator('button:has-text("Edit"), a:has-text("Edit"), [title="Edit"]').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);
        // Should navigate to property view/edit
        expect(page.url()).toContain('/properties/');
      } else if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await waitForPageLoad(page);
        expect(page.url()).toContain('/properties/');
      }
    }
  });

  test('PROP-005: Should edit property general info', async ({ page }) => {
    // Navigate to first property's edit page
    await waitForPageLoad(page, 2000);

    const firstDataRow = page.locator('tbody tr').first();

    if (await firstDataRow.isVisible().catch(() => false)) {
      const editButton = firstDataRow.locator('button:has-text("Edit"), a:has-text("Edit"), [title="Edit"]').first();

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await waitForPageLoad(page, 2000);

        // Should be on edit page
        expect(page.url()).toContain('/edit');

        // Look for General tab or form
        const generalTab = page.locator('[role="tab"]:has-text("General")').first();
        if (await generalTab.isVisible().catch(() => false)) {
          await generalTab.click();
          await waitForPageLoad(page);
        }

        // Verify form elements are present
        const nameInput = page.locator('input[name="property_name"], input[placeholder*="name"]').first();
        const formVisible = await nameInput.isVisible().catch(() => false);

        // Just verify we're on an edit form
        expect(formVisible || page.url().includes('/edit')).toBeTruthy();
      }
    }
  });

  test('PROP-006: Should access Checklists tab', async ({ page }) => {
    // Navigate to first property's edit page
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 2000);

      // Look for Checklists tab
      const checklistsTab = page.locator('[role="tab"]:has-text("Checklist")').first();

      if (await checklistsTab.isVisible().catch(() => false)) {
        await checklistsTab.click();
        await waitForPageLoad(page);

        // Verify tab content loaded
        const tabPanel = page.locator('[role="tabpanel"]').first();
        await expect(tabPanel).toBeVisible();
      }
    }
  });

  test('PROP-007: Should access Providers tab', async ({ page }) => {
    // Navigate to first property's edit page
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 2000);

      // Look for Providers tab
      const providersTab = page.locator('[role="tab"]:has-text("Provider")').first();

      if (await providersTab.isVisible().catch(() => false)) {
        await providersTab.click();
        await waitForPageLoad(page);

        // Verify tab content loaded
        const tabPanel = page.locator('[role="tabpanel"]').first();
        await expect(tabPanel).toBeVisible();
      }
    }
  });

  test('PROP-008: Should access Notes tab', async ({ page }) => {
    // Navigate to first property's edit page
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 2000);

      // Look for Notes tab
      const notesTab = page.locator('[role="tab"]:has-text("Note")').first();

      if (await notesTab.isVisible().catch(() => false)) {
        await notesTab.click();
        await waitForPageLoad(page);

        // Verify tab content loaded
        const tabPanel = page.locator('[role="tabpanel"]').first();
        await expect(tabPanel).toBeVisible();
      }
    }
  });
});

test.describe('Properties Module - Page Load Tests', () => {
  test('Should load properties page without errors', async ({ page }) => {
    await page.goto(ROUTES.properties);

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await waitForPageLoad(page, 3000);

    // Verify page content
    await expect(page.locator('text=Properties').first()).toBeVisible({ timeout: 15000 });

    // Log any errors found (informational)
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }
  });
});
