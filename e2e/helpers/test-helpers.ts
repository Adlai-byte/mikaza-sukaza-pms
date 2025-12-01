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
 * Wait for page to fully load (DOM content loaded + extra time)
 * Note: We use 'domcontentloaded' instead of 'networkidle' because
 * Supabase maintains persistent websocket connections that prevent networkidle
 */
export async function waitForPageLoad(page: Page, timeout = 1000) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(timeout);
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

  throw new Error(`Could not find field with label: ${label}`);
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
      await page.waitForTimeout(300);
      await page.locator(`[role="option"]:has-text("${optionText}")`).first().click();
      return;
    }
  }

  throw new Error(`Could not find dropdown with label: ${label}`);
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
 */
export async function closeDialog(page: Page) {
  const closeButton = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Cancel")').first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Click a table row by text content
 */
export async function clickTableRow(page: Page, text: string) {
  await page.locator(`tr:has-text("${text}"), [role="row"]:has-text("${text}")`).first().click();
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
  await page.locator(`button:has-text("${text}")`).first().click();
}

/**
 * Confirm an alert dialog
 */
export async function confirmDialog(page: Page) {
  const confirmButton = page.locator('[role="alertdialog"] button:has-text("Confirm"), [role="alertdialog"] button:has-text("Yes"), [role="alertdialog"] button:has-text("Delete"), [role="alertdialog"] button:has-text("OK")').first();
  await confirmButton.click();
  await page.waitForTimeout(500);
}

/**
 * Cancel an alert dialog
 */
export async function cancelDialog(page: Page) {
  const cancelButton = page.locator('[role="alertdialog"] button:has-text("Cancel"), [role="alertdialog"] button:has-text("No")').first();
  await cancelButton.click();
  await page.waitForTimeout(300);
}

/**
 * Switch to a tab by text
 */
export async function switchToTab(page: Page, tabText: string) {
  await page.locator(`[role="tab"]:has-text("${tabText}")`).click();
  await page.waitForTimeout(500);
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
 */
export async function searchTable(page: Page, searchText: string) {
  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
  await searchInput.fill(searchText);
  await page.waitForTimeout(1000); // Wait for debounced search
}

/**
 * Clear search input
 */
export async function clearSearch(page: Page) {
  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
  await searchInput.clear();
  await page.waitForTimeout(500);
}

/**
 * Wait for table to have data (non-empty)
 */
export async function waitForTableData(page: Page, timeout = 10000) {
  await page.waitForSelector('tbody tr:not(:has-text("No")), [role="rowgroup"] [role="row"]', { timeout });
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
