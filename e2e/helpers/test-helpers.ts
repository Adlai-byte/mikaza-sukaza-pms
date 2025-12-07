import { Page, expect } from '@playwright/test';

/**
 * Common selectors used across tests
 */
export const selectors = {
  // Navigation
  sidebar: 'nav, aside, [data-sidebar]',
  menuItem: (text: string) => `button:has-text("${text}"), a:has-text("${text}")`,

  // Tables
  table: 'table',
  tableRow: '[role="row"], tr',
  tableCell: '[role="cell"], td',
  tableHeader: 'th, [role="columnheader"]',

  // Forms
  textInput: 'input[type="text"], input:not([type])',
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  dateInput: 'input[type="date"]',
  textarea: 'textarea',
  select: '[role="combobox"]',
  selectOption: (text: string) => `[role="option"]:has-text("${text}")`,
  submitButton: 'button[type="submit"]',
  checkbox: 'input[type="checkbox"], [role="checkbox"]',

  // Dialogs
  dialog: '[role="dialog"]',
  dialogTitle: '[role="dialog"] h2, [role="dialog"] [class*="title"]',
  dialogClose: '[role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Cancel")',
  alertDialog: '[role="alertdialog"]',

  // Status
  badge: '[class*="badge"]',
  spinner: '[class*="spinner"], [class*="loading"]',
  toast: '[role="alert"], [class*="toast"], [data-sonner-toast]',

  // Actions
  editButton: 'button:has-text("Edit")',
  deleteButton: 'button:has-text("Delete")',
  saveButton: 'button:has-text("Save")',
  cancelButton: 'button:has-text("Cancel")',
  newButton: 'button:has-text("New"), button:has-text("Add"), button:has-text("Create")',
  exportButton: 'button:has-text("Export")',

  // Page elements
  pageTitle: 'h1, [class*="page-header"] h1, [class*="title"]',
  card: '[class*="card"]',
  tabs: '[role="tablist"]',
  tab: (text: string) => `[role="tab"]:has-text("${text}")`,
  tabPanel: '[role="tabpanel"]',

  // Search & Filter
  searchInput: 'input[placeholder*="Search"], input[type="search"]',
  filterButton: 'button:has-text("Filter")',
};

/**
 * Wait for page to fully load
 * Uses load state + waits for spinners/loading indicators to disappear
 */
export async function waitForPageLoad(page: Page, timeout = 5000) {
  await page.waitForLoadState('domcontentloaded');

  // Wait for any loading spinners to disappear
  const spinner = page.locator('[class*="spinner"], [class*="loading"], [class*="skeleton"]').first();
  try {
    await spinner.waitFor({ state: 'hidden', timeout });
  } catch {
    // No spinner found or already hidden, continue
  }

  // Wait for main content to be visible
  const mainContent = page.locator('main, [role="main"], #root > div').first();
  try {
    await mainContent.waitFor({ state: 'visible', timeout });
  } catch {
    // Fallback: page might not have main element
  }
}

/**
 * Navigate to a page and verify it loaded
 */
export async function navigateAndVerify(page: Page, path: string, titleText: string, timeout = 15000) {
  await page.goto(path);
  await waitForPageLoad(page);
  await expect(page.locator(`text=${titleText}`).first()).toBeVisible({ timeout });
}

/**
 * Login helper
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 15000 });
}

/**
 * Fill a form field by label
 */
export async function fillField(page: Page, label: string, value: string) {
  // Try multiple selector strategies
  const selectors = [
    `label:has-text("${label}") + input`,
    `label:has-text("${label}") ~ input`,
    `label:has-text("${label}") + textarea`,
    `label:has-text("${label}") ~ textarea`,
    `input[placeholder*="${label}"]`,
    `textarea[placeholder*="${label}"]`,
  ];

  for (const selector of selectors) {
    const field = page.locator(selector).first();
    if (await field.isVisible().catch(() => false)) {
      await field.fill(value);
      return;
    }
  }

  throw new Error(
    `Could not find field with label: "${label}"\n` +
    `Tried selectors:\n${selectors.map(s => `  - ${s}`).join('\n')}\n` +
    `Current page URL: ${page.url()}`
  );
}

/**
 * Select a dropdown option
 */
export async function selectOption(page: Page, label: string, optionText: string) {
  // Find and click the combobox
  const comboboxSelectors = [
    `label:has-text("${label}") + [role="combobox"]`,
    `label:has-text("${label}") ~ [role="combobox"]`,
    `[aria-label="${label}"]`,
  ];

  for (const selector of comboboxSelectors) {
    const combobox = page.locator(selector).first();
    if (await combobox.isVisible().catch(() => false)) {
      await combobox.click();
      // Wait for options to appear
      const option = page.locator(`[role="option"]:has-text("${optionText}")`).first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click();
      // Wait for dropdown to close
      await option.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      return;
    }
  }

  throw new Error(
    `Could not find dropdown with label: "${label}"\n` +
    `Tried selectors:\n${comboboxSelectors.map(s => `  - ${s}`).join('\n')}\n` +
    `Option text: "${optionText}"\n` +
    `Current page URL: ${page.url()}`
  );
}

/**
 * Verify a toast message appears
 */
export async function verifyToast(page: Page, message: string, timeout = 5000) {
  const toastLocator = page.locator(`[role="alert"]:has-text("${message}"), [data-sonner-toast]:has-text("${message}")`);
  await expect(toastLocator.first()).toBeVisible({ timeout });
}

/**
 * Wait for and close a dialog
 * @returns true if dialog was closed, false if no dialog was found
 */
export async function closeDialog(page: Page): Promise<boolean> {
  const dialog = page.locator('[role="dialog"]').first();

  if (!await dialog.isVisible().catch(() => false)) {
    console.log('[closeDialog] No dialog found on page');
    return false;
  }

  const closeButton = dialog.locator('button:has-text("Close"), button:has-text("Cancel")').first();

  if (!await closeButton.isVisible().catch(() => false)) {
    console.log('[closeDialog] Dialog found but no close/cancel button visible');
    return false;
  }

  await closeButton.click();

  // Wait for dialog to close
  try {
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    return true;
  } catch {
    console.log('[closeDialog] Dialog did not close within timeout');
    return false;
  }
}

/**
 * Click a table row by text content
 */
export async function clickTableRow(page: Page, text: string) {
  const rowSelector = `tr:has-text("${text}"), [role="row"]:has-text("${text}")`;
  const row = page.locator(rowSelector).first();

  if (!await row.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error(
      `Could not find table row containing text: "${text}"\n` +
      `Selector used: ${rowSelector}\n` +
      `Current page URL: ${page.url()}`
    );
  }

  await row.click();
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  await waitForPageLoad(page);
  const rows = page.locator('tbody tr, [role="rowgroup"] [role="row"]');
  return await rows.count();
}

/**
 * Check if element with text is visible
 */
export async function isTextVisible(page: Page, text: string): Promise<boolean> {
  try {
    return await page.locator(`text=${text}`).first().isVisible();
  } catch {
    return false;
  }
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, text: string) {
  const buttonSelector = `button:has-text("${text}")`;
  const button = page.locator(buttonSelector).first();

  if (!await button.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error(
      `Could not find button with text: "${text}"\n` +
      `Selector used: ${buttonSelector}\n` +
      `Current page URL: ${page.url()}`
    );
  }

  await button.click();
}

/**
 * Confirm an alert dialog
 * @throws Error if no alert dialog or confirm button found
 */
export async function confirmDialog(page: Page) {
  const alertDialog = page.locator('[role="alertdialog"]').first();

  if (!await alertDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    throw new Error(
      `No alert dialog found on page\n` +
      `Current page URL: ${page.url()}`
    );
  }

  const confirmButton = alertDialog.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), button:has-text("OK")').first();

  if (!await confirmButton.isVisible().catch(() => false)) {
    throw new Error(
      `Alert dialog found but no confirm button (Confirm/Yes/Delete/OK)\n` +
      `Current page URL: ${page.url()}`
    );
  }

  await confirmButton.click();

  // Wait for alert dialog to close
  try {
    await alertDialog.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    console.log('[confirmDialog] Alert dialog did not close within 5s timeout');
  }
}

/**
 * Cancel an alert dialog
 * @throws Error if no alert dialog or cancel button found
 */
export async function cancelDialog(page: Page) {
  const alertDialog = page.locator('[role="alertdialog"]').first();

  if (!await alertDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    throw new Error(
      `No alert dialog found on page\n` +
      `Current page URL: ${page.url()}`
    );
  }

  const cancelButton = alertDialog.locator('button:has-text("Cancel"), button:has-text("No")').first();

  if (!await cancelButton.isVisible().catch(() => false)) {
    throw new Error(
      `Alert dialog found but no cancel button (Cancel/No)\n` +
      `Current page URL: ${page.url()}`
    );
  }

  await cancelButton.click();

  // Wait for alert dialog to close
  try {
    await alertDialog.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    console.log('[cancelDialog] Alert dialog did not close within 5s timeout');
  }
}

/**
 * Switch to a tab by text
 * @throws Error if tab not found
 */
export async function switchToTab(page: Page, tabText: string) {
  const tabSelector = `[role="tab"]:has-text("${tabText}")`;
  const tab = page.locator(tabSelector);

  if (!await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error(
      `Could not find tab with text: "${tabText}"\n` +
      `Selector used: ${tabSelector}\n` +
      `Current page URL: ${page.url()}`
    );
  }

  await tab.click();

  // Wait for tab to become selected
  try {
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
  } catch {
    console.log(`[switchToTab] Tab "${tabText}" did not become selected within timeout`);
  }

  // Wait for tab panel content to be visible
  const tabPanel = page.locator('[role="tabpanel"]').first();
  try {
    await tabPanel.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    console.log(`[switchToTab] Tab panel did not become visible after switching to "${tabText}"`);
  }
}

/**
 * Verify sidebar has item
 */
export async function verifySidebarItem(page: Page, itemText: string): Promise<boolean> {
  const sidebar = page.locator('nav, aside, [data-sidebar]').first();
  const item = sidebar.locator(`text=${itemText}`);
  return await item.isVisible().catch(() => false);
}

/**
 * Search in a table/list
 * @throws Error if search input not found
 */
export async function searchTable(page: Page, searchText: string) {
  const searchSelector = 'input[placeholder*="Search"], input[type="search"]';
  const searchInput = page.locator(searchSelector).first();

  if (!await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error(
      `Could not find search input on page\n` +
      `Selector used: ${searchSelector}\n` +
      `Current page URL: ${page.url()}`
    );
  }

  await searchInput.fill(searchText);

  // Wait for table to update (spinner disappears or content changes)
  const spinner = page.locator('[class*="spinner"], [class*="loading"]').first();
  try {
    // If spinner appears, wait for it to disappear
    await spinner.waitFor({ state: 'visible', timeout: 500 });
    await spinner.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // No spinner, wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }
}

/**
 * Clear search input
 * @throws Error if search input not found
 */
export async function clearSearch(page: Page) {
  const searchSelector = 'input[placeholder*="Search"], input[type="search"]';
  const searchInput = page.locator(searchSelector).first();

  if (!await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error(
      `Could not find search input to clear\n` +
      `Selector used: ${searchSelector}\n` +
      `Current page URL: ${page.url()}`
    );
  }

  await searchInput.clear();

  // Wait for table to update after clearing search
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

/**
 * Wait for table to have data (non-empty)
 * @throws Error if table remains empty after timeout
 */
export async function waitForTableData(page: Page, timeout = 10000) {
  const selector = 'tbody tr:not(:has-text("No")), [role="rowgroup"] [role="row"]';

  try {
    await page.waitForSelector(selector, { timeout });
  } catch {
    throw new Error(
      `Table did not receive data within ${timeout}ms\n` +
      `Selector used: ${selector}\n` +
      `Current page URL: ${page.url()}\n` +
      `This may indicate: no data in database, failed API call, or wrong page`
    );
  }
}

/**
 * Export utilities
 */
export const TestHelpers = {
  selectors,
  waitForPageLoad,
  navigateAndVerify,
  login,
  fillField,
  selectOption,
  verifyToast,
  closeDialog,
  clickTableRow,
  getTableRowCount,
  isTextVisible,
  clickButton,
  confirmDialog,
  cancelDialog,
  switchToTab,
  verifySidebarItem,
  searchTable,
  clearSearch,
  waitForTableData,
};

export default TestHelpers;
