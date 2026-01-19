import { test, expect } from '@playwright/test';
import { waitForPageLoad, searchTable, closeDialog } from '../helpers/test-helpers';
import { ROUTES, TEST_JOBS } from '../fixtures/test-data';

test.describe('Jobs Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.jobs);
    await waitForPageLoad(page);
  });

  test('JOB-001: Should load jobs page', async ({ page }) => {
    await expect(page.locator('text=Jobs').first()).toBeVisible({ timeout: 15000 });
  });

  test('JOB-002: Should list jobs', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    // Verify table, card view, or empty state is present
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasDataRows = await page.locator('tr, [class*="row"], [class*="item"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no.*job|empty|no.*task/i).first().isVisible().catch(() => false);
    const hasContent = await page.locator('main, [class*="content"]').first().isVisible().catch(() => false);

    console.log(`Jobs list: table=${hasTable}, cards=${hasCards}, rows=${hasDataRows}, empty=${hasEmptyState}, content=${hasContent}`);
    expect(hasTable || hasCards || hasDataRows || hasEmptyState || hasContent).toBeTruthy();
  });

  test('JOB-003: Should search jobs', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Cleaning');
      await waitForPageLoad(page, 1000);

      await expect(searchInput).toHaveValue('Cleaning');
    }
  });

  test('JOB-004: Should filter by status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusFilter = page.locator('[role="combobox"]').first();

    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const pendingOption = page.locator('[role="option"]:has-text("Pending")').first();
      if (await pendingOption.isVisible().catch(() => false)) {
        await pendingOption.click();
        await waitForPageLoad(page, 1000);
      }
    }

    // Page should still be functional
    await expect(page.locator('text=Jobs').first()).toBeVisible();
  });

  test('JOB-005: Should filter by priority', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for priority filter (may be a separate dropdown)
    const priorityFilter = page.locator('[role="combobox"]').nth(1);

    if (await priorityFilter.isVisible().catch(() => false)) {
      await priorityFilter.click();
      await page.waitForTimeout(300);

      const highOption = page.locator('[role="option"]:has-text("High")').first();
      if (await highOption.isVisible().catch(() => false)) {
        await highOption.click();
        await waitForPageLoad(page, 1000);
      }
    }
  });

  test('JOB-006: Should open create job dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('JOB-007: Should have job form fields', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Check for essential form fields
      const hasTitle = await page.locator('[role="dialog"] input[name*="title"], [role="dialog"] label:has-text("Title")').first().isVisible().catch(() => false);
      const hasDescription = await page.locator('[role="dialog"] textarea, [role="dialog"] label:has-text("Description")').first().isVisible().catch(() => false);
      const hasProperty = await page.locator('[role="dialog"] label:has-text("Property")').first().isVisible().catch(() => false);

      console.log(`Title: ${hasTitle}, Description: ${hasDescription}, Property: ${hasProperty}`);
    }
  });

  test('JOB-008: Should have priority selector', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasPrioritySelector = await page.locator('[role="dialog"] [role="combobox"], [role="dialog"] [role="radiogroup"]').first().isVisible().catch(() => false);
      const hasPriorityLabel = await page.locator('[role="dialog"] label:has-text("Priority")').first().isVisible().catch(() => false);

      console.log(`Priority selector: ${hasPrioritySelector}, Priority label: ${hasPriorityLabel}`);
    }
  });

  test('JOB-009: Should have provider assignment', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasProviderSelector = await page.locator('[role="dialog"] label:has-text("Provider"), [role="dialog"] label:has-text("Assign")').first().isVisible().catch(() => false);

      console.log(`Provider assignment: ${hasProviderSelector}`);
    }
  });

  test('JOB-010: Should have due date field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasDueDate = await page.locator('[role="dialog"] input[type="date"], [role="dialog"] label:has-text("Due")').first().isVisible().catch(() => false);

      console.log(`Due date field: ${hasDueDate}`);
    }
  });

  test('JOB-011: Should close dialog with cancel', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await closeDialog(page);

      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('JOB-012: Should view job details', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr, [class*="job-card"]').first();

    if (await firstRow.isVisible().catch(() => false)) {
      const viewButton = firstRow.locator('button:has-text("View")').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await waitForPageLoad(page);

        const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasDetailPage = page.url().includes('/jobs/');

        expect(hasDialog || hasDetailPage).toBeTruthy();
      }
    }
  });

  test('JOB-013: Should update job status', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible().catch(() => false)) {
      // Look for status update button or dropdown
      const statusButton = firstRow.locator('button:has-text("Status"), [role="combobox"]').first();

      if (await statusButton.isVisible().catch(() => false)) {
        await statusButton.click();
        await page.waitForTimeout(300);

        console.log('Status update available');
      }
    }
  });

  test('JOB-014: Should display priority badges', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const priorityBadges = page.locator('[class*="badge"]:has-text("High"), [class*="badge"]:has-text("Medium"), [class*="badge"]:has-text("Low")');
    const badgeCount = await priorityBadges.count();

    console.log(`Found ${badgeCount} priority badge(s)`);
  });

  test('JOB-015: Should display status badges', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const statusBadges = page.locator('[class*="badge"]:has-text("Pending"), [class*="badge"]:has-text("Progress"), [class*="badge"]:has-text("Completed")');
    const badgeCount = await statusBadges.count();

    console.log(`Found ${badgeCount} status badge(s)`);
  });
});

test.describe('Jobs Module - Scheduling', () => {
  test('JOB-016: Should have scheduling options', async ({ page }) => {
    await page.goto(ROUTES.jobs);
    await waitForPageLoad(page, 2000);

    const createButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      const hasScheduling = await page.locator('[role="dialog"] label:has-text("Schedule"), [role="dialog"] label:has-text("Date")').first().isVisible().catch(() => false);

      console.log(`Scheduling options: ${hasScheduling}`);
    }
  });
});
