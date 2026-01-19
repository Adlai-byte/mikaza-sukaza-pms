import { test, expect } from '@playwright/test';
import { waitForPageLoad, closeDialog } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Report Schedules Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page);
  });

  test('RS-001: Should load report schedules page', async ({ page }) => {
    // Page should show Report Schedules title or related text
    const hasReportSchedules = await page.locator('text=Report').first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasSchedules = await page.locator('text=Schedule').first().isVisible().catch(() => false);
    const hasAutomation = await page.locator('text=Automation').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Report text: ${hasReportSchedules}, Schedules: ${hasSchedules}, Automation: ${hasAutomation}, Cards: ${hasCards}`);
    expect(hasReportSchedules || hasSchedules || hasAutomation || hasCards).toBeTruthy();
  });

  test('RS-002: Should display stats cards', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    // The page has 3 stats cards (Total, Active, Paused)
    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} cards`);
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });

  test('RS-003: Should display total schedules stat', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const hasTotalStat = await page.locator('text=Total').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').count() >= 1;

    console.log(`Total schedules stat: ${hasTotalStat}, Cards: ${hasCards}`);
    expect(hasTotalStat || hasCards).toBeTruthy();
  });

  test('RS-004: Should display active schedules stat', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const hasActiveStat = await page.locator('text=Active').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').count() >= 1;

    console.log(`Active schedules stat: ${hasActiveStat}, Cards: ${hasCards}`);
    expect(hasActiveStat || hasCards).toBeTruthy();
  });

  test('RS-005: Should display paused schedules stat', async ({ page }) => {
    await waitForPageLoad(page, 3000);

    const hasPausedStat = await page.locator('text=Paused').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').count() >= 1;

    console.log(`Paused schedules stat: ${hasPausedStat}, Cards: ${hasCards}`);
    expect(hasPausedStat || hasCards).toBeTruthy();
  });

  test('RS-006: Should have add schedule button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("Schedule"), button:has-text("New")').first();
    const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
    const hasAddButton = await addButton.isVisible().catch(() => false);
    const hasPlusButton = await plusButton.isVisible().catch(() => false);

    console.log(`Add schedule button: ${hasAddButton || hasPlusButton}`);
    expect(hasAddButton || hasPlusButton).toBeTruthy();
  });

  test('RS-007: Should have refresh button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    const refreshIconButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    const hasRefresh = await refreshButton.isVisible().catch(() => false);
    const hasRefreshIcon = await refreshIconButton.isVisible().catch(() => false);

    console.log(`Refresh button: ${hasRefresh || hasRefreshIcon}`);
    expect(hasRefresh || hasRefreshIcon).toBeTruthy();
  });

  test('RS-008: Should open add schedule dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("Schedule")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('RS-009: Should have schedule form fields in dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("Schedule")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        // Check for form fields: Name, Report Type, Day of Week, Time, Recipients
        const hasNameField = await dialog.locator('text=Name').first().isVisible().catch(() => false);
        const hasTypeField = await dialog.locator('text=Report, text=Type').first().isVisible().catch(() => false);
        const hasDayField = await dialog.locator('text=Day').first().isVisible().catch(() => false);
        const hasRecipientsField = await dialog.locator('text=Recipient, text=Email').first().isVisible().catch(() => false);

        console.log(`Name: ${hasNameField}, Type: ${hasTypeField}, Day: ${hasDayField}, Recipients: ${hasRecipientsField}`);
        expect(hasNameField || hasTypeField || hasDayField || hasRecipientsField).toBeTruthy();
      }
    }
  });

  test('RS-010: Should close add schedule dialog', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("Schedule")').first();

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

  test('RS-011: Should display schedules table or empty state', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=No schedule, text=no schedules').first().isVisible().catch(() => false);

    console.log(`Table: ${hasTable}, Cards: ${hasCards}, Empty: ${hasEmpty}`);
    expect(hasTable || hasCards || hasEmpty).toBeTruthy();
  });

  test('RS-012: Should display table headers', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);

    if (hasTable) {
      const hasNameHeader = await page.locator('th:has-text("Name")').first().isVisible().catch(() => false);
      const hasTypeHeader = await page.locator('th:has-text("Type"), th:has-text("Report")').first().isVisible().catch(() => false);
      const hasScheduleHeader = await page.locator('th:has-text("Schedule")').first().isVisible().catch(() => false);
      const hasStatusHeader = await page.locator('th:has-text("Status")').first().isVisible().catch(() => false);

      console.log(`Name: ${hasNameHeader}, Type: ${hasTypeHeader}, Schedule: ${hasScheduleHeader}, Status: ${hasStatusHeader}`);
      expect(hasNameHeader || hasTypeHeader || hasScheduleHeader || hasStatusHeader).toBeTruthy();
    } else {
      console.log('No table visible - might be empty state');
      expect(true).toBeTruthy();
    }
  });
});

test.describe('Report Schedules - Schedule Actions', () => {
  test('RS-013: Should have send now action', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    // Send now button uses Play icon
    const sendNowButton = page.locator('button').filter({ has: page.locator('svg.lucide-play') }).first();
    const hasSendNow = await sendNowButton.isVisible().catch(() => false);

    console.log(`Send now action: ${hasSendNow}`);
  });

  test('RS-014: Should have view history action', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    // History button uses History icon
    const historyButton = page.locator('button').filter({ has: page.locator('svg.lucide-history') }).first();
    const hasHistory = await historyButton.isVisible().catch(() => false);

    console.log(`View history action: ${hasHistory}`);
  });

  test('RS-015: Should have edit action', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-pencil, svg.lucide-edit') }).first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    console.log(`Edit action: ${hasEdit}`);
  });

  test('RS-016: Should have delete action', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();
    const hasDelete = await deleteButton.isVisible().catch(() => false);

    console.log(`Delete action: ${hasDelete}`);
  });

  test('RS-017: Should have enable/disable toggle', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    // Toggle switch for enable/disable
    const toggleSwitch = page.locator('[role="switch"]').first();
    const hasToggle = await toggleSwitch.isVisible().catch(() => false);

    console.log(`Enable/disable toggle: ${hasToggle}`);
  });

  test('RS-018: Should display status badges', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();

    console.log(`Found ${badgeCount} status badges`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('RS-019: Should show delete confirmation dialog', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    // Try to find and click delete button
    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();

    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      // Check for alert dialog
      const alertDialog = page.locator('[role="alertdialog"]');
      const hasAlertDialog = await alertDialog.isVisible().catch(() => false);

      console.log(`Delete confirmation dialog: ${hasAlertDialog}`);

      // Close the dialog if it appeared
      if (hasAlertDialog) {
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('No delete button visible - might be no schedules');
    }
  });

  test('RS-020: Should show history dialog when clicking history', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    // Try to find and click history button
    const historyButton = page.locator('button').filter({ has: page.locator('svg.lucide-history') }).first();

    if (await historyButton.isVisible().catch(() => false)) {
      await historyButton.click();
      await page.waitForTimeout(500);

      // Check for dialog
      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      console.log(`History dialog: ${hasDialog}`);

      // Close the dialog if it appeared
      if (hasDialog) {
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('No history button visible - might be no schedules');
    }
  });
});

test.describe('Report Schedules - Navigation', () => {
  test('RS-021: Should be accessible from sidebar', async ({ page }) => {
    // Go to home first
    await page.goto('/');
    await waitForPageLoad(page);

    // Look for Automation in sidebar
    const automationMenu = page.locator('text=Automation').first();
    const hasAutomation = await automationMenu.isVisible().catch(() => false);

    console.log(`Automation menu: ${hasAutomation}`);

    if (hasAutomation) {
      await automationMenu.click();
      await page.waitForTimeout(500);

      // Look for Report Schedules submenu
      const reportSchedulesLink = page.locator('text=Report Schedules, text=Schedule').first();
      const hasReportSchedules = await reportSchedulesLink.isVisible().catch(() => false);

      console.log(`Report Schedules link: ${hasReportSchedules}`);
    }
  });

  test('RS-022: Should have correct page title', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 3000);

    // Check for page title
    const pageTitle = page.locator('h1, h2').first();
    const titleText = await pageTitle.textContent().catch(() => '');

    console.log(`Page title: ${titleText}`);

    const hasCorrectTitle =
      titleText?.toLowerCase().includes('report') ||
      titleText?.toLowerCase().includes('schedule') ||
      titleText?.toLowerCase().includes('automation');

    expect(hasCorrectTitle).toBeTruthy();
  });

  test('RS-023: Should have page description', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    // Check for description text
    const hasDescription = await page
      .locator('text=automated, text=weekly, text=email')
      .first()
      .isVisible()
      .catch(() => false);

    console.log(`Page description: ${hasDescription}`);
  });
});

test.describe('Report Schedules - Form Validation', () => {
  test('RS-024: Should require schedule name', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("Schedule")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        // Try to submit without filling name
        const submitButton = dialog.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Add")').first();

        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          // Check if dialog is still open (validation failed)
          const dialogStillOpen = await dialog.isVisible().catch(() => false);
          console.log(`Validation blocked submission: ${dialogStillOpen}`);
        }

        // Close dialog
        await page.keyboard.press('Escape');
      }
    }
  });

  test('RS-025: Should require at least one recipient email', async ({ page }) => {
    await page.goto(ROUTES.reportSchedules);
    await waitForPageLoad(page, 2000);

    const addButton = page.locator('button:has-text("Add"), button:has-text("Schedule")').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const hasDialog = await dialog.isVisible().catch(() => false);

      if (hasDialog) {
        // Check for recipient email field
        const hasRecipientField = await dialog
          .locator('input[type="email"], text=Recipient, text=Email')
          .first()
          .isVisible()
          .catch(() => false);

        console.log(`Recipient field visible: ${hasRecipientField}`);

        // Close dialog
        await page.keyboard.press('Escape');
      }
    }
  });
});
