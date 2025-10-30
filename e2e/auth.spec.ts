import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 * Tests login, logout, and password reset functionality
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Wait for login form to be visible
    await expect(page.locator('form')).toBeVisible();

    // Check for email and password inputs
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check for sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Click sign in without filling form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show validation errors
    await expect(page.locator('text=/email.*required/i')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // NOTE: Update these with actual test credentials
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';

    // Fill in credentials
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Should show dashboard content
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should navigate to forgot password', async ({ page }) => {
    // Click forgot password link
    await page.getByRole('link', { name: /forgot.*password/i }).click();

    // Should navigate to reset password page
    await expect(page).toHaveURL(/reset-password/);

    // Should show email input for password reset
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
  });
});

test.describe('Authentication - Logged In State', () => {
  // This would ideally use a test user with known credentials
  // For now, we'll skip or mark as requiring setup
  test.skip('should logout successfully', async ({ page }) => {
    // Login first (would use beforeEach with login helper)

    // Click user menu
    await page.getByRole('button', { name: /user.*menu/i }).click();

    // Click logout
    await page.getByRole('menuitem', { name: /logout/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/');

    // Should show login form again
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
