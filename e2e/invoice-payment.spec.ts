import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Invoice Payment Recording
 * Tests the critical flow of recording payments on invoices
 */

test.describe('Invoice Payment Recording', () => {
  test.beforeEach(async ({ page }) => {
    // NOTE: This requires authentication
    // In a real scenario, you would use a login helper here
    // For now, we'll navigate directly assuming auth is handled
    await page.goto('/invoices');
  });

  test.skip('should display invoices page', async ({ page }) => {
    // Wait for invoices page to load
    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();

    // Should show invoices table or cards
    await expect(page.locator('[data-testid="invoices-list"]').or(page.locator('table'))).toBeVisible();
  });

  test.skip('should open payment recording dialog', async ({ page }) => {
    // Find first invoice row
    const firstInvoice = page.locator('[data-testid="invoice-row"]').first();
    await firstInvoice.waitFor({ state: 'visible' });

    // Click on invoice or action button
    await firstInvoice.click();

    // Click "Record Payment" button
    await page.getByRole('button', { name: /record.*payment/i }).click();

    // Payment dialog should open
    await expect(page.getByRole('dialog').or(page.locator('[role="dialog"]'))).toBeVisible();
    await expect(page.getByText(/payment.*details/i)).toBeVisible();
  });

  test.skip('should validate payment amount', async ({ page }) => {
    // Open payment dialog (assuming we're on an invoice detail page)
    await page.getByRole('button', { name: /record.*payment/i }).click();

    // Try to submit without amount
    await page.getByRole('button', { name: /save.*payment/i }).click();

    // Should show validation error
    await expect(page.locator('text=/amount.*required/i')).toBeVisible();

    // Try negative amount
    await page.locator('input[name="amount"]').fill('-100');
    await page.getByRole('button', { name: /save.*payment/i }).click();

    // Should show validation error
    await expect(page.locator('text=/amount.*positive/i')).toBeVisible();
  });

  test.skip('should record full payment successfully', async ({ page }) => {
    const invoiceAmount = '1000.00';

    // Open payment dialog
    await page.getByRole('button', { name: /record.*payment/i }).click();

    // Fill in payment details
    await page.locator('input[name="payment_date"]').fill('2025-10-23');
    await page.locator('input[name="amount"]').fill(invoiceAmount);
    await page.locator('select[name="payment_method"]').selectOption('cash');
    await page.locator('input[name="reference_number"]').fill('REF-001');
    await page.locator('textarea[name="notes"]').fill('Full payment received');

    // Submit payment
    await page.getByRole('button', { name: /save.*payment/i }).click();

    // Should show success message
    await expect(page.locator('text=/payment.*recorded/i')).toBeVisible({ timeout: 5000 });

    // Invoice status should update to "paid"
    await expect(page.locator('text=/paid/i')).toBeVisible();

    // Payment should appear in history
    await expect(page.getByText(invoiceAmount)).toBeVisible();
    await expect(page.getByText('REF-001')).toBeVisible();
  });

  test.skip('should record partial payment successfully', async ({ page }) => {
    const partialAmount = '500.00';

    // Open payment dialog
    await page.getByRole('button', { name: /record.*payment/i }).click();

    // Fill in partial payment
    await page.locator('input[name="payment_date"]').fill('2025-10-23');
    await page.locator('input[name="amount"]').fill(partialAmount);
    await page.locator('select[name="payment_method"]').selectOption('bank_transfer');
    await page.locator('textarea[name="notes"]').fill('Partial payment - 1st installment');

    // Submit payment
    await page.getByRole('button', { name: /save.*payment/i }).click();

    // Should show success message
    await expect(page.locator('text=/payment.*recorded/i')).toBeVisible({ timeout: 5000 });

    // Invoice status should remain "sent" (not fully paid)
    await expect(page.locator('text=/sent/i')).toBeVisible();

    // Should show amount paid
    await expect(page.locator('text=/paid.*500/i')).toBeVisible();
  });

  test.skip('should display payment history', async ({ page }) => {
    // Navigate to invoice with payments
    await page.goto('/invoices/test-invoice-id');

    // Should show payments section
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible();

    // Should show payment records
    await expect(page.locator('[data-testid="payment-record"]')).toHaveCount(2);

    // Each payment should show date, amount, method
    const firstPayment = page.locator('[data-testid="payment-record"]').first();
    await expect(firstPayment.locator('text=/\\$\\d+\\.\\d{2}/')).toBeVisible();
    await expect(firstPayment.locator('text=/cash|bank.*transfer|credit.*card/i')).toBeVisible();
  });

  test.skip('should handle payment deletion', async ({ page }) => {
    // Navigate to invoice with payments
    await page.goto('/invoices/test-invoice-id');

    // Click delete on first payment
    await page.locator('[data-testid="payment-record"]').first()
      .getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show success message
    await expect(page.locator('text=/payment.*deleted/i')).toBeVisible();

    // Invoice status should update accordingly
    // (e.g., back to "sent" if was fully paid)
  });
});

test.describe('Payment Edge Cases', () => {
  test.skip('should prevent overpayment', async ({ page }) => {
    const invoiceTotal = '1000.00';
    const overpaymentAmount = '1500.00';

    await page.goto('/invoices/test-invoice-id');
    await page.getByRole('button', { name: /record.*payment/i }).click();

    // Try to record payment exceeding invoice total
    await page.locator('input[name="amount"]').fill(overpaymentAmount);
    await page.getByRole('button', { name: /save.*payment/i }).click();

    // Should show warning or prevent submission
    await expect(page.locator('text=/exceeds.*total/i')).toBeVisible();
  });

  test.skip('should handle multiple payments adding up to total', async ({ page }) => {
    await page.goto('/invoices/test-invoice-id');

    // Record first payment
    await page.getByRole('button', { name: /record.*payment/i }).click();
    await page.locator('input[name="amount"]').fill('400.00');
    await page.locator('select[name="payment_method"]').selectOption('cash');
    await page.getByRole('button', { name: /save.*payment/i }).click();
    await expect(page.locator('text=/payment.*recorded/i')).toBeVisible();

    // Record second payment
    await page.getByRole('button', { name: /record.*payment/i }).click();
    await page.locator('input[name="amount"]').fill('300.00');
    await page.locator('select[name="payment_method"]').selectOption('bank_transfer');
    await page.getByRole('button', { name: /save.*payment/i }).click();
    await expect(page.locator('text=/payment.*recorded/i')).toBeVisible();

    // Record final payment
    await page.getByRole('button', { name: /record.*payment/i }).click();
    await page.locator('input[name="amount"]').fill('300.00');
    await page.locator('select[name="payment_method"]').selectOption('credit_card');
    await page.getByRole('button', { name: /save.*payment/i }).click();

    // Invoice should now be fully paid
    await expect(page.locator('text=/paid/i')).toBeVisible();
    await expect(page.locator('text=/1000.*paid/i')).toBeVisible();
  });
});
