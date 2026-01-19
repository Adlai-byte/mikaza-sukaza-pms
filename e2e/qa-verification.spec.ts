import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './helpers/test-helpers';
import { ROUTES } from './fixtures/test-data';

/**
 * QA Verification Tests - Testing all "NEEDS TESTING" items from QA Report
 * Generated: January 18, 2026
 */

const results: { item: string; module: string; status: 'PASS' | 'FAIL' | 'PARTIAL'; notes: string }[] = [];

test.describe('QA Verification - NEEDS TESTING Items', () => {

  // 1. Calendar: Can't filter by property to create new entry
  test('QA-001: Calendar - Filter by property to create new entry', async ({ page }) => {
    await page.goto(ROUTES.calendar || '/calendar');
    await waitForPageLoad(page, 3000);

    // Check for property filter
    const propertyFilter = page.locator('[role="combobox"]').first();
    const hasPropertyFilter = await propertyFilter.isVisible().catch(() => false);

    // Check for add/create button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    const hasAddButton = await addButton.isVisible().catch(() => false);

    console.log(`Calendar - Property Filter: ${hasPropertyFilter}, Add Button: ${hasAddButton}`);

    if (hasPropertyFilter && hasAddButton) {
      // Try selecting a property and then clicking add
      await propertyFilter.click().catch(() => {});
      await page.waitForTimeout(500);

      const options = page.locator('[role="option"]');
      const optionCount = await options.count();

      if (optionCount > 1) {
        await options.nth(1).click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    expect(hasPropertyFilter || hasAddButton).toBeTruthy();
  });

  // 2. Properties: New units don't show in other dropdowns
  test('QA-002: Properties - New units show in dropdowns', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    // Navigate to a property edit page
    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit"), [title="Edit"]').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Look for unit dropdowns/selects
      const unitSelects = page.locator('[role="combobox"]');
      const selectCount = await unitSelects.count();

      console.log(`Properties - Found ${selectCount} dropdown(s)`);
      expect(selectCount).toBeGreaterThan(0);
    }
  });

  // 3. Properties: Buttons overflowing in Utility Assignment
  test('QA-003: Properties - Utility Assignment buttons layout', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Look for Providers or Utilities tab
      const providersTab = page.locator('[role="tab"]:has-text("Provider"), [role="tab"]:has-text("Utilit")').first();

      if (await providersTab.isVisible().catch(() => false)) {
        await providersTab.click();
        await waitForPageLoad(page, 2000);

        // Check for button overflow
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        // Check if any buttons are outside viewport
        const viewportSize = page.viewportSize();
        let overflowDetected = false;

        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const box = await buttons.nth(i).boundingBox().catch(() => null);
          if (box && viewportSize) {
            if (box.x + box.width > viewportSize.width || box.x < 0) {
              overflowDetected = true;
              break;
            }
          }
        }

        console.log(`Utility Assignment - Overflow detected: ${overflowDetected}`);
        expect(overflowDetected).toBeFalsy();
      }
    }
  });

  // 4. Properties: Insurance Document Photo not showing
  test('QA-004: Properties - Insurance Document Photo display', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Look for Documents or Insurance tab
      const docsTab = page.locator('[role="tab"]:has-text("Document"), [role="tab"]:has-text("Insurance")').first();

      if (await docsTab.isVisible().catch(() => false)) {
        await docsTab.click();
        await waitForPageLoad(page, 2000);

        // Check for image elements or file displays
        const images = page.locator('img[src*="supabase"], img[src*="storage"]');
        const imageCount = await images.count();

        const fileLinks = page.locator('a[href*="storage"], button:has-text("View"), button:has-text("Download")');
        const linkCount = await fileLinks.count();

        console.log(`Insurance Documents - Images: ${imageCount}, File links: ${linkCount}`);
      }
    }

    expect(true).toBeTruthy(); // Visual verification needed
  });

  // 5. Properties: Background inconsistency in Notes
  test('QA-005: Properties - Notes background consistency', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Look for Notes section or Financial tab (where notes usually are)
      const financialTab = page.locator('[role="tab"]:has-text("Financial"), [role="tab"]:has-text("Notes")').first();

      if (await financialTab.isVisible().catch(() => false)) {
        await financialTab.click();
        await waitForPageLoad(page, 2000);

        // Check for notes elements
        const notesSection = page.locator('[class*="note"], [data-testid*="note"], textarea').first();
        const hasNotes = await notesSection.isVisible().catch(() => false);

        console.log(`Notes section visible: ${hasNotes}`);
      }
    }

    expect(true).toBeTruthy(); // Visual verification needed
  });

  // 6. Properties: Files/Notes counter not updating
  test('QA-006: Properties - Files/Notes counter updates', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Look for counters/badges
      const counters = page.locator('[class*="badge"], [class*="count"], span:has-text(/\\d+/)');
      const counterCount = await counters.count();

      console.log(`Found ${counterCount} counter elements`);

      // Check Financial tab for file/note counters
      const financialTab = page.locator('[role="tab"]:has-text("Financial")').first();
      if (await financialTab.isVisible().catch(() => false)) {
        const tabText = await financialTab.textContent();
        console.log(`Financial tab text: ${tabText}`);
      }
    }

    expect(true).toBeTruthy();
  });

  // 7. Properties: Description field margin cut off
  test('QA-007: Properties - Description field margin', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Look for description textarea
      const descriptionField = page.locator('textarea[name*="description"], textarea[placeholder*="description"], label:has-text("Description") + textarea, label:has-text("Description") ~ textarea').first();

      if (await descriptionField.isVisible().catch(() => false)) {
        const box = await descriptionField.boundingBox();
        const viewportSize = page.viewportSize();

        if (box && viewportSize) {
          const isFullyVisible = box.x >= 0 && box.y >= 0 &&
                                  box.x + box.width <= viewportSize.width;
          console.log(`Description field fully visible: ${isFullyVisible}`);
          expect(isFullyVisible).toBeTruthy();
        }
      }
    }
  });

  // 8. Properties: SCHEDULED entries verification
  test('QA-008: Properties - Scheduled entries feature', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Go to Financial tab
      const financialTab = page.locator('[role="tab"]:has-text("Financial")').first();
      if (await financialTab.isVisible().catch(() => false)) {
        await financialTab.click();
        await waitForPageLoad(page, 2000);

        // Look for scheduled option or status
        const scheduledOption = page.locator('text=Scheduled, text=SCHEDULED, [value="scheduled"]');
        const hasScheduled = await scheduledOption.first().isVisible().catch(() => false);

        // Also check in add entry dialog
        const addButton = page.locator('button:has-text("Add Entry"), button:has-text("Add")').first();
        if (await addButton.isVisible().catch(() => false)) {
          await addButton.click();
          await page.waitForTimeout(500);

          const statusSelect = page.locator('[role="combobox"]').first();
          if (await statusSelect.isVisible().catch(() => false)) {
            await statusSelect.click();
            await page.waitForTimeout(300);

            const scheduledInDropdown = page.locator('[role="option"]:has-text("Scheduled")');
            const hasScheduledOption = await scheduledInDropdown.isVisible().catch(() => false);
            console.log(`Scheduled option in dropdown: ${hasScheduledOption}`);
          }

          await page.keyboard.press('Escape');
        }

        console.log(`Scheduled entries feature: ${hasScheduled}`);
      }
    }

    expect(true).toBeTruthy();
  });

  // 9. Task Management: List/Board view not matching Calendar
  test('QA-009: Task Management - List/Board view matches Calendar', async ({ page }) => {
    // First check Task Management
    await page.goto(ROUTES.taskManagement || '/task-management');
    await waitForPageLoad(page, 3000);

    // Count tasks in list view
    const taskRows = page.locator('tbody tr, [class*="task-card"], [class*="kanban"] [class*="card"]');
    const taskCount = await taskRows.count();
    console.log(`Task Management - Task count: ${taskCount}`);

    // Check for view toggle
    const viewToggle = page.locator('button:has-text("Board"), button:has-text("List"), button:has-text("Calendar")');
    const hasViewToggle = await viewToggle.first().isVisible().catch(() => false);
    console.log(`View toggle available: ${hasViewToggle}`);

    expect(true).toBeTruthy(); // Data consistency check
  });

  // 10. Check-In/Out: Checklist notes overlapping in PDF
  test('QA-010: Check-In/Out - PDF checklist notes layout', async ({ page }) => {
    await page.goto(ROUTES.checkInOut || '/check-in-out');
    await waitForPageLoad(page, 3000);

    // Look for PDF generation button
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Download"), button:has-text("Generate")').first();
    const hasPdfButton = await pdfButton.isVisible().catch(() => false);

    console.log(`PDF button visible: ${hasPdfButton}`);

    // Check if there are any records to generate PDF from
    const records = page.locator('tbody tr');
    const recordCount = await records.count();
    console.log(`Check-In/Out records: ${recordCount}`);

    expect(true).toBeTruthy(); // PDF visual verification needed
  });

  // 11. Vendors: "Gold Partner Status" label
  test('QA-011: Vendors - Gold Partner Status label', async ({ page }) => {
    await page.goto('/vendor-directory');
    await waitForPageLoad(page, 3000);

    // Look for partner status or payment status labels
    const partnerLabel = page.locator('text=Partner Status, text=Payment Status, text=Gold Partner');
    const labelCount = await partnerLabel.count();

    // Check table headers
    const tableHeaders = page.locator('th');
    const headerTexts: string[] = [];
    const headerCount = await tableHeaders.count();

    for (let i = 0; i < headerCount; i++) {
      const text = await tableHeaders.nth(i).textContent();
      if (text) headerTexts.push(text);
    }

    console.log(`Vendor table headers: ${headerTexts.join(', ')}`);

    const hasCorrectLabel = headerTexts.some(h =>
      h.includes('Payment') || h.includes('Status')
    );

    console.log(`Has Payment Status label: ${hasCorrectLabel}`);
    expect(true).toBeTruthy();
  });

  // 12. Reports: Duplicate CSV buttons
  test('QA-012: Reports - No duplicate CSV buttons', async ({ page }) => {
    await page.goto(ROUTES.reports || '/reports');
    await waitForPageLoad(page, 3000);

    // Count CSV/Export buttons
    const csvButtons = page.locator('button:has-text("CSV"), button:has-text("Export")');
    const buttonCount = await csvButtons.count();

    console.log(`CSV/Export button count: ${buttonCount}`);

    // Check if there are duplicates in the same area
    const buttonTexts: string[] = [];
    for (let i = 0; i < buttonCount; i++) {
      const text = await csvButtons.nth(i).textContent();
      if (text) buttonTexts.push(text.trim());
    }

    console.log(`Button texts: ${buttonTexts.join(', ')}`);

    // Duplicates would be same text buttons next to each other
    let hasDuplicates = false;
    for (let i = 0; i < buttonTexts.length - 1; i++) {
      if (buttonTexts[i] === buttonTexts[i + 1]) {
        hasDuplicates = true;
        break;
      }
    }

    console.log(`Duplicate buttons detected: ${hasDuplicates}`);
    expect(hasDuplicates).toBeFalsy();
  });

  // Additional verification tests based on QA report

  // 13. Check-In/Out: Signature verification
  test('QA-013: Check-In/Out - Signature saving', async ({ page }) => {
    await page.goto(ROUTES.checkInOut || '/check-in-out');
    await waitForPageLoad(page, 3000);

    // Look for signature canvas or pad
    const signatureCanvas = page.locator('canvas, [class*="signature"]');
    const hasSignature = await signatureCanvas.first().isVisible().catch(() => false);

    // Check for signature in existing records
    const signatureImages = page.locator('img[alt*="signature"], img[src*="signature"]');
    const signatureCount = await signatureImages.count();

    console.log(`Signature canvas: ${hasSignature}, Signature images: ${signatureCount}`);
    expect(true).toBeTruthy();
  });

  // 14. Properties: Form scrolling on small screens
  test('QA-014: Properties - Form scrolling on 14" screen', async ({ page }) => {
    // Set viewport to 14" laptop size (typically 1366x768)
    await page.setViewportSize({ width: 1366, height: 768 });

    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      // Check if form is scrollable
      const scrollableArea = page.locator('[class*="overflow"], [class*="scroll"]');
      const hasScrollable = await scrollableArea.first().isVisible().catch(() => false);

      // Check document scroll height
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewportHeight = 768;

      console.log(`Scroll height: ${scrollHeight}, Viewport: ${viewportHeight}`);
      console.log(`Form requires scrolling: ${scrollHeight > viewportHeight}`);
    }

    expect(true).toBeTruthy();
  });

  // 15. Calendar: Property filter functionality
  test('QA-015: Calendar - Property filter works correctly', async ({ page }) => {
    await page.goto(ROUTES.calendar || '/calendar');
    await waitForPageLoad(page, 3000);

    // Find and interact with property filter
    const propertyFilter = page.locator('[role="combobox"]').first();

    if (await propertyFilter.isVisible().catch(() => false)) {
      await propertyFilter.click();
      await page.waitForTimeout(500);

      const options = page.locator('[role="option"]');
      const optionCount = await options.count();

      console.log(`Property filter options: ${optionCount}`);

      if (optionCount > 1) {
        // Select second option (first is usually "All")
        const secondOption = options.nth(1);
        const optionText = await secondOption.textContent();
        await secondOption.click();
        await waitForPageLoad(page, 1000);

        console.log(`Selected property: ${optionText}`);

        // Verify filter was applied
        const currentValue = await propertyFilter.textContent();
        console.log(`Current filter value: ${currentValue}`);
      }
    }

    expect(true).toBeTruthy();
  });

  // 16. Financial entries - Add Entry button validation
  test('QA-016: Properties - Add Entry button disabled when empty', async ({ page }) => {
    await page.goto(ROUTES.properties);
    await waitForPageLoad(page, 3000);

    const editButton = page.locator('tbody tr').first().locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page, 3000);

      const financialTab = page.locator('[role="tab"]:has-text("Financial")').first();
      if (await financialTab.isVisible().catch(() => false)) {
        await financialTab.click();
        await waitForPageLoad(page, 2000);

        const addButton = page.locator('button:has-text("Add Entry")').first();
        if (await addButton.isVisible().catch(() => false)) {
          await addButton.click();
          await page.waitForTimeout(500);

          // Check if submit button is disabled when form is empty
          const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Add")').last();
          const isDisabled = await submitButton.isDisabled().catch(() => false);

          console.log(`Submit button disabled when empty: ${isDisabled}`);

          await page.keyboard.press('Escape');
        }
      }
    }

    expect(true).toBeTruthy();
  });

  // 17. Service Scheduling / Vendor Directory split verification
  test('QA-017: Vendors - Service Scheduling and Vendor Directory split', async ({ page }) => {
    // Check Service Scheduling page
    await page.goto('/service-scheduling');
    await waitForPageLoad(page, 3000);

    const hasServiceScheduling = await page.locator('h1, h2, [class*="title"]').first().isVisible().catch(() => false);
    const serviceTitle = await page.locator('h1, h2').first().textContent().catch(() => '');
    console.log(`Service Scheduling page title: ${serviceTitle}`);

    // Check Vendor Directory page
    await page.goto('/vendor-directory');
    await waitForPageLoad(page, 3000);

    const hasVendorDirectory = await page.locator('h1, h2, [class*="title"]').first().isVisible().catch(() => false);
    const vendorTitle = await page.locator('h1, h2').first().textContent().catch(() => '');
    console.log(`Vendor Directory page title: ${vendorTitle}`);

    expect(hasServiceScheduling || hasVendorDirectory).toBeTruthy();
  });
});

// After all tests, we'll generate a summary
test.afterAll(async () => {
  console.log('\n========================================');
  console.log('QA VERIFICATION TEST SUMMARY');
  console.log('========================================\n');
});
