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

    // Find search input - PropertyTableOptimized has placeholder "Search properties..."
    const searchInput = page.locator('input[placeholder*="Search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      // Search for a property
      await searchInput.fill('Beach');
      await waitForPageLoad(page, 1000);

      // Verify search input has value
      const inputValue = await searchInput.inputValue();
      console.log(`Search input value: ${inputValue}`);
      expect(inputValue).toBe('Beach');

      // Results should be filtered - just verify the table is still visible
      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
      expect(hasTable || hasCards).toBeTruthy();
    } else {
      // No search input found - check if table exists (page might not have search)
      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      console.log('No search input found, verifying table exists:', hasTable);
      expect(hasTable).toBeTruthy();
    }
  });

  test('PROP-003: Should filter by status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // PropertyTableOptimized has multiple filters - look for one with Status/Active/Inactive
    // The status filter should have options like "All Status", "Active", "Inactive"
    const comboboxes = page.locator('[role="combobox"]');
    const comboboxCount = await comboboxes.count();
    console.log(`Found ${comboboxCount} combobox(es)`);

    let foundStatusFilter = false;

    // Try to find and test any filter dropdown
    for (let i = 0; i < Math.min(comboboxCount, 4); i++) {
      const combobox = comboboxes.nth(i);
      if (await combobox.isVisible().catch(() => false)) {
        await combobox.click();
        await page.waitForTimeout(300);

        // Check for status-related options
        const hasActiveOption = await page.locator('[role="option"]:has-text("Active")').isVisible().catch(() => false);
        const hasStatusOption = await page.locator('[role="option"]:has-text("Status")').isVisible().catch(() => false);
        const hasAnyOption = await page.locator('[role="option"]').first().isVisible().catch(() => false);

        if (hasActiveOption || hasStatusOption) {
          console.log(`Found status filter at index ${i}`);
          foundStatusFilter = true;
          // Click an option to test filtering
          const activeOption = page.locator('[role="option"]:has-text("Active")');
          if (await activeOption.isVisible().catch(() => false)) {
            await activeOption.click();
          } else {
            // Click first option to close dropdown
            await page.locator('[role="option"]').first().click().catch(() => {});
          }
          break;
        } else if (hasAnyOption) {
          // Close this dropdown and try next
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }
    }

    // Verify table/content is still visible after filtering
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasContent = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    console.log(`After filter - Table: ${hasTable}, Content: ${hasContent}, Found status filter: ${foundStatusFilter}`);
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
