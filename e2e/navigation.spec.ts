import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // With auth state loaded, should see Dashboard
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to messages page', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(3000);

    // Should see Messages page
    await expect(page.locator('text=Messages').first()).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(3000);

    // Should see Reports page
    await expect(page.locator('text=Reports').first()).toBeVisible({ timeout: 15000 });
  });

  test('should have sidebar navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check if sidebar is visible - look for navigation elements
    await expect(page.locator('nav, aside, [data-sidebar]').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Authentication Flow', () => {
  // These tests use a fresh context without stored auth
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should redirect to auth when not logged in', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Should redirect to auth page or show sign in form
    const hasEmailInput = await page.locator('input[type="email"]').first().isVisible().catch(() => false);
    const hasSignIn = await page.locator('text=Sign In').or(page.locator('text=Sign in')).first().isVisible().catch(() => false);

    expect(hasEmailInput || hasSignIn).toBeTruthy();
  });

  test('should have email input on auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForTimeout(2000);

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should have password input on auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForTimeout(2000);

    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should have submit button on auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForTimeout(2000);

    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 15000 });
  });
});
